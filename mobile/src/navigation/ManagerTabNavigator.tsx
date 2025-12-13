/**
 * ManagerTabNavigator - Bottom Tab Navigation for Managers
 * Built incrementally to avoid module initialization issues
 *
 * Features:
 * - Pending badge on Review tab (red notification indicator)
 * - Animated tab icons with scale effect
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, Animated, Platform, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Users, Building2, CheckCircle, BarChart3 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import { useQueryClient } from '@tanstack/react-query';

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

// Review Tab Icon with Dot Indicator
const ReviewTabIcon: React.FC<{
  color: string;
  focused: boolean;
  badgeCount: number;
}> = ({ color, focused, badgeCount }) => {
  const scale = useRef(new Animated.Value(focused ? 1 : 0.88)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.08 : 0.88,
      useNativeDriver: true,
      tension: 80,
      friction: 7,
    }).start();
  }, [focused]);

  return (
    <View style={badgeStyles.container}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <CheckCircle
          size={28}
          color={color}
          strokeWidth={focused ? 2.5 : 2}
        />
      </Animated.View>
      {badgeCount > 0 && (
        <View style={badgeStyles.dot} />
      )}
    </View>
  );
};

const badgeStyles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    top: 0,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53935',
    borderWidth: 1.5,
    borderColor: '#393735', // Match nav bar background
  },
});
import { SelectAccountScreen } from '../screens/visits/SelectAccountScreen';
// import { ManagerHomeScreen } from '../screens/manager/ManagerHomeScreen'; // TODO: Has StyleSheet.create issue
import { ManagerHomeScreen } from '../screens/manager/ManagerHomeScreenSimple';
import { TeamScreen } from '../screens/manager/TeamScreenSimple';
import { TeamStatsScreen } from '../screens/manager/TeamStatsScreen';
import { ReviewHomeScreen } from '../screens/manager/ReviewHomeScreen';

const Tab = createBottomTabNavigator();

// Simple placeholder component
const Placeholder: React.FC<{ title: string }> = ({ title }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
    <Text style={{ fontSize: 18, color: '#1A1A1A' }}>{title}</Text>
  </View>
);

export const ManagerTabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  // Get today's date to match the query key used in ManagerHomeScreen
  const today = useMemo(() => new Date().toISOString().substring(0, 10), []);

  // State for pending count badge
  const [pendingCount, setPendingCount] = React.useState(0);

  // Subscribe to query cache changes and update pending count
  useEffect(() => {
    // Initial read from cache
    const readFromCache = () => {
      const cachedData = queryClient.getQueryData<{ summary?: { pendingTotal?: number } }>(['managerDashboard', today]);
      return cachedData?.summary?.pendingTotal ?? 0;
    };

    // Defer initial read to avoid setState during render
    const initialTimer = setTimeout(() => {
      setPendingCount(readFromCache());
    }, 0);

    // Subscribe to cache updates
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      const newCount = readFromCache();
      setPendingCount(prev => prev !== newCount ? newCount : prev);
    });

    return () => {
      clearTimeout(initialTimer);
      unsubscribe();
    };
  }, [queryClient, today]);

  // Set Android navigation bar color to match navbar
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync('#393735');
      NavigationBar.setButtonStyleAsync('light'); // White buttons for dark background
    }
  }, []);

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
        name="StatsTab"
        component={TeamStatsScreen}
        options={{
          title: 'Stats',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon Icon={BarChart3} color={color} focused={focused} />
          ),
        }}
      />

      <Tab.Screen
        name="AccountsList"
        component={SelectAccountScreen}
        initialParams={{ mode: 'manage' }}
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
            <ReviewTabIcon color={color} focused={focused} badgeCount={pendingCount} />
          ),
        }}
      />

    </Tab.Navigator>
  );
};
