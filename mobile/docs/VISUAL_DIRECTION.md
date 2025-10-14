# Visual Direction & Design Lab

## Overview

The Artis Sales app uses a token-based design system with semantic roles, interaction states, and configurable visual properties. This document explains how to use the **Design Lab** (dev-only tool) to experiment with and refine the visual design.

---

## Design Lab (Dev-Only)

### What is Design Lab?

Design Lab is a live theme token editor available only in development builds (`__DEV__ = true`). It allows designers and developers to:

- **Edit role tokens** (success, warn, error, info, neutral, primary, accent) with real-time preview
- **Adjust spacing units** and border radius multipliers
- **Scale typography** without changing code
- **Validate contrast ratios** (WCAG AA compliance)
- **Export theme overrides** as JSON for easy sharing and integration

### How to Access

1. Run the app in development mode: `npm start`
2. Navigate to **Kitchen Sink** screen from the main menu
3. At the top, you'll see a **"🧪 Design Lab (Dev Only)"** section
4. Tap **"Open Design Lab →"**

### Using Design Lab

#### Left Panel: Controls

**Global Settings:**
- **Spacing Unit** (0-3): Multiplier for all spacing values (default: 1.0)
- **Border Radius** (0-3): Multiplier for all border radius values (default: 1.0)
- **Type Scale** (0-2): Multiplier for all font sizes (default: 1.0)

**Role Tokens:**
Each semantic role (success, warn, error, info, neutral, primary, accent) has four color properties:
- **base**: Main color of the role
- **bg**: Background color (for badges, alerts)
- **text**: Text color (should contrast well with bg)
- **border**: Border color

Enter hex colors (e.g., `#4CAF50`) in the text inputs. Invalid colors will show a red border. The small swatch preview updates in real-time.

**Contrast Warnings:**
If text/background contrast falls below WCAG AA standards (4.5:1), you'll see a warning at the bottom of the controls panel.

#### Right Panel: Live Preview

The preview updates in real-time as you change values:

- **Badges**: All role variants with icons
- **Spinners**: Different sizes with primary/accent colors
- **Progress Bars**: 25%, 50%, 75% states
- **Button States**: Normal and disabled states with press feedback
- **Cards & Typography**: Headers, body text, captions with scaled sizes

#### Actions

**Reset:**
- Reverts all changes back to default theme tokens
- Requires confirmation

**Export JSON:**
- Copies the current theme overrides to clipboard
- Shows "✓ Copied" confirmation
- JSON structure matches `ThemeOverrides` type

---

## Applying Theme Overrides

### Step 1: Export from Design Lab

1. Adjust tokens in Design Lab until you're happy with the design
2. Tap **"Export JSON"** to copy overrides to clipboard
3. The JSON will look like this:

```json
{
  "roles": {
    "primary": {
      "base": "#393735",
      "bg": "#393735",
      "text": "#FFFFFF",
      "border": "#393735"
    },
    "accent": {
      "base": "#D4A944",
      "bg": "#E8C977",
      "text": "#393735",
      "border": "#D4A944"
    }
  },
  "spacing": {
    "unit": 1.0
  },
  "borderRadius": {
    "multiplier": 1.0
  },
  "typography": {
    "scaleMultiplier": 1.0
  }
}
```

### Step 2: Integrate into Codebase

To make theme overrides permanent, paste them into the theme color files:

**Option A: Update Base Theme (Recommended)**
Edit `mobile/src/theme/colors.ts` and manually update color values:

```typescript
export const colors = {
  primary: '#393735',        // From overrides.roles.primary.base
  accent: '#D4A944',         // From overrides.roles.accent.base
  // ... update other colors
} as const;
```

**Option B: Create Named Theme Variant**
Edit `mobile/src/theme/colorThemes.ts` and add a new theme object:

```typescript
export const brandTheme = {
  colors: {
    primary: '#393735',
    accent: '#D4A944',
    // ... paste role colors here
  },
};
```

**Option C: Create New Theme Export**
Create a new file `mobile/src/theme/customTheme.ts`:

```typescript
import { ThemeOverrides } from './runtime';

export const customThemeOverrides: ThemeOverrides = {
  // Paste exported JSON here
  roles: {
    primary: { /* ... */ },
    accent: { /* ... */ },
  },
};
```

