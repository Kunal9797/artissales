/**
 * Toast Component
 * Presentation component for toast notifications
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { roles, typography, spacing, shadows } from '../theme';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react-native';

export interface ToastProps {
  /**
   * Toast kind - maps to role colors
   */
  kind: 'success' | 'error' | 'info' | 'warning';

  /**
   * Toast message text
   */
  text: string;

  /**
   * Callback when dismiss button is pressed
   */
  onDismiss?: () => void;
}

export function Toast({ kind, text, onDismiss }: ToastProps) {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide up and fade in
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Map kind to role
  const roleKey = kind === 'warning' ? 'warn' : kind;
  const role = roles[roleKey];

  // Get icon based on kind
  const renderIcon = () => {
    const iconProps = { size: 20, color: role.text };

    switch (kind) {
      case 'success':
        return <CheckCircle {...iconProps} />;
      case 'error':
        return <AlertCircle {...iconProps} />;
      case 'warning':
        return <AlertTriangle {...iconProps} />;
      case 'info':
        return <Info {...iconProps} />;
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: role.bg,
          borderColor: role.border,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
        shadows.md,
      ]}
    >
      <View style={styles.iconContainer}>{renderIcon()}</View>

      <Text style={[styles.text, { color: role.text }]} numberOfLines={3}>
        {text}
      </Text>

      {onDismiss && (
        <Pressable onPress={onDismiss} style={styles.dismissButton} hitSlop={8}>
          <X size={18} color={role.text} />
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
    minHeight: 56,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    ...typography.styles.body,
    flex: 1,
    fontWeight: '500',
  },
  dismissButton: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xs / 2,
  },
});
