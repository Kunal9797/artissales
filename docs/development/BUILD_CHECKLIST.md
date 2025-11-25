# Build Checklist

## Version Numbers - Update in 3 Places!

Before every production build, update the version in these 3 files:

| File | Field | Current |
|------|-------|---------|
| `mobile/app.json` | `expo.version` | 1.0.7 |
| `mobile/app.json` | `expo.android.versionCode` | 5 |
| `mobile/android/app/build.gradle` | `versionCode` | 5 |
| `mobile/android/app/build.gradle` | `versionName` | "1.0.7" |
| `mobile/package.json` | `version` | 1.0.7 |

**Important**:
- `versionCode` must be an **integer** and must **increment** with each Play Store upload
- `versionName` is the user-facing version string (e.g., "1.0.7")

---

## Build Profiles

| Profile | Output | Use Case |
|---------|--------|----------|
| `preview` | **APK** | Direct sharing, internal testing, sideloading |
| `production` | **AAB** | Play Store submission |

### Commands

**For internal testing (APK):**
```bash
cd mobile
eas build -p android --profile preview
```

**For Play Store (AAB):**
```bash
cd mobile
eas build -p android --profile production
```

---

## Pre-Build Checklist

- [ ] Update version numbers in all 3 files
- [ ] Commit version changes
- [ ] Push to main branch
- [ ] Deploy Cloud Functions (if backend changes)
- [ ] Run build with correct profile

---

## APK vs AAB

- **APK**: Android Package - can be installed directly on devices
- **AAB**: Android App Bundle - required for Play Store (Google optimizes it per device)
