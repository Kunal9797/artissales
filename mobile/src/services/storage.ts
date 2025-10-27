/**
 * Firebase Storage Service
 * Handles photo uploads to Firebase Storage
 * Using modular Firebase API (v23+)
 */

import { getStorage, ref, putFile, getDownloadURL, deleteObject } from '@react-native-firebase/storage';
import { getAuth } from '@react-native-firebase/auth';
import * as ImageManipulator from 'expo-image-manipulator';
import { copyAsync, deleteAsync, documentDirectory } from 'expo-file-system/legacy';
import { File } from 'expo-file-system';
import { logger } from '../utils/logger';

/**
 * Compress image before uploading
 * Reduces size to max 1024px width/height and JPEG quality 80%
 */
async function compressImage(uri: string): Promise<string> {
  try {
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }], // Resize to max 1024px width (maintains aspect ratio)
      {
        compress: 0.8, // 80% quality
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    return manipulatedImage.uri;
  } catch (error) {
    logger.error('[Storage] Error compressing image:', error);
    // Return original URI if compression fails
    return uri;
  }
}

/**
 * Upload photo to Firebase Storage
 * Path: visits/{userId}/{timestamp}.jpg
 *
 * @param photoUri - Local file URI (from camera or gallery)
 * @param folder - Storage folder (e.g., 'visits', 'expenses')
 * @returns Download URL of uploaded photo
 */
