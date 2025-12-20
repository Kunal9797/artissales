import React, { useState, useEffect, useMemo } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { colors, spacing, typography, useTheme } from '../../theme';
import { User, Phone, MapPin, Shield, Building2, X, Plus, Users } from 'lucide-react-native';
import { api } from '../../services/api';
import { AccountListItem, ManagerListItem } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useBottomSafeArea } from '../../hooks/useBottomSafeArea';

interface AddUserScreenProps {
  navigation: any;
}

type UserRole = 'rep' | 'area_manager' | 'zonal_head' | 'national_head' | 'admin';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'rep', label: 'Sales Rep' },
  { value: 'area_manager', label: 'Area Manager' },
  { value: 'zonal_head', label: 'Zonal Head' },
  { value: 'national_head', label: 'National Head' },
  { value: 'admin', label: 'Admin' },
];

export const AddUserScreen: React.FC<AddUserScreenProps> = ({ navigation }) => {
  const { isDark, colors: themeColors } = useTheme();
  const { user } = useAuth();
  const bottomPadding = useBottomSafeArea(12);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('rep');
  const [territory, setTerritory] = useState('');
  const [loading, setLoading] = useState(false);

  // Filter roles based on current user's role
  const availableRoles = useMemo(() => {
    if (user?.role === 'admin') {
      // Admin can add anyone
      return ROLES;
    } else if (user?.role === 'national_head') {
      // National head can only add zonal_head, area_manager, and rep
      return ROLES.filter(r =>
        r.value === 'zonal_head' ||
        r.value === 'area_manager' ||
        r.value === 'rep'
      );
    }
    // Default: only rep
    return ROLES.filter(r => r.value === 'rep');
  }, [user?.role]);

  // Distributor picker states
  const [selectedDistributor, setSelectedDistributor] = useState<AccountListItem | null>(null);
  const [showDistributorModal, setShowDistributorModal] = useState(false);
  const [distributors, setDistributors] = useState<AccountListItem[]>([]);
  const [loadingDistributors, setLoadingDistributors] = useState(false);

  // Manager (Reports To) picker states - only used by Admin creating reps
  const [selectedManager, setSelectedManager] = useState<ManagerListItem | null>(null);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [managers, setManagers] = useState<ManagerListItem[]>([]);
  const [loadingManagers, setLoadingManagers] = useState(false);

  // Validation states
  const [phoneError, setPhoneError] = useState('');
  const [nameError, setNameError] = useState('');
  const [territoryError, setTerritoryError] = useState('');

  useEffect(() => {
    // Load distributors for picker
    loadDistributors();
    // Load managers for "Reports To" picker (only needed for Admin)
    if (user?.role === 'admin') {
      loadManagers();
    }
  }, [user?.role]);

  const loadDistributors = async () => {
    try {
      setLoadingDistributors(true);
      const response = await api.getAccountsList({ type: 'distributor' });
      if (response.ok) {
        setDistributors(response.accounts);
      }
    } catch (error) {
      logger.error('Error loading distributors:', error);
    } finally {
      setLoadingDistributors(false);
    }
  };

  const loadManagers = async () => {
    try {
      setLoadingManagers(true);
      const response = await api.getManagersList();
      if (response.ok) {
        setManagers(response.managers);
      }
    } catch (error) {
      logger.error('Error loading managers:', error);
    } finally {
      setLoadingManagers(false);
    }
  };

  const validatePhone = (value: string): boolean => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 0) {
      setPhoneError('Phone number is required');
      return false;
    }
    if (digits.length !== 10) {
      setPhoneError('Phone number must be exactly 10 digits');
      return false;
    }
    if (!/^[6-9]/.test(digits)) {
      setPhoneError('Phone number must start with 6-9');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const validateName = (value: string): boolean => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setNameError('Name is required');
      return false;
    }
    if (trimmed.length < 2) {
      setNameError('Name must be at least 2 characters');
      return false;
    }
    if (trimmed.length > 100) {
      setNameError('Name is too long');
      return false;
    }
    setNameError('');
    return true;
  };

  const validateTerritory = (value: string): boolean => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setTerritoryError('Territory is required');
      return false;
    }
    if (trimmed.length < 2) {
      setTerritoryError('Territory must be at least 2 characters');
      return false;
    }
    setTerritoryError('');
    return true;
  };

  const handlePhoneChange = (value: string) => {
    // Auto-format as user types (allow only digits)
    const formatted = value.replace(/\D/g, '').slice(0, 10);
    setPhone(formatted);
    if (formatted.length > 0) {
      validatePhone(formatted);
    } else {
      setPhoneError('');
    }
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (value.trim().length > 0) {
      validateName(value);
    } else {
      setNameError('');
    }
  };

  const handleTerritoryChange = (value: string) => {
    setTerritory(value);
    if (value.trim().length > 0) {
      validateTerritory(value);
    } else {
      setTerritoryError('');
    }
  };

  const isFormValid = (): boolean => {
    // Admin must select a manager when creating a rep
    const needsManager = user?.role === 'admin' && selectedRole === 'rep';
    const hasRequiredManager = !needsManager || selectedManager !== null;

    return (
      phone.length === 10 &&
      name.trim().length >= 2 &&
      territory.trim().length >= 2 &&
      !phoneError &&
      !nameError &&
      !territoryError &&
      hasRequiredManager
    );
  };

  const handleSubmit = async () => {
    // Final validation
    const isPhoneValid = validatePhone(phone);
    const isNameValid = validateName(name);
    const isTerritoryValid = validateTerritory(territory);

    if (!isPhoneValid || !isNameValid || !isTerritoryValid) {
      Alert.alert('Validation Error', 'Please fix the errors before submitting');
      return;
    }

    // Admin must select manager when creating a rep
    if (user?.role === 'admin' && selectedRole === 'rep' && !selectedManager) {
      Alert.alert('Validation Error', 'Please select a manager for this sales rep');
      return;
    }

    setLoading(true);

    try {
      const response = await api.createUserByManager({
        phone: phone,
        name: name.trim(),
        role: selectedRole,
        territory: territory.trim(),
        primaryDistributorId: selectedDistributor?.id,
        // Admin must specify manager for reps; NH/AM auto-assign to themselves on backend
        reportsToUserId: user?.role === 'admin' && selectedRole === 'rep' ? selectedManager?.id : undefined,
      });

      Alert.alert(
        'Success',
        `User created successfully!\n\nName: ${name.trim()}\nPhone: ${phone}\nRole: ${ROLES.find(r => r.value === selectedRole)?.label}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      logger.error('[AddUserScreen] Error creating user:', error);

      // Handle duplicate phone error with a nicer message
      if (error.code === 'DUPLICATE_PHONE' || error.message?.includes('already exists')) {
        Alert.alert(
          'Phone Number Already Registered',
          'This phone number is already registered to an existing active user. Please use a different phone number.',
          [{ text: 'OK', style: 'default' }]
        );
      } else if (error.code === 'INSUFFICIENT_PERMISSIONS') {
        Alert.alert('Permission Denied', 'You do not have permission to create users.');
      } else if (error.code === 'INVALID_PHONE') {
        Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number.');
      } else {
        // Show details if available
        if (error.details) {
          logger.error('[AddUserScreen] Error details:', error.details);
        }
        Alert.alert('Error', error.message || 'Failed to create user. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      {/* Header - Dark style */}
      <View style={{
        backgroundColor: isDark ? themeColors.surface : '#393735',
        paddingHorizontal: 24,
        paddingTop: 52,
        paddingBottom: 20,
      }}>
        <Text style={{ fontSize: 24, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 }}>
          Add New User
        </Text>
        <Text style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.7)' }}>
          Create a new sales team member
        </Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, { paddingBottom: 80 + bottomPadding }]}>
        {/* Phone Number Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: themeColors.text.primary }]}>Phone Number *</Text>
          <View style={[
            styles.inputContainer,
            {
              backgroundColor: themeColors.surface,
              borderColor: phoneError ? colors.error : themeColors.border.default,
            },
          ]}>
            <Phone size={20} color={phoneError ? colors.error : themeColors.text.tertiary} />
            <TextInput
              style={[styles.input, { color: themeColors.text.primary }]}
              placeholder="Enter 10-digit mobile number"
              placeholderTextColor={themeColors.text.tertiary}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={handlePhoneChange}
              maxLength={10}
              editable={!loading}
            />
          </View>
          {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
          {phone.length > 0 && !phoneError && (
            <Text style={styles.helperText}>✓ Valid Indian mobile number</Text>
          )}
        </View>

        {/* Name Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: themeColors.text.primary }]}>Full Name *</Text>
          <View style={[
            styles.inputContainer,
            {
              backgroundColor: themeColors.surface,
              borderColor: nameError ? colors.error : themeColors.border.default,
            },
          ]}>
            <User size={20} color={nameError ? colors.error : themeColors.text.tertiary} />
            <TextInput
              style={[styles.input, { color: themeColors.text.primary }]}
              placeholder="Enter full name"
              placeholderTextColor={themeColors.text.tertiary}
              value={name}
              onChangeText={handleNameChange}
              editable={!loading}
            />
          </View>
          {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
        </View>

        {/* Role Picker */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: themeColors.text.primary }]}>Role *</Text>
          <View style={styles.roleGrid}>
            {availableRoles.map((role) => {
              const isActive = selectedRole === role.value;
              return (
                <TouchableOpacity
                  key={role.value}
                  style={[
                    styles.roleButton,
                    {
                      backgroundColor: isActive
                        ? (isDark ? themeColors.accent + '20' : colors.accent + '10')
                        : themeColors.surface,
                      borderColor: isActive ? themeColors.accent : themeColors.border.default,
                    },
                  ]}
                  onPress={() => setSelectedRole(role.value)}
                  disabled={loading}
                >
                  <Shield
                    size={20}
                    color={isActive ? themeColors.accent : themeColors.text.secondary}
                  />
                  <Text
                    style={[
                      styles.roleButtonText,
                      {
                        color: isActive ? themeColors.accent : themeColors.text.secondary,
                        fontWeight: isActive ? '600' : '500',
                      },
                    ]}
                  >
                    {role.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Territory Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: themeColors.text.primary }]}>Territory *</Text>
          <View style={[
            styles.inputContainer,
            {
              backgroundColor: themeColors.surface,
              borderColor: territoryError ? colors.error : themeColors.border.default,
            },
          ]}>
            <MapPin size={20} color={territoryError ? colors.error : themeColors.text.tertiary} />
            <TextInput
              style={[styles.input, { color: themeColors.text.primary }]}
              placeholder="Enter city name (e.g., Mumbai, Delhi)"
              placeholderTextColor={themeColors.text.tertiary}
              value={territory}
              onChangeText={handleTerritoryChange}
              editable={!loading}
            />
          </View>
          {territoryError ? <Text style={styles.errorText}>{territoryError}</Text> : null}
        </View>

        {/* Reports To (Manager) - only shown for Admin creating a rep */}
        {user?.role === 'admin' && selectedRole === 'rep' && (
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.text.primary }]}>Reports To *</Text>
            <TouchableOpacity
              style={[
                styles.dropdownButton,
                {
                  backgroundColor: themeColors.surface,
                  borderColor: !selectedManager ? themeColors.accent : themeColors.border.default,
                  borderWidth: !selectedManager ? 2 : 1.5,
                },
              ]}
              onPress={() => setShowManagerModal(true)}
              disabled={loading}
            >
              <Users size={20} color={selectedManager ? themeColors.text.tertiary : themeColors.accent} />
              <Text style={{
                flex: 1,
                fontSize: 16,
                color: selectedManager ? themeColors.text.primary : themeColors.text.tertiary,
              }}>
                {selectedManager ? `${selectedManager.name} (${selectedManager.role.replace('_', ' ')})` : 'Select manager...'}
              </Text>
            </TouchableOpacity>
            {selectedManager && (
              <TouchableOpacity
                onPress={() => setSelectedManager(null)}
                style={styles.clearButton}
              >
                <Text style={[styles.clearButtonText, { color: themeColors.accent }]}>Clear selection</Text>
              </TouchableOpacity>
            )}
            {!selectedManager && (
              <Text style={[styles.helperTextMuted, { color: themeColors.text.tertiary }]}>
                Select the manager this rep will report to
              </Text>
            )}
          </View>
        )}

        {/* Primary Distributor (only for rep role) */}
        {selectedRole === 'rep' && (
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.text.primary }]}>Primary Distributor (Optional)</Text>
            <TouchableOpacity
              style={[
                styles.dropdownButton,
                {
                  backgroundColor: themeColors.surface,
                  borderColor: themeColors.border.default,
                },
              ]}
              onPress={() => setShowDistributorModal(true)}
              disabled={loading}
            >
              <Building2 size={20} color={themeColors.text.tertiary} />
              <Text style={{
                flex: 1,
                fontSize: 16,
                color: selectedDistributor ? themeColors.text.primary : themeColors.text.tertiary,
              }}>
                {selectedDistributor?.name || 'Select distributor...'}
              </Text>
            </TouchableOpacity>
            {selectedDistributor && (
              <TouchableOpacity
                onPress={() => setSelectedDistributor(null)}
                style={styles.clearButton}
              >
                <Text style={[styles.clearButtonText, { color: themeColors.accent }]}>Clear selection</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!isFormValid() || loading) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!isFormValid() || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.submitButtonText}>Create User</Text>
          )}
        </TouchableOpacity>

      </ScrollView>

      {/* Distributor Selection Modal */}
      {showDistributorModal && (
        <Modal visible={showDistributorModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: themeColors.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: themeColors.text.primary }]}>Select Distributor</Text>
                <TouchableOpacity onPress={() => setShowDistributorModal(false)}>
                  <X size={24} color={themeColors.text.primary} />
                </TouchableOpacity>
              </View>

              {loadingDistributors ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="small" color={themeColors.accent} />
                  <Text style={[styles.modalLoadingText, { color: themeColors.text.secondary }]}>Loading distributors...</Text>
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.addDistributorButton, { borderColor: themeColors.accent }]}
                    onPress={() => {
                      setShowDistributorModal(false);
                      navigation.navigate('AddAccount', {
                        preSelectedType: 'distributor',
                        onAccountCreated: (accountId: string) => {
                          // Reload distributors and navigate back
                          loadDistributors();
                        },
                      });
                    }}
                  >
                    <Plus size={20} color={themeColors.accent} />
                    <Text style={[styles.addDistributorText, { color: themeColors.accent }]}>Add New Distributor</Text>
                  </TouchableOpacity>

                  <FlatList
                    data={distributors}
                    keyExtractor={(item) => item.id}
                    style={styles.modalList}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[styles.modalItem, { borderBottomColor: themeColors.border.default }]}
                        onPress={() => {
                          setSelectedDistributor(item);
                          setShowDistributorModal(false);
                        }}
                      >
                        <View style={styles.modalItemMain}>
                          <Text style={[styles.modalItemName, { color: themeColors.text.primary }]}>{item.name}</Text>
                          <Text style={[styles.modalItemMeta, { color: themeColors.text.secondary }]}>
                            {item.city}, {item.state}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                      <View style={styles.modalEmpty}>
                        <Text style={[styles.modalEmptyText, { color: themeColors.text.secondary }]}>No distributors found</Text>
                        <Text style={[styles.modalEmptySubtext, { color: themeColors.text.tertiary }]}>
                          Add a distributor first to assign reps
                        </Text>
                      </View>
                    }
                  />
                </>
              )}
            </View>
          </View>
        </Modal>
      )}

      {/* Manager Selection Modal (for "Reports To" dropdown) */}
      {showManagerModal && (
        <Modal visible={showManagerModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: themeColors.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: themeColors.text.primary }]}>Select Manager</Text>
                <TouchableOpacity onPress={() => setShowManagerModal(false)}>
                  <X size={24} color={themeColors.text.primary} />
                </TouchableOpacity>
              </View>

              {loadingManagers ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="small" color={themeColors.accent} />
                  <Text style={[styles.modalLoadingText, { color: themeColors.text.secondary }]}>Loading managers...</Text>
                </View>
              ) : (
                <FlatList
                  data={managers}
                  keyExtractor={(item) => item.id}
                  style={styles.modalList}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.modalItem, { borderBottomColor: themeColors.border.default }]}
                      onPress={() => {
                        setSelectedManager(item);
                        setShowManagerModal(false);
                      }}
                    >
                      <View style={styles.modalItemMain}>
                        <Text style={[styles.modalItemName, { color: themeColors.text.primary }]}>{item.name}</Text>
                        <Text style={[styles.modalItemMeta, { color: themeColors.text.secondary }]}>
                          {item.role.replace('_', ' ')} • {item.territory}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View style={styles.modalEmpty}>
                      <Text style={[styles.modalEmptyText, { color: themeColors.text.secondary }]}>No managers found</Text>
                      <Text style={[styles.modalEmptySubtext, { color: themeColors.text.tertiary }]}>
                        Create a manager account first
                      </Text>
                    </View>
                  }
                />
              )}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 60,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.screenPadding,
  },
  backButton: {
    color: colors.accent,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: '#fff',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.screenPadding,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: colors.border.default,
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    marginTop: spacing.xs,
  },
  helperText: {
    fontSize: typography.fontSize.sm,
    color: colors.success,
    marginTop: spacing.xs,
  },
  helperTextMuted: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: colors.border.default,
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  roleButtonActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '10',
  },
  roleButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  roleButtonTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semiBold,
  },
  submitButton: {
    backgroundColor: colors.accent,
    borderRadius: spacing.borderRadius.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    marginTop: spacing.lg,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: colors.border.default,
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md + 4,
  },
  dropdownRequired: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  dropdownText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  dropdownPlaceholder: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.text.tertiary,
  },
  clearButton: {
    marginTop: spacing.xs,
  },
  clearButtonText: {
    fontSize: typography.fontSize.xs,
    color: colors.accent,
    fontWeight: typography.fontWeight.semiBold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: spacing.borderRadius.lg,
    width: '85%',
    maxHeight: '70%',
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  modalLoading: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  modalLoadingText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  addDistributorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent + '15',
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 2,
    borderColor: colors.accent,
    marginBottom: spacing.md,
  },
  addDistributorText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
  },
  modalList: {
    maxHeight: 300,
  },
  modalItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  modalItemMain: {
    gap: spacing.xs / 2,
  },
  modalItemName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  modalItemMeta: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  modalEmpty: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  modalEmptySubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});
