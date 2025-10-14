# Expo SDK 54 Version Matrix

**Last Updated**: October 14, 2025
**Expo SDK**: 54.0.13
**React Native**: 0.81.4

---

## Core Dependencies

| Package | Version | SDK 54 Compatible | Notes |
|---------|---------|-------------------|-------|
| `expo` | ^54.0.13 | ✅ | Latest SDK 54 patch |
| `react` | ^19.1.0 | ⚠️ | Working but newer than official (18.3.1) |
| `react-native` | ^0.81.4 | ✅ | SDK 54 official version |

## Firebase Dependencies

| Package | Version | Notes |
|---------|---------|-------|
| `@react-native-firebase/app` | ^23.4.0 | Native Firebase SDK |
| `@react-native-firebase/auth` | ^23.4.0 | Phone authentication |
| `@react-native-firebase/firestore` | ^23.4.0 | Offline-first database |
| `@react-native-firebase/storage` | ^23.4.0 | Image uploads |

**Note**: Firebase packages require Node.js >= 20.0.0 (currently on 18.20.6). This is acceptable for development but may require update for production builds.

## Navigation

| Package | Version | SDK 54 Compatible |
|---------|---------|-------------------|
| `@react-navigation/native` | ^7.1.18 | ✅ |
| `@react-navigation/native-stack` | ^7.3.27 | ✅ |
| `@react-navigation/bottom-tabs` | ^7.4.8 | ✅ |
| `react-native-screens` | ^4.16.0 | ✅ |
| `react-native-safe-area-context` | ^5.6.1 | ✅ |

## Expo Modules

| Package | Version | SDK 54 Compatible |
|---------|---------|-------------------|
| `expo-camera` | ~17.0.8 | ✅ |
| `expo-location` | ^19.0.7 | ✅ |
| `expo-image-manipulator` | ~14.0.7 | ✅ |
| `expo-status-bar` | ^3.0.8 | ✅ |

## UI Libraries

| Package | Version | Notes |
|---------|---------|-------|
| `lucide-react-native` | ^0.545.0 | Icon library (500+ icons) |
| `react-native-svg` | ^15.12.1 | SVG support (SDK 54 exact version) |
| `react-native-calendars` | ^1.1313.0 | Date picker component |

## Dev Dependencies

| Package | Version | Notes |
|---------|---------|-------|
| `typescript` | ^5.9.3 | TypeScript 5.x |
| `@types/react` | ~19.1.10 | React 19 types |

**Note**: Removed `@types/react-native` as types are included with `react-native` package.

---

## Expo Doctor Output (October 14, 2025)

```
Running 17 checks on your project...
15/17 checks passed. 2 checks failed.

✖ Check that no duplicate dependencies are installed
Found duplicates for react-native-safe-area-context:
  ├─ react-native-safe-area-context@5.6.1 (at: node_modules/react-native-safe-area-context)
  └─ react-native-safe-area-context@4.5.0 (at: node_modules/react-native-calendars/node_modules/react-native-safe-area-context)

✖ Check for app config fields that may not be synced in a non-CNG project
This project contains native project folders (android/ios) but also has native configuration
in app.json. Properties like orientation, icon, splash, etc. will not be synced unless
you run prebuild in your build pipeline.
```

### Known Issues

1. **Duplicate `react-native-safe-area-context`**: The `react-native-calendars` package brings its own version (4.5.0) while we use 5.6.1. This is acceptable as npm/yarn resolves it, but may cause warnings.

2. **Non-CNG Project**: We have native folders (android/ios) present. This is fine for development but prebuild should be run before production builds to sync app.json configs.

3. **Node.js Version**: Current Node v18.20.6, but React Native 0.81 and Firebase recommend Node >= 20.19.4. Consider upgrading Node.js for production.

---

## Migration Notes

### From Previous State
- ✅ Fixed expo version: 54.0.12 → 54.0.13
- ✅ Fixed react-native-svg: 15.14.0 → 15.12.1 (SDK 54 exact)
- ✅ Removed @types/react-native (types included in react-native)
- ✅ Removed invalid ndkVersion config from app.json

### Remaining Considerations
- React 19.1.0 is ahead of SDK 54 official support (18.3.1) but currently working
- Consider downgrading to React 18.3.1 if Suspense or timing issues arise

---

## Verification Commands

```bash
# Check SDK compatibility
npx expo-doctor

# Install correct versions
npx expo install --fix

# Deduplicate dependencies
npm dedupe

# Verify package versions
npm list expo react react-native
```

---

## References

- [Expo SDK 54 Release Notes](https://expo.dev/changelog/2025/01-14-sdk-54)
- [React Native 0.81 Changelog](https://github.com/facebook/react-native/releases/tag/v0.81.0)
- [Expo Doctor Documentation](https://docs.expo.dev/more/expo-cli/#doctor)
