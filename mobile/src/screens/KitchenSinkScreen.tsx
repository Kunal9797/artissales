/**
 * Kitchen Sink Screen
 * Preview and test all design system elements + Choose color themes
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Pressable,
} from 'react-native';
import { Button, Card, Input, Header, Spinner, Badge, ProgressBar, Checkbox, Radio, Switch, Select, Tabs } from '../components/ui';
import { useToast } from '../providers/ToastProvider';
import { colors, typography, spacing, shadows, roles, states, applyState } from '../theme';
import type { RoleKey, StateKey } from '../theme';
import { Check, Plus, Save, Trash2, ArrowRight, Download, Upload, AlertCircle, Info, CheckCircle, AlertTriangle, Building2, Users, TrendingUp } from 'lucide-react-native';
import { FiltersBar, EmptyState, ErrorState, Skeleton, KpiCard } from '../patterns';
import type { Chip, FilterSpec } from '../patterns';

interface KitchenSinkScreenProps {
  navigation: any;
}

// Toast Demo Component
const ToastDemoSection = () => {
  const toast = useToast();

  return (
    <Card>
      <Text style={styles.cardTitle}>Toasts</Text>
      <Text style={[styles.caption, { marginBottom: spacing.sm }]}>
        Tap buttons to show toast notifications
      </Text>
      <View style={styles.buttonGroup}>
        <Button
          onPress={() => toast.show({ kind: 'success', text: 'Action completed successfully!' })}
          variant="primary"
          size="small"
          style={{ backgroundColor: roles.success.base }}
        >
          Show Success Toast
        </Button>
        <Button
          onPress={() => toast.show({ kind: 'error', text: 'Something went wrong. Please try again.' })}
          variant="primary"
          size="small"
          style={{ backgroundColor: roles.error.base }}
        >
          Show Error Toast
        </Button>
        <Button
          onPress={() => toast.show({ kind: 'warning', text: 'This action cannot be undone.' })}
          variant="primary"
          size="small"
          style={{ backgroundColor: roles.warn.base }}
        >
          Show Warning Toast
        </Button>
        <Button
          onPress={() => toast.show({ kind: 'info', text: 'New features are available!' })}
          variant="primary"
          size="small"
          style={{ backgroundColor: roles.info.base }}
        >
          Show Info Toast
        </Button>
      </View>
    </Card>
  );
};

export const KitchenSinkScreen: React.FC<KitchenSinkScreenProps> = ({ navigation }) => {
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');
  const [useBrandBackground, setUseBrandBackground] = useState(false);

  // PR3 state
  const [checkboxValue, setCheckboxValue] = useState(false);
  const [radioValue, setRadioValue] = useState('option1');
  const [switchValue, setSwitchValue] = useState(false);
  const [selectValue, setSelectValue] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState('tab1');

  // PR4 state
  const [filterChips, setFilterChips] = useState<Chip[]>([
    { label: 'All', value: 'all', active: true },
    { label: 'Active', value: 'active', active: false },
    { label: 'Pending', value: 'pending', active: false },
  ]);
  const [showError, setShowError] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);

  // Color comparison: Corporate Blue vs Brand Background
  const primaryColor = useBrandBackground ? '#393735' : '#3A5A7C';
  const primaryName = useBrandBackground ? 'Brand Background' : 'Corporate Blue';
  const primaryHex = useBrandBackground ? '#393735' : '#3A5A7C';

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );


  return (
    <View style={styles.container}>
      <Header
        title="Design System"
        subtitle="Choose Theme & Preview Components"
        showLogo={true}
        rightAction={{
          icon: '✕',
          onPress: () => navigation.goBack(),
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

        {/* DEV-ONLY: Design Lab Link */}
        {__DEV__ && (
          <Section title="🧪 Design Lab (Dev Only)">
            <Button
              onPress={() => navigation.navigate('DesignLab')}
              variant="primary"
              style={{ backgroundColor: colors.accent }}
            >
              Open Design Lab →
            </Button>
            <Text style={[styles.instructionText, { marginTop: spacing.sm }]}>
              Live theme token editor with real-time preview. Edit colors, spacing, and typography.
            </Text>
          </Section>
        )}

        {/* Color Toggle */}
        <Section title="🎨 Compare Primary Colors">
          <View style={styles.toggleContainer}>
            <Button
              onPress={() => setUseBrandBackground(false)}
              variant={!useBrandBackground ? 'primary' : 'outline'}
              size="small"
              style={{ flex: 1, marginRight: spacing.sm }}
            >
              Corporate Blue
            </Button>
            <Button
              onPress={() => setUseBrandBackground(true)}
              variant={useBrandBackground ? 'primary' : 'outline'}
              size="small"
              style={{ flex: 1, backgroundColor: useBrandBackground ? '#393735' : 'transparent' }}
            >
              Brand Background
            </Button>
          </View>
        </Section>

        {/* Applied Theme */}
        <Section title="✅ Currently Previewing">
          <Card style={{ backgroundColor: primaryColor, borderWidth: 3, borderColor: colors.accent }}>
            <Text style={[styles.cardTitle, { color: '#fff' }]}>{primaryName} + Yellower Gold</Text>
            <Text style={[styles.cardSubtitle, { color: 'rgba(255,255,255,0.9)', marginTop: spacing.sm }]}>
              Primary: {primaryHex}{'\n'}
              Accent (Gold): #D4A944
            </Text>
          </Card>
        </Section>

        {/* Color Swatches */}
        <Section title="Color Palette">
          <View style={styles.colorGrid}>
            <View style={styles.colorItem}>
              <View style={[styles.colorSwatch, { backgroundColor: primaryColor }]} />
              <Text style={styles.colorLabel}>{primaryName}</Text>
              <Text style={styles.colorValue}>{primaryHex}</Text>
            </View>
            <View style={styles.colorItem}>
              <View style={[styles.colorSwatch, { backgroundColor: colors.accent }]} />
              <Text style={styles.colorLabel}>Accent Gold</Text>
              <Text style={styles.colorValue}>#D4A944</Text>
            </View>
          </View>
        </Section>

        {/* Button Preview */}
        <Section title="Button Styles">
          <View style={styles.buttonGroup}>
            <Button
              onPress={() => Alert.alert('Primary')}
              variant="primary"
              style={{ backgroundColor: primaryColor }}
            >
              Primary Button
            </Button>
            <Button
              onPress={() => Alert.alert('Accent')}
              variant="primary"
              style={{ backgroundColor: colors.accent }}
            >
              Accent Button (Gold)
            </Button>
            <Button
              onPress={() => Alert.alert('Outline')}
              variant="outline"
              style={{ borderColor: primaryColor }}
            >
              Outline Button
            </Button>
          </View>
        </Section>

        {/* Enhanced Buttons with Icons */}
        <Section title="✨ Buttons with Icons (Lucide)">
          <View style={styles.buttonGroup}>
            <Button
              onPress={() => Alert.alert('Save')}
              variant="primary"
              style={{ backgroundColor: primaryColor }}
              leftIcon={<Save size={18} color="#fff" />}
            >
              Save Changes
            </Button>

            <Button
              onPress={() => Alert.alert('Add')}
              variant="primary"
              style={{ backgroundColor: primaryColor }}
              rightIcon={<Plus size={18} color="#fff" />}
            >
              Add Visit
            </Button>

            <Button
              onPress={() => Alert.alert('Delete')}
              variant="danger"
              leftIcon={<Trash2 size={18} color="#fff" />}
            >
              Delete
            </Button>

            <Button
              onPress={() => Alert.alert('Download')}
              variant="outline"
              style={{ borderColor: primaryColor }}
              leftIcon={<Download size={18} color={primaryColor} />}
            >
              Download Report
            </Button>

            <Button
              onPress={() => Alert.alert('Upload')}
              variant="secondary"
              rightIcon={<Upload size={18} color={colors.text.primary} />}
            >
              Upload Photo
            </Button>

            <Button
              onPress={() => Alert.alert('Continue')}
              variant="primary"
              style={{ backgroundColor: primaryColor }}
              rightIcon={<ArrowRight size={18} color="#fff" />}
              fullWidth
            >
              Continue
            </Button>
          </View>
        </Section>

        {/* Loading States */}
        <Section title="⏳ Loading States (Spinner + Text)">
          <View style={styles.buttonGroup}>
            <Button
              onPress={() => {}}
              loading
              variant="primary"
              style={{ backgroundColor: primaryColor }}
            >
              Saving...
            </Button>

            <Button
              onPress={() => {}}
              loading
              variant="outline"
              style={{ borderColor: primaryColor }}
            >
              Loading Data...
            </Button>

            <Button
              onPress={() => {}}
              loading
              variant="secondary"
            >
              Processing
            </Button>
          </View>
        </Section>

        {/* Button Variants */}
        <Section title="Button Variants">
          <View style={styles.buttonGroup}>
            <Button onPress={() => Alert.alert('Primary')} variant="primary" style={{ backgroundColor: primaryColor }}>
              Primary Button
            </Button>
            <Button onPress={() => Alert.alert('Secondary')} variant="secondary">
              Secondary Button
            </Button>
            <Button onPress={() => Alert.alert('Outline')} variant="outline" style={{ borderColor: primaryColor }}>
              Outline Button
            </Button>
            <Button onPress={() => Alert.alert('Ghost')} variant="ghost" style={{ color: primaryColor }}>
              Ghost Button
            </Button>
            <Button onPress={() => Alert.alert('Danger')} variant="danger">
              Danger Button
            </Button>
          </View>
        </Section>

        {/* Button Sizes */}
        <Section title="Button Sizes">
          <View style={styles.buttonGroup}>
            <Button onPress={() => Alert.alert('Small')} size="small" style={{ backgroundColor: primaryColor }}>
              Small Button
            </Button>
            <Button onPress={() => Alert.alert('Medium')} size="medium" style={{ backgroundColor: primaryColor }}>
              Medium Button
            </Button>
            <Button onPress={() => Alert.alert('Large')} size="large" style={{ backgroundColor: primaryColor }}>
              Large Button
            </Button>
          </View>
        </Section>

        {/* Cards */}
        <Section title="Cards">
          <Card elevation="sm" style={styles.cardExample}>
            <Text style={styles.cardTitle}>Small Elevation</Text>
            <Text style={styles.cardText}>This card has a small shadow</Text>
          </Card>

          <Card elevation="md" style={styles.cardExample}>
            <Text style={styles.cardTitle}>Medium Elevation (Default)</Text>
            <Text style={styles.cardText}>This card has a medium shadow</Text>
          </Card>

          <Card
            elevation="md"
            onPress={() => Alert.alert('Card Pressed')}
            style={styles.cardExample}
          >
            <Text style={styles.cardTitle}>Pressable Card</Text>
            <Text style={styles.cardText}>Tap me to see the press effect</Text>
          </Card>
        </Section>

        {/* Inputs */}
        <Section title="Inputs">
          <Input
            label="Default Input"
            placeholder="Enter text here..."
            value={inputValue}
            onChangeText={setInputValue}
            helperText="This is helper text"
          />
          <Input
            label="Input with Error"
            placeholder="Enter text here..."
            value={inputError}
            onChangeText={setInputError}
            error="This field is required"
          />
        </Section>

        {/* NEW: Role Tokens */}
        <Section title="🎭 Role Tokens (Semantic Colors)">
          <Text style={styles.instructionText}>
            Semantic roles ensure consistent color usage for status messages, badges, and alerts.
          </Text>
          <View style={styles.roleGrid}>
            {(['success', 'warn', 'error', 'info', 'neutral', 'primary', 'accent'] as RoleKey[]).map((role) => (
              <View key={role} style={styles.roleItem}>
                <View style={[styles.roleSwatch, { backgroundColor: roles[role].bg }]}>
                  <View style={[styles.roleSwatchInner, { backgroundColor: roles[role].base }]} />
                </View>
                <Text style={styles.roleLabel}>{role}</Text>
                <View style={[styles.roleBadge, { backgroundColor: roles[role].bg, borderColor: roles[role].border }]}>
                  {role === 'success' && <CheckCircle size={14} color={roles[role].text} />}
                  {role === 'error' && <AlertCircle size={14} color={roles[role].text} />}
                  {role === 'warn' && <AlertTriangle size={14} color={roles[role].text} />}
                  {role === 'info' && <Info size={14} color={roles[role].text} />}
                  <Text style={[styles.roleBadgeText, { color: roles[role].text }]}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Section>

        {/* NEW: State Tokens */}
        <Section title="⚡ State Tokens (Interactions)">
          <Text style={styles.instructionText}>
            State tokens define visual feedback for user interactions. Press the cards to see effects.
          </Text>
          <View style={styles.stateGrid}>
            {/* Focus State */}
            <Pressable style={[styles.stateCard, states.focus.shadow]}>
              <Text style={styles.stateTitle}>Focus</Text>
              <View style={[styles.stateSwatch, {
                borderColor: states.focus.border,
                borderWidth: states.focus.borderWidth,
                backgroundColor: states.focus.bgTint
              }]} />
              <Text style={styles.stateDesc}>Accessibility border</Text>
            </Pressable>

            {/* Pressed State */}
            <Pressable
              style={({ pressed }) => [
                styles.stateCard,
                pressed && { opacity: states.pressed.opacity }
              ]}
            >
              <Text style={styles.stateTitle}>Pressed</Text>
              <View style={[styles.stateSwatch, { backgroundColor: colors.primary }]} />
              <Text style={styles.stateDesc}>Tap to see effect</Text>
            </Pressable>

            {/* Disabled State */}
            <View style={[styles.stateCard, { opacity: states.disabled.opacity }]}>
              <Text style={styles.stateTitle}>Disabled</Text>
              <View style={[styles.stateSwatch, {
                backgroundColor: states.disabled.bg,
                borderColor: states.disabled.border,
                borderWidth: 1
              }]} />
              <Text style={styles.stateDesc}>Inactive state</Text>
            </View>

            {/* Loading State */}
            <View style={[styles.stateCard, { opacity: states.loading.opacity }]}>
              <Text style={styles.stateTitle}>Loading</Text>
              <View style={[styles.stateSwatch, { backgroundColor: colors.primary }]} />
              <Text style={styles.stateDesc}>Processing...</Text>
            </View>
          </View>
        </Section>

        {/* NEW: applyState Helper Demo */}
        <Section title="🔧 applyState() Helper Function">
          <Text style={styles.instructionText}>
            Use applyState() to quickly apply interaction states to any component.
          </Text>
          <View style={styles.buttonGroup}>
            <Pressable
              style={({ pressed }) => [
                styles.demoButton,
                pressed ? applyState(styles.demoButton, 'pressed') : {}
              ]}
              onPress={() => Alert.alert('Pressed state applied!')}
            >
              <Text style={styles.demoButtonText}>Press Me (applyState)</Text>
            </Pressable>

            <View style={applyState(styles.demoButton, 'disabled')}>
              <Text style={[styles.demoButtonText, { color: states.disabled.text }]}>
                Disabled (applyState)
              </Text>
            </View>

            <View style={applyState(styles.demoButton, 'focus')}>
              <Text style={styles.demoButtonText}>Focus (applyState)</Text>
            </View>
          </View>
        </Section>

        {/* NEW: PR2 Components */}
        <Section title="🎨 DS v0.1 Components (PR2)">
          <Text style={styles.instructionText}>
            New standardized UI components using role tokens
          </Text>

          {/* Spinners */}
          <Card style={{ marginBottom: spacing.md }}>
            <Text style={styles.cardTitle}>Spinners</Text>
            <View style={styles.spinnerRow}>
              <View style={styles.spinnerDemo}>
                <Spinner size="sm" tone="primary" />
                <Text style={styles.caption}>Small</Text>
              </View>
              <View style={styles.spinnerDemo}>
                <Spinner size="md" tone="primary" />
                <Text style={styles.caption}>Medium</Text>
              </View>
              <View style={styles.spinnerDemo}>
                <Spinner size="lg" tone="accent" />
                <Text style={styles.caption}>Large (Accent)</Text>
              </View>
              <View style={styles.spinnerDemo}>
                <Spinner size="md" tone="success" />
                <Text style={styles.caption}>Success</Text>
              </View>
            </View>
          </Card>

          {/* Badges */}
          <Card style={{ marginBottom: spacing.md }}>
            <Text style={styles.cardTitle}>Badges</Text>
            <View style={styles.badgeRow}>
              <Badge variant="success" size="md" icon={<CheckCircle size={12} color={roles.success.text} />}>
                Success
              </Badge>
              <Badge variant="error" size="md" icon={<AlertCircle size={12} color={roles.error.text} />}>
                Error
              </Badge>
              <Badge variant="warn" size="md" icon={<AlertTriangle size={12} color={roles.warn.text} />}>
                Warning
              </Badge>
              <Badge variant="info" size="md" icon={<Info size={12} color={roles.info.text} />}>
                Info
              </Badge>
              <Badge variant="neutral" size="sm">
                Neutral
              </Badge>
            </View>
          </Card>

          {/* Progress Bars */}
          <Card style={{ marginBottom: spacing.md }}>
            <Text style={styles.cardTitle}>Progress Bars</Text>
            <View style={{ gap: spacing.md }}>
              <View>
                <ProgressBar value={0.25} barColor={roles.success.base} />
                <Text style={[styles.caption, { marginTop: spacing.xs }]}>25% Complete</Text>
              </View>
              <View>
                <ProgressBar value={0.5} barColor={roles.info.base} />
                <Text style={[styles.caption, { marginTop: spacing.xs }]}>50% Complete</Text>
              </View>
              <View>
                <ProgressBar value={0.75} barColor={roles.warn.base} />
                <Text style={[styles.caption, { marginTop: spacing.xs }]}>75% Complete</Text>
              </View>
              <View>
                <ProgressBar value={1.0} height={6} />
                <Text style={[styles.caption, { marginTop: spacing.xs }]}>100% Complete (Thicker)</Text>
              </View>
            </View>
          </Card>

          {/* Toast Demos */}
          <ToastDemoSection />
        </Section>

        {/* Real-World Example */}
        <Section title="Real-World Example">
          <Card>
            <Text style={styles.cardTitle}>Visit Log Summary</Text>
            <Text style={[styles.cardText, { marginTop: spacing.sm }]}>
              Account: ABC Laminates
            </Text>
            <Text style={styles.cardText}>Type: Distributor</Text>
            <Text style={styles.cardText}>Time: 2:30 PM</Text>

            <View style={{ height: spacing.md }} />

            <View style={styles.buttonRow}>
              <Button
                onPress={() => Alert.alert('View Details')}
                variant="outline"
                size="small"
                style={{ flex: 1, marginRight: spacing.sm, borderColor: primaryColor }}
                leftIcon={<ArrowRight size={16} color={primaryColor} />}
              >
                View
              </Button>
              <Button
                onPress={() => Alert.alert('Follow Up')}
                variant="primary"
                size="small"
                style={{ flex: 1, backgroundColor: primaryColor }}
                rightIcon={<Plus size={16} color="#fff" />}
              >
                Follow Up
              </Button>
            </View>
          </Card>
        </Section>

        {/* ========== PR3: Input Components ========== */}
        <Section title="📋 PR3: Input Components">
          <Card>
            <Text style={styles.cardTitle}>Checkbox</Text>
            <Checkbox
              checked={checkboxValue}
              onChange={setCheckboxValue}
              label="I agree to the terms and conditions"
            />
            <Checkbox
              checked={false}
              onChange={() => {}}
              label="Disabled checkbox"
              disabled
            />
          </Card>

          <Card style={{ marginTop: spacing.md }}>
            <Text style={styles.cardTitle}>Radio</Text>
            <Radio
              selected={radioValue === 'option1'}
              onChange={() => setRadioValue('option1')}
              label="Option 1"
            />
            <Radio
              selected={radioValue === 'option2'}
              onChange={() => setRadioValue('option2')}
              label="Option 2"
            />
            <Radio
              selected={radioValue === 'option3'}
              onChange={() => setRadioValue('option3')}
              label="Option 3"
            />
            <Radio
              selected={false}
              onChange={() => {}}
              label="Disabled option"
              disabled
            />
          </Card>

          <Card style={{ marginTop: spacing.md }}>
            <Text style={styles.cardTitle}>Switch</Text>
            <Switch
              value={switchValue}
              onChange={setSwitchValue}
              label="Enable notifications"
            />
            <Switch
              value={true}
              onChange={() => {}}
              label="Disabled switch"
              disabled
            />
          </Card>

          <Card style={{ marginTop: spacing.md }}>
            <Text style={styles.cardTitle}>Select</Text>
            <Select
              label="Choose a city"
              value={selectValue}
              onChange={setSelectValue}
              options={[
                { label: 'Mumbai', value: 'mumbai' },
                { label: 'Delhi', value: 'delhi' },
                { label: 'Bangalore', value: 'bangalore' },
                { label: 'Chennai', value: 'chennai' },
                { label: 'Kolkata', value: 'kolkata' },
              ]}
              searchable
            />
            <Text style={[styles.caption, { marginTop: spacing.sm }]}>
              Selected: {selectValue || 'None'}
            </Text>
          </Card>

          <Card style={{ marginTop: spacing.md }}>
            <Text style={styles.cardTitle}>Tabs</Text>
            <Tabs
              items={[
                { label: 'Overview', value: 'tab1' },
                { label: 'Details', value: 'tab2' },
                { label: 'Settings', value: 'tab3' },
              ]}
              value={tabValue}
              onChange={setTabValue}
            />
            <Text style={[styles.caption, { marginTop: spacing.md }]}>
              Current tab: {tabValue}
            </Text>

            <View style={{ marginTop: spacing.md }}>
              <Text style={[styles.caption, { marginBottom: spacing.sm }]}>Dense mode:</Text>
              <Tabs
                items={[
                  { label: 'All', value: 'all' },
                  { label: 'Active', value: 'active' },
                  { label: 'Archived', value: 'archived' },
                ]}
                value={tabValue}
                onChange={setTabValue}
                dense
              />
            </View>
          </Card>
        </Section>

        {/* ========== PR4: Patterns ========== */}
        <Section title="🎨 PR4: Patterns">
          <Card>
            <Text style={styles.cardTitle}>KPI Cards</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.sm }}>
              <KpiCard
                title="Total Accounts"
                value={142}
                icon={<Building2 size={20} color={colors.primary} />}
                delta={{ value: 12, positiveIsGood: true }}
              />
              <KpiCard
                title="Active Users"
                value={89}
                icon={<Users size={20} color={roles.success.base} />}
                delta={{ value: -5, positiveIsGood: true }}
              />
              <KpiCard
                title="Revenue"
                value="₹2.4L"
                icon={<TrendingUp size={20} color={roles.info.base} />}
                delta={{ value: 18, positiveIsGood: true }}
              />
            </View>
          </Card>

          <Card style={{ marginTop: spacing.md }}>
            <Text style={styles.cardTitle}>FiltersBar</Text>
            <FiltersBar
              chips={filterChips}
              onChipToggle={(value) => {
                setFilterChips(prev => prev.map(c => ({ ...c, active: c.value === value })));
              }}
              moreFilters={[
                {
                  key: 'region',
                  label: 'Region',
                  options: [
                    { label: 'North', value: 'north' },
                    { label: 'South', value: 'south' },
                    { label: 'East', value: 'east' },
                    { label: 'West', value: 'west' },
                  ],
                },
                {
                  key: 'type',
                  label: 'Account Type',
                  options: [
                    { label: 'Distributor', value: 'distributor' },
                    { label: 'Dealer', value: 'dealer' },
                    { label: 'Architect', value: 'architect' },
                  ],
                },
              ]}
              onApply={(filters) => Alert.alert('Filters Applied', JSON.stringify(filters, null, 2))}
            />
          </Card>

          <Card style={{ marginTop: spacing.md }}>
            <Text style={styles.cardTitle}>Skeleton (Loading State)</Text>
            <Button
              onPress={() => {
                setShowSkeleton(true);
                setTimeout(() => setShowSkeleton(false), 3000);
              }}
              variant="primary"
              size="small"
            >
              Show Skeleton (3s)
            </Button>
            {showSkeleton && (
              <View style={{ marginTop: spacing.md }}>
                <Skeleton rows={3} avatar />
                <Skeleton rows={2} />
                <Skeleton card />
              </View>
            )}
          </Card>

          <Card style={{ marginTop: spacing.md }}>
            <Text style={styles.cardTitle}>EmptyState</Text>
            <Button
              onPress={() => setShowEmpty(!showEmpty)}
              variant="primary"
              size="small"
            >
              {showEmpty ? 'Hide' : 'Show'} EmptyState
            </Button>
            {showEmpty && (
              <View style={{ marginTop: spacing.md, height: 300 }}>
                <EmptyState
                  icon={<Building2 size={48} color={colors.text.tertiary} />}
                  title="No accounts found"
                  subtitle="Try adjusting your filters or create a new account"
                  primaryAction={{
                    label: 'Add Account',
                    onPress: () => Alert.alert('Add Account', 'Action triggered!'),
                  }}
                />
              </View>
            )}
          </Card>

          <Card style={{ marginTop: spacing.md }}>
            <Text style={styles.cardTitle}>ErrorState</Text>
            <Button
              onPress={() => setShowError(!showError)}
              variant="primary"
              size="small"
            >
              {showError ? 'Hide' : 'Show'} ErrorState
            </Button>
            {showError && (
              <View style={{ marginTop: spacing.md, height: 300 }}>
                <ErrorState
                  message="Network error. Please check your connection."
                  retry={() => Alert.alert('Retry', 'Retrying...')}
                />
              </View>
            )}
          </Card>
        </Section>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.screenPadding,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.styles.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  instructionText: {
    ...typography.styles.body,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    lineHeight: 22,
  },

  // Color Swatches
  colorGrid: {
    flexDirection: 'row',
    gap: spacing.lg,
    justifyContent: 'center',
  },
  colorItem: {
    alignItems: 'center',
    flex: 1,
  },
  colorSwatch: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: spacing.borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border.default,
    ...shadows.md,
  },
  colorLabel: {
    ...typography.styles.label,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs / 2,
  },
  colorValue: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    fontFamily: 'monospace',
  },

  // Buttons
  buttonGroup: {
    gap: spacing.md,
  },

  // Cards
  cardExample: {
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.styles.h4,
    color: colors.text.primary,
  },
  cardSubtitle: {
    ...typography.styles.bodySmall,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    fontFamily: 'monospace',
  },
  cardText: {
    ...typography.styles.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  buttonRow: {
    flexDirection: 'row',
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  // Role Tokens
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  roleItem: {
    width: '30%',
    alignItems: 'center',
  },
  roleSwatch: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.xs,
    marginBottom: spacing.xs,
    borderWidth: 2,
    borderColor: colors.border.default,
  },
  roleSwatchInner: {
    flex: 1,
    borderRadius: spacing.borderRadius.sm,
  },
  roleLabel: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    textTransform: 'capitalize',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: spacing.borderRadius.sm,
    borderWidth: 1,
  },
  roleBadgeText: {
    ...typography.styles.caption,
    fontSize: 11,
  },

  // State Tokens
  stateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  stateCard: {
    width: '47%',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: spacing.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  stateTitle: {
    ...typography.styles.label,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  stateSwatch: {
    width: 60,
    height: 60,
    borderRadius: spacing.borderRadius.md,
    marginBottom: spacing.sm,
  },
  stateDesc: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
  },

  // Demo Button for applyState
  demoButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: spacing.borderRadius.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  demoButtonText: {
    ...typography.styles.button,
    color: colors.text.inverse,
  },

  // PR2 Component Styles
  spinnerRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  spinnerDemo: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  caption: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});
