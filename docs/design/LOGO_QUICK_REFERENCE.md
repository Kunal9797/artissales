# Artis Logo - Quick Reference Card

**For AI Agents & Developers** - Quick copy-paste summary

---

## 📁 Logo Files

```
Location: mobile/assets/images/

artislogo_whitebgrd.png  → Use on LIGHT backgrounds
artislogo_blackbgrd.png  → Use on DARK backgrounds
```

---

## 🎨 Visual Description

### artislogo_whitebgrd.png (Light Background)
- **Triangle**: Dark charcoal/black (#393735) forming letter "A"
- **Inside**: White peacock feather with elegant curved flourish
- **Bottom**: 3 decorative leaves (gold/tan, light gray, dark charcoal)
- **Style**: Premium, elegant, sophisticated

### artislogo_blackbgrd.png (Dark Background)
- **Triangle**: White forming letter "A"
- **Inside**: White peacock feather with elegant curved flourish
- **Bottom**: Gold/tan leaf accent
- **Style**: Same elegant design, inverted for dark backgrounds

---

## 💡 Quick Usage Guide

### ✅ Best Practices
- **Subtle integration** - accent, not dominant
- **Use appropriate version** - match background color
- **Maintain proportions** - don't stretch
- **Keep clear space** - 16px minimum padding
- **Reserve full logo** for key moments (login, splash)
- **Use gold leaf alone** as compact brand marker

### ❌ Avoid
- Overusing (not on every component)
- Modifying colors or distorting shape
- Making too large (except login screen)
- Competing with primary UI

---

## 📏 Common Sizes

```typescript
// Header icon (compact leaf)
{ width: 28, height: 28 }

// Empty state accent
{ width: 48, height: 48, opacity: 0.8 }

// Login screen (full logo)
{ width: 320, height: 320 }

// Background watermark
{ width: 400, height: 400, opacity: 0.04 }
```

---

## 🎨 Brand Colors

```typescript
brandDark:  '#393735'  // Dark charcoal
brandGold:  '#D4AF37'  // Gold/tan accent
brandLight: '#FFFFFF'  // White
```

---

## 🔗 Full Documentation

See [BRANDING_GUIDE.md](./BRANDING_GUIDE.md) for complete guidelines, integration points, and technical specs.

---

**Last Updated**: October 17, 2025
