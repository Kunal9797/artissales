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
} from 'react-native';
import { Button, Card, Input, Header } from '../components/ui';
import { colors, typography, spacing, shadows } from '../theme';
import { Check, Plus, Save, Trash2, ArrowRight, Download, Upload } from 'lucide-react-native';

interface KitchenSinkScreenProps {
  navigation: any;
}

export const KitchenSinkScreen: React.FC<KitchenSinkScreenProps> = ({ navigation }) => {
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');
  const [useBrandBackground, setUseBrandBackground] = useState(false);

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
});
