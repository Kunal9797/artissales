import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Download, AlertTriangle } from 'lucide-react-native';
import { colors, typography, spacing } from '../theme';

interface UpdateModalProps {
  visible: boolean;
  forceUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  updateMessage: string;
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
        <View style={styles.container}>
          {/* Icon */}
          <View style={[styles.iconContainer, forceUpdate && styles.iconContainerForce]}>
            {forceUpdate ? (
              <AlertTriangle size={32} color="#D32F2F" />
            ) : (
              <Download size={32} color={colors.accent} />
            )}
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {forceUpdate ? 'Update Required' : 'Update Available'}
          </Text>

          {/* Version info */}
          <Text style={styles.versionText}>
            v{currentVersion} → v{latestVersion}
          </Text>

          {/* Message */}
          <Text style={styles.message}>{updateMessage}</Text>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.updateButton}
              onPress={onUpdate}
              activeOpacity={0.8}
            >
              <Download size={18} color="#fff" />
              <Text style={styles.updateButtonText}>Update Now</Text>
            </TouchableOpacity>

            {!forceUpdate && (
              <TouchableOpacity
                style={styles.laterButton}
                onPress={onDismiss}
                activeOpacity={0.7}
              >
                <Text style={styles.laterButtonText}>Later</Text>
              </TouchableOpacity>
            )}
          </View>

          {forceUpdate && (
            <Text style={styles.forceText}>
              This update is required to continue using the app.
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.screenPadding,
  },
  container: {
    width: width - 48,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainerForce: {
    backgroundColor: '#FFEBEE',
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  versionText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginBottom: 12,
  },
  message: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  updateButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: '#fff',
  },
  laterButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  laterButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.text.tertiary,
  },
  forceText: {
    fontSize: typography.fontSize.xs,
    color: '#D32F2F',
    textAlign: 'center',
    marginTop: 16,
  },
});
