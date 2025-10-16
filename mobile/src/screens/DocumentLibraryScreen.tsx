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
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FileText, Image as ImageIcon, Download, Trash2, Plus, CheckCircle, HardDrive, Share2 } from 'lucide-react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
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

  const handleShareDocument = async (document: Document) => {
    try {
      // Get cached document
      const cachedDoc = await documentCache.getCachedDocument(document.id);
      if (!cachedDoc) {
        Alert.alert('Error', 'Document not available offline. Please download it first.');
        return;
      }

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }

      // Share the document using the file:// URI (expo-sharing requires file:// not content://)
      await Sharing.shareAsync(cachedDoc.localUri, {
        mimeType: cachedDoc.mimeType,
        dialogTitle: `Share ${document.name}`,
        UTI: cachedDoc.mimeType === 'application/pdf' ? 'com.adobe.pdf' : undefined,
      });
    } catch (err: any) {
      console.error('Error sharing document:', err);
      if (!err.message?.includes('cancelled')) {
        Alert.alert('Share Failed', 'Could not share document. Please try again.');
      }
    }
  };

  const handleOpenDocument = async (document: Document) => {
    try {
      // Check if document is cached
      const cachedDoc = await documentCache.getCachedDocument(document.id);

      if (cachedDoc) {
        console.log('Opening cached document:', cachedDoc.localUri);

        // Open cached document
        const contentUri = await documentCache.getContentUri(cachedDoc.localUri);
        console.log('Content URI:', contentUri);

        // Use platform-specific opening method
        if (Platform.OS === 'android') {
          // On Android, use IntentLauncher to explicitly open with chooser
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
            type: cachedDoc.mimeType,
          });
          console.log('File opened with IntentLauncher');
        } else {
          // On iOS, use Linking
          await Linking.openURL(contentUri);
          console.log('File opened with Linking');
        }
      } else {
        // Open from web (requires internet)
        console.log('Opening document from web:', document.fileUrl);
        await Linking.openURL(document.fileUrl);
      }
    } catch (err: any) {
      console.error('Error opening document:', err);

      // Check if it's a "no handler" error
      if (err?.message?.includes('No Activity found') || err?.message?.includes('no handler')) {
        Alert.alert(
          'No App Available',
          'Please install a PDF viewer app from Google Play Store to view documents offline.\n\nRecommended: Google PDF Viewer or Adobe Acrobat Reader',
          [
            { text: 'OK', style: 'default' },
          ]
        );
      } else {
        Alert.alert(
          'Error Opening File',
          err?.message || 'Failed to open document. Make sure you have a PDF viewer installed.'
        );
      }
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

  const formatDate = (dateValue: any): string => {
    if (!dateValue) {
      return 'Recently';
    }

    let date: Date;

    // Handle Firestore Timestamp object
    if (typeof dateValue === 'object' && '_seconds' in dateValue) {
      // Convert Firestore Timestamp to Date (seconds * 1000 to get milliseconds)
      date = new Date(dateValue._seconds * 1000);
    } else if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    } else if (typeof dateValue === 'number') {
      date = new Date(dateValue);
    } else {
      return 'Recently';
    }

    if (isNaN(date.getTime())) {
      return 'Recently';
    }

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
          <Text style={styles.documentName} numberOfLines={2}>
            {item.name}
          </Text>
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
          {/* Download/Cached Status Button */}
          {isCached ? (
            <>
              <View style={[styles.actionButton, styles.cachedButton]}>
                <CheckCircle size={20} color={colors.success} />
              </View>
              {/* Share Button */}
              <TouchableOpacity
                style={[styles.actionButton, styles.shareButton]}
                onPress={() => handleShareDocument(item)}
              >
                <Share2 size={20} color="#F57C00" />
              </TouchableOpacity>
            </>
          ) : isDownloading ? (
            <View style={[styles.actionButton, styles.downloadingButton]}>
              <View style={styles.progressContainer}>
                <ActivityIndicator size="small" color={colors.info} />
                {progress !== undefined && progress > 0 && (
                  <Text style={styles.progressText}>{progress}%</Text>
                )}
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDownloadDocument(item)}
            >
              <Download size={20} color={colors.info} />
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
    width: 40,
    height: 40,
    borderRadius: spacing.borderRadius.lg,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cachedButton: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  shareButton: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FFB74D',
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
