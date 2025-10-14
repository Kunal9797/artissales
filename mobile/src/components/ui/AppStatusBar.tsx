/**
 * AppStatusBar Component
 * Centralized StatusBar configuration with brand colors
 *
 * Edge-to-edge is enabled by default in SDK 54 / RN 0.81
 * This component ensures consistent status bar styling across the app
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { colors } from '../../theme';

interface AppStatusBarProps {
  /**
   * Background color of the status bar
   * Default: Brand primary color (#393735)
   */
  backgroundColor?: string;

  /**
   * Content style: 'light-content' or 'dark-content'
   * Default: 'light-content' (white icons/text on dark background)
   */
  barStyle?: 'light-content' | 'dark-content';

  /**
   * Whether the status bar is translucent (Android only)
   * Default: false
   */
  translucent?: boolean;
}

export const AppStatusBar: React.FC<AppStatusBarProps> = ({
  backgroundColor = colors.primary, // Brand background #393735
  barStyle = 'light-content',
  translucent = false,
}) => {
  return (
    <StatusBar
      backgroundColor={backgroundColor}
      barStyle={barStyle}
      translucent={translucent}
    />
  );
};
