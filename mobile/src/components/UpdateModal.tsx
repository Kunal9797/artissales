import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { Download, ArrowRight, X } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface UpdateModalProps {
  visible: boolean;
  forceUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  updateMessage?: string;
  onUpdate: () => void;
  onDismiss: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  visible,
  forceUpdate,
  currentVersion,
  latestVersion,
  updateMessage,
  onUpdate,
  onDismiss,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Close button */}
          {!forceUpdate && (
            <TouchableOpacity style={styles.closeBtn} onPress={onDismiss}>
              <X size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}

          {/* Title */}
          <Text style={[styles.title, forceUpdate && styles.titleForce]}>
            {forceUpdate ? 'Update Required' : 'Update Available'}
          </Text>

          {/* App icon + Version row */}
          <View style={styles.appRow}>
            {/* App icon (like home screen icon) */}
            <View style={styles.appIcon}>
              <Image
                source={require('../../assets/images/artislogo_blackbgrd.png')}
                style={styles.appIconImage}
                resizeMode="contain"
              />
            </View>

            {/* Version info */}
            <View style={styles.versionInfo}>
              <Text style={styles.appName}>Artis Sales</Text>
              <View style={styles.versionRow}>
                <Text style={styles.versionOld}>{currentVersion}</Text>
                <ArrowRight size={14} color="#9CA3AF" />
                <Text style={styles.versionNew}>{latestVersion}</Text>
              </View>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.description}>
            {updateMessage || (forceUpdate
              ? 'This update is required to continue using the app.'
              : 'A new version with improvements is available.')}
          </Text>

          {/* Update button */}
          <TouchableOpacity
            style={[styles.updateBtn, forceUpdate && styles.updateBtnForce]}
            onPress={onUpdate}
            activeOpacity={0.9}
          >
            <Download size={18} color="#fff" />
            <Text style={styles.updateBtnText}>Update Now</Text>
          </TouchableOpacity>

          {/* Later button */}
          {!forceUpdate && (
            <TouchableOpacity style={styles.skipBtn} onPress={onDismiss}>
              <Text style={styles.skipBtnText}>Later</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: width - 48,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 20,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  titleForce: {
    color: '#DC2626',
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  appIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#393735',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  appIconImage: {
    width: '100%',
    height: '100%',
  },
  versionInfo: {
    marginLeft: 16,
    flex: 1,
  },
  appName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  versionOld: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  versionNew: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  updateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#393735',
    paddingVertical: 14,
    borderRadius: 12,
  },
  updateBtnForce: {
    backgroundColor: '#DC2626',
  },
  updateBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
  },
});
