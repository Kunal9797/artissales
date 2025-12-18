/**
 * DocumentsScreen - Unified Role-Adaptive Documents Library
 *
 * Features:
 * - Pill filters: All / Offline
 * - Role-based features (managers can upload/delete)
 * - Offline document management
 * - Share functionality
 * - Storage usage tracking
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { logger } from '../utils/logger';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
  RefreshControl,
} from 'react-native';
import { FlashList, ListRenderItemInfo } from '@shopify/flash-list';
import { useRoute } from '@react-navigation/native';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import { colors, spacing, typography, featureColors } from '../theme';
import { api } from '../services/api';
import { documentCache, DownloadProgress } from '../services/documentCache';
import { Document } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useBottomSafeArea } from '../hooks/useBottomSafeArea';
import { EmptyState, Skeleton } from '../patterns';
import {
  FileText,
  Folder,
  Download,
  Plus,
  Share2,
  Trash2,
  ArrowLeft,
  Image as ImageIcon,
  MoreVertical,
  Check,
} from 'lucide-react-native';

// TEMPORARY: Design preview flag - set to false to hide design options
const SHOW_DESIGN_PREVIEW = false;

interface DocumentsScreenProps {
  navigation: any;
}

type FilterMode = 'all' | 'offline';

export const DocumentsScreen: React.FC<DocumentsScreenProps> = ({ navigation }) => {
  const route = useRoute();
  const { user } = useAuth();
  const bottomPadding = useBottomSafeArea(12);

  // Determine if this is a stack screen (managers) or tab screen (sales reps)
  const isStackScreen = route.name === 'Documents';

  // Role-based permissions
  const canManageDocuments = user?.role &&
    ['admin', 'national_head', 'area_manager', 'zonal_head'].includes(user.role);

  // State
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOnline, setLoadingOnline] = useState(false);
  const [cachedDocIds, setCachedDocIds] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [totalCacheSize, setTotalCacheSize] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadDocuments = useCallback(async (showLoadingIndicator = true) => {
    try {
      if (showLoadingIndicator) {
        setLoadingOnline(true);
      }
      const response = await api.getDocuments();
      if (response.ok) {
        setDocuments(response.documents);
      }
    } catch (error) {
      logger.error('Error fetching documents:', error);
    } finally {
      if (showLoadingIndicator) {
        setLoadingOnline(false);
      }
    }
  }, []);

  const loadCachedDocuments = useCallback(async () => {
    try {
      const cachedDocs = await documentCache.listCachedDocuments();
      const cachedIds = new Set(cachedDocs.map(doc => doc.documentId));
      setCachedDocIds(cachedIds);

      const size = await documentCache.getTotalCacheSize();
      setTotalCacheSize(size);
    } catch (error) {
      logger.error('Error loading cached documents:', error);
    }
  }, []);

  // Load data on mount only (Phase 2A optimization)
  // User can manually refresh via pull-to-refresh
  useEffect(() => {
    // Priority loading: Load both in parallel, but keep loading=true until we have online docs
    const loadInPriority = async () => {
      // Start both loads in parallel
      const cachePromise = loadCachedDocuments();
      const onlinePromise = loadDocuments(false); // Don't show loadingOnline indicator

      // Wait for both to complete
      await Promise.all([cachePromise, onlinePromise]);

      // Now we have both cached and online data, hide loading
      setLoading(false);
    };

    loadInPriority();
  }, [loadDocuments, loadCachedDocuments]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadDocuments(), loadCachedDocuments()]);
    setRefreshing(false);
  }, [loadDocuments, loadCachedDocuments]);

  const handleDownloadDocument = async (document: Document) => {
    try {
      setDownloading(document.id);
      setDownloadProgress(prev => ({ ...prev, [document.id]: 0 }));

      await documentCache.downloadDocument(
        document.id,
        document.fileUrl,
        document.name,
        document.fileType, // Pass the actual file type from Firestore
        (progress: DownloadProgress) => {
          const percent = Math.round(
            (progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 100
          );
          setDownloadProgress(prev => ({ ...prev, [document.id]: percent }));
        }
      );

      await loadCachedDocuments();
      Alert.alert('Success', `${document.name} is now available offline`);
    } catch (error) {
      logger.error('Error downloading document:', error);
      Alert.alert('Download Failed', 'Could not download document. Please try again.');
    } finally {
      setDownloading(null);
      setDownloadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[document.id];
        return newProgress;
      });
    }
  };

  const handleOpenDocument = async (document: Document) => {
    try {
      logger.log('[DocumentsScreen] ========== Opening Document ==========');
      logger.log('[DocumentsScreen] Document name:', document.name);
      logger.log('[DocumentsScreen] Document ID:', document.id);
      logger.log('[DocumentsScreen] Document fileType:', document.fileType);
      logger.log('[DocumentsScreen] Document fileUrl:', document.fileUrl);

      let cachedDoc = await documentCache.getCachedDocument(document.id);

      if (cachedDoc) {
        logger.log('[DocumentsScreen] ✓ Document is cached');
        logger.log('[DocumentsScreen] Cached localUri:', cachedDoc.localUri);
        logger.log('[DocumentsScreen] Cached MIME type:', cachedDoc.mimeType);

        // Check if file actually exists
        const { File } = await import('expo-file-system');
        try {
          const file = new File(cachedDoc.localUri);
          const exists = file.exists;
          logger.log('[DocumentsScreen] File exists check:', exists);
          if (exists) {
            logger.log('[DocumentsScreen] File size:', file.size, 'bytes');
          } else {
            logger.error('[DocumentsScreen] ✗ File does not exist at localUri!');
            Alert.alert('Error', 'Cached file not found. Please re-download the document.');
            return;
          }
        } catch (fileCheckError) {
          logger.error('[DocumentsScreen] Error checking file existence:', fileCheckError);
        }

        // Fix MIME type if it's wrong using the document's fileType from Firestore
        if (cachedDoc.mimeType === 'application/octet-stream' && document.fileType) {
          logger.log('[DocumentsScreen] Fixing MIME type from fileType:', document.fileType);
          cachedDoc = await documentCache.fixMimeType(document.id, document.fileType);
          logger.log('[DocumentsScreen] MIME type after fix:', cachedDoc.mimeType);
        }

        logger.log('[DocumentsScreen] Getting content URI for Android...');
        const contentUri = await documentCache.getContentUri(cachedDoc.localUri);
        logger.log('[DocumentsScreen] Content URI result:', contentUri);

        // Use IntentLauncher to open the document directly (Android)
        if (Platform.OS === 'android') {
          logger.log('[DocumentsScreen] Opening with IntentLauncher...');
          logger.log('[DocumentsScreen]   - action: android.intent.action.VIEW');
          logger.log('[DocumentsScreen]   - data:', contentUri);
          logger.log('[DocumentsScreen]   - type:', cachedDoc.mimeType);

          try {
            await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
              data: contentUri,
              flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
              type: cachedDoc.mimeType,
            });
            logger.log('[DocumentsScreen] ✓ IntentLauncher succeeded');
          } catch (intentError: any) {
            logger.error('[DocumentsScreen] ✗ IntentLauncher failed:', intentError);
            logger.error('[DocumentsScreen] Intent error message:', intentError?.message);
            logger.error('[DocumentsScreen] Intent error code:', intentError?.code);

            // Fallback: Try using Linking as a last resort
            logger.log('[DocumentsScreen] Trying Linking.openURL as fallback...');
            try {
              await Linking.openURL(contentUri);
              logger.log('[DocumentsScreen] ✓ Linking fallback succeeded');
            } catch (linkError) {
              logger.error('[DocumentsScreen] Linking fallback also failed:', linkError);
              throw intentError; // Throw original error
            }
          }
        } else {
          // iOS
          logger.log('[DocumentsScreen] iOS: Opening with Linking.openURL');
          await Linking.openURL(contentUri);
        }
        logger.log('[DocumentsScreen] ✓ Document opened successfully');
      } else {
        logger.log('[DocumentsScreen] Document not cached, opening from web');
        logger.log('[DocumentsScreen] Web URL:', document.fileUrl);
        await Linking.openURL(document.fileUrl);
      }

      logger.log('[DocumentsScreen] ========== Document Opened Successfully ==========');
    } catch (error: any) {
      logger.error('[DocumentsScreen] ========== ERROR Opening Document ==========');
      logger.error('[DocumentsScreen] Error type:', error?.constructor?.name);
      logger.error('[DocumentsScreen] Error message:', error?.message);
      logger.error('[DocumentsScreen] Error code:', error?.code);
      logger.error('[DocumentsScreen] Full error object:', JSON.stringify(error, null, 2));
      logger.error('[DocumentsScreen] Error stack:', error?.stack);

      if (error?.message?.includes('No Activity found') || error?.message?.includes('no handler')) {
        Alert.alert(
          'No App Available',
          'Please install a PDF viewer app from Google Play Store to view documents.\n\nRecommended: Google PDF Viewer or Adobe Acrobat Reader',
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        // Show detailed error in dev mode
        const errorDetails = __DEV__
          ? `\n\nDev Details:\nMessage: ${error?.message}\nCode: ${error?.code}\nType: ${error?.constructor?.name}`
          : '';
        Alert.alert(
          'Error Opening File',
          `${error?.message || 'Failed to open document'}${errorDetails}\n\nMake sure you have a PDF viewer installed.`
        );
      }
    }
  };

  const handleShareDocument = async (document: Document) => {
    try {
      const cachedDoc = await documentCache.getCachedDocument(document.id);
      if (!cachedDoc) {
        Alert.alert('Error', 'Document not available offline. Please download it first.');
        return;
      }

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }

      await Sharing.shareAsync(cachedDoc.localUri, {
        mimeType: cachedDoc.mimeType,
        dialogTitle: `Share ${document.name}`,
        UTI: cachedDoc.mimeType === 'application/pdf' ? 'com.adobe.pdf' : undefined,
      });
    } catch (err: any) {
      logger.error('Error sharing document:', err);
      if (!err.message?.includes('cancelled')) {
        Alert.alert('Share Failed', 'Could not share document. Please try again.');
      }
    }
  };

  const handleDeleteCachedDocument = (document: Document) => {
    Alert.alert(
      'Delete Offline Copy',
      `Remove "${document.name}" from offline storage?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(document.id);
              await documentCache.deleteCachedDocument(document.id);
              await loadCachedDocuments();
            } catch (err) {
              logger.error('Error deleting cached document:', err);
              Alert.alert('Error', 'Failed to delete offline copy');
            } finally {
              setDeleting(null);
            }
          },
        },
      ]
    );
  };

  const handleDeleteDocument = (document: Document) => {
    Alert.alert(
      'Delete Document',
      `Permanently delete "${document.name}"? This will remove it for all users.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(document.id);
              const response = await api.deleteDocument({ documentId: document.id });
              if (response.ok) {
                setDocuments(prev => prev.filter(d => d.id !== document.id));
                Alert.alert('Success', 'Document deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete document');
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to delete document');
            } finally {
              setDeleting(null);
            }
          },
        },
      ]
    );
  };

  const handleClearAllCache = () => {
    Alert.alert(
      'Clear All Downloads',
      'Remove all offline documents? You can download them again later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await documentCache.clearAllCache();
              await loadCachedDocuments();
              Alert.alert('Success', 'All offline documents cleared');
            } catch (err) {
              logger.error('Error clearing cache:', err);
              Alert.alert('Error', 'Failed to clear offline documents');
            }
          },
        },
      ]
    );
  };

  const formatFileSize = (sizeInBytes: number): string => {
    if (sizeInBytes < 1024) return `${sizeInBytes} B`;
    if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get 1-2 letter initials from document name
  const getDocInitials = (name: string): string => {
    // Remove file extension
    const baseName = name.replace(/\.[^/.]+$/, '');
    const words = baseName.split(/[\s_-]+/).filter(w => w.length > 0);

    if (words.length >= 2) {
      // First letter of first two words: "Fine Decor" -> "FD"
      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    } else if (words.length === 1) {
      // Single word: just first letter - "Woodrica" -> "W", "Artis" -> "A"
      return words[0].charAt(0).toUpperCase();
    }
    return 'D';
  };

  const formatDate = (dateValue: any): string => {
    if (!dateValue) return 'Recently';

    let date: Date;
    if (typeof dateValue === 'object' && '_seconds' in dateValue) {
      date = new Date(dateValue._seconds * 1000);
    } else if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    } else if (typeof dateValue === 'number') {
      date = new Date(dateValue);
    } else {
      return 'Recently';
    }

    if (isNaN(date.getTime())) return 'Recently';

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const offlineDocuments = documents.filter(doc => cachedDocIds.has(doc.id));
  const offlineCount = offlineDocuments.length;

  // Type for list items - includes documents and storage footer
  type ListItem =
    | { type: 'document'; data: Document }
    | { type: 'storage_footer' };

  // Build list data based on filter mode
  const listData = useMemo((): ListItem[] => {
    const items: ListItem[] = [];
    const docs = filterMode === 'all' ? documents : offlineDocuments;

    docs.forEach(doc => {
      items.push({ type: 'document', data: doc });
    });

    // Add storage footer only in offline mode with documents
    if (filterMode === 'offline' && offlineDocuments.length > 0) {
      items.push({ type: 'storage_footer' });
    }

    return items;
  }, [documents, offlineDocuments, filterMode]);

  // Memoized document press handler
  const handleDocumentPress = useCallback((doc: Document) => {
    handleOpenDocument(doc);
  }, []);

  // Memoized download handler
  const handleDownloadPress = useCallback((doc: Document) => {
    handleDownloadDocument(doc);
  }, []);

  // Memoized share handler
  const handleSharePress = useCallback((doc: Document) => {
    handleShareDocument(doc);
  }, []);

  // Memoized delete handler
  const handleDeletePress = useCallback((doc: Document) => {
    filterMode === 'offline' ? handleDeleteCachedDocument(doc) : handleDeleteDocument(doc);
  }, [filterMode]);

  // FlashList renderItem
  const renderDocumentItem = useCallback(({ item, index }: ListRenderItemInfo<ListItem>) => {
    if (item.type === 'storage_footer') {
      return (
        <View style={styles.storageFooter}>
          <View style={styles.storageTotalContainer}>
            <Text style={styles.storageTotalLabel}>Total Storage Used</Text>
            <Text style={styles.storageTotalSize}>{formatFileSize(totalCacheSize)}</Text>
          </View>

          <TouchableOpacity style={styles.clearAllButton} onPress={handleClearAllCache}>
            <Text style={styles.clearAllText}>Clear All Downloads</Text>
          </TouchableOpacity>

          {totalCacheSize > 100 * 1024 * 1024 && (
            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>
                {totalCacheSize > 500 * 1024 * 1024
                  ? 'Consider clearing old documents'
                  : 'Using significant storage'}
              </Text>
            </View>
          )}
        </View>
      );
    }

    const doc = item.data;
    const isCached = cachedDocIds.has(doc.id);
    const isDownloading = downloading === doc.id;
    const progress = downloadProgress[doc.id];
    const isPdf = doc.fileType === 'pdf';
    const isDeleting = deleting === doc.id;
    const isLastItem = index === listData.length - 1 || (index === listData.length - 2 && filterMode === 'offline');

    return (
      <TouchableOpacity
        style={[
          styles.documentCard,
          isLastItem && styles.documentCardLast,
        ]}
        onPress={() => handleDocumentPress(doc)}
        disabled={isDownloading}
      >
        <View style={styles.documentInitial}>
          <Text style={styles.documentInitialText}>
            {getDocInitials(doc.name)}
          </Text>
        </View>

        <View style={styles.documentInfo}>
          <Text style={styles.documentName} numberOfLines={1}>
            {doc.name}
          </Text>
          <Text style={styles.documentMeta}>
            {formatFileSize(doc.fileSizeBytes)} • {formatDate(doc.uploadedAt)}
          </Text>
          {isDownloading && progress !== undefined && (
            <Text style={styles.downloadingText}>
              Downloading... {progress}%
            </Text>
          )}
        </View>

        <View style={styles.documentActions}>
          {isDownloading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : isCached ? (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleSharePress(doc)}
            >
              <Share2 size={22} color="#F57C00" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDownloadPress(doc)}
            >
              <Download size={22} color={colors.info} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [cachedDocIds, downloading, downloadProgress, deleting, filterMode, loadingOnline, totalCacheSize, listData.length, handleDocumentPress, handleDownloadPress, handleSharePress, handleDeletePress]);

  // Key extractor
  const keyExtractor = useCallback((item: ListItem, index: number) => {
    return item.type === 'storage_footer' ? 'storage_footer' : item.data.id;
  }, []);

  return (
    <View style={styles.container}>
      {/* Dark Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Documents</Text>

        {/* Upload button (managers only) */}
        {canManageDocuments && (
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => navigation.navigate('UploadDocument', { onUploadSuccess: loadDocuments })}
          >
            <Plus size={16} color={colors.accent} />
            <Text style={styles.uploadButtonText}>Upload</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Row - Single toggle chip */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={filterMode === 'offline' ? styles.filterChipActive : styles.filterChipInactive}
          onPress={() => setFilterMode(filterMode === 'offline' ? 'all' : 'offline')}
        >
          {filterMode === 'offline' ? (
            <Check size={14} color="#FFFFFF" />
          ) : (
            <Download size={14} color={colors.text.secondary} />
          )}
          <Text style={filterMode === 'offline' ? styles.filterChipTextActive : styles.filterChipTextInactive}>
            Offline only
          </Text>
        </TouchableOpacity>
        <Text style={styles.docCount}>
          {filterMode === 'offline' ? offlineCount : documents.length} documents
        </Text>
      </View>

      {/* TEMPORARY: Design Preview Section */}
      {SHOW_DESIGN_PREVIEW && (
        <View style={previewStyles.container}>
          <Text style={previewStyles.title}>Choose a Design Style</Text>
          <Text style={previewStyles.subtitle}>Tap to select your preferred document row style</Text>

          {/* Option A: Current Card Style */}
          <View style={previewStyles.optionContainer}>
            <Text style={previewStyles.optionLabel}>A. Cards (Current)</Text>
            <View style={previewStyles.optionPreview}>
              <View style={[styles.documentCard, { marginBottom: 0 }]}>
                <View style={styles.documentIcon}>
                  <FileText size={24} color={colors.primary} />
                </View>
                <View style={styles.documentInfo}>
                  <Text style={styles.documentName} numberOfLines={1}>Product Catalog 2024.pdf</Text>
                  <Text style={styles.documentMeta}>2.4 MB • Dec 15, 2024</Text>
                </View>
                <View style={styles.documentActions}>
                  <View style={styles.actionButton}>
                    <Download size={20} color={colors.info} />
                  </View>
                </View>
              </View>
            </View>
            <TouchableOpacity style={previewStyles.selectButton} onPress={() => Alert.alert('Option A', 'Keep current card design')}>
              <Text style={previewStyles.selectButtonText}>Select</Text>
            </TouchableOpacity>
          </View>

          {/* Option B: Clean Rows */}
          <View style={previewStyles.optionContainer}>
            <Text style={previewStyles.optionLabel}>B. Clean Rows</Text>
            <View style={previewStyles.optionPreview}>
              {/* Example: Not downloaded yet */}
              <View style={previewStyles.cleanRow}>
                <FileText size={28} color={colors.primary} />
                <View style={previewStyles.cleanRowInfo}>
                  <Text style={previewStyles.cleanRowName} numberOfLines={1}>Product Catalog 2024.pdf</Text>
                  <Text style={previewStyles.cleanRowMeta}>2.4 MB • Dec 15, 2024</Text>
                </View>
                <Download size={22} color={colors.info} />
              </View>
              <View style={previewStyles.separator} />
              {/* Example: Already downloaded */}
              <View style={previewStyles.cleanRow}>
                <FileText size={28} color={colors.primary} />
                <View style={previewStyles.cleanRowInfo}>
                  <Text style={previewStyles.cleanRowName} numberOfLines={1}>Brochure Design.pdf</Text>
                  <Text style={previewStyles.cleanRowMeta}>1.1 MB • Dec 12, 2024</Text>
                </View>
                <Share2 size={22} color="#F57C00" />
              </View>
              <View style={previewStyles.separator} />
            </View>
            <TouchableOpacity style={previewStyles.selectButton} onPress={() => Alert.alert('Option B', 'Clean rows - Download or Share icon based on state')}>
              <Text style={previewStyles.selectButtonText}>Select</Text>
            </TouchableOpacity>
          </View>

          {/* Option C: Compact List */}
          <View style={previewStyles.optionContainer}>
            <Text style={previewStyles.optionLabel}>C. Compact</Text>
            <View style={previewStyles.optionPreview}>
              <View style={previewStyles.compactRow}>
                <FileText size={22} color={colors.text.secondary} />
                <Text style={previewStyles.compactName} numberOfLines={1}>Product Catalog 2024.pdf</Text>
                <Text style={previewStyles.compactMeta}>2.4 MB</Text>
                <Download size={18} color={colors.info} />
              </View>
              <View style={previewStyles.separator} />
            </View>
            <TouchableOpacity style={previewStyles.selectButton} onPress={() => Alert.alert('Option C', 'Compact single-line design')}>
              <Text style={previewStyles.selectButtonText}>Select</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Chip Options */}
          <Text style={[previewStyles.title, { marginTop: spacing.lg }]}>Filter Style</Text>
          <Text style={previewStyles.subtitle}>Single toggle chip instead of two tabs</Text>

          <View style={previewStyles.optionContainer}>
            <Text style={previewStyles.optionLabel}>Filter Chip (Inactive)</Text>
            <View style={previewStyles.optionPreview}>
              <View style={previewStyles.filterChipRow}>
                <View style={previewStyles.filterChipInactive}>
                  <Download size={14} color={colors.text.secondary} />
                  <Text style={previewStyles.filterChipTextInactive}>Offline only</Text>
                </View>
                <Text style={previewStyles.docCount}>{documents.length} documents</Text>
              </View>
            </View>
          </View>

          <View style={previewStyles.optionContainer}>
            <Text style={previewStyles.optionLabel}>Filter Chip (Active)</Text>
            <View style={previewStyles.optionPreview}>
              <View style={previewStyles.filterChipRow}>
                <View style={previewStyles.filterChipActive}>
                  <Check size={14} color="#FFFFFF" />
                  <Text style={previewStyles.filterChipTextActive}>Offline only</Text>
                </View>
                <Text style={previewStyles.docCount}>{offlineCount} documents</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.content}>
          <Skeleton rows={2} />
          <Skeleton rows={2} />
          <Skeleton rows={2} />
          <Skeleton rows={2} />
        </View>
      ) : listData.length === 0 ? (
        <View style={styles.content}>
          <EmptyState
            icon={<FileText size={48} color={colors.text.tertiary} />}
            title={filterMode === 'all' ? 'No documents yet' : 'No offline documents'}
            subtitle={
              filterMode === 'all'
                ? canManageDocuments
                  ? 'Upload catalogs, brochures, or other documents'
                  : 'No documents have been uploaded yet'
                : 'Download documents from the All tab to access them offline'
            }
            primaryAction={
              filterMode === 'all' && canManageDocuments
                ? {
                    label: 'Upload Document',
                    onPress: () => navigation.navigate('UploadDocument', { onUploadSuccess: loadDocuments }),
                  }
                : undefined
            }
          />
        </View>
      ) : (
        <FlashList
          data={listData}
          renderItem={renderDocumentItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={{
            paddingTop: spacing.md,
            paddingBottom: isStackScreen ? bottomPadding + 24 : 80 + bottomPadding,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListFooterComponent={
            loadingOnline ? (
              <View style={{ marginTop: spacing.md }}>
                <Skeleton rows={2} />
                <Skeleton rows={2} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingTop: 52,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.inverse,
    flex: 1,
  },
  uploadButton: {
    backgroundColor: 'rgba(201, 169, 97, 0.25)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: spacing.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  uploadButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.accent,
  },
  // Filter row styles
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    backgroundColor: '#FFFFFF',
  },
  filterChipInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: '#FFFFFF',
  },
  filterChipTextInactive: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  filterChipActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
  filterChipTextActive: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: '#FFFFFF',
  },
  docCount: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  content: {
    padding: spacing.screenPadding,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xl * 3,
    gap: spacing.md,
  },
  loadingText: {
    ...typography.styles.body,
    color: colors.text.tertiary,
  },
  documentCard: {
    backgroundColor: '#FFFFFF',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.screenPadding,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  documentCardLast: {
    borderBottomWidth: 0,
  },
  documentIcon: {
    marginRight: spacing.md,
  },
  documentInitial: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  documentInitialText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: '#FFFFFF',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
    flex: 1,
  },
  documentMeta: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  downloadingText: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 4,
    fontWeight: typography.fontWeight.medium,
  },
  documentActions: {
    marginLeft: spacing.sm,
    padding: spacing.sm,
  },
  actionButton: {
    // Clean style - no background, just the icon
  },
  deletingButton: {
    opacity: 0.5,
  },
  storageFooter: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  storageTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  storageTotalLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  storageTotalSize: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  clearAllButton: {
    backgroundColor: colors.error,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.md,
    alignItems: 'center',
  },
  clearAllText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: '#fff',
  },
  warningContainer: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: '#FFF3E0',
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: '#FFB300',
  },
  warningText: {
    fontSize: typography.fontSize.sm,
    color: '#F57C00',
    textAlign: 'center',
  },
});

// TEMPORARY: Preview styles for design exploration
const previewStyles = StyleSheet.create({
  container: {
    backgroundColor: '#FAFAFA',
    padding: spacing.screenPadding,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  optionContainer: {
    marginBottom: spacing.lg,
  },
  optionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionPreview: {
    backgroundColor: '#FFFFFF',
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  selectButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.md,
    alignSelf: 'flex-start',
  },
  selectButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: '#FFFFFF',
  },
  // Option B: Clean Row styles
  cleanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  cleanRowInfo: {
    flex: 1,
  },
  cleanRowName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: 2,
  },
  cleanRowMeta: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  menuButton: {
    padding: spacing.sm,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border.light,
    marginLeft: 44, // Align with text after icon
  },
  // Option C: Compact Row styles
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  compactName: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  compactMeta: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginRight: spacing.sm,
  },
  // Filter chip styles
  filterChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterChipInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: '#FFFFFF',
  },
  filterChipTextInactive: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  filterChipActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
  filterChipTextActive: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: '#FFFFFF',
  },
  docCount: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
});
