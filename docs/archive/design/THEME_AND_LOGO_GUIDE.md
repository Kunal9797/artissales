# ARCHIVED - OUTDATED

**Date Archived**: 2025-10-17
**Reason**: References deleted asset files and old color codes. Superseded by [BRANDING_GUIDE.md](../design/BRANDING_GUIDE.md)

---

# Artis Sales App - Theme & Logo Implementation Guide

## 🎨 **Applied Theme: Corporate Blue + Yellower Gold**

### Color Palette

**Primary Colors (Corporate Blue)**
- Primary: `#3A5A7C` - Main buttons, headers, navigation
- Primary Dark: `#2C4560` - Pressed/active states
- Primary Light: `#5B7A9E` - Hover states, light backgrounds

**Accent Colors (Yellower Gold)**
- Accent: `#D4A944` - Icons, badges, highlights, important CTAs
- Accent Dark: `#B8935F` - Accent pressed states
- Accent Light: `#E8C977` - Accent backgrounds, subtle highlights

**Neutral Colors**
- Background: `#FFFFFF`
- Surface: `#F8F8F8`
- Text Primary: `#1A1A1A`
- Text Secondary: `#666666`

---

## 🖼️ **Logo Variants & Placements**

### **Logo Assets Needed**

```
assets/images/
  ├── logo-full.png              # Full logo with text (current: logo-transparent.png)
  ├── logo-icon.png              # Just peacock triangle (need to create)
  ├── logo-dark-bg.png           # Full logo on dark background (already have)
  └── logo-wordmark.png          # Just "ARTIS LAMINATE" text (optional)
```

### **Logo Placement Strategy**

#### **1. Login Screen**
**Logo:** Full logo (large, centered)
- File: `logo-full.png`
- Size: 280x93px (large)
- Position: Center top, above phone input
- Background: White
- Purpose: Brand establishment

```tsx
<View style={styles.logoContainer}>
  <Logo variant="transparent" size="large" />
  <Text style={styles.tagline}>You Imagine. We Create</Text>
</View>
```

