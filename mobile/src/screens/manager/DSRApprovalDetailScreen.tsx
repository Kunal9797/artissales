import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, typography } from '../../theme';
import {
  Clock,
  Building2,
  FileBarChart,
  Wallet,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';
import { api } from '../../services/api';
import { getFirestore, doc, getDoc } from '@react-native-firebase/firestore';

interface DSRApprovalDetailScreenProps {
  navigation: any;
  route: any;
}

interface DSRDetail {
  id: string;
  userId: string;
  userName: string;
  date: string;
  checkInAt?: any;
  checkOutAt?: any;
  totalVisits: number;
  visitIds: string[];
  sheetsSales: Array<{ catalog: string; totalSheets: number }>;
  totalSheetsSold: number;
  expenses: Array<{ category: string; totalAmount: number }>;
  totalExpenses: number;
  status: string;
  managerComments?: string;
}

export const DSRApprovalDetailScreen: React.FC<DSRApprovalDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const { dsrId } = route.params;
  const [dsr, setDsr] = useState<DSRDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDSR();
  }, []);

  const loadDSR = async () => {
    try {
      const db = getFirestore();
      const dsrDocRef = doc(db, 'dsrReports', dsrId);
      const dsrDoc = await getDoc(dsrDocRef);

      if (dsrDoc.exists()) {
        const data = dsrDoc.data();
        // Get user name
        const userDocRef = doc(db, 'users', data.userId);
        const userDoc = await getDoc(userDocRef);
        const userName = userDoc.exists() ? userDoc.data()?.name : 'Unknown';

        setDsr({
          id: dsrDoc.id,
          ...data,
          userName,
        } as DSRDetail);
      }
    } catch (error) {
      console.error('[DSRDetail] Error loading DSR:', error);
      Alert.alert('Error', 'Failed to load DSR details');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    Alert.alert('Approve DSR', 'Are you sure you want to approve this report?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          setSubmitting(true);
          try {
            await api.reviewDSR({
              reportId: dsrId,
              status: 'approved',
              comments: comments.trim() || undefined,
            });
            Alert.alert('Success', 'DSR approved successfully', [
              {
                text: 'OK',
                onPress: () => navigation.goBack(),
              },
            ]);
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to approve DSR');
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  };

  const handleRequestRevision = async () => {
    if (comments.trim().length === 0) {
      Alert.alert('Comments Required', 'Please add comments explaining what needs revision');
      return;
    }

    Alert.alert(
      'Request Revision',
      'This will send the report back to the rep for revision.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Revision',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              await api.reviewDSR({
                reportId: dsrId,
                status: 'needs_revision',
                comments: comments.trim(),
              });
              Alert.alert('Success', 'Revision requested successfully', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to request revision');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!dsr) {
    return (
      <View style={styles.loadingContainer}>
        <Text>DSR not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{dsr.userName}</Text>
        <Text style={styles.subtitle}>
          {new Date(dsr.date).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Attendance Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={20} color={colors.accent} />
            <Text style={styles.sectionTitle}>Attendance</Text>
          </View>
          <View style={styles.attendanceRow}>
            <View style={styles.attendanceItem}>
              <Text style={styles.attendanceLabel}>Check In</Text>
              <Text style={styles.attendanceValue}>{formatTime(dsr.checkInAt)}</Text>
            </View>
            <View style={styles.attendanceItem}>
              <Text style={styles.attendanceLabel}>Check Out</Text>
              <Text style={styles.attendanceValue}>{formatTime(dsr.checkOutAt)}</Text>
            </View>
          </View>
        </View>

        {/* Visits Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Building2 size={20} color="#2196F3" />
            <Text style={styles.sectionTitle}>Visits</Text>
          </View>
          <Text style={styles.sectionValue}>{dsr.totalVisits} visits logged</Text>
        </View>

        {/* Sheets Sales Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FileBarChart size={20} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Sheets Sold</Text>
          </View>
          <Text style={styles.sectionValue}>{dsr.totalSheetsSold} sheets total</Text>
          {dsr.sheetsSales && dsr.sheetsSales.length > 0 && (
            <View style={styles.detailsList}>
              {dsr.sheetsSales.map((item, index) => (
                <View key={index} style={styles.detailItem}>
                  <Text style={styles.detailLabel}>{item.catalog}</Text>
                  <Text style={styles.detailValue}>{item.totalSheets} sheets</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Expenses Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Wallet size={20} color="#FF9800" />
            <Text style={styles.sectionTitle}>Expenses</Text>
          </View>
          <Text style={styles.sectionValue}>₹{dsr.totalExpenses} total</Text>
          {dsr.expenses && dsr.expenses.length > 0 && (
            <View style={styles.detailsList}>
              {dsr.expenses.map((item, index) => (
                <View key={index} style={styles.detailItem}>
                  <Text style={styles.detailLabel}>
                    {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                  </Text>
                  <Text style={styles.detailValue}>₹{item.totalAmount}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Comments Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manager Comments</Text>
          <TextInput
            style={styles.commentsInput}
            placeholder="Add your comments (optional for approval, required for revision)"
            placeholderTextColor={colors.text.tertiary}
            multiline
            numberOfLines={4}
            value={comments}
            onChangeText={setComments}
            editable={!submitting}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={handleRequestRevision}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <XCircle size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Request Revision</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={handleApprove}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <CheckCircle size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Approve</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  section: {
    backgroundColor: '#fff',
    padding: spacing.lg,
    borderRadius: spacing.borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  sectionValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  attendanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  attendanceItem: {
    alignItems: 'center',
  },
  attendanceLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs / 2,
  },
  attendanceValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
  },
  detailsList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  detailLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  commentsInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.md,
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
  },
});
