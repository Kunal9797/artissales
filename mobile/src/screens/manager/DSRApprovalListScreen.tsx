import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { ClipboardList, ChevronRight, Calendar } from 'lucide-react-native';
import { api } from '../../services/api';

interface DSRApprovalListScreenProps {
  navigation: any;
}

interface DSRItem {
  id: string;
  userId: string;
  userName: string;
  date: string;
  totalVisits: number;
  totalSheetsSold: number;
  totalExpenses: number;
  status: 'pending' | 'approved' | 'needs_revision';
  generatedAt: string | null;
}

export const DSRApprovalListScreen: React.FC<DSRApprovalListScreenProps> = ({ navigation }) => {
  const [dsrs, setDsrs] = useState<DSRItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDSRs();
  }, []);

  const loadDSRs = async () => {
    setLoading(true);
    try {
      const response = await api.getPendingDSRs({});
      console.log('[DSRApprovalList] DSRs loaded:', response);
      if (response.ok && response.dsrs) {
        setDsrs(response.dsrs);
      }
    } catch (error: any) {
      console.error('[DSRApprovalList] Error loading DSRs:', error);
      Alert.alert('Error', 'Failed to load pending DSRs');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    loadDSRs();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>DSR Approvals</Text>
        <Text style={styles.subtitle}>Review daily sales reports</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} colors={[colors.accent]} />
        }
      >
        {dsrs.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <ClipboardList size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyStateText}>No pending DSRs</Text>
            <Text style={styles.emptyStateSubtext}>All reports have been reviewed</Text>
          </View>
        )}

        {dsrs.map((dsr) => (
          <TouchableOpacity
            key={dsr.id}
            style={styles.dsrCard}
            onPress={() => navigation.navigate('DSRApprovalDetail', { dsrId: dsr.id })}
          >
            <View style={styles.dsrCardHeader}>
              <View>
                <Text style={styles.dsrUserName}>{dsr.userName}</Text>
                <View style={styles.dsrDateRow}>
                  <Calendar size={14} color={colors.text.tertiary} />
                  <Text style={styles.dsrDate}>{formatDate(dsr.date)}</Text>
                </View>
              </View>
              <ChevronRight size={24} color={colors.text.tertiary} />
            </View>

            <View style={styles.dsrStats}>
              <View style={styles.dsrStatItem}>
                <Text style={styles.dsrStatValue}>{dsr.totalVisits}</Text>
                <Text style={styles.dsrStatLabel}>Visits</Text>
              </View>
              <View style={styles.dsrStatItem}>
                <Text style={styles.dsrStatValue}>{dsr.totalSheetsSold}</Text>
                <Text style={styles.dsrStatLabel}>Sheets</Text>
              </View>
              <View style={styles.dsrStatItem}>
                <Text style={styles.dsrStatValue}>₹{dsr.totalExpenses}</Text>
                <Text style={styles.dsrStatLabel}>Expenses</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

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
  header: {
    backgroundColor: colors.primary,
    paddingTop: 60,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.screenPadding,
  },
  backButton: {
    color: colors.accent,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 3,
  },
  emptyStateText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  emptyStateSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  dsrCard: {
    backgroundColor: '#fff',
    padding: spacing.lg,
    borderRadius: spacing.borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  dsrCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dsrUserName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  dsrDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  dsrDate: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  dsrStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  dsrStatItem: {
    alignItems: 'center',
  },
  dsrStatValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
    marginBottom: spacing.xs / 2,
  },
  dsrStatLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
});
