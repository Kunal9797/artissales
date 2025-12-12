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
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Building2, User, Phone, Mail, MapPin, Hash, Calendar } from 'lucide-react-native';
import { api } from '../services/api';
import { colors, spacing, typography } from '../theme';
import { AccountType } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useBottomSafeArea } from '../hooks/useBottomSafeArea';

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
  }, []);

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

    // Phone is optional, but if provided must be valid
    if (phone.trim() && !/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add New Account</Text>
        <Text style={styles.subtitle}>Create a new {accountType}</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, { paddingBottom: 80 + bottomPadding }]}>
        {/* Account Type Selector */}
        <Text style={styles.sectionLabel}>Account Type *</Text>
        <View style={styles.accountTypeContainer}>
          {canCreateDistributor && (
            <TouchableOpacity
              style={[
                styles.accountTypeButton,
                accountType === 'distributor' && styles.accountTypeButtonActive,
              ]}
              onPress={() => setAccountType('distributor')}
            >
              <Text
                style={[
                  styles.accountTypeText,
                  accountType === 'distributor' && styles.accountTypeTextActive,
                ]}
              >
                Distributor
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.accountTypeButton,
              accountType === 'dealer' && styles.accountTypeButtonActive,
            ]}
            onPress={() => setAccountType('dealer')}
          >
            <Text
              style={[
                styles.accountTypeText,
                accountType === 'dealer' && styles.accountTypeTextActive,
              ]}
            >
              Dealer
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.accountTypeButton,
              accountType === 'architect' && styles.accountTypeButtonActive,
            ]}
            onPress={() => setAccountType('architect')}
          >
            <Text
              style={[
                styles.accountTypeText,
                accountType === 'architect' && styles.accountTypeTextActive,
              ]}
            >
              Architect
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.accountTypeButton,
              accountType === 'OEM' && styles.accountTypeButtonActive,
            ]}
            onPress={() => setAccountType('OEM')}
          >
            <Text
              style={[
                styles.accountTypeText,
                accountType === 'OEM' && styles.accountTypeTextActive,
              ]}
            >
              OEM
            </Text>
          </TouchableOpacity>
        </View>

        {/* Account Name */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Account Name *</Text>
          <View style={styles.inputWrapper}>
            <Building2 size={20} color={colors.text.tertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., ABC Laminates Pvt Ltd"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        {/* Contact Person */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Contact Person</Text>
          <View style={styles.inputWrapper}>
            <User size={20} color={colors.text.tertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={contactPerson}
              onChangeText={setContactPerson}
              placeholder="e.g., Mr. Sharma"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>
        </View>

        {/* Phone Number */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Phone Number</Text>
          <View style={styles.inputWrapper}>
            <Phone size={20} color={colors.text.tertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="10-digit mobile"
              keyboardType="phone-pad"
              maxLength={10}
              placeholderTextColor={colors.text.tertiary}
            />
          </View>
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
        </View>

        {/* Email */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email</Text>
          <View style={styles.inputWrapper}>
            <Mail size={20} color={colors.text.tertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>

        {/* Birthdate (only for dealer, architect, and OEM) */}
        {(accountType === 'dealer' || accountType === 'architect' || accountType === 'OEM') && (
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Birthdate (Optional)</Text>
            <View style={styles.inputWrapper}>
              <Calendar size={20} color={colors.text.tertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={birthdate}
                onChangeText={setBirthdate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
            {errors.birthdate && <Text style={styles.errorText}>{errors.birthdate}</Text>}
            <Text style={styles.helpText}>Format: YYYY-MM-DD (e.g., 1990-05-15)</Text>
          </View>
        )}

        {/* City */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>City *</Text>
          <View style={styles.inputWrapper}>
            <MapPin size={20} color={colors.text.tertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="e.g., Delhi"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>
          {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
        </View>

        {/* State */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>State *</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowStateModal(true)}
          >
            <MapPin size={20} color={colors.text.tertiary} />
            <Text style={state ? styles.dropdownText : styles.dropdownPlaceholder}>
              {state || 'Select state...'}
            </Text>
          </TouchableOpacity>
          {errors.state && <Text style={styles.errorText}>{errors.state}</Text>}
        </View>

        {/* Pincode */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Pincode *</Text>
          <View style={styles.inputWrapper}>
            <Hash size={20} color={colors.text.tertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={pincode}
              onChangeText={setPincode}
              placeholder="6-digit pincode"
              keyboardType="number-pad"
              maxLength={6}
              placeholderTextColor={colors.text.tertiary}
            />
          </View>
          {errors.pincode && <Text style={styles.errorText}>{errors.pincode}</Text>}
        </View>

        {/* Address */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Address (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={address}
            onChangeText={setAddress}
            placeholder="Full address..."
            multiline
            numberOfLines={3}
            placeholderTextColor={colors.text.tertiary}
          />
        </View>

        {/* Parent Distributor (for dealers/architects/OEMs) */}
        {(accountType === 'dealer' || accountType === 'architect' || accountType === 'OEM') && (
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Parent Distributor (Optional)</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowDistributorModal(true)}
            >
              <Building2 size={20} color={colors.text.tertiary} />
              <Text style={selectedDistributor ? styles.dropdownText : styles.dropdownPlaceholder}>
                {selectedDistributor?.name || 'Select distributor...'}
              </Text>
            </TouchableOpacity>
            {selectedDistributor && (
              <TouchableOpacity
                onPress={() => {
                  setSelectedDistributor(null);
                  setParentDistributorId('');
                }}
                style={styles.clearButton}
              >
                <Text style={styles.clearButtonText}>Clear selection</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select State</Text>
              <TouchableOpacity onPress={() => setShowStateModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {INDIAN_STATES.map((st) => (
                <TouchableOpacity
                  key={st}
                  style={styles.modalItem}
                  onPress={() => {
                    setState(st);
                    setShowStateModal(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{st}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Distributor Selection Modal */}
      {showDistributorModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Distributor</Text>
              <TouchableOpacity onPress={() => setShowDistributorModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  setSelectedDistributor(null);
                  setParentDistributorId('');
                  setShowDistributorModal(false);
                }}
              >
                <Text style={[styles.modalItemText, { fontWeight: 'bold' }]}>
                  No distributor (independent)
                </Text>
              </TouchableOpacity>
              {distributors.map((dist) => (
                <TouchableOpacity
                  key={dist.id}
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedDistributor(dist);
                    setParentDistributorId(dist.id);
                    setShowDistributorModal(false);
                  }}
                >
                  <Text style={styles.modalItemText}>
                    {dist.name} - {dist.city}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
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
    marginBottom: spacing.md,
  },
  backButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.accent,
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
  sectionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  accountTypeContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  accountTypeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border.default,
    alignItems: 'center',
  },
  accountTypeButtonActive: {
    backgroundColor: colors.accent + '15',
    borderColor: colors.accent,
  },
  accountTypeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.secondary,
  },
  accountTypeTextActive: {
    color: colors.accent,
    fontWeight: typography.fontWeight.bold,
  },
  inputContainer: {
    marginBottom: spacing.lg,
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
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: '#fff',
    paddingHorizontal: spacing.md,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: '#fff',
    padding: spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: '#fff',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
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
  errorText: {
    fontSize: typography.fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs / 2,
  },
  helpText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs / 2,
  },
  clearButton: {
    marginTop: spacing.xs,
  },
  clearButtonText: {
    fontSize: typography.fontSize.xs,
    color: colors.accent,
    fontWeight: typography.fontWeight.semiBold,
  },
  submitButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: '#fff',
  },
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
  modalClose: {
    fontSize: typography.fontSize.xl,
    color: colors.text.tertiary,
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  modalItemText: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
});