export async function uploadPhoto(
  photoUri: string,
  folder: 'visits' | 'expenses' = 'visits'
): Promise<string> {
  try {
    const authInstance = getAuth();
    const user = authInstance.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    logger.debug('Storage', 'Compressing image...');
    const compressedUri = await compressImage(photoUri);
    logger.debug('Storage', 'Compression complete');

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}.jpg`;
    const storagePath = `${folder}/${user.uid}/${filename}`;

    logger.debug('Storage', `Uploading to: ${storagePath}`);

    // Upload to Firebase Storage using modular API
    const storage = getStorage();
    const storageRef = ref(storage, storagePath);

    // putFile returns a Task - we need to wait for it to complete
    const uploadTask = putFile(storageRef, compressedUri);
    await uploadTask;

    // Get download URL
    const downloadUrl = await getDownloadURL(storageRef);
    logger.debug('Storage', `Upload complete: ${downloadUrl}`);

    return downloadUrl;
  } catch (error) {
    logger.error('[Storage] Upload error:', error);
    throw new Error('Failed to upload photo: ' + (error as Error).message);
  }
}

/**
 * Upload multiple photos
 * @param photoUris - Array of local file URIs
 * @param folder - Storage folder
 * @returns Array of download URLs
 */
export async function uploadPhotos(
  photoUris: string[],
  folder: 'visits' | 'expenses' = 'visits'
): Promise<string[]> {
  const uploadPromises = photoUris.map((uri) => uploadPhoto(uri, folder));
  return Promise.all(uploadPromises);
}

/**
 * Delete photo from Firebase Storage
 * @param downloadUrl - Full download URL of the photo
 */
export async function deletePhoto(downloadUrl: string): Promise<void> {
  try {
    const storage = getStorage();
    const reference = ref(storage, downloadUrl);
    await deleteObject(reference);
    logger.debug('Storage', `Photo deleted: ${downloadUrl}`);
  } catch (error) {
    logger.error('[Storage] Delete error:', error);
    throw new Error('Failed to delete photo: ' + (error as Error).message);
  }
}

/**
 * Compress profile photo
 * Smaller size for profile pics: 512x512px, 70% quality
 */
async function compressProfilePhoto(uri: string): Promise<string> {
  try {
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 512 } }], // Resize to max 512px width (maintains aspect ratio)
      {
        compress: 0.7, // 70% quality (smaller file size)
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    return manipulatedImage.uri;
  } catch (error) {
    logger.error('[Storage] Error compressing profile photo:', error);
    // Return original URI if compression fails
    return uri;
  }
}

/**
 * Upload profile photo to Firebase Storage
 * Path: profilePhotos/{userId}/profile.jpg
 *
 * @param photoUri - Local file URI (from camera or gallery)
 * @returns Download URL of uploaded profile photo
 */
export async function uploadProfilePhoto(photoUri: string): Promise<string> {
  try {
    const authInstance = getAuth();
    const user = authInstance.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    logger.debug('Storage', 'Compressing profile photo...');
    const compressedUri = await compressProfilePhoto(photoUri);
    logger.debug('Storage', 'Compression complete');

    // Fixed filename for profile photo (overwrite existing)
    const storagePath = `profilePhotos/${user.uid}/profile.jpg`;

    logger.debug('Storage', `Uploading profile photo to: ${storagePath}`);

    // Upload to Firebase Storage using modular API
    const storage = getStorage();
    const storageRef = ref(storage, storagePath);

    // putFile returns a Task - we need to wait for it to complete
    const uploadTask = putFile(storageRef, compressedUri);
    await uploadTask;

    // Get download URL
    const downloadUrl = await getDownloadURL(storageRef);
    logger.debug('Storage', `Profile photo upload complete: ${downloadUrl}`);

    return downloadUrl;
  } catch (error) {
    logger.error('[Storage] Profile photo upload error:', error);
    throw new Error('Failed to upload profile photo: ' + (error as Error).message);
  }
}

/**
 * Delete profile photo from Firebase Storage
 * Path: profilePhotos/{userId}/profile.jpg
 */
export async function deleteProfilePhoto(): Promise<void> {
  try {
    const authInstance = getAuth();
    const user = authInstance.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const storage = getStorage();
    const storagePath = `profilePhotos/${user.uid}/profile.jpg`;
    const storageRef = ref(storage, storagePath);

    await deleteObject(storageRef);
    logger.debug('Storage', `Profile photo deleted: ${storagePath}`);

    // Also delete local cache
    await deleteLocalProfilePhoto();
  } catch (error) {
    // If photo doesn't exist, that's okay (not an error)
    if ((error as any).code === 'storage/object-not-found') {
      logger.debug('Storage', 'Profile photo does not exist (already deleted)');
      await deleteLocalProfilePhoto(); // Still delete local cache
      return;
    }
    logger.error('[Storage] Delete profile photo error:', error);
    throw new Error('Failed to delete profile photo: ' + (error as Error).message);
  }
}

/**
 * Get local file path for cached profile photo
 */
function getLocalProfilePhotoPath(): string {
  const authInstance = getAuth();
  const user = authInstance.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return `${documentDirectory}profilePhoto_${user.uid}.jpg`;
}

/**
 * Save profile photo to local cache
 * @param photoUri - URI of compressed photo
 * @returns Local file URI
 */
export async function cacheProfilePhotoLocally(photoUri: string): Promise<string> {
  try {
    const localPath = getLocalProfilePhotoPath();
    await copyAsync({
      from: photoUri,
      to: localPath,
    });
    logger.debug('Storage', `Profile photo cached locally: ${localPath}`);
    return localPath;
  } catch (error) {
    logger.error('[Storage] Error caching profile photo locally:', error);
    throw error;
  }
}

/**
 * Get cached profile photo from local storage
 * @returns Local file URI if cached, null otherwise
 */
export async function getLocalProfilePhoto(): Promise<string | null> {
  try {
    const localPath = getLocalProfilePhotoPath();

    // Use new File API to check if file exists (exists is a property, not a method)
    const file = new File(localPath);

    if (file.exists) {
      logger.debug('Storage', `Profile photo found in local cache: ${localPath}`);
      return localPath;
    }

    logger.debug('Storage', 'No profile photo in local cache');
    return null;
  } catch (error) {
    logger.error('[Storage] Error checking local profile photo:', error);
    return null;
  }
}

/**
 * Delete cached profile photo from local storage
 */
export async function deleteLocalProfilePhoto(): Promise<void> {
  try {
    const localPath = getLocalProfilePhotoPath();

    // Use new File API to check and delete (exists is a property, not a method)
    const file = new File(localPath);

    if (file.exists) {
      await deleteAsync(localPath);
      logger.debug('Storage', `Local profile photo deleted: ${localPath}`);
    }
  } catch (error) {
    logger.error('[Storage] Error deleting local profile photo:', error);
    // Don't throw - this is not critical
  }
}
