import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FileText, Image as ImageIcon, Download, Trash2, Plus, CheckCircle, HardDrive } from 'lucide-react-native';
import { api } from '../services/api';
import { colors, spacing, typography } from '../theme';
import { Document } from '../types';
import { EmptyState, ErrorState } from '../patterns';
import { useAuth } from '../hooks/useAuth';
import { documentCache, DownloadProgress } from '../services/documentCache';

type DocumentLibraryScreenProps = NativeStackScreenProps<any, 'DocumentLibrary'>;

export const DocumentLibraryScreen: React.FC<DocumentLibraryScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Download states
  const [cachedDocIds, setCachedDocIds] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});

  const canManageDocuments = user?.role && ['admin', 'national_head', 'area_manager', 'zonal_head'].includes(user.role);

  useEffect(() => {
    loadDocuments();
    loadCachedDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getDocuments();
      if (response.ok) {
        setDocuments(response.documents);
      } else {
        setError('Failed to load documents');
      }
    } catch (err) {
      console.error('Error loading documents:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadCachedDocuments = async () => {
    try {
      const cachedDocs = await documentCache.listCachedDocuments();
      const cachedIds = new Set(cachedDocs.map(doc => doc.documentId));
      setCachedDocIds(cachedIds);
    } catch (err) {
      console.error('Error loading cached documents:', err);
    }
  };

  const handleDownloadDocument = async (document: Document) => {
    try {
      setDownloading(document.id);
      setDownloadProgress(prev => ({ ...prev, [document.id]: 0 }));

      await documentCache.downloadDocument(
        document.id,
        document.fileUrl,
        document.name,
        (progress: DownloadProgress) => {
          const percent = Math.round(
            (progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 100
          );
          setDownloadProgress(prev => ({ ...prev, [document.id]: percent }));
        }
      );

      // Update cached documents list
      setCachedDocIds(prev => new Set(prev).add(document.id));
      Alert.alert('Success', `${document.name} is now available offline`);
    } catch (err) {
      console.error('Error downloading document:', err);
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
      // Check if document is cached
      const cachedDoc = await documentCache.getCachedDocument(document.id);

      if (cachedDoc) {
        // Open cached document
        const contentUri = await documentCache.getContentUri(cachedDoc.localUri);
        const supported = await Linking.canOpenURL(contentUri);
        if (supported) {
          await Linking.openURL(contentUri);
        } else {
          Alert.alert('Error', 'Cannot open this file type');
        }
      } else {
        // Open from web (requires internet)
        const supported = await Linking.canOpenURL(document.fileUrl);
        if (supported) {
          await Linking.openURL(document.fileUrl);
        } else {
          Alert.alert('Error', 'Cannot open this file type');
        }
      }
    } catch (err) {
      console.error('Error opening document:', err);
      Alert.alert('Error', 'Failed to open document');
    }
  };

  const handleDeleteDocument = (document: Document) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${document.name}"?`,
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
                setDocuments((prev) => prev.filter((d) => d.id !== document.id));
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

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderDocument = ({ item }: { item: Document }) => {
    const isCached = cachedDocIds.has(item.id);
    const isDownloading = downloading === item.id;
    const progress = downloadProgress[item.id];

    return (
      <TouchableOpacity
        style={styles.documentCard}
        onPress={() => handleOpenDocument(item)}
        activeOpacity={0.7}
      >
        <View style={styles.documentIcon}>
          {item.fileType === 'pdf' ? (
            <FileText size={32} color={colors.error} />
          ) : (
            <ImageIcon size={32} color={colors.info} />
          )}
        </View>

        <View style={styles.documentInfo}>
          <View style={styles.documentHeader}>
            <Text style={styles.documentName} numberOfLines={2}>
              {item.name}
            </Text>
            {isCached && (
              <View style={styles.cachedBadge}>
                <CheckCircle size={14} color={colors.success} />
                <Text style={styles.cachedText}>Offline</Text>
              </View>
            )}
          </View>
          {item.description && (
            <Text style={styles.documentDescription} numberOfLines={1}>
              {item.description}
            </Text>
          )}
          <View style={styles.documentMeta}>
            <Text style={styles.documentMetaText}>
              {formatFileSize(item.fileSizeBytes)} • {formatDate(item.uploadedAt)}
            </Text>
          </View>
          <Text style={styles.uploadedBy}>
            Uploaded by {item.uploadedByName}
          </Text>
        </View>

        <View style={styles.documentActions}>
          {/* Download/Progress Button */}
          {!isCached && (
            <TouchableOpacity
              style={[styles.actionButton, isDownloading && styles.downloadingButton]}
              onPress={() => handleDownloadDocument(item)}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <View style={styles.progressContainer}>
                  <ActivityIndicator size="small" color={colors.info} />
                  {progress !== undefined && progress > 0 && (
                    <Text style={styles.progressText}>{progress}%</Text>
                  )}
                </View>
              ) : (
                <Download size={20} color={colors.info} />
              )}
            </TouchableOpacity>
          )}

          {/* Delete Button (Admin only) */}
          {canManageDocuments && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeleteDocument(item)}
              disabled={deleting === item.id}
            >
              {deleting === item.id ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <Trash2 size={20} color={colors.error} />
              )}
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.manageDownloadsButton}
              onPress={() => navigation.navigate('ManageDownloads', { onDelete: loadCachedDocuments })}
            >
              <HardDrive size={20} color="#fff" />
            </TouchableOpacity>

            {canManageDocuments && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('UploadDocument', { onUploadSuccess: loadDocuments })}
              >
                <Plus size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text style={styles.title}>Documents & Resources</Text>
        <Text style={styles.subtitle}>
          {documents.length} {documents.length === 1 ? 'document' : 'documents'}
        </Text>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading documents...</Text>
        </View>
      ) : error ? (
        <ErrorState message={error} retry={loadDocuments} />
      ) : documents.length === 0 ? (
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
        <FlatList
          data={documents}
          renderItem={renderDocument}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
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
    paddingTop: 60,
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  backButton: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.accent,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  manageDownloadsButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    backgroundColor: colors.accent,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: '#fff',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  list: {
    padding: spacing.screenPadding,
  },
  documentCard: {
    backgroundColor: '#fff',
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border.default,
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
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs / 2,
    gap: spacing.xs,
  },
  documentName: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  cachedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: spacing.borderRadius.sm,
    gap: 4,
  },
  cachedText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.success,
  },
  documentDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  documentMeta: {
    marginBottom: spacing.xs / 2,
  },
  documentMetaText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  uploadedBy: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  documentActions: {
    marginLeft: spacing.sm,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  downloadingButton: {
    backgroundColor: '#E3F2FD',
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontSize: typography.fontSize.xs,
    color: colors.info,
    marginTop: 2,
    fontWeight: typography.fontWeight.semiBold,
  },
  deleteButton: {
    backgroundColor: '#FFEBEE',
  },
});