Then apply it at app startup in `App.tsx`:

```typescript
import { customThemeOverrides } from './src/theme/customTheme';
import { useThemeOverrides } from './src/theme/runtime';

function AppWithTheme() {
  const { setOverrides } = useThemeOverrides();

  React.useEffect(() => {
    setOverrides(customThemeOverrides);
  }, []);

  return <YourApp />;
}
```

---

## Design System Tokens Reference

### Semantic Roles

| Role | Purpose | Examples |
|------|---------|----------|
| `success` | Positive feedback, confirmations | "Visit logged", "Payment received" |
| `warn` | Warnings, cautions | "Due in 2 hours", "Pending approval" |
| `error` | Errors, failures | "Login failed", "Required field" |
| `info` | Informational messages | "3 new leads", "Tip: ..." |
| `neutral` | Default/inactive states | Disabled buttons, placeholder text |
| `primary` | Brand actions | Primary buttons, headers |
| `accent` | Highlights, emphasis | Gold badges, selected items |

### Interaction States

| State | Purpose | Visual Effect |
|-------|---------|---------------|
| `focus` | Keyboard navigation | Border highlight + shadow |
| `pressed` | Touch feedback | Opacity 0.7, scale 0.98 |
| `disabled` | Inactive elements | Opacity 0.4, muted colors |
| `hover` | Mouse hover (web) | Subtle scale + opacity |
| `loading` | Processing state | Opacity 0.6 |

---

## Best Practices

### Color Accessibility

1. **Always check contrast warnings** in Design Lab
2. Aim for **4.5:1** contrast ratio (WCAG AA) for normal text
3. Aim for **3:1** for large text (18pt+)
4. Test with grayscale/colorblind simulation tools

### Spacing & Layout

- Use **spacing unit multiplier** to scale up/down for different screen densities
- Keep multiplier between 0.8–1.2 for most cases
- Avoid fractional multipliers (0.9, 1.1) for pixel-perfect layouts

### Typography

- Type scale multiplier affects **all font sizes** proportionally
- Test readability on actual devices (not just simulator)
- Avoid scales above 1.3 (text becomes too large)

### Workflow Tips

1. **Start with defaults**: Only override what needs to change
2. **Test edge cases**: Very long text, small screens, high contrast mode
3. **Document changes**: Add comments in colorThemes.ts explaining why colors were changed
4. **Share JSON**: Send exported JSON to team for review before committing

---

## Troubleshooting

**Design Lab button not showing:**
- Ensure you're running in dev mode (`__DEV__ = true`)
- Check that `ThemeRuntimeProvider` is wrapping your app in `App.tsx`

**Contrast warnings not going away:**
- Adjust `text` or `bg` colors until ratio ≥ 4.5:1
- Use online contrast checkers (e.g., WebAIM Contrast Checker)

**Changes not applying:**
- Check for typos in hex values (must be `#RRGGBB` format)
- Ensure you're editing the correct role property (base vs bg vs text)

**Export JSON is empty:**
- Make at least one change before exporting
- Reset button clears all overrides

---

## Technical Details

### Files

- `src/theme/runtime.ts`: ThemeRuntimeProvider, useThemeOverrides hook
- `src/theme/serialize.ts`: JSON import/export, validation utilities
- `src/screens/DesignLabScreen.tsx`: Design Lab UI
- `src/theme/roles.ts`: Default role token definitions
- `src/theme/states.ts`: Interaction state definitions

### Type Safety

All theme tokens are fully typed:
- `RoleKey`: 'success' | 'warn' | 'error' | 'info' | 'neutral' | 'primary' | 'accent'
- `StateKey`: 'focus' | 'pressed' | 'disabled' | 'hover' | 'loading'
- `ThemeOverrides`: Deep partial of theme structure

### Performance

- Design Lab is **dev-only** and does not ship in production builds
- Runtime theme system uses React Context (minimal overhead)
- Overrides are **not persisted** to disk (intentional design choice)

---

## Feedback & Requests

If you need additional Design Lab features (e.g., shadow editing, gradient support), add a comment in the `DS_V0.1_PLAN.md` file or create a task.

---

**Last Updated**: January 2025
**Related Files**: `DS_V0.1_PLAN.md`, `COMPONENT_CATALOG.md` (coming soon)
