/**
 * ManagerTabNavigator - Bottom Tab Navigation for Managers
 * Built incrementally to avoid module initialization issues
 */

import React from 'react';
import { View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Users, Building2, CheckCircle, User as UserIcon } from 'lucide-react-native';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { AccountsListScreen } from '../screens/manager/AccountsListScreen';
import { ReviewHomeScreen } from '../screens/manager/ReviewHomeScreen';
// import { ManagerHomeScreen } from '../screens/manager/ManagerHomeScreen'; // TODO: Has StyleSheet.create issue
import { ManagerHomeScreen } from '../screens/manager/ManagerHomeScreenSimple';
import { TeamScreen } from '../screens/manager/TeamScreenSimple';

const Tab = createBottomTabNavigator();

// Simple placeholder component
const Placeholder: React.FC<{ title: string }> = ({ title }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
    <Text style={{ fontSize: 18, color: '#1A1A1A' }}>{title}</Text>
  </View>
);

export const ManagerTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#C9A961',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.5)',
        tabBarStyle: {
          backgroundColor: '#393735',
          paddingBottom: 30,
          paddingTop: 8,
          height: 85,
        },
      }}
    >
      <Tab.Screen
        name="ManagerHomeTab"
        component={ManagerHomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home size={24} color={color} strokeWidth={2.5} />,
        }}
      />

      <Tab.Screen
        name="TeamTab"
        component={TeamScreen}
        options={{
          title: 'Team',
          tabBarIcon: ({ color }) => <Users size={24} color={color} strokeWidth={2.5} />,
        }}
      />

      <Tab.Screen
        name="AccountsTab"
        component={AccountsListScreen}
        options={{
          title: 'Accounts',
          tabBarIcon: ({ color }) => <Building2 size={24} color={color} strokeWidth={2.5} />,
        }}
      />

      <Tab.Screen
        name="ReviewTab"
        component={ReviewHomeScreen}
        options={{
          title: 'Review',
          tabBarIcon: ({ color }) => <CheckCircle size={24} color={color} strokeWidth={2.5} />,
        }}
      />

      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Me',
          tabBarIcon: ({ color }) => <UserIcon size={24} color={color} strokeWidth={2.5} />,
        }}
      />
    </Tab.Navigator>
  );
};
