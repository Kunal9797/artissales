/**
 * Sync Status Indicator
 * Shows upload queue and data queue status with visual feedback
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Upload, CheckCircle, AlertCircle, RefreshCw, X } from 'lucide-react-native';
import { uploadQueue, QueueItem } from '../services/uploadQueue';
import { dataQueue, DataQueueItem } from '../services/dataQueue';

export const SyncStatusIndicator: React.FC = () => {
  const [uploadQueueItems, setUploadQueueItems] = useState<QueueItem[]>([]);
  const [dataQueueItems, setDataQueueItems] = useState<DataQueueItem[]>([]);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Initialize data queue
    dataQueue.init();

    // Subscribe to upload queue changes
    const unsubscribeUpload = uploadQueue.subscribe((newQueue) => {
      setUploadQueueItems(newQueue);
    });

    // Subscribe to data queue changes
    const unsubscribeData = dataQueue.subscribe((newQueue) => {
      setDataQueueItems(newQueue);
    });

    // Initial load
    setUploadQueueItems(uploadQueue.getQueue());
    setDataQueueItems(dataQueue.getQueue());

    return () => {
      unsubscribeUpload();
      unsubscribeData();
    };
  }, []);

  // Calculate totals from both queues
  const uploadPending = uploadQueueItems.filter(
    item => item.status === 'pending' || item.status === 'uploading'
  ).length;
  const uploadFailed = uploadQueueItems.filter(item => item.status === 'failed').length;

  const dataPending = dataQueueItems.filter(
    item => item.status === 'pending' || item.status === 'syncing'
  ).length;
  const dataFailed = dataQueueItems.filter(item => item.status === 'failed').length;

  const totalPending = uploadPending + dataPending;
  const totalFailed = uploadFailed + dataFailed;
  const totalItems = uploadQueueItems.length + dataQueueItems.length;

  // Animate visibility
  useEffect(() => {
    if (totalItems > 0) {
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
  }, [totalItems, fadeAnim]);

  if (totalItems === 0) {
    return null;
  }

  const handleRetryFailed = () => {
    uploadQueue.retryFailed();
    dataQueue.retryAllFailed();
  };

  const handleDismissFailed = () => {
    // Remove all failed items from both queues
    uploadQueueItems
      .filter(item => item.status === 'failed')
      .forEach(item => uploadQueue.removeFromQueue(item.id));
    dataQueueItems
      .filter(item => item.status === 'failed')
      .forEach(item => dataQueue.removeItem(item.id));
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {totalPending > 0 && (
        <View style={styles.badge}>
          <Upload size={14} color="#FFFFFF" />
          <Text style={styles.badgeText}>
            Syncing {totalPending} {totalPending === 1 ? 'item' : 'items'}...
          </Text>
        </View>
      )}

      {totalFailed > 0 && (
        <View style={styles.failedContainer}>
          <View style={styles.failedBadge}>
            <AlertCircle size={14} color="#FFFFFF" />
            <Text style={styles.badgeText}>
              {totalFailed} failed
            </Text>
          </View>
          <TouchableOpacity style={styles.actionButton} onPress={handleRetryFailed}>
            <RefreshCw size={14} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dismissButton} onPress={handleDismissFailed}>
            <X size={14} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
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
  failedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  failedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D32F2F',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1976D2',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  dismissButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#757575',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
