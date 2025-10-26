/**
 * Firebase Storage Service
 * Handles photo uploads to Firebase Storage
 * Using modular Firebase API (v23+)
 */

import { getStorage, ref, putFile, getDownloadURL, deleteObject } from '@react-native-firebase/storage';
import { getAuth } from '@react-native-firebase/auth';
import * as ImageManipulator from 'expo-image-manipulator';
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
