import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Building2, User, Phone, Mail, MapPin, Hash, Calendar, Briefcase, PenTool, ChevronDown, X, Clock } from 'lucide-react-native';
import { api } from '../services/api';
import { colors, spacing, typography, useTheme } from '../theme';
import { AccountType } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useBottomSafeArea } from '../hooks/useBottomSafeArea';
import {
  RecentLocation,
  getRecentLocations,
  saveRecentLocation,
  formatLocationLabel,
} from '../utils/recentLocations';

// Account type options with icons
const ACCOUNT_TYPES = [
  { value: 'distributor', label: 'Distributor', Icon: Building2, color: '#1976D2' },
  { value: 'dealer', label: 'Dealer', Icon: Briefcase, color: '#388E3C' },
  { value: 'architect', label: 'Architect', Icon: PenTool, color: '#7B1FA2' },
  { value: 'OEM', label: 'OEM', Icon: Building2, color: '#F57C00' },
] as const;

type AddAccountScreenProps = NativeStackScreenProps<any, 'AddAccount'>;

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry',
];

export const AddAccountScreen: React.FC<AddAccountScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { isDark, colors: themeColors } = useTheme();
  const bottomPadding = useBottomSafeArea(12);
  const preSelectedAccountId = route.params?.preSelectedAccountId;
  const onAccountCreated = route.params?.onAccountCreated;

  // Form state
  const [accountType, setAccountType] = useState<AccountType>('dealer');
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [address, setAddress] = useState('');
  const [parentDistributorId, setParentDistributorId] = useState('');
  const [showStateModal, setShowStateModal] = useState(false);
  const [showDistributorModal, setShowDistributorModal] = useState(false);
  const [distributors, setDistributors] = useState<any[]>([]);
  const [selectedDistributor, setSelectedDistributor] = useState<any>(null);
  const [recentLocations, setRecentLocations] = useState<RecentLocation[]>([]);

  // Validation & loading
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Ref guard to prevent double-tap submissions
  const isSubmittingRef = useRef(false);

  // Check if user can create distributors
  const canCreateDistributor = user?.role === 'national_head' || user?.role === 'admin';

  useEffect(() => {
    // Load distributors for linking
    loadDistributors();
    // Load recent locations
    loadRecentLocations();
  }, []);

  const loadRecentLocations = async () => {
    const locations = await getRecentLocations();
    setRecentLocations(locations);
  };

  const handleSelectRecentLocation = (location: RecentLocation) => {
    setCity(location.city);
    setState(location.state);
    setPincode(location.pincode);
  };

  const loadDistributors = async () => {
    try {
      const response = await api.getAccountsList({ type: 'distributor' });
      if (response.ok) {
        setDistributors(response.accounts);
      }
    } catch (error) {
      console.error('Error loading distributors:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Account name is required';
    if (name.trim().length < 2) newErrors.name = 'Name must be at least 2 characters';

    // Phone is required and must be 10 digits
    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Phone must be 10 digits';
    }

    if (!city.trim()) newErrors.city = 'City is required';
    if (!state) newErrors.state = 'State is required';

    if (!pincode.trim()) newErrors.pincode = 'Pincode is required';
    if (!/^\d{6}$/.test(pincode)) newErrors.pincode = 'Pincode must be 6 digits';

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    // Birthdate validation (optional, but if provided must be valid)
    if (birthdate && !/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) {
      newErrors.birthdate = 'Birthdate must be in YYYY-MM-DD format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    // Prevent double-tap submissions
    if (isSubmittingRef.current) return;

    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before submitting');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    try {
      const response = await api.createAccount({
        name: name.trim(),
        type: accountType,
        contactPerson: contactPerson.trim() || undefined,
        phone: phone.replace(/\D/g, '') || '',
        email: email.trim() || undefined,
        birthdate: birthdate.trim() || undefined,
        city: city.trim(),
        state: state || '',
        pincode: pincode.trim(),
        address: address.trim() || undefined,
        parentDistributorId: parentDistributorId || undefined,
      });

      if (response.ok) {
        // Save location to recents for quick access later
        await saveRecentLocation({
          city: city.trim(),
          state: state,
          pincode: pincode.trim(),
        });
        // Call the callback if provided
        if (onAccountCreated) {
          onAccountCreated(response.accountId);
        }
        // Navigate back immediately
        navigation.goBack();
      } else {
        Alert.alert('Error', response.error || 'Failed to create account');
      }
    } catch (error: any) {
      // Handle duplicate phone error with a nicer message
      if (error.code === 'DUPLICATE_PHONE' || error.message?.includes('already exists')) {
        // Extract account name from error message if available
        const match = error.message?.match(/already exists: (.+)$/);
        const existingAccountName = match ? match[1] : 'another account';

        Alert.alert(
          'Phone Number Already Registered',
          `This phone number is already registered to "${existingAccountName}". Please use a different phone number or find the existing account.`,
          [
            { text: 'OK', style: 'default' }
          ]
        );
      } else {
        Alert.alert('Error', error.message || 'Failed to create account');
      }
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // Get visible account types based on user role
  const visibleAccountTypes = canCreateDistributor
    ? ACCOUNT_TYPES
    : ACCOUNT_TYPES.filter(t => t.value !== 'distributor');

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Compact Header */}
      <View style={[styles.header, { backgroundColor: isDark ? themeColors.surface : colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: themeColors.accent }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: '#FFFFFF' }]}>New Account</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: 100 + bottomPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Account Type Grid */}
        <Text style={[styles.sectionLabel, { color: themeColors.text.secondary }]}>Account Type</Text>
        <View style={styles.typeGrid}>
          {visibleAccountTypes.map(({ value, label, Icon, color }) => {
            const isSelected = accountType === value;
            return (
              <TouchableOpacity
                key={value}
                style={[
                  styles.typeCard,
                  { backgroundColor: themeColors.surface, borderColor: themeColors.border.default },
                  isSelected && { borderColor: color, backgroundColor: color + (isDark ? '20' : '10') },
                ]}
                onPress={() => setAccountType(value as AccountType)}
                activeOpacity={0.7}
              >
                <View style={[styles.typeIconContainer, { backgroundColor: color + (isDark ? '30' : '15') }]}>
                  <Icon size={20} color={color} />
                </View>
                <Text style={[styles.typeLabel, { color: themeColors.text.primary }, isSelected && { color, fontWeight: '600' }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Form Card */}
        <View style={[styles.formCard, { backgroundColor: themeColors.surface }]}>
          {/* Basic Info Section */}
          <Text style={[styles.formSectionTitle, { color: themeColors.text.tertiary }]}>Basic Info</Text>

          {/* Account Name */}
          <View style={[styles.fieldRow, { backgroundColor: themeColors.background, borderColor: themeColors.border.default }]}>
            <Building2 size={18} color={themeColors.text.tertiary} />
            <TextInput
              style={[styles.fieldInput, { color: themeColors.text.primary }]}
              value={name}
              onChangeText={setName}
              placeholder="Account name *"
              placeholderTextColor={themeColors.text.tertiary}
            />
          </View>
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

          {/* Contact Person */}
          <View style={[styles.fieldRow, { backgroundColor: themeColors.background, borderColor: themeColors.border.default }]}>
            <User size={18} color={themeColors.text.tertiary} />
            <TextInput
              style={[styles.fieldInput, { color: themeColors.text.primary }]}
              value={contactPerson}
              onChangeText={setContactPerson}
              placeholder="Contact person"
              placeholderTextColor={themeColors.text.tertiary}
            />
          </View>

          {/* Phone & Email in row */}
          <View style={styles.twoColumnRow}>
            <View style={[styles.fieldRow, styles.halfWidth, { backgroundColor: themeColors.background, borderColor: themeColors.border.default }]}>
              <Phone size={18} color={themeColors.text.tertiary} />
              <TextInput
                style={[styles.fieldInput, { color: themeColors.text.primary }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone *"
                keyboardType="phone-pad"
                maxLength={10}
                placeholderTextColor={themeColors.text.tertiary}
              />
            </View>
            <View style={[styles.fieldRow, styles.halfWidth, { backgroundColor: themeColors.background, borderColor: themeColors.border.default }]}>
              <Mail size={18} color={themeColors.text.tertiary} />
              <TextInput
                style={[styles.fieldInput, { color: themeColors.text.primary }]}
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={themeColors.text.tertiary}
              />
            </View>
          </View>
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          {/* Birthdate (only for non-distributors) */}
          {accountType !== 'distributor' && (
            <View style={[styles.fieldRow, { backgroundColor: themeColors.background, borderColor: themeColors.border.default }]}>
              <Calendar size={18} color={themeColors.text.tertiary} />
              <TextInput
                style={[styles.fieldInput, { color: themeColors.text.primary }]}
                value={birthdate}
                onChangeText={setBirthdate}
                placeholder="Birthdate (YYYY-MM-DD)"
                placeholderTextColor={themeColors.text.tertiary}
              />
            </View>
          )}
          {errors.birthdate && <Text style={styles.errorText}>{errors.birthdate}</Text>}

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: themeColors.border.default }]} />

          {/* Location Section */}
          <Text style={[styles.formSectionTitle, { color: themeColors.text.tertiary }]}>Location</Text>

          {/* Recent Locations Chips */}
          {recentLocations.length > 0 && (
            <View style={styles.recentLocationsContainer}>
              <View style={styles.recentLocationsHeader}>
                <Clock size={14} color={themeColors.text.tertiary} />
                <Text style={[styles.recentLocationsLabel, { color: themeColors.text.tertiary }]}>Recent:</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recentLocationsScroll}
              >
                {recentLocations.map((location, index) => {
                  const isSelected =
                    city.toLowerCase() === location.city.toLowerCase() &&
                    state === location.state &&
                    pincode === location.pincode;
                  return (
                    <TouchableOpacity
                      key={`${location.pincode}-${index}`}
                      style={[
                        styles.recentLocationChip,
                        { backgroundColor: themeColors.background, borderColor: themeColors.border.default },
                        isSelected && { backgroundColor: themeColors.accent + '15', borderColor: themeColors.accent },
                      ]}
                      onPress={() => handleSelectRecentLocation(location)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.recentLocationChipText,
                          { color: themeColors.text.secondary },
                          isSelected && { color: themeColors.accent },
                        ]}
                      >
                        {formatLocationLabel(location)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* City & Pincode in row */}
          <View style={styles.twoColumnRow}>
            <View style={[styles.fieldRow, styles.halfWidth, { backgroundColor: themeColors.background, borderColor: themeColors.border.default }]}>
              <MapPin size={18} color={themeColors.text.tertiary} />
              <TextInput
                style={[styles.fieldInput, { color: themeColors.text.primary }]}
                value={city}
                onChangeText={setCity}
                placeholder="City *"
                placeholderTextColor={themeColors.text.tertiary}
              />
            </View>
            <View style={[styles.fieldRow, styles.halfWidth, { backgroundColor: themeColors.background, borderColor: themeColors.border.default }]}>
              <Hash size={18} color={themeColors.text.tertiary} />
              <TextInput
                style={[styles.fieldInput, { color: themeColors.text.primary }]}
                value={pincode}
                onChangeText={setPincode}
                placeholder="Pincode *"
                keyboardType="number-pad"
                maxLength={6}
                placeholderTextColor={themeColors.text.tertiary}
              />
            </View>
          </View>
          {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
          {errors.pincode && <Text style={styles.errorText}>{errors.pincode}</Text>}

          {/* State Dropdown */}
          <TouchableOpacity
            style={[styles.fieldRow, { backgroundColor: themeColors.background, borderColor: themeColors.border.default }]}
            onPress={() => setShowStateModal(true)}
            activeOpacity={0.7}
          >
            <MapPin size={18} color={themeColors.text.tertiary} />
            <Text style={[styles.fieldInput, { color: state ? themeColors.text.primary : themeColors.text.tertiary }]}>
              {state || 'Select state *'}
            </Text>
            <ChevronDown size={18} color={themeColors.text.tertiary} />
          </TouchableOpacity>
          {errors.state && <Text style={styles.errorText}>{errors.state}</Text>}

          {/* Address */}
          <View style={[styles.fieldRow, styles.textAreaRow, { backgroundColor: themeColors.background, borderColor: themeColors.border.default }]}>
            <TextInput
              style={[styles.fieldInput, styles.textAreaInput, { color: themeColors.text.primary }]}
              value={address}
              onChangeText={setAddress}
              placeholder="Full address (optional)"
              multiline
              numberOfLines={2}
              placeholderTextColor={themeColors.text.tertiary}
            />
          </View>

          {/* Parent Distributor (for dealers/architects/OEMs) */}
          {accountType !== 'distributor' && (
            <>
              <View style={[styles.divider, { backgroundColor: themeColors.border.default }]} />
              <Text style={[styles.formSectionTitle, { color: themeColors.text.tertiary }]}>Parent Distributor</Text>
              <TouchableOpacity
                style={[styles.fieldRow, { backgroundColor: themeColors.background, borderColor: themeColors.border.default }]}
                onPress={() => setShowDistributorModal(true)}
                activeOpacity={0.7}
              >
                <Building2 size={18} color={themeColors.text.tertiary} />
                <Text style={[styles.fieldInput, { color: selectedDistributor ? themeColors.text.primary : themeColors.text.tertiary }]}>
                  {selectedDistributor?.name || 'Select distributor (optional)'}
                </Text>
                {selectedDistributor ? (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedDistributor(null);
                      setParentDistributorId('');
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <X size={18} color={themeColors.text.tertiary} />
                  </TouchableOpacity>
                ) : (
                  <ChevronDown size={18} color={themeColors.text.tertiary} />
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Create Account</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* State Selection Modal */}
      {showStateModal && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#404040' : '#FFFFFF' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: themeColors.border.default }]}>
              <Text style={[styles.modalTitle, { color: themeColors.text.primary }]}>Select State</Text>
              <TouchableOpacity onPress={() => setShowStateModal(false)}>
                <Text style={[styles.modalClose, { color: themeColors.text.tertiary }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {INDIAN_STATES.map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[styles.modalItem, { borderBottomColor: themeColors.border.default }]}
                  onPress={() => {
                    setState(st);
                    setShowStateModal(false);
                  }}
                >
                  <Text style={[styles.modalItemText, { color: themeColors.text.primary }]}>{st}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Distributor Selection Modal */}
      {showDistributorModal && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#404040' : '#FFFFFF' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: themeColors.border.default }]}>
              <Text style={[styles.modalTitle, { color: themeColors.text.primary }]}>Select Distributor</Text>
              <TouchableOpacity onPress={() => setShowDistributorModal(false)}>
                <Text style={[styles.modalClose, { color: themeColors.text.tertiary }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <TouchableOpacity
                style={[styles.modalItem, { borderBottomColor: themeColors.border.default }]}
                onPress={() => {
                  setSelectedDistributor(null);
                  setParentDistributorId('');
                  setShowDistributorModal(false);
                }}
              >
                <Text style={[styles.modalItemText, { fontWeight: 'bold', color: themeColors.text.primary }]}>
                  No distributor (independent)
                </Text>
              </TouchableOpacity>
              {distributors.map((dist) => (
                <TouchableOpacity
                  key={dist.id}
                  style={[styles.modalItem, { borderBottomColor: themeColors.border.default }]}
                  onPress={() => {
                    setSelectedDistributor(dist);
                    setParentDistributorId(dist.id);
                    setShowDistributorModal(false);
                  }}
                >
                  <Text style={[styles.modalItemText, { color: themeColors.text.primary }]}>
                    {dist.name} - {dist.city}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingTop: 54,
    paddingBottom: 12,
    paddingHorizontal: spacing.screenPadding,
  },
  backButton: {
    paddingVertical: 4,
  },
  backButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.accent,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: '#fff',
  },
  headerSpacer: {
    width: 50, // Balance the Cancel button
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.screenPadding,
  },
  sectionLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  // Account Type Grid
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  typeCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    padding: 12,
    gap: 10,
  },
  typeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.text.primary,
  },

  // Form Card
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  formSectionTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.default,
    marginVertical: 16,
  },

  // Field Rows
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    gap: 10,
  },
  fieldInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    padding: 0,
  },
  placeholderText: {
    color: colors.text.tertiary,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  halfWidth: {
    flex: 1,
  },
  textAreaRow: {
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  textAreaInput: {
    minHeight: 40,
    textAlignVertical: 'top',
  },

  // Error
  errorText: {
    fontSize: typography.fontSize.xs,
    color: colors.error,
    marginTop: -4,
    marginBottom: 8,
    marginLeft: 4,
  },

  // Submit Button
  submitButton: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: '#fff',
  },

  // Modal
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '85%',
    maxHeight: '70%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
  },
  modalClose: {
    fontSize: 20,
    color: colors.text.tertiary,
    padding: 4,
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  modalItemText: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },

  // Recent Locations
  recentLocationsContainer: {
    marginBottom: 12,
  },
  recentLocationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  recentLocationsLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
  recentLocationsScroll: {
    gap: 8,
  },
  recentLocationChip: {
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  recentLocationChipSelected: {
    backgroundColor: colors.accent + '15',
    borderColor: colors.accent,
  },
  recentLocationChipText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  recentLocationChipTextSelected: {
    color: colors.accent,
  },
});
