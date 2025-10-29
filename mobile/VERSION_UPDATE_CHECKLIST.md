# Version Update Checklist

⚠️ **IMPORTANT**: When releasing a new version, you MUST update version numbers in THREE places!

## Why?

We use `expo prebuild` which generates native Android and iOS code. These native files take precedence over `app.json` during builds.

## Checklist for New Versions:

When bumping version (e.g., from 1.0.4 to 1.0.5):

### ✅ Step 1: Update app.json
**File**: `mobile/app.json`
```json
{
  "version": "1.0.5",
  "android": {
    "versionCode": 3  // Increment by 1
  }
}
```

### ✅ Step 2: Update Android
**File**: `mobile/android/app/build.gradle`
```gradle
versionCode 3        // Same as app.json
versionName "1.0.5"  // Same as app.json version
```

### ✅ Step 3: Update iOS
**File**: `mobile/ios/ArtisSales/Info.plist`
```xml
<key>CFBundleShortVersionString</key>
<string>1.0.5</string>  <!-- Same as app.json version -->

<key>CFBundleVersion</key>
<string>3</string>  <!-- Same as Android versionCode -->
```

### ✅ Step 4: Commit Changes
```bash
git add mobile/app.json mobile/android/app/build.gradle mobile/ios/ArtisSales/Info.plist
git commit -m "chore: bump version to 1.0.5 (versionCode 3)"
```

### ✅ Step 5: Build
```bash
cd mobile
eas build --platform android --profile production
```

## Version Naming Convention:

- **Version Name**: Semantic versioning (e.g., 1.0.5)
  - Major.Minor.Patch
  - Visible to users in app stores

- **Version Code**: Integer that increments with each release
  - Must be unique and always increase
  - Used by Play Store to identify releases
  - Example: 1, 2, 3, 4, ...

## Current Version:

- **Version Name**: 1.0.5
- **Version Code**: 3
- **Last Updated**: October 29, 2025

## Quick Reference:

| Version | Version Code | Date | Notes |
|---------|--------------|------|-------|
| 1.0.0 | 1 | Oct 28, 2025 | Initial release |
| 1.0.2 | 1 | Oct 28, 2025 | Profile & Performance |
| 1.0.4 | 2 | Oct 28, 2025 | Stats fix & DSR revision workflow |
| 1.0.5 | 3 | Oct 29, 2025 | Safe area fixes for 10 screens (Phase 1 + 2) |

---

**Remember**: Always update all THREE files before building! 🚀
