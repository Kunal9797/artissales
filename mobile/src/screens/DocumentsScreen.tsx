/**
import { logger } from '../utils/logger';
 * DocumentsScreen - Unified Role-Adaptive Documents Library
 *
 * Features:
 * - Pill filters: All / Offline
 * - Role-based features (managers can upload/delete)
 * - Offline document management
 * - Share functionality
 * - Storage usage tracking
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
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

  useFocusEffect(
    useCallback(() => {
      // Priority loading: Load cached documents first (instant), then online documents
      const loadInPriority = async () => {
        // 1. Load cached documents immediately (synchronous, from AsyncStorage)
        await loadCachedDocuments();
        setLoading(false); // Show cached documents immediately

        // 2. Load online documents in background
        loadDocuments(true); // Will set loadingOnline state
      };

      loadInPriority();
    }, [loadDocuments, loadCachedDocuments])
  );

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
      logger.log('[DocumentsScreen] Opening document:', document.name, document.id);
      let cachedDoc = await documentCache.getCachedDocument(document.id);

      if (cachedDoc) {
        logger.log('[DocumentsScreen] Document is cached, localUri:', cachedDoc.localUri);

        // Fix MIME type if it's wrong using the document's fileType from Firestore
        if (cachedDoc.mimeType === 'application/octet-stream' && document.fileType) {
          logger.log('[DocumentsScreen] Fixing MIME type using fileType:', document.fileType);
          cachedDoc = await documentCache.fixMimeType(document.id, document.fileType);
        }

        const contentUri = await documentCache.getContentUri(cachedDoc.localUri);
        logger.log('[DocumentsScreen] Content URI:', contentUri);
        logger.log('[DocumentsScreen] Using MIME type:', cachedDoc.mimeType);

        if (Platform.OS === 'android') {
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            flags: 1,
            type: cachedDoc.mimeType,
          });
          logger.log('[DocumentsScreen] IntentLauncher succeeded');
        } else {
          await Linking.openURL(contentUri);
        }
      } else {
        logger.log('[DocumentsScreen] Document not cached, opening from web:', document.fileUrl);
        await Linking.openURL(document.fileUrl);
      }
    } catch (error: any) {
      logger.error('[DocumentsScreen] Error opening document:', error);
      logger.error('[DocumentsScreen] Error details:', JSON.stringify(error, null, 2));

      if (error?.message?.includes('No Activity found') || error?.message?.includes('no handler')) {
        Alert.alert(
          'No App Available',
          'Please install a PDF viewer app from Google Play Store to view documents.\n\nRecommended: Google PDF Viewer or Adobe Acrobat Reader',
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        Alert.alert(
          'Error Opening File',
          `${error?.message || 'Failed to open document'}\n\nMake sure you have a PDF viewer installed.`
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: isStackScreen ? 24 : 100 }, // Less padding for stack, more for tab
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {loading ? (
          <>
            <Skeleton rows={2} />
            <Skeleton rows={2} />
            <Skeleton rows={2} />
            <Skeleton rows={2} />
          </>
        ) : filterMode === 'all' ? (
          // ALL VIEW
          documents.length === 0 ? (
            <EmptyState
              icon={<FileText size={48} color={colors.text.tertiary} />}
              title="No documents yet"
              subtitle={
                canManageDocuments
                  ? 'Upload catalogs, brochures, or other documents'
                  : 'No documents have been uploaded yet'
              }
              primaryAction={
                canManageDocuments
                  ? {
                      label: 'Upload Document',
                      onPress: () => navigation.navigate('UploadDocument', { onUploadSuccess: loadDocuments }),
                    }
                  : undefined
              }
            />
          ) : (
            <>
              {documents.map((doc, index) => {
                const isCached = cachedDocIds.has(doc.id);
                const isDownloading = downloading === doc.id;
                const progress = downloadProgress[doc.id];
                const isPdf = doc.fileType === 'pdf';

                return (
                  <TouchableOpacity
                    key={doc.id}
                    style={[
                      styles.documentCard,
                      index === documents.length - 1 && !loadingOnline && { marginBottom: 0 },
                    ]}
                    onPress={() => handleOpenDocument(doc)}
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
                      ) : isCached ? (
                        <>
                          {/* Share button for cached documents */}
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleShareDocument(doc)}
                          >
                            <Share2 size={20} color="#F57C00" />
                          </TouchableOpacity>
                        </>
                      ) : (
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleDownloadDocument(doc)}
                        >
                          <Download size={20} color={colors.info} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Show skeleton rows at bottom while loading online documents */}
              {loadingOnline && (
                <>
                  <Skeleton rows={2} />
                  <Skeleton rows={2} />
                </>
              )}
            </>
          )
        ) : (
          // OFFLINE VIEW
          <>
            {offlineDocuments.length === 0 ? (
              <EmptyState
                icon={<FileText size={48} color={colors.text.tertiary} />}
                title="No offline documents"
                subtitle="Download documents from the All tab to access them offline"
              />
            ) : (
              <>
                {offlineDocuments.map((doc, index) => {
                  const isDeleting = deleting === doc.id;
                  const isPdf = doc.fileType === 'pdf';

                  return (
                    <TouchableOpacity
                      key={doc.id}
                      style={[
                        styles.documentCard,
                        index === offlineDocuments.length - 1 && styles.documentCardLast,
                      ]}
                      onPress={() => handleOpenDocument(doc)}
                      disabled={isDeleting}
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
                      </View>

                      <View style={styles.documentActions}>
                        {/* Share button */}
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleShareDocument(doc)}
                          disabled={isDeleting}
                        >
                          <Share2 size={20} color="#F57C00" />
                        </TouchableOpacity>

                        {/* Delete from device button */}
                        <TouchableOpacity
                          style={[styles.actionButton, isDeleting && styles.deletingButton]}
                          onPress={() => handleDeleteCachedDocument(doc)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <ActivityIndicator size="small" color={colors.error} />
                          ) : (
                            <Trash2 size={20} color={colors.error} />
                          )}
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {/* Storage Info Footer */}
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
                        ⚠️ {totalCacheSize > 500 * 1024 * 1024
                          ? 'Consider clearing old documents'
                          : 'Using significant storage'}
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
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
  scrollView: {
    flex: 1,
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
