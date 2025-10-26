/**
 * Sync Status Indicator
 * Shows upload queue status with visual feedback
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Upload, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react-native';
import { uploadQueue, QueueItem } from '../services/uploadQueue';

export const SyncStatusIndicator: React.FC = () => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Subscribe to queue changes
    const unsubscribe = uploadQueue.subscribe((newQueue) => {
      setQueue(newQueue);

      // Fade in when items are present
      if (newQueue.length > 0) {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    });

    // Initial load
    setQueue(uploadQueue.getQueue());

    return unsubscribe;
  }, []);

  const pendingCount = queue.filter(
    item => item.status === 'pending' || item.status === 'uploading'
  ).length;
  const failedCount = queue.filter(item => item.status === 'failed').length;

  if (queue.length === 0) {
    return null;
  }

  const handleRetryFailed = () => {
    uploadQueue.retryFailed();
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {pendingCount > 0 && (
        <View style={styles.badge}>
          <Upload size={14} color="#FFFFFF" />
          <Text style={styles.badgeText}>
            Syncing {pendingCount} {pendingCount === 1 ? 'item' : 'items'}...
          </Text>
        </View>
      )}

      {failedCount > 0 && (
        <TouchableOpacity style={styles.failedBadge} onPress={handleRetryFailed}>
          <AlertCircle size={14} color="#FFFFFF" />
          <Text style={styles.badgeText}>
            {failedCount} failed
          </Text>
          <RefreshCw size={12} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80, // Above bottom nav
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 1000,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1976D2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  failedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D32F2F',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
