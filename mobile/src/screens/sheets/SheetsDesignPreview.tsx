import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors, spacing, typography, featureColors } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Sample data for preview
const CATALOGS = [
  { value: 'Fine Decor', label: 'Fine Decor', initials: 'FD', color: '#9C27B0' },
  { value: 'Artvio', label: 'Artvio', initials: 'A', color: '#2196F3' },
  { value: 'Woodrica', label: 'Woodrica', initials: 'W', color: '#4CAF50' },
  { value: 'Artis 1MM', label: 'Artis 1MM', initials: '1', color: '#FF9800' },
];

const PROGRESS = [
  { catalog: 'Artvio', achieved: 62, target: 1000, percentage: 6 },
  { catalog: 'Artis 1MM', achieved: 94, target: 1000, percentage: 9 },
];

interface DesignPreviewProps {
  navigation: any;
}

export const SheetsDesignPreview: React.FC<DesignPreviewProps> = ({ navigation }) => {
  const [currentDesign, setCurrentDesign] = useState(0);
  const [selectedCatalog, setSelectedCatalog] = useState<string | null>('Artvio');

  const designs = [
    { name: 'Design A', subtitle: 'Card-based with sections' },
    { name: 'Design B', subtitle: 'Minimal flat layout' },
    { name: 'Design C', subtitle: 'Stepper/wizard style' },
    { name: 'Design D', subtitle: 'Compact grid focus' },
    { name: 'Design E', subtitle: 'Bottom sheet style' },
  ];

  const nextDesign = () => setCurrentDesign((prev) => (prev + 1) % designs.length);
  const prevDesign = () => setCurrentDesign((prev) => (prev - 1 + designs.length) % designs.length);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Design Comparison</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Design Switcher */}
      <View style={styles.switcher}>
        <TouchableOpacity onPress={prevDesign} style={styles.switchBtn}>
          <ChevronLeft size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.switcherCenter}>
          <Text style={styles.designName}>{designs[currentDesign].name}</Text>
          <Text style={styles.designSubtitle}>{designs[currentDesign].subtitle}</Text>
        </View>
        <TouchableOpacity onPress={nextDesign} style={styles.switchBtn}>
          <ChevronRight size={20} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Dots indicator */}
      <View style={styles.dots}>
        {designs.map((_, i) => (
          <View key={i} style={[styles.dot, i === currentDesign && styles.dotActive]} />
        ))}
      </View>

      {/* Design Preview */}
      <ScrollView style={styles.previewArea} contentContainerStyle={styles.previewContent}>
        {currentDesign === 0 && <DesignA selectedCatalog={selectedCatalog} setSelectedCatalog={setSelectedCatalog} />}
        {currentDesign === 1 && <DesignB selectedCatalog={selectedCatalog} setSelectedCatalog={setSelectedCatalog} />}
        {currentDesign === 2 && <DesignC selectedCatalog={selectedCatalog} setSelectedCatalog={setSelectedCatalog} />}
        {currentDesign === 3 && <DesignD selectedCatalog={selectedCatalog} setSelectedCatalog={setSelectedCatalog} />}
        {currentDesign === 4 && <DesignE selectedCatalog={selectedCatalog} setSelectedCatalog={setSelectedCatalog} />}
      </ScrollView>

      {/* Submit Button Preview */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, !selectedCatalog && styles.submitBtnDisabled]}
          disabled={!selectedCatalog}
        >
          <Text style={styles.submitBtnText}>
            {selectedCatalog ? 'Log Sheets' : 'Select Catalog'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ============================================
// DESIGN A: Card-based with distinct sections
// ============================================
const DesignA = ({ selectedCatalog, setSelectedCatalog }: any) => (
  <View style={designA.container}>
    {/* Progress Card */}
    <View style={designA.card}>
      <Text style={designA.cardTitle}>MONTHLY PROGRESS</Text>
      {PROGRESS.map((p) => (
        <View key={p.catalog} style={designA.progressRow}>
          <Text style={designA.progressLabel}>{p.catalog}</Text>
          <View style={designA.progressBarContainer}>
            <View style={[designA.progressBar, { width: `${p.percentage}%` }]} />
          </View>
          <Text style={designA.progressValue}>{p.achieved}/{p.target}</Text>
        </View>
      ))}
    </View>

    {/* Catalog Card */}
    <View style={designA.card}>
      <Text style={designA.cardTitle}>SELECT CATALOG</Text>
      <View style={designA.catalogGrid}>
        {CATALOGS.map((c) => (
          <TouchableOpacity
            key={c.value}
            style={[
              designA.catalogItem,
              selectedCatalog === c.value && { borderColor: c.color, backgroundColor: c.color + '10' },
            ]}
            onPress={() => setSelectedCatalog(c.value)}
          >
            <View style={[designA.catalogIcon, { backgroundColor: c.color + '20' }]}>
              <Text style={[designA.catalogIconText, { color: c.color }]}>{c.initials}</Text>
            </View>
            <Text style={[designA.catalogLabel, selectedCatalog === c.value && { color: c.color }]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>

    {/* Input Card */}
    <View style={designA.card}>
      <Text style={designA.cardTitle}>NUMBER OF SHEETS</Text>
      <TextInput
        style={[designA.input, selectedCatalog && { borderColor: featureColors.sheets.primary }]}
        placeholder="0"
        placeholderTextColor={colors.text.tertiary}
        keyboardType="numeric"
      />
    </View>

    {/* Notes Card */}
    <View style={designA.card}>
      <Text style={designA.cardTitle}>NOTES (OPTIONAL)</Text>
      <TextInput
        style={designA.notesInput}
        placeholder="Add notes for manager..."
        placeholderTextColor={colors.text.tertiary}
        multiline
      />
    </View>
  </View>
);

const designA = StyleSheet.create({
  container: { gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.tertiary,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    width: 70,
    fontSize: 13,
    color: colors.text.primary,
  },
  progressBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: colors.border.default,
    borderRadius: 3,
    marginHorizontal: 10,
  },
  progressBar: {
    height: '100%',
    backgroundColor: featureColors.sheets.primary,
    borderRadius: 3,
  },
  progressValue: {
    fontSize: 12,
    color: colors.text.secondary,
    width: 60,
    textAlign: 'right',
  },
  catalogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  catalogItem: {
    width: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    gap: 10,
  },
  catalogIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogIconText: {
    fontSize: 14,
    fontWeight: '700',
  },
  catalogLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.primary,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border.default,
    borderRadius: 10,
    padding: 16,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  notesInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
});

// ============================================
// DESIGN B: Minimal flat - no cards
// ============================================
const DesignB = ({ selectedCatalog, setSelectedCatalog }: any) => (
  <View style={designB.container}>
    {/* Inline progress */}
    <Text style={designB.progressText}>
      <Text style={{ color: '#2196F3', fontWeight: '600' }}>Artvio</Text> 62/1000{'  •  '}
      <Text style={{ color: '#FF9800', fontWeight: '600' }}>Artis 1MM</Text> 94/1000
    </Text>

    {/* Title */}
    <Text style={designB.title}>
      {selectedCatalog ? 'Enter Number of Sheets' : 'Select Catalog'}
    </Text>

    {/* Catalog chips */}
    <View style={designB.chipRow}>
      {CATALOGS.map((c) => (
        <TouchableOpacity
          key={c.value}
          style={[
            designB.chip,
            selectedCatalog === c.value && { backgroundColor: c.color, borderColor: c.color },
          ]}
          onPress={() => setSelectedCatalog(c.value)}
        >
          <Text style={[
            designB.chipText,
            selectedCatalog === c.value && { color: '#fff' },
          ]}>{c.label}</Text>
        </TouchableOpacity>
      ))}
    </View>

    {/* Number input - large and centered */}
    <View style={designB.numberContainer}>
      <TextInput
        style={designB.numberInput}
        placeholder="0"
        placeholderTextColor={colors.text.tertiary}
        keyboardType="numeric"
      />
      <Text style={designB.sheetsLabel}>sheets</Text>
    </View>

    {/* Notes */}
    <TextInput
      style={designB.notes}
      placeholder="Notes for manager (optional)"
      placeholderTextColor={colors.text.tertiary}
      multiline
    />
  </View>
);

const designB = StyleSheet.create({
  container: { alignItems: 'center' },
  progressText: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 20,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 32,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    backgroundColor: '#fff',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  numberContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  numberInput: {
    fontSize: 64,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    minWidth: 150,
  },
  sheetsLabel: {
    fontSize: 16,
    color: colors.text.tertiary,
    marginTop: -8,
  },
  notes: {
    width: '100%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    minHeight: 50,
    textAlignVertical: 'top',
  },
});

// ============================================
// DESIGN C: Stepper/Wizard style
// ============================================
const DesignC = ({ selectedCatalog, setSelectedCatalog }: any) => (
  <View style={designC.container}>
    {/* Step indicator */}
    <View style={designC.steps}>
      <View style={[designC.step, designC.stepComplete]}>
        <Text style={designC.stepNumber}>1</Text>
      </View>
      <View style={[designC.stepLine, selectedCatalog && designC.stepLineActive]} />
      <View style={[designC.step, selectedCatalog && designC.stepComplete]}>
        <Text style={designC.stepNumber}>2</Text>
      </View>
    </View>
    <View style={designC.stepLabels}>
      <Text style={designC.stepLabel}>Catalog</Text>
      <Text style={designC.stepLabel}>Count</Text>
    </View>

    {/* Progress summary */}
    <View style={designC.progressBox}>
      {PROGRESS.map((p, i) => (
        <Text key={p.catalog} style={designC.progressItem}>
          {p.catalog}: {p.percentage}%{i < PROGRESS.length - 1 ? '  |  ' : ''}
        </Text>
      ))}
    </View>

    {/* Catalog selection - vertical list */}
    <View style={designC.catalogList}>
      {CATALOGS.map((c) => (
        <TouchableOpacity
          key={c.value}
          style={[
            designC.catalogRow,
            selectedCatalog === c.value && { borderLeftColor: c.color, backgroundColor: c.color + '08' },
          ]}
          onPress={() => setSelectedCatalog(c.value)}
        >
          <View style={[designC.catalogDot, { backgroundColor: c.color }]} />
          <Text style={[designC.catalogName, selectedCatalog === c.value && { fontWeight: '600' }]}>{c.label}</Text>
          {selectedCatalog === c.value && <Text style={[designC.checkmark, { color: c.color }]}>✓</Text>}
        </TouchableOpacity>
      ))}
    </View>

    {/* Count input */}
    <View style={designC.countSection}>
      <Text style={designC.countLabel}>How many sheets?</Text>
      <TextInput
        style={[designC.countInput, selectedCatalog && { borderColor: featureColors.sheets.primary }]}
        placeholder="Enter number"
        placeholderTextColor={colors.text.tertiary}
        keyboardType="numeric"
      />
    </View>

    {/* Notes */}
    <TextInput
      style={designC.notes}
      placeholder="Notes (optional)"
      placeholderTextColor={colors.text.tertiary}
    />
  </View>
);

const designC = StyleSheet.create({
  container: {},
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  step: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepComplete: {
    backgroundColor: featureColors.sheets.primary,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  stepLine: {
    width: 60,
    height: 3,
    backgroundColor: colors.border.default,
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: featureColors.sheets.primary,
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 76,
    marginBottom: 20,
  },
  stepLabel: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  progressBox: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  progressItem: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  catalogList: {
    gap: 8,
    marginBottom: 24,
  },
  catalogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  catalogDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  catalogName: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '600',
  },
  countSection: {
    marginBottom: 16,
  },
  countLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  countInput: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: colors.border.default,
    borderRadius: 10,
    padding: 14,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  notes: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
  },
});

// ============================================
// DESIGN D: Compact grid focus
// ============================================
const DesignD = ({ selectedCatalog, setSelectedCatalog }: any) => (
  <View style={designD.container}>
    {/* Combined header with progress */}
    <View style={designD.header}>
      <Text style={designD.title}>Log Sheets</Text>
      <View style={designD.progressPills}>
        {PROGRESS.map((p) => (
          <View key={p.catalog} style={designD.pill}>
            <Text style={designD.pillText}>{p.catalog} {p.percentage}%</Text>
          </View>
        ))}
      </View>
    </View>

    {/* 2x2 Grid - larger, more prominent */}
    <View style={designD.grid}>
      {CATALOGS.map((c) => {
        const isSelected = selectedCatalog === c.value;
        return (
          <TouchableOpacity
            key={c.value}
            style={[
              designD.gridItem,
              isSelected && { borderColor: c.color, borderWidth: 3 },
            ]}
            onPress={() => setSelectedCatalog(c.value)}
          >
            <View style={[designD.gridIcon, { backgroundColor: c.color }]}>
              <Text style={designD.gridIconText}>{c.initials}</Text>
            </View>
            <Text style={designD.gridLabel}>{c.label}</Text>
            {isSelected && (
              <View style={[designD.selectedBadge, { backgroundColor: c.color }]}>
                <Text style={designD.selectedBadgeText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>

    {/* Inline count input */}
    <View style={designD.countRow}>
      <Text style={designD.countLabel}>Sheets:</Text>
      <TextInput
        style={designD.countInput}
        placeholder="0"
        placeholderTextColor={colors.text.tertiary}
        keyboardType="numeric"
      />
    </View>

    {/* Notes inline */}
    <TextInput
      style={designD.notes}
      placeholder="+ Add note"
      placeholderTextColor={colors.text.tertiary}
    />
  </View>
);

const designD = StyleSheet.create({
  container: {},
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  progressPills: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    backgroundColor: featureColors.sheets.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pillText: {
    fontSize: 12,
    color: featureColors.sheets.primary,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  gridItem: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
    position: 'relative',
  },
  gridIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gridIconText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  gridLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 12,
  },
  countLabel: {
    fontSize: 16,
    color: colors.text.secondary,
    marginRight: 12,
  },
  countInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
  },
  notes: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: colors.text.secondary,
  },
});

// ============================================
// DESIGN E: Bottom sheet style (content at bottom)
// ============================================
const DesignE = ({ selectedCatalog, setSelectedCatalog }: any) => (
  <View style={designE.container}>
    {/* Large number display at top */}
    <View style={designE.numberDisplay}>
      <Text style={designE.bigNumber}>0</Text>
      <Text style={designE.sheetsText}>sheets</Text>
    </View>

    {/* Selected catalog indicator */}
    {selectedCatalog && (
      <View style={designE.selectedIndicator}>
        <Text style={designE.selectedText}>
          Logging to <Text style={{ fontWeight: '600' }}>{selectedCatalog}</Text>
        </Text>
      </View>
    )}

    {/* Bottom section */}
    <View style={designE.bottomSheet}>
      {/* Progress bar */}
      <View style={designE.progressSection}>
        {PROGRESS.map((p) => {
          const cat = CATALOGS.find(c => c.value === p.catalog);
          return (
            <View key={p.catalog} style={designE.progressItem}>
              <View style={[designE.progressDot, { backgroundColor: cat?.color }]} />
              <Text style={designE.progressName}>{p.catalog}</Text>
              <View style={designE.progressBarBg}>
                <View style={[designE.progressBarFill, { width: `${p.percentage}%`, backgroundColor: cat?.color }]} />
              </View>
              <Text style={designE.progressPercent}>{p.percentage}%</Text>
            </View>
          );
        })}
      </View>

      {/* Horizontal scroll catalogs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={designE.catalogScroll}>
        {CATALOGS.map((c) => (
          <TouchableOpacity
            key={c.value}
            style={[
              designE.catalogChip,
              selectedCatalog === c.value && { backgroundColor: c.color },
            ]}
            onPress={() => setSelectedCatalog(c.value)}
          >
            <Text style={[
              designE.catalogChipText,
              selectedCatalog === c.value && { color: '#fff' },
            ]}>{c.initials}</Text>
            <Text style={[
              designE.catalogChipLabel,
              selectedCatalog === c.value && { color: '#fff' },
            ]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Notes */}
      <TextInput
        style={designE.notes}
        placeholder="Add a note..."
        placeholderTextColor={colors.text.tertiary}
      />
    </View>
  </View>
);

const designE = StyleSheet.create({
  container: {
    flex: 1,
  },
  numberDisplay: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  bigNumber: {
    fontSize: 80,
    fontWeight: '700',
    color: colors.text.primary,
  },
  sheetsText: {
    fontSize: 18,
    color: colors.text.tertiary,
    marginTop: -10,
  },
  selectedIndicator: {
    alignItems: 'center',
    marginBottom: 20,
  },
  selectedText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  progressSection: {
    marginBottom: 20,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  progressName: {
    width: 70,
    fontSize: 13,
    color: colors.text.primary,
  },
  progressBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border.default,
    borderRadius: 2,
    marginHorizontal: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressPercent: {
    width: 35,
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'right',
  },
  catalogScroll: {
    marginBottom: 16,
  },
  catalogChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    gap: 6,
  },
  catalogChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  catalogChipLabel: {
    fontSize: 13,
    color: colors.text.primary,
  },
  notes: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
  },
});

// ============================================
// Main Styles
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingTop: 54,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  switcher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  switchBtn: {
    padding: 8,
  },
  switcherCenter: {
    alignItems: 'center',
  },
  designName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  designSubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border.default,
  },
  dotActive: {
    backgroundColor: featureColors.sheets.primary,
    width: 20,
  },
  previewArea: {
    flex: 1,
  },
  previewContent: {
    padding: 16,
    paddingBottom: 100,
  },
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  submitBtn: {
    backgroundColor: featureColors.sheets.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: colors.border.default,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default SheetsDesignPreview;
