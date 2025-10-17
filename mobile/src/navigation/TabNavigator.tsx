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
  const menuItems = [
    {
      icon: <BarChart2 size={24} color={featureColors.sheets.primary} />,
      label: 'Log Sheet Sales',
      screen: 'SheetsEntry',
      color: featureColors.sheets,
    },
    {
      icon: <CheckSquare size={24} color={featureColors.visits.primary} />,
      label: 'Log Visit',
      screen: 'SelectAccount',
      color: featureColors.visits,
    },
    {
      icon: <User size={24} color={featureColors.expenses.primary} />,
      label: 'Report Expense',
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
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.fabMenuOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.fabMenuContainer}>
          <View style={styles.fabMenuHeader}>
            <Text style={styles.fabMenuTitle}>Quick Log</Text>
            <TouchableOpacity onPress={onClose} style={styles.fabMenuClose}>
              <Text style={styles.fabMenuCloseText}>×</Text>
            </TouchableOpacity>
          </View>

          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.fabMenuItem}
              onPress={() => handleItemPress(item.screen)}
              activeOpacity={0.7}
            >
              <View style={[styles.fabMenuIconContainer, { backgroundColor: item.color.light }]}>
                {item.icon}
              </View>
              <Text style={styles.fabMenuItemText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
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

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.75)', // Increased for clarity
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarItemStyle: styles.tabBarItem,
          tabBarIconStyle: { marginTop: 4 },
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
  tabBarLabel: {
    fontSize: 12,
    fontWeight: typography.fontWeight.semiBold,
    marginTop: 4,
  },
  tabBarItem: {
    paddingVertical: 6,
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

  // FAB Menu Styles
  fabMenuOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  fabMenuContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: spacing.borderRadius.xl,
    borderTopRightRadius: spacing.borderRadius.xl,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.lg,
    maxHeight: '70%',
  },
  fabMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  fabMenuTitle: {
    ...typography.styles.h3,
    color: colors.text.primary,
  },
  fabMenuClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabMenuCloseText: {
    fontSize: 24,
    color: colors.text.secondary,
    lineHeight: 24,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  fabMenuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: spacing.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  fabMenuItemText: {
    ...typography.styles.body,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.semiBold,
    flex: 1,
  },
});
