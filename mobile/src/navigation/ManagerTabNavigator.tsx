/**
 * ManagerTabNavigator - Bottom Tab Navigation for Managers
 * Built incrementally to avoid module initialization issues
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, Animated } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Users, Building2, CheckCircle, User as UserIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Animated Icon Wrapper with subtle scale on focus
const AnimatedTabIcon: React.FC<{
  Icon: any;
  color: string;
  focused: boolean;
  size?: number;
  strokeWidth?: number;
  fill?: string;
}> = ({ Icon, color, focused, size = 28, strokeWidth, fill }) => {
  const scale = useRef(new Animated.Value(focused ? 1 : 0.88)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.08 : 0.88, // Noticeable but not excessive: active 1.08, inactive 0.88
      useNativeDriver: true,
      tension: 80,
      friction: 7,
    }).start();
  }, [focused]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Icon
        size={size}
        color={color}
        strokeWidth={focused ? 2.5 : 2}
        fill={fill || 'none'}
      />
    </Animated.View>
  );
};
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
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#C9A961',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.75)', // Increased from 0.5 to 0.75 to reduce overlap darkening
        tabBarStyle: {
          backgroundColor: '#393735',
          paddingBottom: Math.max(insets.bottom, 8), // Use safe area inset or minimum 8px
          paddingTop: 8, // Reduced from 12 to move icons up
          height: 65 + Math.max(insets.bottom, 8), // Adjust height based on bottom inset
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarShowLabel: true, // Changed from false to true - show labels for manager
      }}
    >
      <Tab.Screen
        name="ManagerHomeTab"
        component={ManagerHomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon Icon={Home} color={color} focused={focused} />
          ),
        }}
      />

      <Tab.Screen
        name="TeamTab"
        component={TeamScreen}
        options={{
          title: 'Team',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon Icon={Users} color={color} focused={focused} />
          ),
        }}
      />

      <Tab.Screen
        name="AccountsTab"
        component={AccountsListScreen}
        options={{
          title: 'Accounts',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon Icon={Building2} color={color} focused={focused} fill="none" />
          ),
        }}
      />

      <Tab.Screen
        name="ReviewTab"
        component={ReviewHomeScreen}
        options={{
          title: 'Review',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon Icon={CheckCircle} color={color} focused={focused} />
          ),
        }}
      />

      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Me',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon Icon={UserIcon} color={color} focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
