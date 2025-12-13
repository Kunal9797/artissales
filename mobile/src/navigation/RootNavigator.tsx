import React, { useState, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, NavigationState } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { useAuth } from '../hooks/useAuth';
import { trackScreenView } from '../services/analytics';
import { TabNavigator } from './TabNavigator';
import { ManagerTabNavigator } from './ManagerTabNavigator';
import { LoginScreen } from '../screens/LoginScreen';
import { OTPScreen } from '../screens/OTPScreen';
// import { AttendanceScreen } from '../screens/attendance/AttendanceScreen'; // REMOVED - Now handled by modal in HomeScreen
import { SelectAccountScreen } from '../screens/visits/SelectAccountScreen';
import { LogVisitScreen } from '../screens/visits/LogVisitScreen';
import { ExpenseEntryScreen } from '../screens/expenses/ExpenseEntryScreen';
import { CompactSheetsEntryScreen } from '../screens/sheets/CompactSheetsEntryScreen';
import { SheetsDesignPreview } from '../screens/sheets/SheetsDesignPreview';
import { ExpenseDesignPreview } from '../screens/expenses/ExpenseDesignPreview';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { KitchenSinkScreen } from '../screens/KitchenSinkScreen';
import { DesignLabScreen } from '../screens/DesignLabScreen';
// DISABLED FOR V1 LAUNCH - Re-enable after attendance decision finalized
// import { HomeScreenV3 } from '../screens/HomeScreen_v3';
import { KitchenSinkScreen as AccountDesignKitchenSink } from '../screens/design/KitchenSinkScreen';
// Incrementally re-enabling manager stack screens as we test them
import { AddUserScreen } from '../screens/manager/AddUserScreen';
import { UserDetailScreen } from '../screens/manager/UserDetailScreen';
import { SetTargetScreen } from '../screens/manager/SetTargetScreen';
import { AddAccountScreen } from '../screens/AddAccountScreen';
import { EditAccountScreen } from '../screens/EditAccountScreen';
import { AccountDetailScreen } from '../screens/manager/AccountDetailScreen';
// import { TeamTargetsScreen } from '../screens/manager/TeamTargetsScreen';
import { DocumentsScreen } from '../screens/DocumentsScreen';
import { UploadDocumentScreen } from '../screens/UploadDocumentScreen';
import { ManageDownloadsScreen } from '../screens/ManageDownloadsScreen';
import { AttendanceHistoryScreen } from '../screens/AttendanceHistoryScreen';
import { TeamStatsScreen } from '../screens/manager/TeamStatsScreen';
import { TeamScreen } from '../screens/manager/TeamScreenSimple';

