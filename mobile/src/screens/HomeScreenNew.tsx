/**
 * Home Screen - New Design
 * Corporate Blue + Yellower Gold theme with Lucide icons
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { getAuth, signOut } from '@react-native-firebase/auth';
import { Button, Card } from '../components/ui';
import { colors, typography, spacing, shadows } from '../theme';
import {
  MapPin,
  Building2,
  DollarSign,
  FileBarChart,
  ClipboardList,
  Palette,
  User,
  LogOut,
  ArrowRight,
} from 'lucide-react-native';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreenNew: React.FC<HomeScreenProps> = ({ navigation }) => {
  const authInstance = getAuth();
  const user = authInstance.currentUser;

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(authInstance);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const MenuItem = ({
    icon: Icon,
    title,
    onPress,
    accentColor,
  }: {
    icon: any;
    title: string;
    onPress: () => void;
    accentColor?: string;
  }) => (
    <Card onPress={onPress} elevation="md" padding="md" style={styles.menuCard}>
      <View style={styles.menuContent}>
        <View style={styles.menuLeft}>
          <View style={[styles.iconContainer, accentColor && { backgroundColor: accentColor + '15' }]}>
            <Icon size={24} color={accentColor || colors.accent} />
          </View>
          <Text style={styles.menuTitle}>{title}</Text>
        </View>
        <ArrowRight size={20} color={colors.text.tertiary} />
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      {/* Header with Corporate Blue */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {/* Peacock Icon Placeholder - TODO: Replace with actual logo-icon.png */}
          <View style={styles.logoIcon}>
            <Text style={styles.logoText}>A</Text>
          </View>

          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>Artis Sales</Text>
            <Text style={styles.headerSubtitle}>Welcome back!</Text>
          </View>

          <Button
            onPress={() => navigation.navigate('Profile')}
            variant="ghost"
            size="small"
            style={styles.profileButton}
            leftIcon={<User size={24} color="#fff" />}
          >
            <Text />
          </Button>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

        {/* Main Menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <MenuItem
            icon={MapPin}
            title="Attendance"
            onPress={() => navigation.navigate('Attendance')}
          />

          <MenuItem
            icon={Building2}
            title="Log Visit"
            onPress={() => navigation.navigate('SelectAccount')}
          />

          <MenuItem
            icon={DollarSign}
            title="Report Expense"
            onPress={() => navigation.navigate('ExpenseEntry')}
          />

          <MenuItem
            icon={FileBarChart}
            title="Log Sheet Sales"
            onPress={() => navigation.navigate('SheetsEntry')}
          />

          <MenuItem
            icon={ClipboardList}
            title="Daily Report (DSR)"
            onPress={() => navigation.navigate('DSR')}
          />
        </View>

        {/* Design System Demo */}
        <Card
          onPress={() => navigation.navigate('KitchenSink')}
          elevation="lg"
          padding="lg"
          style={styles.demoCard}
        >
          <View style={styles.demoContent}>
            <View style={styles.demoLeft}>
              <View style={styles.demoIconContainer}>
                <Palette size={28} color="#fff" />
              </View>
              <View>
                <Text style={styles.demoTitle}>Design System</Text>
                <Text style={styles.demoSubtitle}>Preview themes & components</Text>
              </View>
            </View>
            <ArrowRight size={24} color="#fff" />
          </View>
        </Card>

        {/* Coming Soon */}
        <View style={styles.comingSoonCard}>
          <Text style={styles.comingSoonTitle}>Coming Soon</Text>
          <Text style={styles.comingSoonText}>
            • Leads management{'\n'}
            • Performance analytics{'\n'}
            • Manager dashboard
          </Text>
        </View>

        {/* Sign Out Button */}
        <Button
          onPress={handleSignOut}
          variant="outline"
          fullWidth
          leftIcon={<LogOut size={20} color={colors.error} />}
          style={styles.signOutButton}
          textStyle={{ color: colors.error }}
        >
          Sign Out
        </Button>

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

  // Header (Corporate Blue)
  header: {
    backgroundColor: colors.primary,
    paddingTop: 60, // Status bar
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.screenPadding,
    ...shadows.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logoIcon: {
    width: 48,
    height: 48,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.accent, // Yellower gold
  },
  headerTitles: {
    flex: 1,
  },
  headerTitle: {
    ...typography.styles.h3,
    color: colors.text.inverse,
    marginBottom: 2,
  },
  headerSubtitle: {
    ...typography.styles.bodySmall,
    color: colors.text.inverse,
    opacity: 0.9,
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: spacing.borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },

  // Scroll Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.screenPadding,
  },

  // Section
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.styles.h4,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },

  // Menu Items
  menuCard: {
    marginBottom: spacing.md,
  },
  menuContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.accentLight + '30', // Light gold tint
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTitle: {
    ...typography.styles.bodyLarge,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.semiBold,
  },

  // Design System Demo Card
  demoCard: {
    backgroundColor: colors.accent, // Yellower gold
    marginBottom: spacing.lg,
  },
  demoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  demoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  demoIconContainer: {
    width: 56,
    height: 56,
    borderRadius: spacing.borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  demoTitle: {
    ...typography.styles.h4,
    color: '#fff',
    marginBottom: 4,
  },
  demoSubtitle: {
    ...typography.styles.bodySmall,
    color: '#fff',
    opacity: 0.9,
  },

  // Coming Soon
  comingSoonCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  comingSoonTitle: {
    ...typography.styles.label,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  comingSoonText: {
    ...typography.styles.bodySmall,
    color: colors.text.tertiary,
    lineHeight: 22,
  },

  // Sign Out Button
  signOutButton: {
    borderColor: colors.error,
    borderWidth: 1.5,
  },
});
