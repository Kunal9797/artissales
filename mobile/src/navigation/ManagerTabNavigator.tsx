/**
 * ManagerTabNavigator - Bottom Tab Navigation for Managers
 *
 * Provides 5-tab navigation for managers (NO FAB):
 * - Home: Team dashboard, KPIs, alerts, top performers
 * - Team: Team members with attendance & performance
 * - Accounts: Customer accounts (already modern)
 * - Review: Approve DSRs & Expenses
 * - Me: Profile & settings (shared with sales reps)
 *
 * Key differences from sales rep tabs:
 * - No FAB (all actions via header buttons)
 * - Manager-specific screens
 * - Team monitoring focus
 */

import React from 'react';
import { Platform, View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Users, Building2, CheckCircle, User } from 'lucide-react-native';
// import { ManagerHomeScreen } from '../screens/manager/ManagerHomeScreen'; // TODO: Fix StyleSheet.create issue
// import { UserListScreen } from '../screens/manager/UserListScreen'; // TODO: Fix StyleSheet.create issue
// import { AccountsListScreen } from '../screens/manager/AccountsListScreen'; // TODO: Fix StyleSheet.create issue
import { ProfileScreen } from '../screens/profile/ProfileScreen';

// Temporary placeholders until we fix StyleSheet.create issues in manager screens
const ManagerHomeScreen: React.FC = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
    <Text style={{ fontSize: 18, color: '#1A1A1A' }}>Manager Home</Text>
    <Text style={{ fontSize: 14, color: '#666666', marginTop: 8 }}>Coming soon...</Text>
  </View>
);

const UserListScreen: React.FC = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
    <Text style={{ fontSize: 18, color: '#1A1A1A' }}>Team</Text>
    <Text style={{ fontSize: 14, color: '#666666', marginTop: 8 }}>Coming soon...</Text>
  </View>
);

const AccountsListScreen: React.FC = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
    <Text style={{ fontSize: 18, color: '#1A1A1A' }}>Accounts</Text>
    <Text style={{ fontSize: 14, color: '#666666', marginTop: 8 }}>Coming soon...</Text>
  </View>
);

const ReviewHomeScreen: React.FC = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
    <Text style={{ fontSize: 18, color: '#1A1A1A' }}>Review</Text>
    <Text style={{ fontSize: 14, color: '#666666', marginTop: 8 }}>Coming soon...</Text>
  </View>
);

const Tab = createBottomTabNavigator();

/**
 * Main Manager Tab Navigator
 */
export const ManagerTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#C9A961',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.5)',
        tabBarStyle: {
          backgroundColor: '#393735',
          borderTopWidth: 1,
          borderTopColor: 'rgba(255, 255, 255, 0.1)',
          height: Platform.OS === 'ios' ? 95 : 85,
          paddingBottom: Platform.OS === 'ios' ? 38 : 30,
          paddingTop: 8,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          borderRadius: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarItemStyle: {
          paddingVertical: 6,
        },
        tabBarIconStyle: { marginTop: 4 },
      }}
    >
      <Tab.Screen
        name="ManagerHomeTab"
        component={ManagerHomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Home size={24} color={color} strokeWidth={2.5} />
          ),
        }}
      />

      <Tab.Screen
        name="TeamTab"
        component={UserListScreen}
        options={{
          title: 'Team',
          tabBarIcon: ({ color }) => (
            <Users size={24} color={color} strokeWidth={2.5} />
          ),
        }}
      />

      <Tab.Screen
        name="AccountsTab"
        component={AccountsListScreen}
        options={{
          title: 'Accounts',
          tabBarIcon: ({ color }) => (
            <Building2 size={24} color={color} strokeWidth={2.5} />
          ),
        }}
      />

      <Tab.Screen
        name="ReviewTab"
        component={ReviewHomeScreen}
        options={{
          title: 'Review',
          tabBarIcon: ({ color }) => (
            <CheckCircle size={24} color={color} strokeWidth={2.5} />
          ),
        }}
      />

      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Me',
          tabBarIcon: ({ color }) => (
            <User size={24} color={color} strokeWidth={2.5} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
