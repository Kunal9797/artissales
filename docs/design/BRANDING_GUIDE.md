# Artis Field Sales App - Branding Guide

**Last Updated**: October 17, 2025
**Status**: Active

---

## 📁 Logo Assets

### Location
`mobile/assets/images/`

### Available Files

#### 1. **artislogo_whitebgrd.png** (Light Background Version)
- **Primary triangle**: Dark charcoal/black (#393735)
- **Peacock feather motif**: White with elegant curved flourish inside the triangle
- **Decorative leaves**: Three leaves at bottom
  - Gold/tan leaf (brand accent color)
  - Light gray leaf
  - Dark charcoal leaf
- **Use cases**: White backgrounds, light UI elements, daytime screens
- **Format**: Transparent PNG

#### 2. **artislogo_blackbgrd.png** (Dark Background Version)
- **Primary triangle**: White/light color
- **Peacock feather motif**: White/light tones
- **Decorative leaves**: Gold/tan accent leaf prominent
- **Use cases**: Dark backgrounds, dark mode, headers with dark brand color
- **Format**: Transparent PNG

---

## 🎨 Design Characteristics

### Visual Elements
- **Triangle shape**: Forms the letter "A" for Artis
- **Peacock feather**: Symbolizes craftsmanship, elegance, and beauty
- **Gold accent**: Adds sophistication and premium feel
- **Asymmetric balance**: Modern, dynamic composition

### Brand Personality
- Elegant and sophisticated
- Premium quality (suitable for laminates/interior design industry)
- Traditional craftsmanship meets modern design
- Professional and trustworthy

---

## 🎯 Usage Guidelines

### ✅ DO

1. **Maintain Clear Space**
   - Leave minimum 16px padding around logo
   - Don't crowd with other elements

2. **Use Appropriate Version**
   - Light backgrounds → use artislogo_whitebgrd.png
   - Dark backgrounds → use artislogo_blackbgrd.png

3. **Keep Proportions**
   - Maintain original aspect ratio
   - Don't stretch or distort

4. **Subtle Integration**
   - Use as accent, not dominant element
   - Reserve full logo for key moments (login, splash)
   - Consider using just the gold leaf as compact brand marker

5. **Consistent Sizing**
   - Header icons: 24-28px height
   - Login screen: 300-400px width
   - Empty states: 40-60px height
   - Background watermarks: Large but very low opacity (0.03-0.05)

### ❌ DON'T

1. **Don't Overuse**
   - Not on every card or component
   - Not as repeating pattern
   - Avoid visual clutter

2. **Don't Modify Colors**
   - Keep original color scheme
   - Don't apply filters or color overlays
   - Don't use off-brand colors

3. **Don't Distort**
   - No stretching or skewing
   - No rotation (except intentional animation)
   - No cropping of essential elements

4. **Don't Compete**
   - Logo shouldn't fight for attention with UI
   - Keep subtle and supportive
   - Enhance, don't overwhelm

---

## 📱 App Integration Points

### Priority 1: Header Branding ⭐⭐⭐
**Location**: Top-left of screen headers
**Asset**: Gold leaf element (compact version)
**Size**: 24-28px height
**Purpose**: Consistent brand presence across all screens
**Implementation**:
```typescript
headerLeft: () => (
  <Image
    source={require('../../assets/images/artislogo_leaf.png')}
    style={{ width: 28, height: 28, marginLeft: 12 }}
    resizeMode="contain"
  />
)
```

### Priority 2: Empty States ⭐⭐
**Location**: Empty list views (Team, Accounts, Review tabs)
**Asset**: Gold leaf accent
**Size**: 40-60px height
**Purpose**: Branded empty states, turn negative into positive
**Implementation**:
```typescript
<EmptyState
  icon={<Image source={require('../../assets/images/artislogo_leaf.png')} />}
  title="No pending reviews"
  description="All caught up! Check back later."
/>
```

### Priority 3: Login Screen ⭐⭐
**Location**: Phone authentication screen
**Asset**: Full triangle logo (appropriate version for background)
**Size**: 300-400px width
**Purpose**: Premium first impression, establish brand identity
**Placement**: Center-top with fade-in animation

### Additional Integration Points

#### Splash/Loading Screen
- Full triangle logo, center-aligned
- Fade-in animation during app initialization
- Use appropriate version based on system theme

#### Success/Confirmation Modals
- Gold leaf icon (32-40px) with checkmark overlay
- Shows after major actions (DSR approved, expense approved)
- Reinforces brand during positive moments

#### Profile Screen Background
- Very subtle triangle logo watermark
- Opacity: 0.03-0.05 (barely visible)
- Position: bottom-right or center
- Creates depth without distraction

#### Pull-to-Refresh Animation
- Spinning/rotating leaf during refresh
- Replaces generic loading spinner
- Delightful micro-interaction

#### Documents/Resources Section
- Triangle logo as card accent (small, corner placement)
- Links to product catalogs, price lists
- Visually connects resources to brand

#### Greeting Bar Accent
- Subtle leaf pattern on dark greeting bar
- Small, semi-transparent
- Right side of "Good morning, [Name]" text

---

## 🎨 Brand Color Palette

### Primary Colors
- **Brand Dark**: `#393735` (Dark charcoal - used for headers, primary elements)
- **Brand Gold**: `#D4AF37` (Gold/tan - accent color for highlights)
- **Brand Light**: `#FFFFFF` (White - for contrast on dark backgrounds)

### Feature Colors (from theme system)
- **Attendance Green**: `#2E7D32`
- **Visits Blue**: `#1976D2`
- **Sheets Purple**: `#7B1FA2`
- **Expenses Orange**: `#E65100`
- **DSR Cyan**: `#0277BD`
- **Accounts Gray**: `#546E7A`

### Usage
- Logo works best with brand dark and gold colors
- Feature colors complement logo without competing
- Maintain visual hierarchy: logo is subtle accent, not primary focus

---

## 📐 Technical Specifications

### Logo Dimensions
- **Full triangle logo**: ~1024x1024px (original asset size)
- **Maintain aspect ratio**: Always
- **Export format**: Transparent PNG
- **Color space**: sRGB

### Mobile Implementation
```typescript
// Header logo (compact)
{
  width: 28,
  height: 28,
  resizeMode: 'contain',
  tintColor: undefined, // Keep original colors
}

// Login screen (full)
{
  width: 320,
  height: 320,
  resizeMode: 'contain',
  alignSelf: 'center',
}

// Empty state accent
{
  width: 48,
  height: 48,
  resizeMode: 'contain',
  opacity: 0.8, // Slightly subtle
}

// Background watermark
{
  width: 400,
  height: 400,
  resizeMode: 'contain',
  opacity: 0.04, // Very subtle
  position: 'absolute',
}
```

---

## 🔄 Future Considerations

### Potential Additional Assets
- **Leaf-only icon**: Extract just the gold leaf for very compact uses
- **Monochrome versions**: Single-color versions for specific contexts
- **Animated logo**: For splash screen or special occasions
- **App icon variants**: For different Android launcher styles

### Brand Evolution
- Document any logo updates or refinements
- Maintain version history
- Ensure consistency across all touchpoints
- Consider seasonal variations (if appropriate)

---

## 📚 Related Documentation
- [Design System v0.1](./DESIGN_SYSTEM.md) - UI component patterns
- [Theme System](../mobile/src/theme/README.md) - Colors, spacing, typography
- [Mobile Setup Summary](./MOBILE_SETUP_SUMMARY.md) - Technical implementation

---

## 📞 Brand Contact
**Owner**: Kunal Gupta (Artis Laminates)
**Project**: Artis Field Sales App
**Design Context**: Premium field sales tracking for laminates industry

---

**Note**: This is a living document. Update as brand guidelines evolve or new logo assets are created.
