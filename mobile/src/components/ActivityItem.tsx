/**
 * ActivityItem Component - Memoized for performance
 *
 * Extracted from HomeScreen_v2 to prevent unnecessary re-renders.
 * Uses React.memo with custom comparison to only re-render when activity data changes.
 */

import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import {
  MapPin,
  FileText,
  IndianRupee,
  CheckCircle,
  Clock,
  CloudUpload,
  RefreshCw,
} from 'lucide-react-native';
import { colors, featureColors } from '../theme';
import { dataQueue } from '../services/dataQueue';

// Activity type definition
export interface Activity {
  id: string;
  type: 'visit' | 'sheets' | 'expense' | 'attendance';
  time: Date;
  description: string;
  value?: string;
  detail?: string;
  notes?: string;
  purpose?: string;
  status?: 'pending' | 'verified' | 'approved' | 'rejected';
  syncStatus?: 'pending' | 'syncing' | 'failed';
  photos?: string[];
}

interface ActivityItemProps {
  activity: Activity;
  onPress: (activity: Activity) => void;
}

// Helper to get compact time format
const getCompactTime = (activityTime: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - activityTime.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return activityTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Helper to get activity icon
const getActivityIcon = (type: Activity['type']) => {
  switch (type) {
    case 'visit':
      return <MapPin size={24} color={featureColors.visits.primary} />;
    case 'sheets':
      return <FileText size={24} color={featureColors.sheets.primary} />;
    case 'expense':
      return <IndianRupee size={24} color={featureColors.expenses.primary} />;
    default:
      return <CheckCircle size={24} color={featureColors.attendance.primary} />;
  }
};

// Helper to get status icon
const getStatusIcon = (activity: Activity) => {
  if (activity.type !== 'sheets' && activity.type !== 'expense') return null;

  // Sync status takes priority (offline pending items)
  if (activity.syncStatus) {
    switch (activity.syncStatus) {
      case 'pending':
      case 'syncing':
        return <CloudUpload size={16} color="#1976D2" />;
      case 'failed':
        return (
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                'Sync Failed',
                'This item failed to sync. Would you like to retry?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Retry', onPress: () => dataQueue.retryItem(activity.id) },
                ]
              );
            }}
          >
            <RefreshCw size={16} color="#D32F2F" />
          </TouchableOpacity>
        );
    }
  }

  // Manager review status
  const status = activity.status || 'pending';
  switch (status) {
    case 'pending':
      return <Clock size={16} color="#F9A825" />;
    case 'verified':
    case 'approved':
      return <CheckCircle size={16} color="#2E7D32" />;
    case 'rejected':
      return (
        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#C62828' }}>✕</Text>
        </View>
      );
    default:
      return <Clock size={16} color="#F9A825" />;
  }
};

const ActivityItemComponent: React.FC<ActivityItemProps> = ({ activity, onPress }) => {
  const isPendingSync = !!activity.syncStatus;

  const handlePress = () => {
    if (isPendingSync) {
      Alert.alert(
        'Waiting to Sync',
        'This entry will be uploaded when you\'re back online. You can edit it after it syncs.',
        [{ text: 'OK' }]
      );
    } else {
      onPress(activity);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      style={{
        backgroundColor: colors.surface,
        borderRadius: 10,
        paddingVertical: 14,
        paddingHorizontal: 14,
        marginBottom: 8,
        borderWidth: isPendingSync ? 2 : 1,
        borderColor: isPendingSync ? '#1976D2' : colors.border.light,
        borderStyle: isPendingSync ? 'dashed' : 'solid',
      }}
    >
      {/* Single row: Icon + Value • Detail • Time + Status */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {/* Icon without background */}
        {getActivityIcon(activity.type)}

        {/* Content: Value • Detail • Time */}
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
          <Text style={{
            fontSize: (activity.type === 'sheets' || activity.type === 'expense') ? 19 : 17,
            fontWeight: '600',
            color: colors.text.primary
          }}>
            {activity.value || activity.description}
          </Text>
          {activity.detail && (
            <Text style={{ fontSize: 15, color: colors.text.secondary, marginLeft: 6 }}>
              • {activity.detail}
            </Text>
          )}
          <Text style={{ fontSize: 13, color: colors.text.tertiary, marginLeft: 6 }}>
            • {getCompactTime(activity.time)}
          </Text>
        </View>

        {/* Status icon for sheets/expenses */}
        {getStatusIcon(activity)}
      </View>
    </TouchableOpacity>
  );
};

// Memoized component with custom comparison
export const ActivityItem = React.memo(ActivityItemComponent, (prevProps, nextProps) => {
  // Only re-render if these specific properties change
  return (
    prevProps.activity.id === nextProps.activity.id &&
    prevProps.activity.syncStatus === nextProps.activity.syncStatus &&
    prevProps.activity.status === nextProps.activity.status &&
    prevProps.activity.value === nextProps.activity.value &&
    prevProps.activity.detail === nextProps.activity.detail &&
    prevProps.activity.notes === nextProps.activity.notes
  );
});

ActivityItem.displayName = 'ActivityItem';
