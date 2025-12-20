import React, { useState, useEffect } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, Save } from 'lucide-react-native';
import { colors, spacing, typography, useTheme } from '../../theme';
import { api } from '../../services/api';
import { TargetsByCatalog, TargetsByAccountType } from '../../types';
import { useBottomSafeArea } from '../../hooks/useBottomSafeArea';

type SetTargetParams = {
  userId: string;
  userName: string;
  currentMonth?: string;
  existingTarget?: any; // Pre-fetched target data from TeamStatsScreen
};

type SetTargetScreenProps = NativeStackScreenProps<{ SetTarget: SetTargetParams }, 'SetTarget'>;

const CATALOGS: Array<keyof TargetsByCatalog> = ['Fine Decor', 'Artvio', 'Woodrica', 'Artis 1MM'];
const ACCOUNT_TYPES: Array<keyof TargetsByAccountType> = ['dealer', 'architect', 'OEM'];

export const SetTargetScreen: React.FC<SetTargetScreenProps> = ({ navigation, route }) => {
  const { isDark, colors: themeColors } = useTheme();
  const { userId, userName, currentMonth, existingTarget: passedTarget } = route.params;
  const bottomPadding = useBottomSafeArea(12);

  const [month, setMonth] = useState<string>(currentMonth || getCurrentMonth());
  const [targets, setTargets] = useState<TargetsByCatalog>({});
  const [visitTargets, setVisitTargets] = useState<TargetsByAccountType>({});
  const [autoRenew, setAutoRenew] = useState(false);
  const [loading, setLoading] = useState(!passedTarget); // Skip loading if data passed
  const [saving, setSaving] = useState(false);
  const [existingTarget, setExistingTarget] = useState<any>(passedTarget || null);

  useEffect(() => {
    // If target data was passed, use it immediately
    if (passedTarget) {
      setExistingTarget(passedTarget);
      setTargets(passedTarget.targetsByCatalog || {});
      setVisitTargets(passedTarget.targetsByAccountType || {});
      setAutoRenew(passedTarget.autoRenew || false);
      setLoading(false);
    } else {
      // Only fetch if no data was passed
      loadExistingTarget();
    }
  }, [userId, month, passedTarget]);

  function getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  const loadExistingTarget = async () => {
    try {
      setLoading(true);
      const response = await api.getTarget({ userId, month });

      if (response.ok && response.target) {
        setExistingTarget(response.target);
        setTargets(response.target.targetsByCatalog || {});
        setVisitTargets(response.target.targetsByAccountType || {});
        setAutoRenew(response.target.autoRenew || false);
      } else {
        // No existing target
        setTargets({});
        setVisitTargets({});
        setAutoRenew(false);
        setExistingTarget(null);
      }
    } catch (error: any) {
      logger.error('[SetTarget] Error loading target:', error);
      Alert.alert('Error', 'Failed to load existing target');
    } finally {
      setLoading(false);
    }
  };

  const handleTargetChange = (catalog: keyof TargetsByCatalog, value: string) => {
    const numValue = value === '' ? undefined : parseInt(value, 10);
    setTargets(prev => ({
      ...prev,
      [catalog]: numValue,
    }));
  };

  const handleVisitTargetChange = (accountType: keyof TargetsByAccountType, value: string) => {
    const numValue = value === '' ? undefined : parseInt(value, 10);
    setVisitTargets(prev => ({
      ...prev,
      [accountType]: numValue,
    }));
  };

  const validateTargets = (): boolean => {
    const hasSheetTarget = Object.values(targets).some(v => v !== undefined && v > 0);
    const hasVisitTarget = Object.values(visitTargets).some(v => v !== undefined && v > 0);

    if (!hasSheetTarget && !hasVisitTarget) {
      Alert.alert('Error', 'Please set at least one target (sheets or visits)');
      return false;
    }

    // Check all defined sheet targets are > 0
    for (const [catalog, value] of Object.entries(targets)) {
      if (value !== undefined && (value <= 0 || !Number.isFinite(value))) {
        Alert.alert('Error', `Invalid target value for ${catalog}. Must be > 0`);
        return false;
      }
    }

    // Check all defined visit targets are > 0
    for (const [type, value] of Object.entries(visitTargets)) {
      if (value !== undefined && (value <= 0 || !Number.isFinite(value))) {
        const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
        Alert.alert('Error', `Invalid target value for ${capitalize(type)}. Must be > 0`);
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateTargets()) {
      return;
    }

    // If editing existing auto-renewed target, ask if should update future months
    if (existingTarget && existingTarget.autoRenew && existingTarget.sourceTargetId) {
      Alert.alert(
        'Update Target',
        'This target was auto-renewed. Do you want to update only this month or all future months?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Only This Month',
            onPress: () => saveTarget(false),
          },
          {
            text: 'All Future Months',
            onPress: () => saveTarget(true),
          },
        ]
      );
    } else {
      await saveTarget(false);
    }
  };

  const saveTarget = async (updateFutureMonths: boolean) => {
    try {
      setSaving(true);

      const response = await api.setTarget({
        userId,
        month,
        targetsByCatalog: targets,
        targetsByAccountType: visitTargets,
        autoRenew,
        updateFutureMonths,
      });

      if (response.ok) {
        Alert.alert(
          'Success',
          existingTarget ? 'Target updated successfully' : 'Target set successfully',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error: any) {
      logger.error('[SetTarget] Error saving target:', error);
      Alert.alert('Error', error.message || 'Failed to save target');
    } finally {
      setSaving(false);
    }
  };

  const handleStopAutoRenew = async () => {
    Alert.alert(
      'Stop Auto-Renew',
      'Are you sure you want to stop auto-renewing this target from next month onwards?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop Auto-Renew',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              const response = await api.stopAutoRenew({ userId, month });

              if (response.ok) {
                Alert.alert('Success', 'Auto-renew stopped successfully');
                setAutoRenew(false);
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to stop auto-renew');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: themeColors.background }}>
        <View style={{
          backgroundColor: isDark ? themeColors.surface : '#393735',
          paddingHorizontal: 24,
          paddingTop: 52,
          paddingBottom: 20,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}>
          <TouchableOpacity style={{ padding: 8, marginLeft: -8 }} onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 28, color: themeColors.accent }}>←</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 24, fontWeight: '600', color: '#FFFFFF' }}>Set Target</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.accent} />
          <Text style={[styles.loadingText, { color: themeColors.text.secondary }]}>Loading target...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      {/* Header - Dark style */}
      <View style={{
        backgroundColor: isDark ? themeColors.surface : '#393735',
        paddingHorizontal: 24,
        paddingTop: 52,
        paddingBottom: 20,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={{ padding: 8, marginLeft: -8 }}
            onPress={() => navigation.goBack()}
          >
            <Text style={{ fontSize: 28, color: themeColors.accent }}>←</Text>
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 }}>
              Set Target
            </Text>
            <Text style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.7)' }}>
              {userName}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 80 + bottomPadding }}>
        <View style={styles.content}>
          {/* Month Display - Compact horizontal */}
          <View style={[styles.monthCard, { backgroundColor: themeColors.surface, borderColor: themeColors.accent + '40' }]}>
            <Text style={[styles.monthLabel, { color: themeColors.text.secondary }]}>Target Month</Text>
            <Text style={[styles.monthValue, { color: themeColors.accent }]}>{formatMonth(month)}</Text>
          </View>

          {/* Sheet Sales Targets */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.text.secondary }]}>📊 SHEET SALES TARGETS</Text>
            <Text style={[styles.sectionSubtitle, { color: themeColors.text.secondary }]}>Set monthly sheet targets for each catalog</Text>

            {CATALOGS.map((catalog) => (
              <View key={catalog} style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: themeColors.text.primary }]}>{catalog}</Text>
                <View style={[styles.inputWrapper, { backgroundColor: themeColors.surface, borderColor: themeColors.border.default }]}>
                  <TextInput
                    style={[styles.input, { color: themeColors.text.primary }]}
                    value={targets[catalog]?.toString() || ''}
                    onChangeText={(value) => handleTargetChange(catalog, value)}
                    placeholder="0"
                    placeholderTextColor={themeColors.text.tertiary}
                    keyboardType="number-pad"
                    editable={!saving}
                  />
                  <Text style={[styles.inputUnit, { color: themeColors.text.secondary }]}>sheets</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Visit Targets */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.text.secondary }]}>👥 VISIT TARGETS</Text>
            <Text style={[styles.sectionSubtitle, { color: themeColors.text.secondary }]}>Set monthly visit targets by account type</Text>

            {ACCOUNT_TYPES.map((type) => {
              const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
              return (
                <View key={type} style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: themeColors.text.primary }]}>{capitalize(type)} Visits</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: themeColors.surface, borderColor: themeColors.border.default }]}>
                    <TextInput
                      style={[styles.input, { color: themeColors.text.primary }]}
                      value={visitTargets[type]?.toString() || ''}
                      onChangeText={(value) => handleVisitTargetChange(type, value)}
                      placeholder="0"
                      placeholderTextColor={themeColors.text.tertiary}
                      keyboardType="number-pad"
                      editable={!saving}
                    />
                    <Text style={[styles.inputUnit, { color: themeColors.text.secondary }]}>visits</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Auto-Renew Toggle */}
          <View style={styles.section}>
            <View style={[styles.autoRenewHeader, { backgroundColor: themeColors.surface }]}>
              <View style={styles.autoRenewLeft}>
                <Text style={[styles.sectionTitle, { color: themeColors.text.secondary }]}>AUTO-RENEW</Text>
                <Text style={[styles.autoRenewDescription, { color: themeColors.text.secondary }]}>
                  Automatically copy all targets (sheets + visits) to future months
                </Text>
              </View>
              <Switch
                value={autoRenew}
                onValueChange={setAutoRenew}
                trackColor={{ false: themeColors.text.tertiary, true: themeColors.accent }}
                thumbColor="#fff"
                disabled={saving}
              />
            </View>

            {autoRenew && (
              <View style={[styles.autoRenewInfo, { backgroundColor: themeColors.info + '15', borderLeftColor: themeColors.info }]}>
                <Text style={[styles.autoRenewInfoText, { color: themeColors.text.secondary }]}>
                  ℹ️ Target will be copied to next month on the 1st at 12:01 AM.
                  You can turn this off anytime.
                </Text>
              </View>
            )}
          </View>

          {/* Stop Auto-Renew Button (if target was auto-renewed) */}
          {existingTarget && existingTarget.sourceTargetId && autoRenew && (
            <TouchableOpacity
              style={styles.stopAutoRenewButton}
              onPress={handleStopAutoRenew}
              disabled={saving}
            >
              <Text style={styles.stopAutoRenewButtonText}>Stop Auto-Renew</Text>
            </TouchableOpacity>
          )}

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: themeColors.accent }, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Save size={20} color={colors.primary} />
                <Text style={[styles.saveButtonText, { color: colors.primary }]}>
                  {existingTarget ? 'Update Target' : 'Save Target'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

function formatMonth(month: string): string {
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 50,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.screenPadding,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.inverse,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.inverse,
    opacity: 0.85,
    marginTop: spacing.xs / 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.screenPadding,
  },
  monthCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent + '40',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
  },
  monthValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    marginBottom: spacing.sm,
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    paddingVertical: spacing.sm,
  },
  inputUnit: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  autoRenewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
  },
  autoRenewLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  autoRenewDescription: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  autoRenewInfo: {
    backgroundColor: colors.info + '15',
    borderRadius: spacing.borderRadius.sm,
    padding: spacing.sm,
    marginTop: spacing.xs,
    borderLeftWidth: 2,
    borderLeftColor: colors.info,
  },
  autoRenewInfoText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.xs * 1.4,
  },
  stopAutoRenewButton: {
    backgroundColor: colors.warning,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  stopAutoRenewButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: '#fff',
  },
  saveButton: {
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: spacing.borderRadius.md,
    gap: spacing.xs,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: '#fff',
  },
});
