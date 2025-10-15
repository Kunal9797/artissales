import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FileText, Image as ImageIcon, Trash2, HardDrive } from 'lucide-react-native';
import { colors, spacing, typography } from '../theme';
import { EmptyState } from '../patterns';
import { documentCache, CachedDocument } from '../services/documentCache';

type ManageDownloadsScreenProps = NativeStackScreenProps<any, 'ManageDownloads'>;

export const ManageDownloadsScreen: React.FC<ManageDownloadsScreenProps> = ({ navigation, route }) => {
  const [cachedDocs, setCachedDocs] = useState<CachedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [totalSize, setTotalSize] = useState(0);

  const onDelete = route.params?.onDelete;

  useEffect(() => {
    loadCachedDocuments();
  }, []);

  const loadCachedDocuments = async () => {
    try {
      setLoading(true);
      const docs = await documentCache.listCachedDocuments();
      setCachedDocs(docs);

      const size = await documentCache.getTotalCacheSize();
      setTotalSize(size);
    } catch (err) {
      console.error('Error loading cached documents:', err);
      Alert.alert('Error', 'Failed to load cached documents');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleOpenDocument = async (doc: CachedDocument) => {
    try {
      const contentUri = await documentCache.getContentUri(doc.localUri);
      const supported = await Linking.canOpenURL(contentUri);
      if (supported) {
        await Linking.openURL(contentUri);
      } else {
        Alert.alert('Error', 'Cannot open this file type');
      }
    } catch (err) {
      console.error('Error opening document:', err);
      Alert.alert('Error', 'Failed to open document');
    }
  };

  const handleDeleteDocument = (doc: CachedDocument) => {
    Alert.alert(
      'Delete Offline Copy',
      `Remove "${doc.fileName}" from offline storage?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(doc.documentId);
              await documentCache.deleteCachedDocument(doc.documentId);
              setCachedDocs((prev) => prev.filter((d) => d.documentId !== doc.documentId));
              setTotalSize((prev) => prev - doc.fileSize);

              // Notify parent screen
              if (onDelete) {
                onDelete();
              }
            } catch (err) {
              console.error('Error deleting document:', err);
              Alert.alert('Error', 'Failed to delete offline copy');
            } finally {
              setDeleting(null);
            }
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
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
              setLoading(true);
              await documentCache.clearAllCache();
              setCachedDocs([]);
              setTotalSize(0);

              // Notify parent screen
              if (onDelete) {
                onDelete();
              }

              Alert.alert('Success', 'All offline documents cleared');
            } catch (err) {
              console.error('Error clearing cache:', err);
              Alert.alert('Error', 'Failed to clear offline documents');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderDocument = ({ item }: { item: CachedDocument }) => {
    const isDeleting = deleting === item.documentId;
    const isPdf = item.mimeType === 'application/pdf';

    return (
      <TouchableOpacity
        style={styles.documentCard}
        onPress={() => handleOpenDocument(item)}
        activeOpacity={0.7}
        disabled={isDeleting}
      >
        <View style={styles.documentIcon}>
          {isPdf ? (
            <FileText size={32} color={colors.error} />
          ) : (
            <ImageIcon size={32} color={colors.info} />
          )}
        </View>

        <View style={styles.documentInfo}>
          <Text style={styles.documentName} numberOfLines={2}>
            {item.fileName}
          </Text>
          <Text style={styles.documentMeta}>
            {formatFileSize(item.fileSize)} • Downloaded {formatDate(item.downloadedAt)}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.deleteButton, isDeleting && styles.deletingButton]}
          onPress={() => handleDeleteDocument(item)}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <Trash2 size={20} color={colors.error} />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (cachedDocs.length === 0) return null;

    return (
      <View style={styles.footer}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total Storage Used</Text>
          <Text style={styles.totalSize}>{formatFileSize(totalSize)}</Text>
        </View>

        <TouchableOpacity style={styles.clearAllButton} onPress={handleClearAll}>
          <Text style={styles.clearAllText}>Clear All Downloads</Text>
        </TouchableOpacity>

        {totalSize > 100 * 1024 * 1024 && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>
              ⚠️ {totalSize > 500 * 1024 * 1024 ? 'Consider clearing old documents' : 'Using significant storage'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Offline Documents</Text>
        <Text style={styles.subtitle}>
          {cachedDocs.length} {cachedDocs.length === 1 ? 'document' : 'documents'} available offline
        </Text>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading offline documents...</Text>
        </View>
      ) : cachedDocs.length === 0 ? (
        <EmptyState
          icon={<HardDrive size={48} color={colors.text.tertiary} />}
          title="No offline documents"
          subtitle="Download documents from the library to access them offline"
          primaryAction={{
            label: 'Go to Documents',
            onPress: () => navigation.goBack(),
          }}
        />
      ) : (
        <FlatList
          data={cachedDocs}
          renderItem={renderDocument}
          keyExtractor={(item) => item.documentId}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={renderFooter}
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
  backButton: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.accent,
    marginBottom: spacing.md,
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
    alignItems: 'center',
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
  documentName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  documentMeta: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  deletingButton: {
    opacity: 0.5,
  },
  footer: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  totalLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  totalSize: {
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
