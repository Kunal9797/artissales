import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocation } from '../../hooks/useLocation';
import { api } from '../../services/api';
import { Account } from '../../hooks/useAccounts';

interface LogVisitScreenProps {
  navigation: any;
  route: {
    params: {
      account: Account;
    };
  };
}

const VISIT_PURPOSES = [
  { value: 'sample_delivery', label: 'Sample Delivery' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'complaint', label: 'Complaint' },
  { value: 'new_lead', label: 'New Lead' },
  { value: 'payment_collection', label: 'Payment Collection' },
  { value: 'other', label: 'Other' },
];

export const LogVisitScreen: React.FC<LogVisitScreenProps> = ({ navigation, route }) => {
  const { account } = route.params;
  const { location, error: locationError } = useLocation();

  const [purpose, setPurpose] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    // Validation
    if (!purpose) {
      Alert.alert('Error', 'Please select a visit purpose');
      return;
    }

    if (!location) {
      Alert.alert('Error', 'Waiting for GPS location...');
      return;
    }

    if (location.accuracy > 50) {
      Alert.alert(
        'Poor GPS Accuracy',
        `GPS accuracy is ${Math.round(location.accuracy)}m. Required: ≤50m. Please wait for better signal.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setSubmitting(true);

    try {
      await api.logVisit({
        accountId: account.id,
        accountName: account.name,
        purpose: purpose as any,
        notes: notes.trim() || undefined,
        lat: location.latitude,
        lon: location.longitude,
        accuracyM: location.accuracy,
      });

      Alert.alert('Success', 'Visit logged successfully!', [
        {
          text: 'OK',
          onPress: () => {
            navigation.navigate('Home');
          },
        },
      ]);
    } catch (error: any) {
      console.error('Visit logging error:', error);
      Alert.alert('Error', error.message || 'Failed to log visit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Log Visit</Text>
      </View>

      {/* Account Info */}
      <View style={styles.accountCard}>
        <Text style={styles.accountName}>{account.name}</Text>
        <Text style={styles.accountType}>
          {account.type === 'distributor' ? '🏭 Distributor' : '🏪 Dealer'}
        </Text>
        {account.contactPerson && (
          <Text style={styles.accountDetail}>👤 {account.contactPerson}</Text>
        )}
        <Text style={styles.accountDetail}>
          📍 {account.city}, {account.state}
        </Text>
      </View>

      {/* GPS Status */}
      <View style={styles.gpsCard}>
        <Text style={styles.sectionLabel}>GPS Location</Text>
        {locationError ? (
          <Text style={styles.errorText}>❌ {locationError}</Text>
        ) : location ? (
          <>
            <Text style={styles.gpsText}>
              ✅ Location acquired ({Math.round(location.accuracy)}m accuracy)
            </Text>
            {location.accuracy > 50 && (
              <Text style={styles.warningText}>
                ⚠️ Accuracy should be ≤50m. Please wait for better signal.
              </Text>
            )}
          </>
        ) : (
          <ActivityIndicator size="small" color="#4CAF50" />
        )}
      </View>

      {/* Visit Purpose */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Visit Purpose *</Text>
        <View style={styles.purposeGrid}>
          {VISIT_PURPOSES.map((item) => (
            <TouchableOpacity
              key={item.value}
              style={[
                styles.purposeButton,
                purpose === item.value && styles.purposeButtonSelected,
              ]}
              onPress={() => setPurpose(item.value)}
            >
              <Text
                style={[
                  styles.purposeButtonText,
                  purpose === item.value && styles.purposeButtonTextSelected,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Notes (Optional)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Add any notes about this visit..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          (!purpose || !location || location.accuracy > 50 || submitting) &&
            styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={!purpose || !location || location.accuracy > 50 || submitting}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Log Visit</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 32,
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4CAF50',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  accountCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  accountName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  accountType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  accountDetail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  gpsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  gpsText: {
    fontSize: 14,
    color: '#4CAF50',
  },
  warningText: {
    fontSize: 12,
    color: '#ff9800',
    marginTop: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#f44336',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  purposeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  purposeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  purposeButtonSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  purposeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  purposeButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  notesInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});
