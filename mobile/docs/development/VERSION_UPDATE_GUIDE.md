# Version Update Guide

**Last Updated:** November 1, 2025

This guide explains **exactly where and how** to update version numbers before creating a new production build.

---

## 🎯 Quick Checklist

Before running `eas build --platform android --profile production`, update version numbers in **ALL 4 LOCATIONS**:

- [ ] 1. `mobile/app.json` - version field
- [ ] 2. `mobile/app.json` - android.versionCode field
- [ ] 3. `mobile/package.json` - version field
- [ ] 4. `mobile/android/app/build.gradle` - versionCode and versionName

---

## 📝 Step-by-Step Instructions

### Version Numbering Scheme

**Format:** `MAJOR.MINOR.PATCH` (e.g., 1.0.6)

- **MAJOR:** Breaking changes, major feature releases (1.x.x → 2.x.x)
- **MINOR:** New features, non-breaking changes (1.0.x → 1.1.x)
- **PATCH:** Bug fixes, performance improvements (1.0.5 → 1.0.6)

**Version Code:** Integer that increments with each build (1, 2, 3, 4...)
- Must always increase (Android requirement)
- Cannot reuse previous version codes

---

## 📍 Location 1: app.json (version)

**File:** `mobile/app.json`

**Location:** Root of expo config, line ~5

```json
{
  "expo": {
    "name": "Artis Sales",
    "slug": "artis-sales",
    "version": "1.0.6",  ← UPDATE THIS
    ...
  }
}
```

**Find:** Search for `"version":` near the top
**Update:** Change to new version (e.g., "1.0.6" → "1.0.7")

---

## 📍 Location 2: app.json (versionCode)

**File:** `mobile/app.json`

**Location:** Inside android object, line ~23

```json
{
  "expo": {
    ...
    "android": {
      "versionCode": 4,  ← UPDATE THIS (increment by 1)
      "adaptiveIcon": {
        ...
      }
    }
  }
}
```

**Find:** Search for `"versionCode":`
**Update:** Increment by 1 (e.g., 3 → 4)
**⚠️ CRITICAL:** This MUST always increase, never decrease or reuse

---

## 📍 Location 3: package.json

**File:** `mobile/package.json`

**Location:** Root object, line ~3

```json
{
  "name": "mobile",
  "version": "1.0.6",  ← UPDATE THIS
  "main": "index.js",
  ...
}
```

**Find:** Search for `"version":` near the top
**Update:** Change to match app.json version (e.g., "1.0.6" → "1.0.7")

---

## 📍 Location 4: build.gradle (MOST IMPORTANT!)

**File:** `mobile/android/app/build.gradle`

**Location:** Inside defaultConfig block, lines ~95-96

```gradle
android {
    ...
    defaultConfig {
        applicationId 'com.artis.sales'
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 4           ← UPDATE THIS (increment by 1)
        versionName "1.0.6"     ← UPDATE THIS (match app.json)
        ...
    }
}
```

**Find:** Search for `versionCode` in build.gradle
**Update:**
- `versionCode`: Increment by 1 (e.g., 3 → 4)
- `versionName`: Match app.json version (e.g., "1.0.5" → "1.0.6")

**⚠️ WHY THIS MATTERS:** This file controls the actual Android APK build. If you forget to update this, EAS will show the wrong build number!

---

## 🔍 Verification Commands

After updating all 4 locations, run this command to verify:

```bash
cd /Users/kunal/ArtisSales/mobile

echo "=== VERSION VERIFICATION ==="
echo ""
echo "1. app.json version:"
grep '"version"' app.json | head -1
echo ""
echo "2. app.json versionCode:"
grep 'versionCode' app.json
echo ""
echo "3. package.json version:"
grep '"version"' package.json | head -1
echo ""
echo "4. build.gradle versionCode:"
grep 'versionCode' android/app/build.gradle
echo ""
echo "5. build.gradle versionName:"
grep 'versionName' android/app/build.gradle
```

**Expected Output:**
```
=== VERSION VERIFICATION ===

1. app.json version:
    "version": "1.0.7",

2. app.json versionCode:
      "versionCode": 5,

3. package.json version:
  "version": "1.0.7",

4. build.gradle versionCode:
        versionCode 5

5. build.gradle versionName:
        versionName "1.0.7"
```

**✅ All numbers should match!**

---

## 📋 Example: Updating from 1.0.6 (Build 4) to 1.0.7 (Build 5)

### Before:
```
app.json version:        "1.0.6"
app.json versionCode:    4
package.json version:    "1.0.6"
build.gradle versionCode: 4
build.gradle versionName: "1.0.6"
```

### Changes:
1. **app.json** line 5: `"version": "1.0.6"` → `"version": "1.0.7"`
2. **app.json** line 23: `"versionCode": 4` → `"versionCode": 5`
3. **package.json** line 3: `"version": "1.0.6"` → `"version": "1.0.7"`
4. **build.gradle** line 95: `versionCode 4` → `versionCode 5`
5. **build.gradle** line 96: `versionName "1.0.6"` → `versionName "1.0.7"`

### After:
```
app.json version:        "1.0.7"
app.json versionCode:    5
package.json version:    "1.0.7"
build.gradle versionCode: 5
build.gradle versionName: "1.0.7"
```

---

## ⚠️ Common Mistakes

### ❌ Mistake 1: Forgetting build.gradle
**Problem:** Updated app.json and package.json, but forgot build.gradle
**Result:** EAS shows old build number (e.g., Build 3 instead of Build 4)
**Solution:** ALWAYS update build.gradle - it's the most important file!

### ❌ Mistake 2: Version Code Doesn't Match
**Problem:** app.json has versionCode 5, but build.gradle has versionCode 4
**Result:** Confusing build numbers, potential Play Store rejection
**Solution:** Verify with the verification command above

### ❌ Mistake 3: Decreasing Version Code
**Problem:** Changed versionCode from 5 to 4
**Result:** Google Play Store will reject the upload
**Solution:** Version codes must ALWAYS increase, never decrease

### ❌ Mistake 4: Version Name Mismatch
**Problem:** app.json has "1.0.7" but build.gradle has "1.0.6"
**Result:** Inconsistent versioning across app
**Solution:** Keep version names synchronized

---

## 🚀 Building After Version Update

Once all 4 locations are updated and verified:

```bash
cd /Users/kunal/ArtisSales/mobile
eas build --platform android --profile production
```

---

## 📚 Additional Documentation

After creating a new build, also update:

- **Release Notes:** Create `mobile/docs/releases/RELEASE_X.X.X.md`
- **Changelog:** Document what changed in this version
- **Testing Checklist:** Note areas to test

---

## 🔗 Related Files

- **EAS Config:** `mobile/eas.json` - Build profiles
- **Version History:** `mobile/docs/releases/` - All release notes
- **This Guide:** `mobile/docs/development/VERSION_UPDATE_GUIDE.md`

---

## 💡 Pro Tips

1. **Use a script:** Consider creating a bash script to update all 4 locations automatically
2. **Git tag:** Tag releases in git (e.g., `git tag v1.0.7`)
3. **Commit message:** Use format like `chore: bump version to 1.0.7 (build 5)`
4. **Double check:** Always run the verification command before building

---

**Questions?** Check the EAS Build documentation: https://docs.expo.dev/build/introduction/

**Last Build:** Version 1.0.6 (Build 4) - November 1, 2025
