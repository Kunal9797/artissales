# Component Catalog - DS v0.1

Complete reference for all design system components and patterns.

---

## PR3: Input Components

### Checkbox

Accessible checkbox with focus ring, role tokens, and 48dp hit target.

**Props:**
- `checked: boolean` - Checked state
- `onChange: (checked: boolean) => void` - Change handler
- `label?: string` - Label text
- `disabled?: boolean` - Disabled state
- `variant?: RoleKey` - Role variant for checked state (default: `'primary'`)
- `accessibilityLabel?: string` - Accessibility label

**Usage:**
```tsx
import { Checkbox } from '../components/ui';

<Checkbox
  checked={isAgreed}
  onChange={setIsAgreed}
  label="I agree to the terms"
/>

<Checkbox
  checked={isEnabled}
  onChange={setIsEnabled}
  label="Enable feature"
  variant="success"
/>
```

---

### Radio

Accessible radio button with focus ring, role tokens, and 48dp hit target.

**Props:**
- `selected: boolean` - Selected state
- `onChange: () => void` - Change handler
- `label?: string` - Label text
- `disabled?: boolean` - Disabled state
- `variant?: RoleKey` - Role variant for selected state (default: `'primary'`)
- `accessibilityLabel?: string` - Accessibility label

**Usage:**
```tsx
import { Radio } from '../components/ui';

<Radio
  selected={value === 'option1'}
  onChange={() => setValue('option1')}
  label="Option 1"
/>

<Radio
  selected={value === 'option2'}
  onChange={() => setValue('option2')}
  label="Option 2"
  variant="accent"
/>
```

---

### Switch

Accessible toggle switch with animated thumb, focus ring, and 48dp hit target.

**Props:**
- `value: boolean` - On/off state
- `onChange: (value: boolean) => void` - Change handler
- `label?: string` - Label text
- `disabled?: boolean` - Disabled state
- `variant?: RoleKey` - Role variant for on state (default: `'primary'`)
- `accessibilityLabel?: string` - Accessibility label

**Usage:**
```tsx
import { Switch } from '../components/ui';

<Switch
  value={isEnabled}
  onChange={setIsEnabled}
  label="Enable notifications"
/>

<Switch
  value={isDarkMode}
  onChange={setIsDarkMode}
  label="Dark mode"
  variant="accent"
/>
```

---

### Select

Modal-based select with optional search, FlatList rendering, and focus ring.

**Props:**
- `value: string | null` - Selected value
- `onChange: (value: string) => void` - Change handler
- `options: SelectOption[]` - Options list (`{ label: string, value: string }[]`)
- `placeholder?: string` - Placeholder text
- `label?: string` - Label text
- `searchable?: boolean` - Enable search (default: `false`)
- `disabled?: boolean` - Disabled state
- `accessibilityLabel?: string` - Accessibility label

**Usage:**
```tsx
import { Select } from '../components/ui';

<Select
  label="Choose a city"
  value={selectedCity}
  onChange={setSelectedCity}
  options={[
    { label: 'Mumbai', value: 'mumbai' },
    { label: 'Delhi', value: 'delhi' },
    { label: 'Bangalore', value: 'bangalore' },
  ]}
  searchable
/>
```

---

### Tabs

Segmented control with dense mode support, focus ring, and accessible navigation.

**Props:**
- `items: TabItem[]` - Tab items (`{ label: string, value: string }[]`)
- `value: string` - Current selected value
- `onChange: (value: string) => void` - Change handler
- `dense?: boolean` - Dense mode (smaller padding) (default: `false`)
- `disabled?: boolean` - Disabled state

**Usage:**
```tsx
import { Tabs } from '../components/ui';

<Tabs
  items={[
    { label: 'Overview', value: 'overview' },
    { label: 'Details', value: 'details' },
    { label: 'Settings', value: 'settings' },
  ]}
  value={currentTab}
  onChange={setCurrentTab}
/>

<Tabs
  items={[
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
  ]}
  value={filter}
  onChange={setFilter}
  dense
/>
```

---

## PR4: Pattern Components

### FiltersBar

Horizontal quick chips with "More filters" modal using Selects.

**Props:**
- `chips: Chip[]` - Quick filter chips (`{ label: string, value: string, active: boolean }[]`)
- `onChipToggle: (value: string) => void` - Chip toggle handler
- `moreFilters?: FilterSpec[]` - Advanced filters (`{ key: string, label: string, options: SelectOption[] }[]`)
- `onApply?: (filters: Record<string, string>) => void` - Apply filters handler

