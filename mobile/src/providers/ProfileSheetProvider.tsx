/**
 * ProfileSheetProvider
 * Global context to show/hide the profile bottom sheet from anywhere in the app
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ProfileSheet } from '../components/ProfileSheet';

interface ProfileSheetContextValue {
  showProfileSheet: () => void;
  hideProfileSheet: () => void;
  isVisible: boolean;
}

const ProfileSheetContext = createContext<ProfileSheetContextValue>({
  showProfileSheet: () => {},
  hideProfileSheet: () => {},
  isVisible: false,
});

export function useProfileSheet() {
  return useContext(ProfileSheetContext);
}

interface ProfileSheetProviderProps {
  children: ReactNode;
}

export function ProfileSheetProvider({ children }: ProfileSheetProviderProps) {
  const [visible, setVisible] = useState(false);

  const showProfileSheet = useCallback(() => {
    setVisible(true);
  }, []);

  const hideProfileSheet = useCallback(() => {
    setVisible(false);
  }, []);

  const value: ProfileSheetContextValue = {
    showProfileSheet,
    hideProfileSheet,
    isVisible: visible,
  };

  return (
    <ProfileSheetContext.Provider value={value}>
      {children}
      {/* Only render ProfileSheet when visible to avoid SafeAreaProvider issues */}
      {visible && <ProfileSheet visible={visible} onClose={hideProfileSheet} />}
    </ProfileSheetContext.Provider>
  );
}
