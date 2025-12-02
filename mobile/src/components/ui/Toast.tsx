/**
 * Toast Component
 * Compact pill-style toast notifications with icon and color-coding
 * Positioned above bottom navigation bar
 */

import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated, AccessibilityInfo } from 'react-native';
import { Check, AlertCircle, Info, AlertTriangle, CloudOff } from 'lucide-react-native';

export interface ToastProps {
  /**
   * Toast kind - determines color and icon
   */
  kind: 'success' | 'error' | 'info' | 'warning' | 'offline';

  /**
   * Toast message text
   */
  text: string;

  /**
   * Callback when toast is dismissed (auto or manual)
   */
  onDismiss?: () => void;
}

// Compact color scheme for toast pills
const toastColors = {
  success: {
    bg: '#4CAF50',
    text: '#FFFFFF',
  },
  error: {
    bg: '#F44336',
    text: '#FFFFFF',
  },
  warning: {
    bg: '#FF9800',
    text: '#FFFFFF',
  },
  info: {
    bg: '#2196F3',
    text: '#FFFFFF',
  },
  offline: {
    bg: '#757575',
    text: '#FFFFFF',
  },
};

export function Toast({ kind, text, onDismiss }: ToastProps) {
  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide up and fade in
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Announce toast text to screen reader (TalkBack/VoiceOver)
    AccessibilityInfo.announceForAccessibility(text);
  }, [text]);

  const colors = toastColors[kind] || toastColors.info;

  // Get icon based on kind
  const renderIcon = () => {
    const iconProps = { size: 16, color: colors.text, strokeWidth: 2.5 };

    switch (kind) {
      case 'success':
        return <Check {...iconProps} />;
      case 'error':
        return <AlertCircle {...iconProps} />;
      case 'warning':
        return <AlertTriangle {...iconProps} />;
      case 'info':
        return <Info {...iconProps} />;
      case 'offline':
        return <CloudOff {...iconProps} />;
      default:
        return <Check {...iconProps} />;
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.bg,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      {renderIcon()}
      <Text style={[styles.text, { color: colors.text }]} numberOfLines={1}>
        {text}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
});
