# Artis Sales App - Design System

## 🎨 Overview
Modern, professional design system built with Artis Laminates brand identity. Simple, clean, and functional for field sales team use.

## 📁 File Structure

```
mobile/src/
├── theme/                      # Design tokens (single source of truth)
│   ├── colors.ts              # Brand colors, status colors
│   ├── typography.ts          # Font styles, sizes, weights
│   ├── spacing.ts             # 8px grid system
│   ├── shadows.ts             # Elevation/shadow styles
│   └── index.ts               # Export all theme tokens
│
└── components/ui/             # Reusable UI components
    ├── Button.tsx             # Primary/secondary/outline/ghost/danger variants
    ├── Card.tsx               # Container with elevation
    ├── Input.tsx              # Text input with labels/errors
    ├── Header.tsx             # Page header with logo option
    └── index.ts               # Export all components
```

## 🎨 Brand Colors

**Primary:** `#B8935F` (Artis Gold) - Buttons, highlights, active states
**Background:** `#FFFFFF` - Main backgrounds
**Surface:** `#F8F8F8` - Card backgrounds
**Text Primary:** `#1A1A1A` - Main text
**Text Secondary:** `#666666` - Descriptions, secondary text

**Status Colors:**
- Success: `#4CAF50`
- Warning: `#FFA726`
- Error: `#EF5350`
- Info: `#42A5F5`

## 📏 Spacing (8px Grid)

- `xs`: 4px
- `sm`: 8px
- `md`: 16px
- `lg`: 24px
- `xl`: 32px
- `2xl`: 40px
- `3xl`: 48px
- `4xl`: 64px

## 🔤 Typography

**Headings:**
- H1: 32px, Bold
- H2: 28px, Bold
- H3: 24px, SemiBold
- H4: 20px, SemiBold

**Body:**
- Large: 18px
- Regular: 16px
- Small: 14px

**Other:**
- Button: 16px, SemiBold
- Label: 14px, Medium
- Caption: 12px

## 🧩 Component Usage

### Button
```tsx
import { Button } from '../components/ui';

// Primary button (default)
<Button onPress={handleSubmit}>Submit</Button>

// Variants
<Button variant="secondary">Cancel</Button>
<Button variant="outline">View Details</Button>
<Button variant="ghost">Skip</Button>
<Button variant="danger">Delete</Button>

// Sizes
<Button size="small">Small</Button>
<Button size="medium">Medium (default)</Button>
<Button size="large">Large</Button>

// States
<Button disabled>Disabled</Button>
<Button loading>Loading...</Button>
<Button fullWidth>Full Width</Button>
```

### Card
```tsx
import { Card } from '../components/ui';

// Basic card
<Card>
  <Text>Card content</Text>
</Card>

// With elevation
<Card elevation="sm">Small shadow</Card>
<Card elevation="md">Medium shadow (default)</Card>
<Card elevation="lg">Large shadow</Card>

// Pressable card
<Card onPress={() => console.log('pressed')}>
  <Text>Tap me</Text>
</Card>

// Custom padding
<Card padding="none">No padding</Card>
<Card padding="lg">Large padding</Card>
```

### Input
```tsx
import { Input } from '../components/ui';

// Basic input
<Input
  label="Name"
  placeholder="Enter your name"
  value={name}
  onChangeText={setName}
/>

// With error
<Input
  label="Email"
  error="Email is required"
  value={email}
  onChangeText={setEmail}
/>

// With helper text
<Input
  label="Phone"
  helperText="+91 format"
  value={phone}
  onChangeText={setPhone}
/>

// Multiline
<Input
  label="Notes"
  multiline
  numberOfLines={4}
/>
```

### Header
```tsx
import { Header } from '../components/ui';

// Basic header
<Header title="Dashboard" />

// With subtitle
<Header
  title="Welcome"
  subtitle="Good morning!"
/>

// With logo
<Header
  title="Artis Sales"
  showLogo={true}
/>

// With right action
<Header
  title="Profile"
  rightAction={{
    icon: '⚙️',
    onPress: () => navigation.navigate('Settings'),
  }}
/>
```

## 🧪 Testing the Design System

Navigate to **Kitchen Sink Screen** to see all components in action:

1. From Home screen, tap "🎨 Design System Demo"
2. View all colors, typography, buttons, cards, inputs
3. Test interactive elements
4. Use this to tweak colors/spacing before rolling out

## 🚀 Next Steps

### To Apply Theme to Existing Screens:

1. Import theme tokens:
   ```tsx
   import { colors, typography, spacing, shadows } from '../theme';
   ```

2. Replace hardcoded values:
   ```tsx
   // Before
   backgroundColor: '#007AFF'
   padding: 24
   fontSize: 18

   // After
   backgroundColor: colors.primary
   padding: spacing.screenPadding
   fontSize: typography.fontSize.lg
   ```

3. Use UI components:
   ```tsx
   // Before
   <TouchableOpacity style={styles.button}>
     <Text>Submit</Text>
   </TouchableOpacity>

   // After
   <Button onPress={handleSubmit}>Submit</Button>
   ```

## 📋 Rollout Plan

1. ✅ Theme system created
2. ✅ Kitchen Sink demo ready
3. ⏳ Apply to Home Screen
4. ⏳ Apply to one feature screen (e.g., Log Visit)
5. ⏳ Iterate based on feedback
6. ⏳ Roll out to all screens

## 🎯 Design Principles

- **Simple & Clean**: No fancy animations or complex patterns
- **Professional**: Enterprise-ready, polished look
- **Functional**: Easy to use for field sales teams
- **Consistent**: Same patterns everywhere
- **Accessible**: High contrast, readable text

## 🛠️ Customization

All design tokens are in `/theme` folder. To change:

- **Colors**: Edit `theme/colors.ts`
- **Spacing**: Edit `theme/spacing.ts`
- **Typography**: Edit `theme/typography.ts`
- **Shadows**: Edit `theme/shadows.ts`

Changes propagate automatically to all components!
