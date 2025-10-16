/**
 * DocumentsScreen - Flat Documents List with Offline Section
 *
 * Shows:
 * - Offline Documents (top section)
 * - All Documents (flat list)
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import * as IntentLauncher from 'expo-intent-launcher';
import { Card } from '../components/ui';
import { colors, spacing, typography, featureColors } from '../theme';
import { api } from '../services/api';
import { documentCache, DownloadProgress } from '../services/documentCache';
import { Document } from '../types';
import {
  FileText,
  Folder,
  Download,
  CheckCircle,
} from 'lucide-react-native';

interface DocumentsScreenProps {
  navigation: any;
}

export const DocumentsScreen: React.FC<DocumentsScreenProps> = ({ navigation }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [cachedDocIds, setCachedDocIds] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [refreshing, setRefreshing] = useState(false);

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getDocuments();
      if (response.ok) {
        setDocuments(response.documents);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCachedDocuments = useCallback(async () => {
    try {
      const cachedDocs = await documentCache.listCachedDocuments();
      const cachedIds = new Set(cachedDocs.map(doc => doc.documentId));
      setCachedDocIds(cachedIds);
    } catch (error) {
      console.error('Error loading cached documents:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDocuments();
      loadCachedDocuments();
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
        (progress: DownloadProgress) => {
          const percent = Math.round(
            (progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 100
          );
          setDownloadProgress(prev => ({ ...prev, [document.id]: percent }));
        }
      );

      setCachedDocIds(prev => new Set(prev).add(document.id));
      Alert.alert('Success', `${document.name} is now available offline`);
    } catch (error) {
      console.error('Error downloading document:', error);
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
        console.log('Opening cached document:', cachedDoc.localUri);

        // Open cached document
        const contentUri = await documentCache.getContentUri(cachedDoc.localUri);
        console.log('Content URI:', contentUri);

        // Use platform-specific opening method
        if (Platform.OS === 'android') {
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
            type: cachedDoc.mimeType,
          });
          console.log('File opened with IntentLauncher');
        } else {
          await Linking.openURL(contentUri);
          console.log('File opened with Linking');
        }
      } else {
        // Open from web (requires internet)
        console.log('Opening document from web:', document.fileUrl);
        await Linking.openURL(document.fileUrl);
      }
    } catch (error: any) {
      console.error('Error opening document:', error);

      // Check if it's a "no handler" error
      if (error?.message?.includes('No Activity found') || error?.message?.includes('no handler')) {
        Alert.alert(
          'No App Available',
          'Please install a PDF viewer app from Google Play Store to view documents.\n\nRecommended: Google PDF Viewer or Adobe Acrobat Reader',
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        Alert.alert(
          'Error Opening File',
          error?.message || 'Failed to open document. Make sure you have a PDF viewer installed.'
        );
      }
    }
  };

  const offlineDocuments = documents.filter(doc => cachedDocIds.has(doc.id));
  const allDocuments = documents.filter(doc => !cachedDocIds.has(doc.id));

  const formatFileSize = (sizeInBytes: number): string => {
    if (sizeInBytes < 1024) return `${sizeInBytes} B`;
    if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateValue: any): string => {
    if (!dateValue) {
      return 'Recently';
    }

    let date: Date;

    // Handle Firestore Timestamp object
    if (typeof dateValue === 'object' && '_seconds' in dateValue) {
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Folder size={24} color={colors.text.inverse} />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Documents</Text>
            <Text style={styles.headerSubtitle}>
              {offlineDocuments.length} available offline
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
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
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading documents...</Text>
          </View>
        ) : (
          <>
            {/* Offline Documents Section */}
            {offlineDocuments.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <CheckCircle size={18} color={featureColors.attendance.primary} />
              <Text style={styles.sectionTitle}>Available Offline</Text>
            </View>
            <Card elevation="md" style={styles.documentList}>
              {offlineDocuments.map((doc, index) => (
                <TouchableOpacity
                  key={doc.id}
                  style={[
                    styles.documentItem,
                    index < offlineDocuments.length - 1 && styles.documentItemBorder,
                  ]}
                  onPress={() => handleOpenDocument(doc)}
                >
                  <View style={styles.documentIcon}>
                    <FileText size={20} color={featureColors.documents.primary} />
                  </View>
                  <View style={styles.documentContent}>
                    <Text style={styles.documentName} numberOfLines={1}>
                      {doc.name}
                    </Text>
                    <View style={styles.documentMeta}>
                      <Text style={styles.documentMetaText}>{formatFileSize(doc.fileSizeBytes)}</Text>
                      <View style={styles.metaDot} />
                      <Text style={styles.documentMetaText}>{formatDate(doc.uploadedAt)}</Text>
                    </View>
                  </View>
                  <CheckCircle size={18} color={featureColors.attendance.primary} />
                </TouchableOpacity>
              ))}
            </Card>
          </>
        )}

        {/* All Documents */}
        <View style={styles.sectionHeader}>
          <Folder size={18} color={colors.text.secondary} />
          <Text style={styles.sectionTitle}>All Documents</Text>
        </View>
        <Card elevation="sm" style={styles.documentList}>
          {allDocuments.map((doc, index) => (
            <TouchableOpacity
              key={doc.id}
              style={[
                styles.documentItem,
                index < allDocuments.length - 1 && styles.documentItemBorder,
              ]}
              onPress={() => {
                const isCached = cachedDocIds.has(doc.id);
                if (isCached) {
                  handleOpenDocument(doc);
                } else {
                  handleDownloadDocument(doc);
                }
              }}
              disabled={downloading === doc.id}
            >
              <View style={[
                styles.documentIcon,
                { backgroundColor: cachedDocIds.has(doc.id) ? featureColors.documents.light : colors.border.light }
              ]}>
                <FileText size={20} color={cachedDocIds.has(doc.id) ? featureColors.documents.primary : colors.text.tertiary} />
              </View>
              <View style={styles.documentContent}>
                <Text style={styles.documentName} numberOfLines={1}>
                  {doc.name}
                </Text>
                <View style={styles.documentMeta}>
                  <Text style={styles.documentMetaText}>{formatFileSize(doc.fileSizeBytes)}</Text>
                  <View style={styles.metaDot} />
                  <Text style={styles.documentMetaText}>{formatDate(doc.uploadedAt)}</Text>
                </View>
                {downloading === doc.id && downloadProgress[doc.id] !== undefined && (
                  <Text style={styles.downloadingText}>
                    Downloading... {downloadProgress[doc.id]}%
                  </Text>
                )}
              </View>
              {downloading === doc.id ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : cachedDocIds.has(doc.id) ? (
                <CheckCircle size={18} color={featureColors.attendance.primary} />
              ) : (
                <Download size={18} color={colors.text.tertiary} />
              )}
            </TouchableOpacity>
          ))}
        </Card>
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
  // Header
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: 52, // Status bar space
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.inverse,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.screenPadding,
    paddingBottom: 100, // Extra padding for floating nav bar
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    ...typography.styles.h4,
    color: colors.text.primary,
  },
  // Document List
  documentList: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  documentItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: featureColors.documents.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentContent: {
    flex: 1,
  },
  documentName: {
    ...typography.styles.body,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
    marginBottom: 4,
  },
  documentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  documentMetaText: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.text.tertiary,
  },
  downloadingText: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 4,
    fontWeight: typography.fontWeight.medium,
  },
});
