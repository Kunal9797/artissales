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
import { colors, spacing, typography } from '../../theme';
import { api } from '../../services/api';
import { TargetsByCatalog, TargetsByAccountType } from '../../types';
import { useBottomSafeArea } from '../../hooks/useBottomSafeArea';

type SetTargetParams = {
  userId: string;
  userName: string;
  currentMonth?: string;
};

type SetTargetScreenProps = NativeStackScreenProps<{ SetTarget: SetTargetParams }, 'SetTarget'>;

const CATALOGS: Array<keyof TargetsByCatalog> = ['Fine Decor', 'Artvio', 'Woodrica', 'Artis 1MM'];
const ACCOUNT_TYPES: Array<keyof TargetsByAccountType> = ['dealer', 'architect', 'OEM'];

export const SetTargetScreen: React.FC<SetTargetScreenProps> = ({ navigation, route }) => {
  const { userId, userName, currentMonth } = route.params;
  const bottomPadding = useBottomSafeArea(12);

  const [month, setMonth] = useState<string>(currentMonth || getCurrentMonth());
  const [targets, setTargets] = useState<TargetsByCatalog>({});
  const [visitTargets, setVisitTargets] = useState<TargetsByAccountType>({});
  const [autoRenew, setAutoRenew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingTarget, setExistingTarget] = useState<any>(null);

  useEffect(() => {
    loadExistingTarget();
  }, [userId, month]);

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
        setTargets(response.target.targetsByCatalog);
        setVisitTargets(response.target.targetsByAccountType || {});
        setAutoRenew(response.target.autoRenew);
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
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color={colors.text.inverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Set Target</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading target...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header - Dark style */}
      <View style={{
        backgroundColor: '#393735',
        paddingHorizontal: 24,
        paddingTop: 52,
        paddingBottom: 20,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={{ padding: 8, marginLeft: -8 }}
            onPress={() => navigation.goBack()}
          >
            <Text style={{ fontSize: 28, color: '#C9A961' }}>←</Text>
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
          {/* Month Display */}
          <View style={styles.monthCard}>
            <Text style={styles.monthLabel}>Target Month</Text>
            <Text style={styles.monthValue}>{formatMonth(month)}</Text>
          </View>

          {/* Sheet Sales Targets */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 SHEET SALES TARGETS</Text>
            <Text style={styles.sectionSubtitle}>Set monthly sheet targets for each catalog</Text>

            {CATALOGS.map((catalog) => (
              <View key={catalog} style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{catalog}</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={targets[catalog]?.toString() || ''}
                    onChangeText={(value) => handleTargetChange(catalog, value)}
                    placeholder="0"
                    keyboardType="number-pad"
                    editable={!saving}
                  />
                  <Text style={styles.inputUnit}>sheets</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Visit Targets */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👥 VISIT TARGETS</Text>
            <Text style={styles.sectionSubtitle}>Set monthly visit targets by account type</Text>

            {ACCOUNT_TYPES.map((type) => {
              const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
              return (
                <View key={type} style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>{capitalize(type)} Visits</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      value={visitTargets[type]?.toString() || ''}
                      onChangeText={(value) => handleVisitTargetChange(type, value)}
                      placeholder="0"
                      keyboardType="number-pad"
                      editable={!saving}
                    />
                    <Text style={styles.inputUnit}>visits</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Auto-Renew Toggle */}
          <View style={styles.section}>
            <View style={styles.autoRenewHeader}>
              <View style={styles.autoRenewLeft}>
                <Text style={styles.sectionTitle}>AUTO-RENEW</Text>
                <Text style={styles.autoRenewDescription}>
                  Automatically copy all targets (sheets + visits) to future months
                </Text>
              </View>
              <Switch
                value={autoRenew}
                onValueChange={setAutoRenew}
                trackColor={{ false: colors.text.tertiary, true: colors.accent }}
                thumbColor="#fff"
                disabled={saving}
              />
            </View>

            {autoRenew && (
              <View style={styles.autoRenewInfo}>
                <Text style={styles.autoRenewInfoText}>
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
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Save size={20} color="#fff" />
                <Text style={styles.saveButtonText}>
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
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.accent + '40',
  },
  monthLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  monthValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    paddingVertical: spacing.md,
  },
  inputUnit: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  autoRenewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
  },
  autoRenewLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  autoRenewDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs / 2,
  },
  autoRenewInfo: {
    backgroundColor: colors.info + '15',
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
  },
  autoRenewInfoText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.sm * 1.4,
  },
  stopAutoRenewButton: {
    backgroundColor: colors.warning,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  stopAutoRenewButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: '#fff',
  },
  saveButton: {
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.md,
    gap: spacing.sm,
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