export type RootStackParamList = {
  Home: undefined;
  // HomeV3: undefined; // DISABLED - New design prototype (attendance-free)
  ManagerHome: undefined;
  Attendance: undefined;
  SelectAccount: { editActivityId?: string };
  LogVisit: { account?: { id: string; name: string; type: string }; editActivityId?: string };
  ExpenseEntry: { editActivityId?: string };
  ExpenseDesignPreview: undefined;
  SheetsEntry: { editActivityId?: string };
  SheetsDesignPreview: undefined;
  Profile: undefined;
  KitchenSink: undefined;
  AccountDesignKitchenSink: undefined;
  DesignLab: undefined;
  AddUser: undefined;
  UserList: undefined;
  UserDetail: { userId: string };
  AccountsList: undefined;
  AccountDetail: { accountId: string };
  AddAccount: { preSelectedType?: string; onAccountCreated?: (accountId: string) => void };
  EditAccount: { account: any; onAccountUpdated?: () => void };
  SetTarget: { userId: string; userName: string; currentMonth: string };
  TeamTargets: undefined;
  TeamStats: undefined;
  Documents: undefined;
  UploadDocument: { onUploadSuccess?: () => void };
  ManageDownloads: { onDelete?: () => void };
  AttendanceHistory: { userId?: string; userName?: string } | undefined;
  Login: undefined;
  OTP: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Get the active route name from navigation state.
 * Handles nested navigators (like tabs).
 */
const getActiveRouteName = (state: NavigationState | undefined): string | undefined => {
  if (!state) return undefined;

  const route = state.routes[state.index];

  // Dive into nested navigators
  if (route.state) {
    return getActiveRouteName(route.state as NavigationState);
  }

  return route.name;
};

export const RootNavigator: React.FC = () => {
  const { user, loading } = useAuth();
  const [confirmation, setConfirmation] = useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const routeNameRef = useRef<string | undefined>();

  // Reset confirmation when user logs out
  React.useEffect(() => {
    if (!user && confirmation) {
      setConfirmation(null);
    }
  }, [user]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Determine if user is a manager
  const isManager = user?.role && ['area_manager', 'zonal_head', 'national_head', 'admin'].includes(user.role);

  return (
    <NavigationContainer
      onReady={() => {
        // Initialize with current route name (won't have state on first render)
        routeNameRef.current = 'Home';
      }}
      onStateChange={(state) => {
        const previousRouteName = routeNameRef.current;
        const currentRouteName = getActiveRouteName(state);

        if (previousRouteName !== currentRouteName && currentRouteName) {
          // Track screen view in analytics
          trackScreenView(currentRouteName);
        }

        // Save the current route name for later comparison
        routeNameRef.current = currentRouteName;
      }}
    >
      {user ? (
        // User is authenticated - Route to appropriate TabNavigator based on role
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {/* Route managers to ManagerTabNavigator, reps to TabNavigator */}
          {isManager ? (
            <Stack.Screen name="Home" component={ManagerTabNavigator} />
          ) : (
            <Stack.Screen name="Home" component={TabNavigator} />
          )}
          {/* Sales rep screens (always available) */}
          {/* DISABLED FOR V1 LAUNCH
          <Stack.Screen
            name="HomeV3"
            component={HomeScreenV3}
            options={{ headerShown: true, title: 'Home (New Design)' }}
          />
          */}
          <Stack.Screen name="SelectAccount" component={SelectAccountScreen} />
          <Stack.Screen name="LogVisit" component={LogVisitScreen as any} />
          <Stack.Screen name="ExpenseEntry" component={ExpenseEntryScreen} />
          <Stack.Screen name="ExpenseDesignPreview" component={ExpenseDesignPreview} />
          <Stack.Screen name="SheetsEntry" component={CompactSheetsEntryScreen} />
          <Stack.Screen name="SheetsDesignPreview" component={SheetsDesignPreview} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="KitchenSink" component={KitchenSinkScreen} />
          <Stack.Screen name="AccountDesignKitchenSink" component={AccountDesignKitchenSink} />
          <Stack.Screen name="DesignLab" component={DesignLabScreen} />

          {/* Manager stack screens - Team Management */}
          <Stack.Screen name="AddUser" component={AddUserScreen} />
          <Stack.Screen name="UserDetail" component={UserDetailScreen} />
          <Stack.Screen name="SetTarget" component={SetTargetScreen} />

          {/* Manager stack screens - Account Management */}
          <Stack.Screen name="AccountDetail" component={AccountDetailScreen} />
          <Stack.Screen name="AddAccount" component={AddAccountScreen} />
          <Stack.Screen name="EditAccount" component={EditAccountScreen} />

          {/* TODO: Re-enable these as we build/test them */}
          {/* <Stack.Screen name="TeamTargets" component={TeamTargetsScreen} /> */}
          <Stack.Screen name="TeamStats" component={TeamStatsScreen} />
          <Stack.Screen name="UserList" component={TeamScreen} />
          <Stack.Screen name="Documents" component={DocumentsScreen} />
          <Stack.Screen name="UploadDocument" component={UploadDocumentScreen} />
          <Stack.Screen name="ManageDownloads" component={ManageDownloadsScreen} />

          {/* Activity History (replaces attendance tracking) */}
          <Stack.Screen name="AttendanceHistory" component={AttendanceHistoryScreen} />
        </Stack.Navigator>
      ) : (
        // User is not authenticated
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!confirmation ? (
            <Stack.Screen name="Login">
              {(props) => (
                <LoginScreen
                  {...props}
                  onCodeSent={(conf) => setConfirmation(conf)}
                />
              )}
            </Stack.Screen>
          ) : (
            <Stack.Screen name="OTP">
              {(props) => (
                <OTPScreen
                  {...props}
                  confirmation={confirmation}
                  onBack={() => setConfirmation(null)}
                />
              )}
            </Stack.Screen>
          )}
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
