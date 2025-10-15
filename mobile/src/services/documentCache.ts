import { Paths, Directory, File } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_METADATA_KEY = '@document_cache_metadata';
const CACHE_DIR_NAME = 'documents';

export interface CachedDocument {
  documentId: string;
  localUri: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  downloadedAt: number; // timestamp
}

export interface DownloadProgress {
  totalBytesWritten: number;
  totalBytesExpectedToWrite: number;
}

class DocumentCacheService {
  private cacheDir: Directory;

  constructor() {
    // Initialize cache directory using new Paths API
    this.cacheDir = new Directory(Paths.document, CACHE_DIR_NAME);
  }

  /**
   * Ensure cache directory exists
   */
  private async ensureCacheDirectory(): Promise<void> {
    if (!(await this.cacheDir.exists())) {
      await this.cacheDir.create();
    }
  }

  /**
   * Get cache metadata from AsyncStorage
   */
  private async getCacheMetadata(): Promise<Record<string, CachedDocument>> {
    try {
      const metadata = await AsyncStorage.getItem(CACHE_METADATA_KEY);
      return metadata ? JSON.parse(metadata) : {};
    } catch (error) {
      console.error('Error reading cache metadata:', error);
      return {};
    }
  }

  /**
   * Save cache metadata to AsyncStorage
   */
  private async saveCacheMetadata(metadata: Record<string, CachedDocument>): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error('Error saving cache metadata:', error);
      throw error;
    }
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(fileName: string): string {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(fileName: string): string {
    const extension = this.getFileExtension(fileName).toLowerCase();
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };
    return mimeTypes[extension] || 'application/octet-stream';
  }

  /**
   * Download and cache a document
   * @param documentId Unique document ID
   * @param fileUrl Firebase Storage URL or web URL
   * @param fileName Original file name
   * @param onProgress Optional progress callback
   * @returns Local URI of downloaded file
   */
  async downloadDocument(
    documentId: string,
    fileUrl: string,
    fileName: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<string> {
    try {
      // Ensure cache directory exists
      await this.ensureCacheDirectory();

      // Generate local file path
      const fileExtension = this.getFileExtension(fileName);
      const localFileName = `${documentId}.${fileExtension}`;

      // Download file
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const fileSize = blob.size;

      // Create file in cache directory
      const file = new File(this.cacheDir, localFileName);

      // Write blob to file
      await file.create({
        binary: await blob.arrayBuffer(),
      });

      const localUri = file.uri;
      const mimeType = this.getMimeType(fileName);

      // Update cache metadata
      const metadata = await this.getCacheMetadata();
      metadata[documentId] = {
        documentId,
        localUri,
        fileName,
        fileSize,
        mimeType,
        downloadedAt: Date.now(),
      };

      await this.saveCacheMetadata(metadata);

      return localUri;
    } catch (error) {
      console.error('Error downloading document:', error);
      throw error;
    }
  }

  /**
   * Check if a document is cached
   */
  async isDocumentCached(documentId: string): Promise<boolean> {
    try {
      const metadata = await this.getCacheMetadata();
      const cachedDoc = metadata[documentId];

      if (!cachedDoc) {
        return false;
      }

      // Verify file still exists
      const file = new File(cachedDoc.localUri);
      const exists = await file.exists();

      if (!exists) {
        // Clean up stale metadata
        delete metadata[documentId];
        await this.saveCacheMetadata(metadata);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking document cache:', error);
      return false;
    }
  }

  /**
   * Get cached document info
   */
  async getCachedDocument(documentId: string): Promise<CachedDocument | null> {
    try {
      const metadata = await this.getCacheMetadata();
      const cachedDoc = metadata[documentId];

      if (!cachedDoc) {
        return null;
      }

      // Verify file still exists
      const file = new File(cachedDoc.localUri);
      const exists = await file.exists();

      if (!exists) {
        // Clean up stale metadata
        delete metadata[documentId];
        await this.saveCacheMetadata(metadata);
        return null;
      }

      return cachedDoc;
    } catch (error) {
      console.error('Error getting cached document:', error);
      return null;
    }
  }

  /**
   * Delete a cached document
   */
  async deleteCachedDocument(documentId: string): Promise<void> {
    try {
      const metadata = await this.getCacheMetadata();
      const cachedDoc = metadata[documentId];

      if (cachedDoc) {
        // Delete file
        const file = new File(cachedDoc.localUri);
        if (await file.exists()) {
          await file.delete();
        }

        // Remove from metadata
        delete metadata[documentId];
        await this.saveCacheMetadata(metadata);
      }
    } catch (error) {
      console.error('Error deleting cached document:', error);
      throw error;
    }
  }

  /**
   * List all cached documents
   */
  async listCachedDocuments(): Promise<CachedDocument[]> {
    try {
      const metadata = await this.getCacheMetadata();
      const cachedDocs: CachedDocument[] = [];
      const updatedMetadata: Record<string, CachedDocument> = {};

      // Verify each cached document still exists
      for (const [documentId, cachedDoc] of Object.entries(metadata)) {
        const file = new File(cachedDoc.localUri);
        if (await file.exists()) {
          cachedDocs.push(cachedDoc);
          updatedMetadata[documentId] = cachedDoc;
        }
      }

      // Save updated metadata (cleaned of stale entries)
      if (Object.keys(updatedMetadata).length !== Object.keys(metadata).length) {
        await this.saveCacheMetadata(updatedMetadata);
      }

      // Sort by download date (newest first)
      return cachedDocs.sort((a, b) => b.downloadedAt - a.downloadedAt);
    } catch (error) {
      console.error('Error listing cached documents:', error);
      return [];
    }
  }

  /**
   * Get total cache size in bytes
   */
  async getTotalCacheSize(): Promise<number> {
    try {
      const cachedDocs = await this.listCachedDocuments();
      return cachedDocs.reduce((total, doc) => total + doc.fileSize, 0);
    } catch (error) {
      console.error('Error calculating cache size:', error);
      return 0;
    }
  }

  /**
   * Clear all cached documents
   */
  async clearAllCache(): Promise<void> {
    try {
      // Delete cache directory
      if (await this.cacheDir.exists()) {
        await this.cacheDir.delete();
      }

      // Clear metadata
      await AsyncStorage.removeItem(CACHE_METADATA_KEY);

      // Recreate cache directory
      await this.ensureCacheDirectory();
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }

  /**
   * Get content URI for opening file with native apps
   * Returns the file URI directly - modern OS handles this
   */
  async getContentUri(localUri: string): Promise<string> {
    return localUri;
  }
}

// Export singleton instance
export const documentCache = new DocumentCacheService();
