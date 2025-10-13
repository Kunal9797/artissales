import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore, doc, getDoc } from '@react-native-firebase/firestore';
import { Card, Logo } from '../components/ui';
import { TargetProgressCard } from '../components/TargetProgressCard';
import { colors, spacing, typography, shadows } from '../theme';
import {
  MapPin,
  Building2,
  IndianRupee,
  FileBarChart,
  ClipboardList,
  User,
  Palette,
  ChevronRight,
} from 'lucide-react-native';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const authInstance = getAuth();
  const user = authInstance.currentUser;
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    const loadUserData = async () => {
      if (user?.uid) {
        try {
          const firestore = getFirestore();
          const userDocRef = doc(firestore, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            const role = userData?.role || 'rep';
            setUserName(userData?.name || 'User');

            // Redirect managers to ManagerHomeScreen
            if (role === 'national_head' || role === 'admin') {
              navigation.replace('ManagerHome');
            }
          }
        } catch (error) {
          console.error('Error loading user data:', error);
          setUserName('User');
        }
      }
    };

    loadUserData();
  }, [user?.uid, navigation]);

  return (
    <View style={styles.container}>
      {/* Header with Brand Background Color */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Logo variant="trans-artis" size="large" style={styles.logo} />
            <View style={styles.headerText}>
              <Text style={styles.title}>Artis Sales</Text>
              <Text style={styles.subtitle}>Welcome {userName || 'User'}!</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <User size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>

        {/* Target Progress Card with Log Button */}
        {user?.uid && (
          <TargetProgressCard
            userId={user.uid}
            month={new Date().toISOString().substring(0, 7)}
            onLogPress={() => navigation.navigate('SheetsEntry')}
            style={{ marginBottom: spacing.md }}
          />
        )}

        {/* Feature Cards with Lucide Icons */}
        <Card elevation="md" onPress={() => navigation.navigate('Attendance')} style={styles.menuCard}>
          <View style={styles.menuCardContent}>
            <View style={[styles.iconContainer, { backgroundColor: colors.accent + '20' }]}>
              <MapPin size={24} color={colors.accent} />
            </View>
            <Text style={styles.menuCardText}>Attendance</Text>
          </View>
          <ChevronRight size={24} color={colors.text.tertiary} />
        </Card>

        <Card elevation="md" onPress={() => navigation.navigate('SelectAccount')} style={styles.menuCard}>
          <View style={styles.menuCardContent}>
            <View style={[styles.iconContainer, { backgroundColor: colors.accent + '20' }]}>
              <Building2 size={24} color={colors.accent} />
            </View>
            <Text style={styles.menuCardText}>Log Visit</Text>
          </View>
          <ChevronRight size={24} color={colors.text.tertiary} />
        </Card>

        <Card elevation="md" onPress={() => navigation.navigate('ExpenseEntry')} style={styles.menuCard}>
          <View style={styles.menuCardContent}>
            <View style={[styles.iconContainer, { backgroundColor: colors.accent + '20' }]}>
              <IndianRupee size={24} color={colors.accent} />
            </View>
            <Text style={styles.menuCardText}>Report Expense</Text>
          </View>
          <ChevronRight size={24} color={colors.text.tertiary} />
        </Card>

        <Card elevation="md" onPress={() => navigation.navigate('DSR')} style={styles.menuCard}>
          <View style={styles.menuCardContent}>
            <View style={[styles.iconContainer, { backgroundColor: colors.accent + '20' }]}>
              <ClipboardList size={24} color={colors.accent} />
            </View>
            <Text style={styles.menuCardText}>Daily Report (DSR)</Text>
          </View>
          <ChevronRight size={24} color={colors.text.tertiary} />
        </Card>

        {/* Design System Demo */}
        <Card elevation="md" onPress={() => navigation.navigate('KitchenSink')} style={[styles.menuCard, { backgroundColor: colors.accent }]}>
          <View style={styles.menuCardContent}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
              <Palette size={24} color="#fff" />
            </View>
            <Text style={[styles.menuCardText, { color: '#fff' }]}>Design System Demo</Text>
          </View>
          <ChevronRight size={24} color="#fff" />
        </Card>

        <Card elevation="sm" style={styles.noteCard}>
          <Text style={styles.noteTitle}>Coming Soon</Text>
          <Text style={styles.noteText}>• Leads management</Text>
          <Text style={styles.noteText}>• Performance analytics</Text>
          <Text style={styles.noteText}>• Manager dashboard</Text>
        </Card>

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
    backgroundColor: colors.primary,  // Brand Background #393735
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.xl + spacing.sm,
    ...shadows.lg,
    elevation: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    flex: 1,
  },
  logo: {
    // Extra styling for logo if needed
  },
  headerText: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    ...typography.styles.h2,
    color: colors.text.inverse,
    fontWeight: '700',
    marginBottom: spacing.xs / 4,
  },
  subtitle: {
    ...typography.styles.body,
    color: colors.text.inverse,
    opacity: 0.9,
    fontSize: 15,
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.screenPadding,
  },
  menuCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  menuCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: spacing.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuCardText: {
    ...typography.styles.h4,
    color: colors.text.primary,
  },
  noteCard: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  noteTitle: {
    ...typography.styles.h4,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  noteText: {
    ...typography.styles.body,
    color: colors.text.secondary,
    marginBottom: spacing.xs / 2,
  },
});
