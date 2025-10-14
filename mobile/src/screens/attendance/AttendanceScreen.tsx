import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Calendar, CheckCircle } from 'lucide-react-native';
import { useAttendance } from '../../hooks/useAttendance';
import { useLocation } from '../../hooks/useLocation';
import { api } from '../../services/api';
import { colors, spacing, typography, shadows } from '../../theme';

export const AttendanceScreen: React.FC = () => {
  const { status, loading: statusLoading } = useAttendance();
  const { getCurrentLocation, loading: locationLoading } = useLocation();
  const [submitting, setSubmitting] = useState(false);

  const formatTime = (date: Date | null) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getWorkDuration = () => {
    if (!status.checkInTime) return null;
    const endTime = status.checkOutTime || new Date();
    const durationMs = endTime.getTime() - status.checkInTime.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const handleCheckIn = async () => {
    try {
      setSubmitting(true);

      // Get current location
      const location = await getCurrentLocation();
      if (!location) {
        Alert.alert('Error', 'Could not get your location. Please enable GPS.');
        setSubmitting(false);
        return;
      }

      // Check GPS accuracy
      if (location.accuracy > 100) {
        Alert.alert(
          'Poor GPS Accuracy',
          `GPS accuracy is ${Math.round(location.accuracy)}m. Please wait for better signal (need ≤ 100m).`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Check In Anyway',
              onPress: async () => {
                await performCheckIn(location);
              },
            },
          ]
        );
        setSubmitting(false);
        return;
      }

      await performCheckIn(location);
    } catch (error: any) {
      console.error('Check-in error:', error);
      Alert.alert('Error', error.message || 'Failed to check in');
      setSubmitting(false);
    }
  };

  const performCheckIn = async (location: { latitude: number; longitude: number; accuracy: number }) => {
    try {
      await api.checkIn({
        lat: location.latitude,
        lon: location.longitude,
        accuracyM: location.accuracy,
      });

      Alert.alert('Success', 'Checked in successfully!');
      setSubmitting(false);
    } catch (error: any) {
      throw error;
    }
  };

  const handleCheckOut = async () => {
    try {
      setSubmitting(true);

      // Get current location
      const location = await getCurrentLocation();
      if (!location) {
        Alert.alert('Error', 'Could not get your location. Please enable GPS.');
        setSubmitting(false);
        return;
      }

      // Check GPS accuracy
      if (location.accuracy > 100) {
        Alert.alert(
          'Poor GPS Accuracy',
          `GPS accuracy is ${Math.round(location.accuracy)}m. Please wait for better signal (need ≤ 100m).`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Check Out Anyway',
              onPress: async () => {
                await performCheckOut(location);
              },
            },
          ]
        );
        setSubmitting(false);
        return;
      }

      await performCheckOut(location);
    } catch (error: any) {
      console.error('Check-out error:', error);
      Alert.alert('Error', error.message || 'Failed to check out');
      setSubmitting(false);
    }
  };

  const performCheckOut = async (location: { latitude: number; longitude: number; accuracy: number }) => {
    try {
      await api.checkOut({
        lat: location.latitude,
        lon: location.longitude,
        accuracyM: location.accuracy,
      });

      Alert.alert('Success', 'Checked out successfully!');
      setSubmitting(false);
    } catch (error: any) {
      throw error;
    }
  };

  if (statusLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading attendance...</Text>
      </View>
    );
  }

  const isLoading = locationLoading || submitting;
  const canCheckIn = !status.hasCheckedIn && !isLoading;
  const canCheckOut = status.hasCheckedIn && !status.hasCheckedOut && !isLoading;

  const handleViewMonthlyRecords = () => {
    Alert.alert(
      'Monthly Attendance',
      'Monthly attendance records feature coming soon!\n\nYou will be able to view:\n• All check-ins and check-outs this month\n• Total working hours\n• Days present/absent',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.title}>Attendance</Text>
            <Text style={styles.subtitle}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
          <TouchableOpacity style={styles.calendarButton} onPress={handleViewMonthlyRecords}>
            <Calendar size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {/* Status Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today's Status</Text>

          {!status.hasCheckedIn ? (
            <Text style={styles.statusText}>Not checked in</Text>
          ) : !status.hasCheckedOut ? (
            <>
              <Text style={styles.statusText}>✓ Checked in at {formatTime(status.checkInTime)}</Text>
              {getWorkDuration() && (
                <Text style={styles.durationText}>Work duration: {getWorkDuration()}</Text>
              )}
            </>
          ) : (
            <>
              <Text style={styles.statusText}>✓ Checked in at {formatTime(status.checkInTime)}</Text>
              <Text style={styles.statusText}>✓ Checked out at {formatTime(status.checkOutTime)}</Text>
              {getWorkDuration() && (
                <Text style={styles.durationText}>Total work: {getWorkDuration()}</Text>
              )}
            </>
          )}
        </View>

        {/* Action Button */}
        {canCheckIn && (
          <TouchableOpacity
            style={[styles.actionButton, styles.checkInButton]}
            onPress={handleCheckIn}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>CHECK IN</Text>
            )}
          </TouchableOpacity>
        )}

        {canCheckOut && (
          <TouchableOpacity
            style={[styles.actionButton, styles.checkOutButton]}
            onPress={handleCheckOut}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>CHECK OUT</Text>
            )}
          </TouchableOpacity>
        )}

        {status.hasCheckedOut && (
          <View style={styles.completedCard}>
            <CheckCircle size={20} color={colors.success} />
            <Text style={styles.completedText}>
              Attendance marked for today
            </Text>
          </View>
        )}
      </View>
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
    paddingBottom: spacing.xl * 1.5,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: '#fff',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: '#fff',
    opacity: 0.9,
  },
  calendarButton: {
    padding: spacing.md,
    borderRadius: spacing.borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  content: {
    flex: 1,
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  cardTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  statusText: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  durationText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  actionButton: {
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 2,
  },
  checkInButton: {
    backgroundColor: colors.success,
    borderColor: '#2EA043',
  },
  checkOutButton: {
    backgroundColor: colors.error,
    borderColor: colors.errorDark,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  completedCard: {
    backgroundColor: colors.successLight,
    borderRadius: spacing.borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.success,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  completedText: {
    fontSize: typography.fontSize.base,
    color: colors.successDark,
    fontWeight: typography.fontWeight.semiBold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
});
