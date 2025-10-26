/**
 * TabNavigator - Bottom Tab Navigation with Integrated Log Button
 *
 * Provides 5-tab navigation for the app:
 * - Home: Today's dashboard & attendance
 * - Stats: Monthly performance & progress
 * - Log: Quick actions menu (prominent center button)
 * - Docs: Documents & resources library
 * - Me: Profile & settings
 *
 * Different tabs for reps vs managers (role-based)
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform, Animated } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, BarChart2, Plus, Folder, User, CheckSquare } from 'lucide-react-native';
import { colors, spacing, typography, featureColors } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';

// Animated Icon Wrapper - Same as manager tabs
const AnimatedTabIcon: React.FC<{
  Icon: any;
  color: string;
  focused: boolean;
  size?: number;
}> = ({ Icon, color, focused, size = 28 }) => {
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
    <Animated.View style={{ transform: [{ scale }] }}>
      <Icon size={size} color={color} strokeWidth={focused ? 2.5 : 2} />
    </Animated.View>
  );
};
import { HomeScreen } from '../screens/HomeScreen_v2';
import { StatsScreen } from '../screens/StatsScreen';
import { DocumentsScreen } from '../screens/DocumentsScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator();

/**
 * Custom Log Tab Button Component
 * Integrated into tab bar but with prominent design
 */
interface LogTabButtonProps {
  onPress: () => void;
}

const LogTabButton: React.FC<LogTabButtonProps> = ({ onPress }) => {
  return (
    <TouchableOpacity
      style={styles.logTabButton}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.logButtonInner}>
        <Plus size={32} color={colors.primary} strokeWidth={3} />
      </View>
      <Text style={styles.logButtonLabel}>Log</Text>
    </TouchableOpacity>
  );
};

/**
 * FAB Menu Component
 * Shows quick action options when FAB is tapped
 */
interface FABMenuProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
}

const FABMenu: React.FC<FABMenuProps> = ({ visible, onClose, navigation }) => {
  const insets = useSafeAreaInsets();

  const menuItems = [
    {
      icon: <CheckSquare size={28} color={featureColors.visits.primary} />,
      label: 'Log Visit',
      subtitle: 'Track customer visits',
      screen: 'SelectAccount',
      color: featureColors.visits,
    },
    {
      icon: <BarChart2 size={28} color={featureColors.sheets.primary} />,
      label: 'Log Sheet Sales',
      subtitle: 'Record laminate sales',
      screen: 'SheetsEntry',
      color: featureColors.sheets,
    },
    {
      icon: <User size={28} color={featureColors.expenses.primary} />,
      label: 'Report Expense',
      subtitle: 'Log daily expenses',
      screen: 'ExpenseEntry',
      color: featureColors.expenses,
    },
  ];

  const handleItemPress = (screen: string) => {
    onClose();
    // Small delay to let modal close animation finish
    setTimeout(() => {
      navigation.navigate(screen);
    }, 150);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.fabMenuOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.fabMenuContainer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          {/* Modern Handle Bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.fabMenuHeader}>
            <Text style={styles.fabMenuTitle}>Quick Actions</Text>
            <Text style={styles.fabMenuSubtitle}>What would you like to log?</Text>
          </View>

          {/* Menu Items */}
          <View style={styles.fabMenuItems}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.fabMenuItem,
                  index === menuItems.length - 1 && styles.fabMenuItemLast,
                ]}
                onPress={() => handleItemPress(item.screen)}
                activeOpacity={0.7}
              >
                <View style={[styles.fabMenuIconContainer, { backgroundColor: item.color.light }]}>
                  {item.icon}
                </View>
                <View style={styles.fabMenuTextContainer}>
                  <Text style={styles.fabMenuItemLabel}>{item.label}</Text>
                  <Text style={styles.fabMenuItemSubtitle}>{item.subtitle}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};


/**
 * Main Tab Navigator
 */