#### **2. Home Screen Header**
**Logo:** Icon only (peacock triangle)
- File: `logo-icon.png`
- Size: 40x40px (icon)
- Position: Top left of header
- Background: Corporate Blue (#3A5A7C)
- Purpose: Compact branding, doesn't take space

```tsx
<Header
  leftIcon={<Image source={logoIcon} style={{width: 40, height: 40}} />}
  title="Dashboard"
  style={{backgroundColor: colors.primary}}
/>
```

#### **3. Profile Screen**
**Logo:** Full logo (medium)
- File: `logo-full.png`
- Size: 200x67px (medium)
- Position: Top center
- Background: White card
- Purpose: Full branding in user settings

#### **4. Navigation Bar (if bottom tabs)**
**Logo:** Icon only (peacock triangle)
- File: `logo-icon.png`
- Size: 24x24px (small icon)
- Position: Home tab icon
- Color: Tinted based on active state

#### **5. Splash Screen (future)**
**Logo:** Full logo (large)
- File: `logo-full.png`
- Size: 300x100px
- Position: Center
- Background: Corporate Blue gradient
- Purpose: App launch branding

---

## 🎯 **Logo Extraction: Peacock Icon**

We need to create `logo-icon.png` from your existing logo. This should be:

### **What to Extract:**
- **Just the white triangle with the peacock symbol**
- **No text** ("ARTIS LAMINATE")
- Square aspect ratio (e.g., 200x200px)
- Transparent background

### **Use Cases:**
1. Compact header icons
2. Navigation bar icons
3. Loading screens
4. Notification icons
5. Small badges

### **How to Create:**
**Option 1:** I can guide you to crop it in any image editor
**Option 2:** You provide it separately if you have the original design files
**Option 3:** Use the full logo for now, create icon version later

---

## 🔄 **Emoji to Lucide Icon Replacement Map**

### **Current Emojis → Lucide Icons**

| Screen | Current Emoji | Lucide Icon | Icon Name |
|--------|---------------|-------------|-----------|
| **Home Screen** |
| Attendance | 📍 | `<MapPin>` | MapPin |
| Log Visit | 🏢 | `<Building2>` | Building2 |
| Report Expense | 💰 | `<DollarSign>` | DollarSign |
| Log Sheet Sales | 📊 | `<FileBarChart>` | FileBarChart |
| Daily Report (DSR) | 📋 | `<ClipboardList>` | ClipboardList |
| Design System Demo | 🎨 | `<Palette>` | Palette |
| **Navigation** |
| Back | ← | `<ArrowLeft>` | ArrowLeft |
| Forward | → | `<ArrowRight>` | ArrowRight |
| Close | ✕ | `<X>` | X |
| **Actions** |
| Save | 💾 | `<Save>` | Save |
| Add/Plus | ➕ | `<Plus>` | Plus |
| Edit | ✏️ | `<Edit>` | Edit |
| Delete | 🗑️ | `<Trash2>` | Trash2 |
| Download | ⬇️ | `<Download>` | Download |
| Upload | ⬆️ | `<Upload>` | Upload |
| Camera | 📷 | `<Camera>` | Camera |
| **Status** |
| Check/Success | ✅ | `<Check>` | Check |
| Alert | ⚠️ | `<AlertTriangle>` | AlertTriangle |
| Info | ℹ️ | `<Info>` | Info |
| Error | ❌ | `<XCircle>` | XCircle |
| **Profile** |
| User | 👤 | `<User>` | User |
| Settings | ⚙️ | `<Settings>` | Settings |
| Logout | 🚪 | `<LogOut>` | LogOut |

### **Implementation Example:**

**Before (Emoji):**
```tsx
<Text style={styles.menuButtonText}>📍 Attendance</Text>
```

**After (Lucide Icon):**
```tsx
import { MapPin } from 'lucide-react-native';

<View style={styles.menuButton}>
  <MapPin size={24} color={colors.primary} />
  <Text style={styles.menuButtonText}>Attendance</Text>
</View>
```

---

## 📱 **Screen-by-Screen Logo & Icon Usage**

### **Login Screen**
- ✅ Full logo (large) - centered
- ✅ Tagline below logo
- Background: White

### **Home Screen**
- ✅ Icon logo (peacock) - top left header
- ✅ Replace all menu emojis with Lucide icons
- Header: Corporate Blue background
- Icons: Yellower Gold accent (#D4A944)

### **Header Component (Reusable)**
```tsx
<Header
  leftIcon={<PeacockIcon />}           // Small peacock triangle
  title="Visits"
  rightAction={{
    icon: <User size={24} color="#fff" />,
    onPress: () => navigate('Profile')
  }}
  backgroundColor={colors.primary}     // Corporate Blue
/>
```

### **Profile Screen**
- ✅ Full logo (medium) - top of screen
- ✅ User icon with Lucide `<User>`
- ✅ Settings icon with Lucide `<Settings>`
- ✅ Logout button with Lucide `<LogOut>`

### **Visit Screens**
- Building icon: `<Building2>`
- Location: `<MapPin>`
- Camera: `<Camera>`
- Save: `<Save>`

### **DSR Screen**
- Clipboard: `<ClipboardList>`
- Calendar: `<Calendar>`
- Download: `<Download>`

### **Expense Screen**
- Dollar: `<DollarSign>`
- Receipt: `<Receipt>`
- Upload: `<Upload>`

---

## 🎨 **Visual Design Rules**

### **When to Use Corporate Blue**
- Primary buttons
- Headers/navigation bars
- Active states
- Important backgrounds

### **When to Use Yellower Gold Accent**
- Icons (most UI icons)
- Badges/notifications
- Hover states
- Success indicators
- Important CTAs ("Save", "Submit")
- Links

### **Icon Sizing**
- **Small:** 16px (inline text icons)
- **Medium:** 24px (menu items, buttons)
- **Large:** 32px (feature highlights)
- **XL:** 48px (empty states, illustrations)

### **Icon Colors**
- **On Blue backgrounds:** White or Gold accent
- **On White backgrounds:** Corporate Blue or Gold accent
- **Disabled states:** Gray (#999999)
- **Error states:** Red (#EF5350)
- **Success states:** Green (#4CAF50)

---

## 📋 **Implementation Checklist**

### Phase 1: Logo Setup
- [ ] Create peacock icon (logo-icon.png) from full logo
- [ ] Add logo to Login screen (full, large)
- [ ] Add logo icon to Home header (peacock, small)
- [ ] Add logo to Profile screen (full, medium)

### Phase 2: Theme Application
- [x] Update theme colors to Corporate Blue + Gold
- [ ] Apply to Home screen
- [ ] Apply to all buttons
- [ ] Apply to headers

### Phase 3: Icon Replacement
- [ ] Replace Home screen emojis (6 menu items)
- [ ] Replace header/navigation emojis
- [ ] Replace action button emojis
- [ ] Replace status indicator emojis
- [ ] Test all screens for consistency

### Phase 4: Polish
- [ ] Ensure all icons use correct sizing
- [ ] Verify color contrast for accessibility
- [ ] Test on different screen sizes
- [ ] Update empty states with icons

---

## 🚀 **Next Steps**

1. **Peacock Icon Creation** - Need to extract just the triangle+peacock
2. **Apply Theme** - Update all screens with Corporate Blue + Gold
3. **Replace Emojis** - Systematically replace with Lucide icons
4. **Test & Refine** - Ensure consistency across app

---

**Last Updated:** Oct 10, 2025
**Theme:** Corporate Blue (#3A5A7C) + Yellower Gold (#D4A944)
**Status:** Ready for implementation
