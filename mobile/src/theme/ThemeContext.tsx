/**
 * Theme Context
 * Manages light/dark mode with AsyncStorage persistence
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors, Colors } from './colors';

// Storage key for theme preference
const THEME_STORAGE_KEY = '@artis_theme_mode';

// Theme mode type
export type ThemeMode = 'light' | 'dark';

// Context value type
interface ThemeContextValue {
  mode: ThemeMode;
  colors: Colors;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

// Create context with default values
const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  colors: lightColors,
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {},
});

// Provider props
interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * Theme Provider Component
 * Wraps the app to provide theme context
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Default to light mode (user's choice: 5A - light mode default)
  const [mode, setMode] = useState<ThemeMode>('light');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme preference on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme === 'light' || savedTheme === 'dark') {
          setMode(savedTheme);
        }
        // If no saved preference, keep default (light)
      } catch (error) {
        console.warn('Failed to load theme preference:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadTheme();
  }, []);

  // Save theme preference when it changes
  const persistTheme = useCallback(async (newMode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
    }
  }, []);

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    setMode((current) => {
      const newMode = current === 'light' ? 'dark' : 'light';
      persistTheme(newMode);
      return newMode;
    });
  }, [persistTheme]);

  // Set specific theme
  const setTheme = useCallback((newMode: ThemeMode) => {
    setMode(newMode);
    persistTheme(newMode);
  }, [persistTheme]);

  // Get colors based on current mode
  const colors = useMemo(() => {
    return mode === 'dark' ? darkColors : lightColors;
  }, [mode]);

  // Context value
  const value = useMemo<ThemeContextValue>(() => ({
    mode,
    colors,
    isDark: mode === 'dark',
    toggleTheme,
    setTheme,
  }), [mode, colors, toggleTheme, setTheme]);

  // Don't render until theme is loaded to prevent flash
  // Actually, we'll render with default (light) immediately for better UX
  // The switch will happen quickly if user has dark mode saved

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Hook to access theme context
 * Returns current theme mode, colors, and toggle function
 */
export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

/**
 * Hook to get just the colors (common use case)
 * Shorthand for useTheme().colors
 */
export const useThemeColors = (): Colors => {
  const { colors } = useTheme();
  return colors;
};

/**
 * Hook to check if dark mode is active
 */
export const useIsDarkMode = (): boolean => {
  const { isDark } = useTheme();
  return isDark;
};
