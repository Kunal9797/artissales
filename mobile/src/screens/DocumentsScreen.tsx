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
} from 'lucide-react-native';

interface DocumentsScreenProps {
  navigation: any;
}

type FilterMode = 'all' | 'offline';

export const DocumentsScreen: React.FC<DocumentsScreenProps> = ({ navigation }) => {
  const route = useRoute();
  const { user } = useAuth();

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
          isLastItem && !loadingOnline && { marginBottom: 0 },
        ]}
        onPress={() => handleDocumentPress(doc)}
        disabled={isDownloading}
      >
        <View style={styles.documentIcon}>
          {isPdf ? (
            <FileText size={24} color={colors.primary} />
          ) : (
            <ImageIcon size={24} color={colors.primary} />
          )}
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
          ) : filterMode === 'offline' ? (
            <>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleSharePress(doc)}
                disabled={isDeleting}
              >
                <Share2 size={20} color="#F57C00" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, isDeleting && styles.deletingButton]}
                onPress={() => handleDeletePress(doc)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color={colors.error} />
                ) : (
                  <Trash2 size={20} color={colors.error} />
                )}
              </TouchableOpacity>
            </>
          ) : isCached ? (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleSharePress(doc)}
            >
              <Share2 size={20} color="#F57C00" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDownloadPress(doc)}
            >
              <Download size={20} color={colors.info} />
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* Back button for stack screen (managers) */}
            {isStackScreen && (
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={{ marginRight: 4 }}
              >
                <ArrowLeft size={20} color="#C9A961" />
              </TouchableOpacity>
            )}
            <Folder size={20} color="#C9A961" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 24, fontWeight: '600', color: '#FFFFFF' }}>
                Documents
              </Text>
              <Text style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.7)', marginTop: 2 }}>
                {documents.length} documents • {offlineCount} offline
              </Text>
            </View>
          </View>

          {/* Upload button (managers only) */}
          {canManageDocuments && (
            <TouchableOpacity
              style={{
                backgroundColor: '#C9A961',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
              onPress={() => navigation.navigate('UploadDocument', { onUploadSuccess: loadDocuments })}
            >
              <Plus size={18} color="#393735" />
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#393735' }}>Upload</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Pills - Below header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, backgroundColor: '#FFFFFF' }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 16,
              backgroundColor: filterMode === 'all' ? '#393735' : '#FFFFFF',
              borderWidth: 1,
              borderColor: filterMode === 'all' ? '#393735' : '#E0E0E0',
            }}
            onPress={() => setFilterMode('all')}
          >
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: filterMode === 'all' ? '#FFFFFF' : '#666666',
            }}>
              All ({documents.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 16,
              backgroundColor: filterMode === 'offline' ? '#393735' : '#FFFFFF',
              borderWidth: 1,
              borderColor: filterMode === 'offline' ? '#393735' : '#E0E0E0',
            }}
            onPress={() => setFilterMode('offline')}
          >
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: filterMode === 'offline' ? '#FFFFFF' : '#666666',
            }}>
              Offline ({offlineCount})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

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
            paddingHorizontal: spacing.screenPadding,
            paddingTop: spacing.screenPadding,
            paddingBottom: isStackScreen ? 24 : 100,
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
    backgroundColor: '#393735',
    paddingHorizontal: 24,
    paddingTop: 52,
    paddingBottom: 16,
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
    backgroundColor: '#fff',
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  documentCardLast: {
    marginBottom: spacing.lg,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
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
    flexDirection: 'row',
    gap: spacing.xs,
    marginLeft: spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: spacing.borderRadius.lg,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
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
