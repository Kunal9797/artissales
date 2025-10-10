/**
 * Firebase Storage Service
 * Handles photo uploads to Firebase Storage
 */

import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from '@react-native-firebase/storage';
import { getAuth } from '@react-native-firebase/auth';
import * as ImageManipulator from 'expo-image-manipulator';

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
    console.error('Error compressing image:', error);
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

    console.log('[Storage] Compressing image...');
    const compressedUri = await compressImage(photoUri);
    console.log('[Storage] Compression complete');

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}.jpg`;
    const storagePath = `${folder}/${user.uid}/${filename}`;

    console.log('[Storage] Uploading to:', storagePath);

    // Convert local URI to blob for upload
    const response = await fetch(compressedUri);
    const blob = await response.blob();

    // Upload to Firebase Storage using modular API
    const storageInstance = getStorage();
    const storageRef = ref(storageInstance, storagePath);
    await uploadBytes(storageRef, blob);

    // Get download URL
    const downloadUrl = await getDownloadURL(storageRef);
    console.log('[Storage] Upload complete:', downloadUrl);

    return downloadUrl;
  } catch (error) {
    console.error('[Storage] Upload error:', error);
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
    const storageInstance = getStorage();
    const reference = ref(storageInstance, downloadUrl);
    await deleteObject(reference);
    console.log('[Storage] Photo deleted:', downloadUrl);
  } catch (error) {
    console.error('[Storage] Delete error:', error);
    throw new Error('Failed to delete photo: ' + (error as Error).message);
  }
}
