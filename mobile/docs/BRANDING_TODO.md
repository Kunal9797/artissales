# Branding Assets TODO

**Last Updated**: October 14, 2025
**Status**: Placeholder assets in use - needs branded replacements

---

## Current Status

✅ **Brand Colors Applied**:
- Primary: `#393735` (Brand Background)
- Accent: `#D4A944` (Yellower Gold)
- Splash background: `#393735`
- Android adaptive icon background: `#393735`
- StatusBar: `#393735` with white content

⚠️ **Placeholder Assets in Use**:
- App icon (./assets/icon.png)
- Splash screen (./assets/splash.png)
- Android adaptive icon foreground (./assets/adaptive-icon.png)

---

## Required Assets

### 1. App Icon (./assets/icon.png)

**Dimensions**: 1024x1024px (PNG with transparency)

**Requirements**:
- Square canvas
- Artis Laminates logo centered
- Brand background (#393735) or transparent
- No text (just logo/mark)
- Safe area: Keep important content within 80% center

**Usage**: iOS App Store, Google Play Store listing

---

### 2. Splash Screen (./assets/splash.png)

**Dimensions**: 1284x2778px (PNG with transparency)

**Requirements**:
- Artis Laminates wordmark/logo
- Centered on transparent background
- Logo should be ~300-400px wide
- Will be placed on `#393735` background (configured in app.json)
- Consider adding tagline if appropriate

**Usage**: App launch screen while loading

**Current config**:
```json
"splash": {
  "image": "./assets/splash.png",
  "resizeMode": "contain",
  "backgroundColor": "#393735"
}
```

---

### 3. Android Adaptive Icon Foreground (./assets/adaptive-icon.png)

**Dimensions**: 1024x1024px (PNG with transparency)

**Requirements**:
- Artis logo/mark centered
- Transparent background
- Safe area: Keep content within 66% center circle (mask applied by Android)
- Will be overlaid on `#393735` background

**Usage**: Android home screen, app drawer

**Current config**:
```json
"adaptiveIcon": {
  "foregroundImage": "./assets/adaptive-icon.png",
  "backgroundColor": "#393735"
}
```

---

## Asset Specifications Summary

| Asset | Dimensions | Format | Background | Notes |
|-------|------------|--------|------------|-------|
| **icon.png** | 1024x1024 | PNG | Transparent or #393735 | Main app icon |
| **splash.png** | 1284x2778 | PNG | Transparent | Splash logo (on #393735 bg) |
| **adaptive-icon.png** | 1024x1024 | PNG | Transparent | Android adaptive (on #393735 bg) |

---

## Platform-Specific Requirements

### Android

**Icon Sizes** (auto-generated from icon.png):
- `mipmap-mdpi`: 48x48
- `mipmap-hdpi`: 72x72
- `mipmap-xhdpi`: 96x96
- `mipmap-xxhdpi`: 144x144
- `mipmap-xxxhdpi`: 192x192

**Adaptive Icon**:
- Foreground: 108dp (1024px at xxxhdpi)
- Safe zone: 66dp center circle
- Background: Solid color (#393735)

### iOS

**Icon Sizes** (auto-generated from icon.png):
- iPhone: 60x60, 120x120, 180x180
- iPad: 76x76, 152x152
- App Store: 1024x1024
- Spotlight: 80x80, 120x120
- Settings: 58x58, 87x87

---

## Design Guidelines

### Logo Usage
- Use official Artis Laminates logo files
- Maintain brand color integrity
- Ensure sufficient contrast on dark backgrounds
- Consider monochrome version for adaptive icon if needed

### Color Palette (Reference)
- **Primary**: #393735 (Brand Background)
- **Accent**: #D4A944 (Yellower Gold)
- **Text on Primary**: #FFFFFF (White)

### Typography
- App name: "Artis Sales"
- Tagline (optional): TBD

---

## Asset Preparation Steps

1. **Obtain brand assets** from Artis Laminates marketing team:
   - Logo (vector format: SVG, AI, or EPS preferred)
   - Brand guidelines document
   - Approved color codes

2. **Create icon.png** (1024x1024):
   - Export logo at high resolution
   - Center on 1024x1024 canvas
   - Apply brand background or transparent
   - Save as PNG-24 with transparency

3. **Create splash.png** (1284x2778):
   - Export logo/wordmark
   - Center on tall canvas
   - Keep transparent background
   - Test with #393735 background

4. **Create adaptive-icon.png** (1024x1024):
   - Extract icon/mark from logo
   - Center within 66% safe zone
   - Keep transparent background
   - Test circular mask preview

5. **Replace placeholder files**:
   ```bash
   cp /path/to/new/icon.png mobile/assets/icon.png
   cp /path/to/new/splash.png mobile/assets/splash.png
   cp /path/to/new/adaptive-icon.png mobile/assets/adaptive-icon.png
   ```

6. **Rebuild app**:
   ```bash
   npx expo prebuild --clean
   npx expo run:android
   ```

---

## Testing Checklist

- [ ] App icon appears correctly in Android launcher
- [ ] App icon appears correctly in iOS home screen
- [ ] Splash screen loads with proper alignment and colors
- [ ] Android adaptive icon displays properly in circular mask
- [ ] No pixelation or artifacts on high-DPI devices
- [ ] Icon is recognizable at small sizes (48x48px)
- [ ] Sufficient contrast for accessibility

---

## Tools & Resources

### Design Tools
- **Figma**: https://www.figma.com/
- **Adobe Illustrator**: For vector logo editing
- **Sketch**: For icon design

### Testing Tools
- **Android Asset Studio**: https://romannurik.github.io/AndroidAssetStudio/
- **Expo Icon Preview**: Test in Expo Go app
- **Device Screenshots**: Test on real devices

### Expo Documentation
- [App Icons](https://docs.expo.dev/develop/user-interface/app-icons/)
- [Splash Screens](https://docs.expo.dev/develop/user-interface/splash-screen/)
- [Adaptive Icons (Android)](https://docs.expo.dev/develop/user-interface/app-icons/#android-adaptive-icons)

---

## Future Enhancements

- [ ] App Store screenshots (6.5" iPhone, 12.9" iPad)
- [ ] Play Store feature graphic (1024x500)
- [ ] Promotional videos (30s)
- [ ] App Store preview assets
- [ ] Push notification icon (Android, 96x96, white on transparent)
- [ ] Widget assets (if implementing widgets)

---

**Contact**: Artis Laminates Marketing Team
**Priority**: Medium (placeholder assets functional but not branded)
**Timeline**: Before Play Store beta release
