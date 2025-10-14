/**
 * Design Lab Screen (Dev-only)
 * Live theme token editor with real-time preview
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Header, Button, Card } from '../components/ui';
import { colors, typography, spacing, shadows, states } from '../theme';
import type { RoleKey } from '../theme';
import { useThemeOverrides } from '../theme/runtime';
import {
  serializeThemeOverrides,
  isValidHex,
  validateContrast,
  generateContrastReport,
} from '../theme/serialize';
import { CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react-native';

interface DesignLabScreenProps {
  navigation: any;
}

export const DesignLabScreen: React.FC<DesignLabScreenProps> = ({ navigation }) => {
  const { overrides, setOverrides, resetOverrides, mergedTokens } = useThemeOverrides();
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  // Local state for input values
  const [roleInputs, setRoleInputs] = useState<Record<string, Record<string, string>>>({});

  // Update role color
  const updateRoleColor = (role: RoleKey, key: 'base' | 'bg' | 'text' | 'border', value: string) => {
    const trimmed = value.trim();

    // Update local input state
    setRoleInputs((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [key]: trimmed,
      },
    }));

    // Only update overrides if valid hex
    if (isValidHex(trimmed) || trimmed === '') {
      setOverrides({
        ...overrides,
        roles: {
          ...overrides.roles,
          [role]: {
            ...(overrides.roles?.[role] || {}),
            [key]: trimmed || undefined,
          },
        },
      });
    }
  };

  // Update spacing unit
  const updateSpacingUnit = (value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0 && num <= 3) {
      setOverrides({
        ...overrides,
        spacing: { unit: num },
      });
    }
  };

  // Update border radius multiplier
  const updateBorderRadius = (value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0 && num <= 3) {
      setOverrides({
        ...overrides,
        borderRadius: { multiplier: num },
      });
    }
  };

  // Update typography scale
  const updateTypeScale = (value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0 && num <= 2) {
      setOverrides({
        ...overrides,
        typography: { scaleMultiplier: num },
      });
    }
  };

  // Export to clipboard (show in alert instead - no native clipboard needed)
  const handleExport = () => {
    const json = serializeThemeOverrides(overrides);

    // Show JSON in alert with scrollable view
    Alert.alert(
      'Theme Overrides JSON',
      'Copy this manually:\n\n' + json,
      [{ text: 'OK' }]
    );

    setCopiedToClipboard(true);
    setTimeout(() => setCopiedToClipboard(false), 2000);
  };

  // Reset all overrides
  const handleReset = () => {
    Alert.alert('Reset Theme?', 'This will reset all custom values to defaults.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          resetOverrides();
          setRoleInputs({});
        },
      },
    ]);
  };

  // Generate contrast warnings
  const contrastWarnings = generateContrastReport(overrides);

  return (
    <View style={styles.container}>
      <Header
        title="Design Lab"
        subtitle="Live Theme Editor (Dev Only)"
        showLogo={false}
        rightAction={{
          icon: '✕',
          onPress: () => navigation.goBack(),
        }}
      />

      <View style={styles.content}>
        {/* Left: Controls */}
        <ScrollView style={styles.leftPanel} contentContainerStyle={styles.leftPanelContent}>
          {/* Global Controls */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Global Settings</Text>

            <View style={styles.controlRow}>
              <Text style={styles.label}>Spacing Unit</Text>
              <TextInput
                style={styles.numericInput}
                keyboardType="decimal-pad"
                placeholder="1.0"
                value={overrides.spacing?.unit?.toString() || ''}
                onChangeText={updateSpacingUnit}
              />
            </View>

            <View style={styles.controlRow}>
              <Text style={styles.label}>Border Radius</Text>
              <TextInput
                style={styles.numericInput}
                keyboardType="decimal-pad"
                placeholder="1.0"
                value={overrides.borderRadius?.multiplier?.toString() || ''}
                onChangeText={updateBorderRadius}
              />
            </View>

            <View style={styles.controlRow}>
              <Text style={styles.label}>Type Scale</Text>
              <TextInput
                style={styles.numericInput}
                keyboardType="decimal-pad"
                placeholder="1.0"
                value={overrides.typography?.scaleMultiplier?.toString() || ''}
                onChangeText={updateTypeScale}
              />
            </View>
          </View>

          {/* Role Token Controls */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Role Tokens</Text>

            {(['success', 'warn', 'error', 'info', 'neutral', 'primary', 'accent'] as RoleKey[]).map(
              (role) => (
                <View key={role} style={styles.roleControl}>
                  <Text style={styles.roleTitle}>{role}</Text>

                  {(['base', 'bg', 'text', 'border'] as const).map((colorKey) => {
                    const currentValue =
                      roleInputs[role]?.[colorKey] ||
                      overrides.roles?.[role]?.[colorKey] ||
                      mergedTokens.roles[role][colorKey];

                    return (
                      <View key={colorKey} style={styles.colorControl}>
                        <View style={styles.colorInputRow}>
                          <Text style={styles.colorLabel}>{colorKey}</Text>
                          <View
                            style={[
                              styles.colorSwatch,
                              {
                                backgroundColor: isValidHex(currentValue)
                                  ? currentValue
                                  : '#ccc',
                              },
                            ]}
                          />
                          <TextInput
                            style={[
                              styles.hexInput,
                              !isValidHex(currentValue) &&
                                currentValue !== '' && {
                                  borderColor: colors.error,
                                  borderWidth: 1,
                                },
                            ]}
                            placeholder="#000000"
                            value={currentValue}
                            onChangeText={(value) => updateRoleColor(role, colorKey, value)}
                            autoCapitalize="none"
                            autoCorrect={false}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )
            )}
          </View>

          {/* Contrast Warnings */}
          {contrastWarnings.length > 0 && (
            <View style={styles.warningsSection}>
              <Text style={styles.warningsTitle}>⚠️ Contrast Warnings</Text>
              {contrastWarnings.map((warning, idx) => (
                <Text key={idx} style={styles.warningText}>
                  {warning}
                </Text>
              ))}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button onPress={handleReset} variant="outline" size="small" style={{ flex: 1 }}>
              Reset
            </Button>
            <Button onPress={handleExport} variant="primary" size="small" style={{ flex: 1 }}>
              {copiedToClipboard ? '✓ Copied' : 'Export JSON'}
            </Button>
          </View>
        </ScrollView>

        {/* Right: Preview */}
        <ScrollView style={styles.rightPanel} contentContainerStyle={styles.rightPanelContent}>
          <Text style={styles.previewTitle}>Live Preview</Text>

          {/* Badge Variants */}
          <View style={styles.previewSection}>
            <Text style={styles.previewSectionTitle}>Badges</Text>
            <View style={styles.badgeGrid}>
              {(['success', 'warn', 'error', 'info'] as const).map((role) => (
                <View
                  key={role}
                  style={[
                    styles.badge,
                    {
                      backgroundColor: mergedTokens.roles[role].bg,
                      borderColor: mergedTokens.roles[role].border,
                    },
                  ]}
                >
                  {role === 'success' && (
                    <CheckCircle size={12} color={mergedTokens.roles[role].text} />
                  )}
                  {role === 'error' && (
                    <AlertCircle size={12} color={mergedTokens.roles[role].text} />
                  )}
                  {role === 'warn' && (
                    <AlertTriangle size={12} color={mergedTokens.roles[role].text} />
                  )}
                  {role === 'info' && <Info size={12} color={mergedTokens.roles[role].text} />}
                  <Text style={[styles.badgeText, { color: mergedTokens.roles[role].text }]}>
                    {role}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Spinners */}
          <View style={styles.previewSection}>
            <Text style={styles.previewSectionTitle}>Spinners</Text>
            <View style={styles.spinnerRow}>
              <ActivityIndicator size="small" color={mergedTokens.roles.primary.base} />
              <ActivityIndicator size="large" color={mergedTokens.roles.primary.base} />
              <ActivityIndicator size="small" color={mergedTokens.roles.accent.base} />
            </View>
          </View>

          {/* Progress Bars */}
          <View style={styles.previewSection}>
            <Text style={styles.previewSectionTitle}>Progress Bars</Text>
            {[0.25, 0.5, 0.75].map((progress) => (
              <View key={progress} style={styles.progressBarContainer}>
                <View style={[styles.progressBarBg, { borderRadius: mergedTokens.spacing.borderRadius.sm }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${progress * 100}%`,
                        backgroundColor: mergedTokens.roles.primary.base,
                        borderRadius: mergedTokens.spacing.borderRadius.sm,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressLabel}>{Math.round(progress * 100)}%</Text>
              </View>
            ))}
          </View>

          {/* Button States */}
          <View style={styles.previewSection}>
            <Text style={styles.previewSectionTitle}>Button States</Text>

            <Pressable
              style={({ pressed }) => [
                styles.previewButton,
                { backgroundColor: mergedTokens.roles.primary.base },
                pressed && { opacity: states.pressed.opacity },
              ]}
            >
              <Text style={styles.previewButtonText}>Press Me</Text>
            </Pressable>

            <View
              style={[
                styles.previewButton,
                {
                  backgroundColor: mergedTokens.roles.primary.base,
                  opacity: states.disabled.opacity,
                },
              ]}
            >
              <Text style={styles.previewButtonText}>Disabled</Text>
            </View>
          </View>

          {/* Cards with Typography */}
          <View style={styles.previewSection}>
            <Text style={styles.previewSectionTitle}>Cards & Typography</Text>

            <Card elevation="md">
              <Text
                style={[
                  mergedTokens.typography.styles.h3,
                  { marginBottom: mergedTokens.spacing.sm },
                ]}
              >
                Card Header
              </Text>
              <Text style={mergedTokens.typography.styles.body}>
                This is body text inside a card. It should be legible and properly sized according
                to the type scale multiplier.
              </Text>
              <Text style={[mergedTokens.typography.styles.caption, { marginTop: mergedTokens.spacing.xs }]}>
                Caption text for additional details
              </Text>
            </Card>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },

  // Left Panel (Controls)
  leftPanel: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: colors.border.default,
    backgroundColor: colors.surface,
  },
  leftPanelContent: {
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.styles.h4,
    marginBottom: spacing.md,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.styles.body,
    flex: 1,
  },
  numericInput: {
    ...typography.styles.body,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: spacing.borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    width: 80,
    textAlign: 'center',
  },

  // Role Controls
  roleControl: {
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  roleTitle: {
    ...typography.styles.label,
    marginBottom: spacing.xs,
    textTransform: 'capitalize',
  },
  colorControl: {
    marginBottom: spacing.xs / 2,
  },
  colorInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  colorLabel: {
    ...typography.styles.caption,
    width: 50,
    fontSize: 11,
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: spacing.borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  hexInput: {
    ...typography.styles.caption,
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: spacing.borderRadius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs / 2,
    fontFamily: 'monospace',
    fontSize: 11,
  },

  // Warnings
  warningsSection: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.warningLight,
    borderRadius: spacing.borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  warningsTitle: {
    ...typography.styles.label,
    color: colors.warning,
    marginBottom: spacing.xs,
  },
  warningText: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginBottom: spacing.xs / 2,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  // Right Panel (Preview)
  rightPanel: {
    flex: 1,
  },
  rightPanelContent: {
    padding: spacing.md,
  },
  previewTitle: {
    ...typography.styles.h3,
    marginBottom: spacing.lg,
  },
  previewSection: {
    marginBottom: spacing.lg,
  },
  previewSectionTitle: {
    ...typography.styles.label,
    marginBottom: spacing.sm,
    color: colors.text.secondary,
  },

  // Badge Preview
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadius.sm,
    borderWidth: 1,
  },
  badgeText: {
    ...typography.styles.caption,
    fontSize: 11,
    textTransform: 'capitalize',
  },

  // Spinner Preview
  spinnerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },

  // Progress Bar Preview
  progressBarContainer: {
    marginBottom: spacing.sm,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.border.light,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  progressLabel: {
    ...typography.styles.caption,
    marginTop: spacing.xs / 2,
    color: colors.text.tertiary,
  },

  // Button Preview
  previewButton: {
    padding: spacing.md,
    borderRadius: spacing.borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  previewButtonText: {
    ...typography.styles.button,
    color: colors.text.inverse,
  },
});
