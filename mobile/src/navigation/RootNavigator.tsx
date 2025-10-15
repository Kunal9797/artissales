import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { useAuth } from '../hooks/useAuth';
import { LoginScreen } from '../screens/LoginScreen';
import { OTPScreen } from '../screens/OTPScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { AttendanceScreen } from '../screens/attendance/AttendanceScreen';
import { SelectAccountScreen } from '../screens/visits/SelectAccountScreen';
import { LogVisitScreen } from '../screens/visits/LogVisitScreen';
import { ExpenseEntryScreen } from '../screens/expenses/ExpenseEntryScreen';
import { CompactSheetsEntryScreen } from '../screens/sheets/CompactSheetsEntryScreen';
import { DSRScreen } from '../screens/dsr/DSRScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { KitchenSinkScreen } from '../screens/KitchenSinkScreen';
import { DesignLabScreen } from '../screens/DesignLabScreen';
import { AddUserScreen } from '../screens/manager/AddUserScreen';
import { ManagerHomeScreen } from '../screens/manager/ManagerHomeScreen';
import { DSRApprovalListScreen } from '../screens/manager/DSRApprovalListScreen';
import { DSRApprovalDetailScreen } from '../screens/manager/DSRApprovalDetailScreen';
import { UserListScreen } from '../screens/manager/UserListScreen';
import { UserDetailScreen } from '../screens/manager/UserDetailScreen';
import { AccountsListScreen } from '../screens/manager/AccountsListScreen';
import { AddAccountScreen } from '../screens/AddAccountScreen';
import { EditAccountScreen } from '../screens/EditAccountScreen';
import { SetTargetScreen } from '../screens/manager/SetTargetScreen';
import { TeamTargetsScreen } from '../screens/manager/TeamTargetsScreen';
import { DocumentLibraryScreen } from '../screens/DocumentLibraryScreen';
import { UploadDocumentScreen } from '../screens/UploadDocumentScreen';
import { ManageDownloadsScreen } from '../screens/ManageDownloadsScreen';

export type RootStackParamList = {
  Home: undefined;
  ManagerHome: undefined;
  Attendance: undefined;
  SelectAccount: undefined;
  LogVisit: { accountId: string; accountName: string; accountType: string };
  ExpenseEntry: undefined;
  SheetsEntry: undefined;
  DSR: undefined;
  Profile: undefined;
  KitchenSink: undefined;
  DesignLab: undefined;
  AddUser: undefined;
  DSRApprovalList: undefined;
  DSRApprovalDetail: { reportId: string };
  UserList: undefined;
  UserDetail: { userId: string };
  AccountsList: undefined;
  AddAccount: { preSelectedType?: string; onAccountCreated?: (accountId: string) => void };
  EditAccount: { account: any; onAccountUpdated?: () => void };
  SetTarget: { userId: string; userName: string; currentMonth: string };
  TeamTargets: undefined;
  DocumentLibrary: undefined;
  UploadDocument: { onUploadSuccess?: () => void };
  ManageDownloads: { onDelete?: () => void };
  Login: undefined;
  OTP: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { user, loading } = useAuth();
  const [confirmation, setConfirmation] = useState<FirebaseAuthTypes.ConfirmationResult | null>(null);

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

  return (
    <NavigationContainer>
      {user ? (
        // User is authenticated
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="ManagerHome" component={ManagerHomeScreen} />
          <Stack.Screen name="Attendance" component={AttendanceScreen} />
          <Stack.Screen name="SelectAccount" component={SelectAccountScreen} />
          <Stack.Screen name="LogVisit" component={LogVisitScreen} />
          <Stack.Screen name="ExpenseEntry" component={ExpenseEntryScreen} />
          <Stack.Screen name="SheetsEntry" component={CompactSheetsEntryScreen} />
          <Stack.Screen name="DSR" component={DSRScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="KitchenSink" component={KitchenSinkScreen} />
          <Stack.Screen name="DesignLab" component={DesignLabScreen} />
          <Stack.Screen name="AddUser" component={AddUserScreen} />
          <Stack.Screen name="DSRApprovalList" component={DSRApprovalListScreen} />
          <Stack.Screen name="DSRApprovalDetail" component={DSRApprovalDetailScreen} />
          <Stack.Screen name="UserList" component={UserListScreen} />
          <Stack.Screen name="UserDetail" component={UserDetailScreen} />
          <Stack.Screen name="AccountsList" component={AccountsListScreen} />
          <Stack.Screen name="AddAccount" component={AddAccountScreen} />
          <Stack.Screen name="EditAccount" component={EditAccountScreen} />
          <Stack.Screen name="SetTarget" component={SetTargetScreen} />
          <Stack.Screen name="TeamTargets" component={TeamTargetsScreen} />
          <Stack.Screen name="DocumentLibrary" component={DocumentLibraryScreen} />
          <Stack.Screen name="UploadDocument" component={UploadDocumentScreen} />
          <Stack.Screen name="ManageDownloads" component={ManageDownloadsScreen} />
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