export const TabNavigator: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [fabMenuVisible, setFabMenuVisible] = useState(false);
  const insets = useSafeAreaInsets();

  // Set Android navigation bar color to match navbar
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync(colors.primary); // #393735
      NavigationBar.setButtonStyleAsync('light'); // White buttons for dark background
    }
  }, []);

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.75)', // Increased for clarity
          tabBarStyle: {
            ...styles.tabBar,
            paddingBottom: Math.max(insets.bottom, 8), // Dynamic safe area padding
            height: (Platform.OS === 'ios' ? 75 : 65) + Math.max(insets.bottom, 8), // Adjust height
          },
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarItemStyle: styles.tabBarItem,
          tabBarIconStyle: { marginTop: 0 }, // Changed from 4 to 0 to move icons up
          tabBarShowLabel: true, // Keep labels for sales rep (helpful for navigation)
        }}
      >
        <Tab.Screen
          name="HomeTab"
          component={HomeScreen}
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <AnimatedTabIcon Icon={Home} color={color} focused={focused} />
            ),
          }}
        />

        <Tab.Screen
          name="StatsTab"
          component={StatsScreen}
          options={{
            title: 'Stats',
            tabBarIcon: ({ color, focused }) => (
              <AnimatedTabIcon Icon={BarChart2} color={color} focused={focused} />
            ),
          }}
        />

        {/* Center Log button - prominent design */}
        <Tab.Screen
          name="LogTab"
          component={View}
          options={{
            tabBarButton: () => (
              <LogTabButton onPress={() => setFabMenuVisible(true)} />
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setFabMenuVisible(true);
            },
          }}
        />

        <Tab.Screen
          name="DocumentsTab"
          component={DocumentsScreen}
          options={{
            title: 'Docs',
            tabBarIcon: ({ color, focused }) => (
              <AnimatedTabIcon Icon={Folder} color={color} focused={focused} />
            ),
          }}
        />

        <Tab.Screen
          name="MeTab"
          component={ProfileScreen}
          options={{
            title: 'Me',
            tabBarIcon: ({ color, focused }) => (
              <AnimatedTabIcon Icon={User} color={color} focused={focused} />
            ),
          }}
        />
      </Tab.Navigator>

      {/* FAB Menu Modal */}
      <FABMenu
        visible={fabMenuVisible}
        onClose={() => setFabMenuVisible(false)}
        navigation={navigation}
      />
    </>
  );
};

const styles = StyleSheet.create({
  // Tab Bar Styles - Extends to bottom with proper padding
  tabBar: {
    backgroundColor: colors.primary,
    borderTopWidth: 0,
    height: Platform.OS === 'ios' ? 95 : 85,
    paddingBottom: Platform.OS === 'ios' ? 38 : 30,
    paddingTop: 4, // Reduced from 8 to move icons up
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: typography.fontWeight.semiBold,
    marginTop: 2, // Reduced from 4 to tighten spacing
  },
  tabBarItem: {
    paddingVertical: 4, // Reduced from 6 to move content up
  },

  // Log Tab Button Styles - "Popping up" from nav bar
  logTabButton: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 0,
  },
  logButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 3,
    borderColor: colors.primary,
    marginTop: -32, // Half the button height - makes it "pop up" above nav bar
  },
  logButtonLabel: {
    fontSize: 12,
    fontWeight: typography.fontWeight.semiBold,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 6,
  },

  // FAB Menu Styles - Modern & Sleek
  fabMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  fabMenuContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  fabMenuHeader: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
  },
  fabMenuTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  fabMenuSubtitle: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '400',
  },
  fabMenuItems: {
    paddingHorizontal: 16,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  fabMenuItemLast: {
    marginBottom: 0,
  },
  fabMenuIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  fabMenuTextContainer: {
    flex: 1,
  },
  fabMenuItemLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  fabMenuItemSubtitle: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '400',
  },
});
