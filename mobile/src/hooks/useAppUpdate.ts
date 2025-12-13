import { useState, useEffect } from 'react';
import { Linking } from 'react-native';
import { getFirestore, doc, getDoc } from '@react-native-firebase/firestore';
import Constants from 'expo-constants';
import { logger } from '../utils/logger';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.artis.sales';

interface AppConfig {
  minVersion: string;
  latestVersion: string;
  forceUpdate: boolean;
  updateMessage?: string;
}

interface UpdateState {
  checking: boolean;
  needsUpdate: boolean;
  forceUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  updateMessage: string;
}

/**
 * Compare two semver version strings
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;

    if (numA < numB) return -1;
    if (numA > numB) return 1;
  }

  return 0;
}

/**
 * Hook to check if the app needs to be updated
 * Runs on app launch, fetches config from Firestore
 */
export function useAppUpdate() {
  const [state, setState] = useState<UpdateState>({
    checking: true,
    needsUpdate: false,
    forceUpdate: false,
    currentVersion: '',
    latestVersion: '',
    updateMessage: '',
  });

  useEffect(() => {
    checkForUpdate();
  }, []);

  const checkForUpdate = async () => {
    try {
      const currentVersion = Constants.expoConfig?.version || '0.0.0';
      logger.log('[AppUpdate] Current app version:', currentVersion);

      const db = getFirestore();
      const configRef = doc(db, 'config', 'app');
      const configSnap = await getDoc(configRef);

      if (!configSnap.exists()) {
        logger.log('[AppUpdate] No config document found, skipping update check');
        setState((prev) => ({ ...prev, checking: false, currentVersion }));
        return;
      }

      const config = configSnap.data() as AppConfig;
      logger.log('[AppUpdate] Config:', config);

      const { minVersion, latestVersion, forceUpdate, updateMessage } = config;

      // Check if current version is below minimum (force update)
      const belowMinimum = compareVersions(currentVersion, minVersion) < 0;

      // Check if current version is below latest (soft update)
      const belowLatest = compareVersions(currentVersion, latestVersion) < 0;

      const needsUpdate = belowMinimum || belowLatest;
      const shouldForce = belowMinimum && forceUpdate;

      logger.log('[AppUpdate] Below minimum:', belowMinimum, '| Below latest:', belowLatest);
      logger.log('[AppUpdate] Needs update:', needsUpdate, '| Force:', shouldForce);

      setState({
        checking: false,
        needsUpdate,
        forceUpdate: shouldForce,
        currentVersion,
        latestVersion,
        updateMessage: updateMessage || 'A new version is available with improvements and bug fixes.',
      });
    } catch (error) {
      logger.error('[AppUpdate] Error checking for update:', error);
      setState((prev) => ({ ...prev, checking: false }));
    }
  };

  const openPlayStore = () => {
    Linking.openURL(PLAY_STORE_URL).catch((err) => {
      logger.error('[AppUpdate] Failed to open Play Store:', err);
    });
  };

  const dismissUpdate = () => {
    // Only allow dismiss for soft updates
    if (!state.forceUpdate) {
      setState((prev) => ({ ...prev, needsUpdate: false }));
    }
  };

  return {
    ...state,
    openPlayStore,
    dismissUpdate,
  };
}
