import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { ChevronLeft, ChevronRight, Car, UtensilsCrossed, Hotel, FileText, Camera, Receipt } from 'lucide-react-native';
import { colors, spacing, typography, featureColors } from '../../theme';

const CATEGORIES = [
  { value: 'travel', label: 'Travel', icon: Car, color: '#2196F3' },
  { value: 'food', label: 'Food', icon: UtensilsCrossed, color: '#FF9800' },
  { value: 'accommodation', label: 'Hotel', icon: Hotel, color: '#9C27B0' },
  { value: 'other', label: 'Other', icon: FileText, color: '#607D8B' },
];

interface Props {
  navigation: any;
}

export const ExpenseDesignPreview: React.FC<Props> = ({ navigation }) => {
  const [currentDesign, setCurrentDesign] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('travel');
  const [amount, setAmount] = useState('');

  const designs = [
    { name: 'Design A', subtitle: 'Clean flat - like new Sheets' },
    { name: 'Design B', subtitle: 'Amount-first focus' },
    { name: 'Design C', subtitle: 'Horizontal category scroll' },
    { name: 'Design D', subtitle: 'Compact single card' },
    { name: 'Design E', subtitle: 'Minimal with large input' },
  ];

  const next = () => setCurrentDesign((p) => (p + 1) % designs.length);
  const prev = () => setCurrentDesign((p) => (p - 1 + designs.length) % designs.length);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expense Designs</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Switcher */}
      <View style={styles.switcher}>
        <TouchableOpacity onPress={prev} style={styles.switchBtn}>
          <ChevronLeft size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.switcherCenter}>
          <Text style={styles.designName}>{designs[currentDesign].name}</Text>
          <Text style={styles.designSubtitle}>{designs[currentDesign].subtitle}</Text>
        </View>
        <TouchableOpacity onPress={next} style={styles.switchBtn}>
          <ChevronRight size={20} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Dots */}
      <View style={styles.dots}>
        {designs.map((_, i) => (
          <View key={i} style={[styles.dot, i === currentDesign && styles.dotActive]} />
        ))}
      </View>

      {/* Preview */}
      <ScrollView style={styles.preview} contentContainerStyle={styles.previewContent}>
        {currentDesign === 0 && <DesignA cat={selectedCategory} setCat={setSelectedCategory} amount={amount} setAmount={setAmount} />}
        {currentDesign === 1 && <DesignB cat={selectedCategory} setCat={setSelectedCategory} amount={amount} setAmount={setAmount} />}
        {currentDesign === 2 && <DesignC cat={selectedCategory} setCat={setSelectedCategory} amount={amount} setAmount={setAmount} />}
        {currentDesign === 3 && <DesignD cat={selectedCategory} setCat={setSelectedCategory} amount={amount} setAmount={setAmount} />}
        {currentDesign === 4 && <DesignE cat={selectedCategory} setCat={setSelectedCategory} amount={amount} setAmount={setAmount} />}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.submitBtn, !amount && styles.submitBtnDisabled]}>
          <Text style={styles.submitBtnText}>{amount ? 'Log Expense' : 'Enter Amount'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// =============================================
// DESIGN A: Clean flat - matches new Sheets screen
// =============================================
const DesignA = ({ cat, setCat, amount, setAmount }: any) => (
  <View>
    {/* Category Grid - 2x2 like Sheets */}
    <View style={dA.grid}>
      {CATEGORIES.map((c) => {
        const Icon = c.icon;
        const selected = cat === c.value;
        return (
          <TouchableOpacity
            key={c.value}
            style={[dA.card, selected && { borderColor: c.color, borderWidth: 2.5 }]}
            onPress={() => setCat(c.value)}
          >
            <View style={[dA.badge, { backgroundColor: c.color }]}>
              <Icon size={20} color="#fff" />
            </View>
            <Text style={[dA.label, selected && { color: c.color }]}>{c.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>

    {/* Amount Input */}
    <View style={dA.amountSection}>
      <TextInput
        style={[dA.amountInput, cat && dA.amountInputActive]}
        placeholder="0"
        placeholderTextColor={colors.text.tertiary}
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
      />
      <Text style={dA.amountLabel}>rupees</Text>
    </View>

    {/* Note + Receipt row */}
    <View style={dA.row}>
      <TextInput style={dA.noteInput} placeholder="Add note (optional)" placeholderTextColor={colors.text.tertiary} />
      <TouchableOpacity style={dA.receiptBtn}>
        <Camera size={18} color={featureColors.expenses.primary} />
      </TouchableOpacity>
    </View>
  </View>
);

const dA = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  card: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    padding: 14,
  },
  badge: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  label: { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  amountSection: { alignItems: 'center', marginBottom: 24 },
  amountInput: {
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: colors.border.default,
    borderRadius: 16,
    width: '100%',
    paddingVertical: 18,
    fontSize: 36,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
  },
  amountInputActive: { borderColor: featureColors.expenses.primary },
  amountLabel: { fontSize: 14, color: colors.text.tertiary, marginTop: 6 },
  row: { flexDirection: 'row', gap: 10 },
  noteInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  receiptBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: featureColors.expenses.primary,
  },
});

// =============================================
// DESIGN B: Amount-first focus
// =============================================
const DesignB = ({ cat, setCat, amount, setAmount }: any) => (
  <View>
    {/* Big amount at top */}
    <View style={dB.amountSection}>
      <Text style={dB.currency}>₹</Text>
      <TextInput
        style={dB.amountInput}
        placeholder="0"
        placeholderTextColor={colors.text.tertiary}
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
      />
    </View>

    {/* Category chips - single row */}
    <View style={dB.chips}>
      {CATEGORIES.map((c) => {
        const selected = cat === c.value;
        return (
          <TouchableOpacity
            key={c.value}
            style={[dB.chip, selected && { backgroundColor: c.color, borderColor: c.color }]}
            onPress={() => setCat(c.value)}
          >
            <Text style={[dB.chipText, selected && { color: '#fff' }]}>{c.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>

    {/* Description */}
    <TextInput
      style={dB.descInput}
      placeholder="What was this expense for?"
      placeholderTextColor={colors.text.tertiary}
    />

    {/* Receipt */}
    <TouchableOpacity style={dB.receiptBtn}>
      <Camera size={18} color={colors.text.secondary} />
      <Text style={dB.receiptText}>Add receipt</Text>
    </TouchableOpacity>
  </View>
);

const dB = StyleSheet.create({
  amountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    paddingVertical: 20,
  },
  currency: { fontSize: 40, fontWeight: '300', color: colors.text.tertiary, marginRight: 4 },
  amountInput: { fontSize: 56, fontWeight: '700', color: colors.text.primary, minWidth: 100, textAlign: 'center' },
  chips: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: colors.border.default,
  },
  chipText: { fontSize: 14, fontWeight: '500', color: colors.text.primary },
  descInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    marginBottom: 12,
  },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
  },
  receiptText: { fontSize: 14, color: colors.text.secondary },
});

// =============================================
// DESIGN C: Horizontal category scroll
// =============================================
const DesignC = ({ cat, setCat, amount, setAmount }: any) => (
  <View>
    {/* Horizontal scrolling categories */}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={dC.scroll}>
      {CATEGORIES.map((c) => {
        const Icon = c.icon;
        const selected = cat === c.value;
        return (
          <TouchableOpacity
            key={c.value}
            style={[dC.catCard, selected && { borderColor: c.color, backgroundColor: c.color + '10' }]}
            onPress={() => setCat(c.value)}
          >
            <View style={[dC.iconCircle, { backgroundColor: c.color + '20' }]}>
              <Icon size={22} color={c.color} />
            </View>
            <Text style={[dC.catLabel, selected && { color: c.color }]}>{c.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>

    {/* Amount with prefix */}
    <View style={dC.amountRow}>
      <Text style={dC.prefix}>₹</Text>
      <TextInput
        style={dC.amountInput}
        placeholder="0.00"
        placeholderTextColor={colors.text.tertiary}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />
    </View>

    {/* Note */}
    <TextInput style={dC.noteInput} placeholder="Add a note..." placeholderTextColor={colors.text.tertiary} />

    {/* Receipt toggle */}
    <TouchableOpacity style={dC.receiptToggle}>
      <Receipt size={20} color={featureColors.expenses.primary} />
      <Text style={dC.receiptToggleText}>Attach receipt</Text>
      <ChevronRight size={18} color={colors.text.tertiary} />
    </TouchableOpacity>
  </View>
);

const dC = StyleSheet.create({
  scroll: { marginBottom: 24, marginHorizontal: -16 },
  catCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border.default,
    padding: 16,
    marginHorizontal: 6,
    alignItems: 'center',
    minWidth: 90,
  },
  iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  catLabel: { fontSize: 13, fontWeight: '600', color: colors.text.primary },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  prefix: { fontSize: 24, fontWeight: '600', color: colors.text.tertiary },
  amountInput: { flex: 1, fontSize: 28, fontWeight: '700', paddingVertical: 16, color: colors.text.primary },
  noteInput: { backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 14, marginBottom: 12 },
  receiptToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  receiptToggleText: { flex: 1, fontSize: 14, color: colors.text.primary },
});

// =============================================
// DESIGN D: Compact single card
// =============================================
const DesignD = ({ cat, setCat, amount, setAmount }: any) => (
  <View style={dD.card}>
    {/* Inline category selector */}
    <View style={dD.catRow}>
      {CATEGORIES.map((c) => {
        const Icon = c.icon;
        const selected = cat === c.value;
        return (
          <TouchableOpacity
            key={c.value}
            style={[dD.catBtn, selected && { backgroundColor: c.color }]}
            onPress={() => setCat(c.value)}
          >
            <Icon size={18} color={selected ? '#fff' : colors.text.secondary} />
          </TouchableOpacity>
        );
      })}
      <View style={dD.catLabelBox}>
        <Text style={dD.catLabelText}>{CATEGORIES.find(c => c.value === cat)?.label}</Text>
      </View>
    </View>

    {/* Amount */}
    <View style={dD.amountRow}>
      <Text style={dD.rupee}>₹</Text>
      <TextInput
        style={dD.amountInput}
        placeholder="0"
        placeholderTextColor={colors.text.tertiary}
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
      />
    </View>

    {/* Divider */}
    <View style={dD.divider} />

    {/* Note + camera */}
    <View style={dD.bottomRow}>
      <TextInput style={dD.noteInput} placeholder="Note (optional)" placeholderTextColor={colors.text.tertiary} />
      <TouchableOpacity style={dD.cameraBtn}>
        <Camera size={20} color={featureColors.expenses.primary} />
      </TouchableOpacity>
    </View>
  </View>
);

const dD = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  catBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catLabelBox: { flex: 1, alignItems: 'flex-end' },
  catLabelText: { fontSize: 14, color: colors.text.secondary },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  rupee: { fontSize: 32, fontWeight: '300', color: colors.text.tertiary, marginRight: 4 },
  amountInput: { fontSize: 48, fontWeight: '700', color: colors.text.primary, textAlign: 'center', minWidth: 120 },
  divider: { height: 1, backgroundColor: colors.border.default, marginBottom: 16 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  noteInput: { flex: 1, backgroundColor: colors.background, borderRadius: 10, padding: 12, fontSize: 14 },
  cameraBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: featureColors.expenses.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// =============================================
// DESIGN E: Minimal with large input
// =============================================
const DesignE = ({ cat, setCat, amount, setAmount }: any) => (
  <View>
    {/* Giant amount input */}
    <View style={dE.amountContainer}>
      <TextInput
        style={dE.amountInput}
        placeholder="₹0"
        placeholderTextColor={colors.text.tertiary}
        value={amount ? `₹${amount}` : ''}
        onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ''))}
        keyboardType="numeric"
      />
    </View>

    {/* Category as segmented control */}
    <View style={dE.segmented}>
      {CATEGORIES.map((c) => {
        const selected = cat === c.value;
        return (
          <TouchableOpacity
            key={c.value}
            style={[dE.segment, selected && { backgroundColor: c.color }]}
            onPress={() => setCat(c.value)}
          >
            <Text style={[dE.segmentText, selected && { color: '#fff' }]}>
              {c.label.charAt(0)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
    <Text style={dE.selectedCat}>{CATEGORIES.find(c => c.value === cat)?.label}</Text>

    {/* Optional fields */}
    <TouchableOpacity style={dE.optionalRow}>
      <FileText size={18} color={colors.text.tertiary} />
      <Text style={dE.optionalText}>Add description</Text>
    </TouchableOpacity>
    <TouchableOpacity style={dE.optionalRow}>
      <Camera size={18} color={colors.text.tertiary} />
      <Text style={dE.optionalText}>Add receipt photo</Text>
    </TouchableOpacity>
  </View>
);

const dE = StyleSheet.create({
  amountContainer: { alignItems: 'center', paddingVertical: 40 },
  amountInput: { fontSize: 64, fontWeight: '700', color: colors.text.primary, textAlign: 'center' },
  segmented: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 8,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentText: { fontSize: 16, fontWeight: '600', color: colors.text.secondary },
  selectedCat: { textAlign: 'center', fontSize: 14, color: colors.text.secondary, marginBottom: 24 },
  optionalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  optionalText: { fontSize: 15, color: colors.text.secondary },
});

// =============================================
// Main Styles
// =============================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingTop: 54,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
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
  switchBtn: { padding: 8 },
  switcherCenter: { alignItems: 'center' },
  designName: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  designSubtitle: { fontSize: 12, color: colors.text.secondary },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 12, backgroundColor: '#fff' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border.default },
  dotActive: { backgroundColor: featureColors.expenses.primary, width: 20 },
  preview: { flex: 1 },
  previewContent: { padding: 16, paddingBottom: 100 },
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  submitBtn: {
    backgroundColor: featureColors.expenses.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: { backgroundColor: colors.border.default },
  submitBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});

export default ExpenseDesignPreview;