**Usage:**
```tsx
import { FiltersBar } from '../patterns';

const [chips, setChips] = useState([
  { label: 'All', value: 'all', active: true },
  { label: 'Active', value: 'active', active: false },
]);

<FiltersBar
  chips={chips}
  onChipToggle={(value) => {
    setChips(prev => prev.map(c => ({ ...c, active: c.value === value })));
  }}
  moreFilters={[
    {
      key: 'region',
      label: 'Region',
      options: [
        { label: 'North', value: 'north' },
        { label: 'South', value: 'south' },
      ],
    },
  ]}
  onApply={(filters) => console.log(filters)}
/>
```

---

### EmptyState

Shows when no data is available with optional action.

**Props:**
- `icon?: ReactNode` - Icon (Lucide component or custom element)
- `title: string` - Main title
- `subtitle?: string` - Subtitle text
- `primaryAction?: { label: string, onPress: () => void }` - Primary action button

**Usage:**
```tsx
import { EmptyState } from '../patterns';
import { Building2 } from 'lucide-react-native';

<EmptyState
  icon={<Building2 size={48} color={colors.text.tertiary} />}
  title="No accounts found"
  subtitle="Try adjusting your filters or create a new account"
  primaryAction={{
    label: 'Add Account',
    onPress: () => navigation.navigate('AddAccount'),
  }}
/>
```

---

### ErrorState

Shows when an error occurs with optional retry action.

**Props:**
- `message: string` - Error message
- `retry?: () => void` - Retry action

**Usage:**
```tsx
import { ErrorState } from '../patterns';

<ErrorState
  message="Network error. Please check your connection."
  retry={() => loadData()}
/>
```

---

### Skeleton

Animated loading placeholder (no shimmer lib, just opacity loop).

**Props:**
- `rows?: number` - Number of rows (default: `3`)
- `avatar?: boolean` - Show avatar (default: `false`)
- `card?: boolean` - Card layout (default: `false`)

**Usage:**
```tsx
import { Skeleton } from '../patterns';

// List item skeleton
<Skeleton rows={3} avatar />

// Simple rows
<Skeleton rows={2} />

// Card skeleton
<Skeleton card />
```

---

### KpiCard

Displays key performance indicator with auto-colored delta.

**Props:**
- `title: string` - KPI title
- `value: string | number` - KPI value
- `delta?: { value: number, positiveIsGood: boolean }` - Delta change
- `icon?: ReactNode` - Optional icon

**Usage:**
```tsx
import { KpiCard } from '../patterns';
import { TrendingUp } from 'lucide-react-native';

<KpiCard
  title="Revenue"
  value="₹2.4L"
  delta={{ value: 18, positiveIsGood: true }}
  icon={<TrendingUp size={20} color={colors.primary} />}
/>

<KpiCard
  title="Failed Tasks"
  value={12}
  delta={{ value: 5, positiveIsGood: false }}
/>
```

---

## Design Tokens

All components use the following token systems:

### Role Tokens (`roles`)
- `success` - Confirmations, completed states
- `warn` - Alerts, pending states (note: API uses `warn`, UI displays "warning")
- `error` - Errors, destructive actions
- `info` - Informational messages
- `neutral` - Default states
- `primary` - Brand actions
- `accent` - Highlights, special emphasis

Each role has: `base`, `bg`, `text`, `border`

### State Tokens (`states`)
- `focus` - Keyboard navigation (border, shadow, bgTint)
- `pressed` - Touch feedback (opacity, scale, bgTint)
- `disabled` - Inactive elements (opacity, bg, text, border)
- `hover` - Web/desktop hover (bgTint, scale, opacity)
- `loading` - Loading state (opacity, overlay)

### Spacing (`spacing`)
- `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`, `4xl`
- `borderRadius`: `none`, `sm`, `md`, `lg`, `xl`, `full`

### Typography (`typography`)
- `styles.h1`, `h2`, `h3`, `h4`
- `styles.body`, `bodyLarge`, `bodySmall`
- `styles.label`, `labelSmall`
- `styles.button`, `buttonSmall`
- `styles.caption`

---

## Accessibility

All components follow these a11y standards:

- ✅ **Hit targets**: ≥48dp for all interactive elements
- ✅ **Roles**: Proper `accessibilityRole` set
- ✅ **Labels**: `accessibilityLabel` support
- ✅ **States**: `accessibilityState` for checked/selected/disabled
- ✅ **Focus rings**: Visible via `states.focus`
- ✅ **Color contrast**: WCAG 4.5:1 ratio enforced

---

## Screen Conversion Example

See [AccountsListScreen.tsx](../src/screens/manager/AccountsListScreen.tsx) for a complete example of:
- FiltersBar integration
- Loading state with Skeleton
- Error state with ErrorState
- Empty state with EmptyState
- KPI cards row

---

Last updated: Oct 14, 2025 (PR3+PR4)
