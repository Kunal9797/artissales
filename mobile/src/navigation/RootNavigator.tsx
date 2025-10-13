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
import { SheetsEntryScreen } from '../screens/sheets/SheetsEntryScreen';
import { DSRScreen } from '../screens/dsr/DSRScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { KitchenSinkScreen } from '../screens/KitchenSinkScreen';
import { AddUserScreen } from '../screens/manager/AddUserScreen';
import { ManagerHomeScreen } from '../screens/manager/ManagerHomeScreen';
import { DSRApprovalListScreen } from '../screens/manager/DSRApprovalListScreen';
import { DSRApprovalDetailScreen } from '../screens/manager/DSRApprovalDetailScreen';
import { UserListScreen } from '../screens/manager/UserListScreen';
import { UserDetailScreen } from '../screens/manager/UserDetailScreen';

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
  AddUser: undefined;
  DSRApprovalList: undefined;
  DSRApprovalDetail: { reportId: string };
  UserList: undefined;
  UserDetail: { userId: string };
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
          <Stack.Screen name="SheetsEntry" component={SheetsEntryScreen} />
          <Stack.Screen name="DSR" component={DSRScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="KitchenSink" component={KitchenSinkScreen} />
          <Stack.Screen name="AddUser" component={AddUserScreen} />
          <Stack.Screen name="DSRApprovalList" component={DSRApprovalListScreen} />
          <Stack.Screen name="DSRApprovalDetail" component={DSRApprovalDetailScreen} />
          <Stack.Screen name="UserList" component={UserListScreen} />
          <Stack.Screen name="UserDetail" component={UserDetailScreen} />
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
