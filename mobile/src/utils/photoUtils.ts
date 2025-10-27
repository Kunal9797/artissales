/**
 * Photo Selection Utilities
 * Helper functions for selecting photos from camera or gallery
 */

import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { logger } from './logger';

/**
 * Select photo from camera
 * Handles permissions and returns photo URI or null if cancelled
 */
export async function selectPhotoFromCamera(): Promise<string | null> {
  try {
    // Request camera permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Camera permission is required to take photos. Please enable it in settings.'
      );
      return null;
    }

    // Launch camera
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1], // Square aspect ratio for profile photos
      quality: 0.8,
    });

    if (result.canceled) {
      return null;
    }

    return result.assets[0].uri;
  } catch (error) {
    logger.error('[PhotoUtils] Camera error:', error);
    Alert.alert('Error', 'Failed to take photo. Please try again.');
    return null;
  }
}

/**
 * Select photo from gallery
 * Handles permissions and returns photo URI or null if cancelled
 */
export async function selectPhotoFromGallery(): Promise<string | null> {
  try {
    // Request media library permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Photo library permission is required to select photos. Please enable it in settings.'
      );
      return null;
    }

    // Launch gallery
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1], // Square aspect ratio for profile photos
      quality: 0.8,
    });

    if (result.canceled) {
      return null;
    }

    return result.assets[0].uri;
  } catch (error) {
    logger.error('[PhotoUtils] Gallery error:', error);
    Alert.alert('Error', 'Failed to select photo. Please try again.');
    return null;
  }
}

/**
 * Show photo selection options modal
 * Returns selected photo URI or null if cancelled
 */
export async function selectPhoto(options: {
  title?: string;
  includeRemove?: boolean;
  onRemove?: () => void;
}): Promise<string | null> {
  const { title = 'Select Photo', includeRemove = false, onRemove } = options;

  return new Promise((resolve) => {
    const buttons: any[] = [
      {
        text: 'Take Photo',
        onPress: async () => {
          const uri = await selectPhotoFromCamera();
          resolve(uri);
        },
      },
      {
        text: 'Choose from Gallery',
        onPress: async () => {
          const uri = await selectPhotoFromGallery();
          resolve(uri);
        },
      },
    ];

    if (includeRemove && onRemove) {
      buttons.push({
        text: 'Remove Photo',
        style: 'destructive',
        onPress: () => {
          onRemove();
          resolve(null);
        },
      });
    }

    buttons.push({
      text: 'Cancel',
      style: 'cancel',
      onPress: () => resolve(null),
    });

    Alert.alert(title, undefined, buttons);
  });
}
