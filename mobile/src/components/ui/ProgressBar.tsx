/**
 * ProgressBar Component
 * Linear horizontal progress indicator
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing } from '../../theme';

export interface ProgressBarProps {
  /**
   * Progress value between 0 and 1 (0% to 100%)
   */
  value: number;

  /**
   * Track (background) color
   */
  trackColor?: string;

  /**
   * Bar (fill) color
   */
  barColor?: string;

  /**
   * Height of the progress bar in pixels
   */
  height?: number;

  /**
   * Additional styles for the container
   */
  style?: ViewStyle;
}

export function ProgressBar({
  value,
  trackColor = colors.border.light,
  barColor = colors.primary,
  height = 4,
  style,
}: ProgressBarProps) {
  // Clamp value between 0 and 1
  const progress = Math.max(0, Math.min(1, value));
  const progressPercentage = `${progress * 100}%`;

  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor: trackColor,
          height,
          borderRadius: height / 2,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.bar,
          {
            width: progressPercentage as any, // TypeScript doesn't recognize % strings but RN does
            backgroundColor: barColor,
            height,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  bar: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
