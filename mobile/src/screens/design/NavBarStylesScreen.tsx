/**
 * NavBarStylesScreen - Floating Pill Nav Bar Design Variations
 *
 * Multiple refined floating pill styles for both Sales Rep and Manager views
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Home,
  BarChart2,
  BarChart3,
  Folder,
  Plus,
  Building2,
  CheckCircle,
  ChevronLeft,
} from 'lucide-react-native';
import { colors, spacing } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Tab definitions
const getRepTabs = () => [
  { icon: Home, label: 'Home' },
  { icon: BarChart2, label: 'Stats' },
  { icon: Folder, label: 'Docs' },
  { icon: Plus, label: 'Log', isFab: true },
];

const getManagerTabs = () => [
  { icon: Home, label: 'Home' },
  { icon: BarChart3, label: 'Stats' },
  { icon: Building2, label: 'Accounts' },
  { icon: CheckCircle, label: 'Review' },
];

// ============================================================================
// STYLE 1: Current Baseline (for comparison)
// ============================================================================
const CurrentStyleNav: React.FC<{ role: 'rep' | 'manager'; activeTab: number; onTabPress: (i: number) => void }> = ({
  role,
  activeTab,
  onTabPress,
}) => {
  const tabs = role === 'rep' ? getRepTabs() : getManagerTabs();

  return (
    <View style={styles.currentNav}>
      {tabs.map((tab, index) => {
        const focused = activeTab === index;
        if (tab.isFab) {
          return (
            <TouchableOpacity key={index} style={styles.currentFabContainer} onPress={() => onTabPress(index)}>
              <View style={styles.currentFab}>
                <Plus size={28} color={colors.primary} strokeWidth={3} />
              </View>
              <Text style={[styles.currentLabel, { color: colors.accent }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        }
        return (
          <TouchableOpacity key={index} style={styles.currentTab} onPress={() => onTabPress(index)}>
            <tab.icon size={24} color={focused ? colors.accent : 'rgba(255,255,255,0.6)'} strokeWidth={focused ? 2.5 : 2} />
            <Text style={[styles.currentLabel, { color: focused ? colors.accent : 'rgba(255,255,255,0.6)' }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ============================================================================
// STYLE 2: Floating Pill - Light (White pill, expands on active)
// ============================================================================
const FloatingPillLight: React.FC<{ role: 'rep' | 'manager'; activeTab: number; onTabPress: (i: number) => void }> = ({
  role,
  activeTab,
  onTabPress,
}) => {
  const tabs = role === 'rep' ? getRepTabs() : getManagerTabs();
  const showLabels = role === 'rep'; // Only show labels for rep (has FAB taking space)
  const tabWidth = (SCREEN_WIDTH - 64) / tabs.length;

  return (
    <View style={styles.floatingWrapper}>
      <View style={styles.floatingPillLight}>
        {tabs.map((tab, index) => {
          const focused = activeTab === index;
          if (tab.isFab) {
            return (
              <TouchableOpacity key={index} style={{ width: tabWidth, alignItems: 'center' }} onPress={() => onTabPress(index)}>
                <View style={styles.floatingFabGold}>
                  <Plus size={22} color="#FFF" strokeWidth={3} />
                </View>
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity
              key={index}
              style={[styles.floatingTabLightFixed, { width: tabWidth }, focused && styles.floatingTabLightActive]}
              onPress={() => onTabPress(index)}
            >
              <tab.icon size={20} color={focused ? '#FFF' : '#666'} strokeWidth={focused ? 2.5 : 2} />
              {focused && showLabels && <Text style={styles.floatingLabelLight}>{tab.label}</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// ============================================================================
// STYLE 3: Floating Pill - Dark (Dark pill, gold accent)
// ============================================================================
const FloatingPillDark: React.FC<{ role: 'rep' | 'manager'; activeTab: number; onTabPress: (i: number) => void }> = ({
  role,
  activeTab,
  onTabPress,
}) => {
  const tabs = role === 'rep' ? getRepTabs() : getManagerTabs();
  const showLabels = role === 'rep';
  const tabWidth = (SCREEN_WIDTH - 64) / tabs.length; // Equal width for all

  return (
    <View style={styles.floatingWrapper}>
      <View style={styles.floatingPillDark}>
        {tabs.map((tab, index) => {
          const focused = activeTab === index;
          if (tab.isFab) {
            return (
              <TouchableOpacity key={index} style={{ width: tabWidth, alignItems: 'center' }} onPress={() => onTabPress(index)}>
                <View style={styles.floatingFabOutline}>
                  <Plus size={20} color={colors.accent} strokeWidth={3} />
                </View>
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity
              key={index}
              style={[styles.floatingTabDarkFixed, { width: tabWidth }, focused && styles.floatingTabDarkActive]}
              onPress={() => onTabPress(index)}
            >
              <tab.icon size={20} color={focused ? colors.primary : 'rgba(255,255,255,0.5)'} strokeWidth={2} />
              {focused && showLabels && <Text style={styles.floatingLabelDark}>{tab.label}</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// ============================================================================
// STYLE 4: Floating Pill - Outline (Transparent with border)
// ============================================================================
const FloatingPillOutline: React.FC<{ role: 'rep' | 'manager'; activeTab: number; onTabPress: (i: number) => void }> = ({
  role,
  activeTab,
  onTabPress,
}) => {
  const tabs = role === 'rep' ? getRepTabs() : getManagerTabs();
  const tabWidth = (SCREEN_WIDTH - 64) / tabs.length;

  return (
    <View style={styles.floatingWrapper}>
      <View style={styles.floatingPillOutline}>
        {tabs.map((tab, index) => {
          const focused = activeTab === index;
          if (tab.isFab) {
            return (
              <TouchableOpacity key={index} style={{ width: tabWidth, alignItems: 'center' }} onPress={() => onTabPress(index)}>
                <View style={styles.floatingFabSolid}>
                  <Plus size={20} color="#FFF" strokeWidth={3} />
                </View>
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity
              key={index}
              style={[styles.floatingTabOutlineFixed, { width: tabWidth }, focused && styles.floatingTabOutlineActive]}
              onPress={() => onTabPress(index)}
            >
              <tab.icon size={20} color={focused ? '#FFF' : 'rgba(255,255,255,0.4)'} strokeWidth={focused ? 2.5 : 1.5} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// ============================================================================
// STYLE 5: Floating Pill - Glow (Active tab has glow effect)
// ============================================================================
const FloatingPillGlow: React.FC<{ role: 'rep' | 'manager'; activeTab: number; onTabPress: (i: number) => void }> = ({
  role,
  activeTab,
  onTabPress,
}) => {
  const tabs = role === 'rep' ? getRepTabs() : getManagerTabs();

  return (
    <View style={styles.floatingWrapper}>
      <View style={styles.floatingPillGlow}>
        {tabs.map((tab, index) => {
          const focused = activeTab === index;
          if (tab.isFab) {
            return (
              <TouchableOpacity key={index} onPress={() => onTabPress(index)}>
                <View style={styles.floatingFabGlow}>
                  <Plus size={22} color={colors.primary} strokeWidth={3} />
                </View>
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity
              key={index}
              style={[styles.floatingTabGlow, focused && styles.floatingTabGlowActive]}
              onPress={() => onTabPress(index)}
            >
              <View style={focused ? styles.glowIconWrapper : undefined}>
                <tab.icon size={22} color={focused ? colors.accent : 'rgba(255,255,255,0.5)'} strokeWidth={focused ? 2.5 : 2} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// ============================================================================
// STYLE 6: Floating Pill - Sliding Indicator
// ============================================================================
const FloatingPillSliding: React.FC<{ role: 'rep' | 'manager'; activeTab: number; onTabPress: (i: number) => void }> = ({
  role,
  activeTab,
  onTabPress,
}) => {
  const tabs = role === 'rep' ? getRepTabs() : getManagerTabs();
  const slideAnim = useRef(new Animated.Value(activeTab)).current;
  const tabWidth = (SCREEN_WIDTH - 80) / tabs.length;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: activeTab,
      useNativeDriver: true,
      tension: 68,
      friction: 12,
    }).start();
  }, [activeTab]);

  return (
    <View style={styles.floatingWrapper}>
      <View style={styles.floatingPillSliding}>
        {/* Sliding background */}
        <Animated.View
          style={[
            styles.slidingBg,
            {
              width: tabWidth - 8,
              transform: [{
                translateX: slideAnim.interpolate({
                  inputRange: [0, tabs.length - 1],
                  outputRange: [4, (tabs.length - 1) * tabWidth + 4],
                }),
              }],
            },
          ]}
        />
        {tabs.map((tab, index) => {
          const focused = activeTab === index;
          if (tab.isFab) {
            return (
              <TouchableOpacity key={index} style={{ width: tabWidth }} onPress={() => onTabPress(index)}>
                <View style={styles.floatingFabSliding}>
                  <Plus size={20} color="#FFF" strokeWidth={3} />
                </View>
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity
              key={index}
              style={[styles.floatingTabSliding, { width: tabWidth }]}
              onPress={() => onTabPress(index)}
            >
              <tab.icon size={20} color={focused ? colors.primary : 'rgba(57,55,53,0.4)'} strokeWidth={focused ? 2.5 : 2} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// ============================================================================
// STYLE 7: Floating Pill - Island (Dynamic Island style)
// ============================================================================
const FloatingPillIsland: React.FC<{ role: 'rep' | 'manager'; activeTab: number; onTabPress: (i: number) => void }> = ({
  role,
  activeTab,
  onTabPress,
}) => {
  const tabs = role === 'rep' ? getRepTabs() : getManagerTabs();

  return (
    <View style={styles.floatingWrapperIsland}>
      <View style={styles.floatingPillIsland}>
        {tabs.map((tab, index) => {
          const focused = activeTab === index;
          if (tab.isFab) {
            return (
              <TouchableOpacity key={index} onPress={() => onTabPress(index)}>
                <View style={styles.islandFab}>
                  <Plus size={18} color="#000" strokeWidth={3} />
                </View>
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity
              key={index}
              style={styles.islandTab}
              onPress={() => onTabPress(index)}
            >
              <View style={[styles.islandIconWrapper, focused && styles.islandIconWrapperActive]}>
                <tab.icon size={18} color={focused ? '#000' : 'rgba(255,255,255,0.6)'} strokeWidth={focused ? 2.5 : 2} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// ============================================================================
// STYLE 8: Floating Pill - Minimal Dots
// ============================================================================
const FloatingPillMinimal: React.FC<{ role: 'rep' | 'manager'; activeTab: number; onTabPress: (i: number) => void }> = ({
  role,
  activeTab,
  onTabPress,
}) => {
  const tabs = role === 'rep' ? getRepTabs() : getManagerTabs();

  return (
    <View style={styles.floatingWrapper}>
      <View style={styles.floatingPillMinimal}>
        {tabs.map((tab, index) => {
          const focused = activeTab === index;
          if (tab.isFab) {
            return (
              <TouchableOpacity key={index} onPress={() => onTabPress(index)}>
                <View style={styles.minimalFab}>
                  <Plus size={20} color="#FFF" strokeWidth={3} />
                </View>
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity
              key={index}
              style={styles.minimalTab}
              onPress={() => onTabPress(index)}
            >
              <tab.icon size={22} color={focused ? colors.accent : 'rgba(255,255,255,0.4)'} strokeWidth={focused ? 2.5 : 1.5} />
              {focused && <View style={styles.minimalDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// ============================================================================
// STYLE 9: Floating Pill - Segmented
// ============================================================================
const FloatingPillSegmented: React.FC<{ role: 'rep' | 'manager'; activeTab: number; onTabPress: (i: number) => void }> = ({
  role,
  activeTab,
  onTabPress,
}) => {
  const tabs = role === 'rep' ? getRepTabs() : getManagerTabs();
  const showLabels = role === 'rep';

  return (
    <View style={styles.floatingWrapper}>
      <View style={styles.floatingPillSegmented}>
        {tabs.map((tab, index) => {
          const focused = activeTab === index;
          const isLast = index === tabs.length - 1;
          if (tab.isFab) {
            return (
              <TouchableOpacity key={index} onPress={() => onTabPress(index)}>
                <View style={styles.segmentedFab}>
                  <Plus size={20} color={colors.accent} strokeWidth={3} />
                </View>
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.segmentedTab,
                focused && styles.segmentedTabActive,
                !isLast && !showLabels && styles.segmentedTabBorder,
              ]}
              onPress={() => onTabPress(index)}
            >
              <tab.icon size={20} color={focused ? '#FFF' : 'rgba(255,255,255,0.5)'} strokeWidth={focused ? 2.5 : 2} />
              {showLabels && <Text style={[styles.segmentedLabel, focused && styles.segmentedLabelActive]}>{tab.label}</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// ============================================================================
// MAIN SCREEN
// ============================================================================
export const NavBarStylesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [role, setRole] = useState<'rep' | 'manager'>('rep');
  const [activeTabs, setActiveTabs] = useState<Record<string, number>>({});

  const handleTabPress = (style: string, index: number) => {
    setActiveTabs((prev) => ({ ...prev, [style]: index }));
  };

  const navStyles = [
    { key: 'current', name: 'Current (Baseline)', description: 'Solid dark bar with gold accent', Component: CurrentStyleNav },
    { key: 'pillLight', name: 'Floating Pill - Light', description: 'White pill, expands on active with label', Component: FloatingPillLight },
    { key: 'pillDark', name: 'Floating Pill - Dark', description: 'Dark pill with gold active highlight', Component: FloatingPillDark },
    { key: 'pillOutline', name: 'Floating Pill - Outline', description: 'Transparent with border, fills on active', Component: FloatingPillOutline },
    { key: 'pillGlow', name: 'Floating Pill - Glow', description: 'Active icon has subtle glow effect', Component: FloatingPillGlow },
    { key: 'pillSliding', name: 'Floating Pill - Sliding', description: 'Animated background slides between tabs', Component: FloatingPillSliding },
    { key: 'pillIsland', name: 'Floating Pill - Island', description: 'Compact Dynamic Island inspired style', Component: FloatingPillIsland },
    { key: 'pillMinimal', name: 'Floating Pill - Minimal', description: 'Icons only with dot indicator below', Component: FloatingPillMinimal },
    { key: 'pillSegmented', name: 'Floating Pill - Segmented', description: 'Segmented control style with labels', Component: FloatingPillSegmented },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Nav Bar Styles</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Role Toggle */}
      <View style={styles.roleToggle}>
        <TouchableOpacity
          style={[styles.roleButton, role === 'rep' && styles.roleButtonActive]}
          onPress={() => setRole('rep')}
        >
          <Text style={[styles.roleText, role === 'rep' && styles.roleTextActive]}>Sales Rep</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.roleButton, role === 'manager' && styles.roleButtonActive]}
          onPress={() => setRole('manager')}
        >
          <Text style={[styles.roleText, role === 'manager' && styles.roleTextActive]}>Manager</Text>
        </TouchableOpacity>
      </View>

      {/* Styles List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {navStyles.map(({ key, name, description, Component }) => (
          <View key={key} style={styles.styleCard}>
            <Text style={styles.styleName}>{name}</Text>
            <Text style={styles.styleDescription}>{description}</Text>
            <View style={styles.previewContainer}>
              <Component role={role} activeTab={activeTabs[key] || 0} onTabPress={(i) => handleTabPress(key, i)} />
            </View>
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  roleToggle: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: '#E5E5E5',
    borderRadius: 12,
    padding: 4,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  roleTextActive: {
    color: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  styleCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  styleName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  styleDescription: {
    fontSize: 13,
    color: '#888',
    marginBottom: 16,
  },
  previewContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 80,
  },

  // ==========================================================================
  // Current Style
  // ==========================================================================
  currentNav: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  currentTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    position: 'relative',
  },
  currentLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  currentFabContainer: {
    flex: 1,
    alignItems: 'center',
  },
  currentFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -16,
  },

  // ==========================================================================
  // Floating Common
  // ==========================================================================
  floatingWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  floatingWrapperIsland: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },

  // ==========================================================================
  // Floating Pill Light
  // ==========================================================================
  floatingPillLight: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  floatingTabLight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  floatingTabLightActive: {
    backgroundColor: colors.primary,
  },
  floatingLabelLight: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 6,
  },
  floatingFabGold: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ==========================================================================
  // Floating Pill Dark
  // ==========================================================================
  floatingPillDark: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: 28,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  floatingTabDark: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  floatingTabDarkFixed: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 20,
  },
  floatingTabDarkActive: {
    backgroundColor: colors.accent,
  },
  floatingLabelDark: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 6,
  },
  floatingFabOutline: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ==========================================================================
  // Floating Pill Outline
  // ==========================================================================
  floatingPillOutline: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 28,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  floatingTabOutline: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 20,
    position: 'relative',
  },
  floatingTabOutlineFixed: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 20,
  },
  floatingTabOutlineActive: {
    backgroundColor: colors.accent,
  },
  floatingFabSolid: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ==========================================================================
  // Floating Pill Glow
  // ==========================================================================
  floatingPillGlow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(40,40,40,0.95)',
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  floatingTabGlow: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  floatingTabGlowActive: {},
  glowIconWrapper: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingFabGlow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },

  // ==========================================================================
  // Floating Pill Sliding
  // ==========================================================================
  floatingPillSliding: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingVertical: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    position: 'relative',
  },
  slidingBg: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    backgroundColor: colors.accent,
    borderRadius: 20,
  },
  floatingTabSliding: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    zIndex: 1,
    position: 'relative',
  },
  floatingFabSliding: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },

  // ==========================================================================
  // Floating Pill Island
  // ==========================================================================
  floatingPillIsland: {
    flexDirection: 'row',
    backgroundColor: '#000',
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  islandTab: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  islandIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  islandIconWrapperActive: {
    backgroundColor: '#FFF',
  },
  islandFab: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ==========================================================================
  // Floating Pill Minimal
  // ==========================================================================
  floatingPillMinimal: {
    flexDirection: 'row',
    backgroundColor: 'rgba(50,50,50,0.9)',
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  minimalTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  minimalDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
    marginTop: 6,
  },
  minimalFab: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ==========================================================================
  // Floating Pill Segmented
  // ==========================================================================
  floatingPillSegmented: {
    flexDirection: 'row',
    backgroundColor: 'rgba(60,60,60,0.95)',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  segmentedTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 6,
    position: 'relative',
  },
  segmentedTabActive: {
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  segmentedTabBorder: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
  },
  segmentedLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  segmentedLabelActive: {
    color: '#FFF',
  },
  segmentedFab: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(201,169,97,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

});

export default NavBarStylesScreen;
