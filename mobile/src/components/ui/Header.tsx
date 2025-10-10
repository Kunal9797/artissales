/**
 * Header Component
 * Standard header with optional logo and actions
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
} from 'react-native';
import { colors, typography, spacing } from '../../theme';
import { Logo } from './Logo';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showLogo?: boolean;
  rightAction?: {
    icon: string;
    onPress: () => void;
    label?: string;
  };
  style?: ViewStyle;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showLogo = false,
  rightAction,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          {showLogo && (
            <Logo variant="icon-light" size="small" />
          )}
          <View>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
        </View>

        {rightAction && (
          <Pressable
            onPress={rightAction.onPress}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionButtonPressed,
            ]}
          >
            <Text style={styles.actionIcon}>{rightAction.icon}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
    paddingTop: 60, // Account for status bar
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.screenPadding,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  title: {
    ...typography.styles.h2,
    color: colors.text.inverse,
    marginBottom: spacing.xs / 2,
  },
  subtitle: {
    ...typography.styles.body,
    color: colors.text.inverse,
    opacity: 0.9,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: spacing.borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  actionIcon: {
    fontSize: typography.fontSize['2xl'],
  },
});
