/**
 * Skeleton Pattern
 * Animated loading placeholder (no shimmer lib, just opacity loop)
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { colors, spacing } from '../theme';

export interface SkeletonProps {
  /** Number of rows */
  rows?: number;
  /** Show avatar */
  avatar?: boolean;
  /** Card layout */
  card?: boolean;
  /** Full width (ignores parent padding) */
  fullWidth?: boolean;
  /** Custom width for inline skeleton */
  width?: number | string;
  /** Custom height for inline skeleton */
  height?: number;
  /** Custom styles */
  style?: ViewStyle;
}

export function Skeleton({ rows = 3, avatar = false, card = false, fullWidth = false, width, height, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [opacity]);

  // Inline skeleton with custom width/height
  if (width !== undefined || height !== undefined) {
    return (
      <Animated.View
        style={[
          styles.inlineSkeleton,
          { width: width ?? '100%', height: height ?? 16 },
          { opacity },
          style as any,
        ]}
      />
    );
  }

  if (card) {
    console.log('[Skeleton] Rendering card with fullWidth:', fullWidth);
    console.log('[Skeleton] Using style:', fullWidth ? 'fullWidthCard' : 'card');
    return (
      <View style={[fullWidth ? styles.fullWidthCard : styles.card, style]}>
        <Animated.View style={[styles.cardImage, { opacity }]} />
        <View style={styles.cardContent}>
          <Animated.View style={[styles.line, styles.lineTitle, { opacity }]} />
          <Animated.View style={[styles.line, styles.lineShort, { opacity }]} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {avatar && (
        <Animated.View style={[styles.avatar, { opacity }]} />
      )}
      <View style={styles.content}>
        {Array.from({ length: rows }).map((_, index) => (
          <Animated.View
            key={index}
            style={[
              styles.line,
              index === 0 && styles.lineTitle,
              index === rows - 1 && styles.lineShort,
              { opacity },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inlineSkeleton: {
    backgroundColor: colors.border.default,
    borderRadius: spacing.borderRadius.sm,
  },
  container: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.md,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.border.default,
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  line: {
    height: 12,
    backgroundColor: colors.border.default,
    borderRadius: spacing.borderRadius.sm,
    marginBottom: spacing.sm,
  },
  lineTitle: {
    width: '60%',
    height: 16,
  },
  lineShort: {
    width: '40%',
    marginBottom: 0,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  fullWidthCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
    width: '100%',
  },
  cardImage: {
    height: 120,
    backgroundColor: colors.border.default,
  },
  cardContent: {
    padding: spacing.md,
  },
});
