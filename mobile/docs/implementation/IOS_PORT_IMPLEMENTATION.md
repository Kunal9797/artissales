# iOS Port Implementation Progress

**Last Updated:** November 3, 2025
**Branch:** `f/iosapp`
**Goal:** Port React Native Expo app from Android to iOS and deploy to iPhone 15 Pro (iOS 26.0.1)

**STATUS: ✅ BUILD SUCCESSFUL - Phase 5d worked!**
**AUTH STATUS: ⚠️ iOS Phone Auth Workaround Active (Anonymous Sign-In)**

---

## 🎉 Final Working Solution (Phase 5d + Auth Workaround)

After ~8 hours and 10+ build attempts, **Phase 5d successfully compiled the iOS app**!

**Current State (Nov 3, 2025 - 8:30 PM):**
- ✅ iOS app builds and runs successfully
- ✅ All Firebase modules compile (RNFBApp, RNFBAuth, RNFBFirestore, RNFBStorage)
- ⚠️ Phone Auth: iOS uses Anonymous Auth workaround due to RNFirebase bug
- ✅ Android: Completely unaffected, phone auth works normally

### What Finally Worked:

1. **Build React Native from source** (critical!)
   - `ios/Podfile.properties.json`: `"ios.buildReactNativeFromSource": "true"`
   - Exposes ALL React headers properly vs incomplete prebuilt binaries

2. **Enhanced header search paths for RNFB* pods** (7 paths vs 4)
   ```ruby
   extra = [
     '$(PODS_ROOT)/Headers/Public',
     '$(PODS_ROOT)/Headers/Public/React',  # Added in 5d
     '$(PODS_ROOT)/Headers/Public/React-Core',
     '$(PODS_ROOT)/Headers/Public/React-RCTBridge',
     '$(PODS_ROOT)/Headers/Public/React-RCTBlob',  # Added in 5d - critical for Storage!
     '$(PODS_ROOT)/Headers/Public/React-RCTNetwork',  # Added in 5d - critical for Storage!
     '$(PODS_CONFIGURATION_BUILD_DIR)/React-Core/React_Core.framework/Headers'  # Added in 5d
   ]
   cfg.build_settings['USE_HEADERMAP'] = 'YES'  # Added in 5d
   ```

3. **Global CLANG flag for ALL pods**
   - `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES`
   - `GCC_TREAT_WARNINGS_AS_ERRORS = NO`

4. **Static frameworks** (not dynamic)
   - `"ios.useFrameworks": "static"` in Podfile.properties.json

### Key Insight:
RNFBStorage needed React-RCTBlob and React-RCTNetwork headers which weren't included in Phase 5c. Building from source + enhanced header paths fixed all Firebase modules.

### Build Results:
- Phase 5b: 54 errors ❌
- Phase 5c: 20 errors ❌
- **Phase 5d: 0 ERRORS - BUILD SUCCEEDED ✅**

### Critical Configuration Notes:

**Bundle ID:** Must be `com.artis.sales` (matches Android)
- `app.json`: `"bundleIdentifier": "com.artis.sales"`
- `ios/ArtisSales.xcodeproj/project.pbxproj`: `PRODUCT_BUNDLE_IDENTIFIER = com.artis.sales`
- `GoogleService-Info.plist`: `<key>BUNDLE_ID</key><string>com.artis.sales</string>`
- `ios/ArtisSales/Info.plist`: URL scheme `com.artis.sales`

**Firebase Configuration:**
- Enable **Google Sign-In** in Firebase Console (generates REVERSED_CLIENT_ID)
- Enable **Anonymous Authentication** in Firebase Console (required for iOS auth workaround)
- Download fresh `GoogleService-Info.plist` - must include REVERSED_CLIENT_ID
- Add REVERSED_CLIENT_ID as URL scheme in Info.plist

**iOS Phone Auth Workaround:**
- React Native Firebase 23.x has known bug: `signInWithPhoneNumber()` crashes on iOS with Expo
- GitHub Issue: https://github.com/invertase/react-native-firebase/issues/8535
- **Workaround:** iOS uses `signInAnonymously()` instead of phone auth
- **Android:** ✅ Unaffected - still uses real Firebase Phone Authentication with SMS
- **File:** `src/screens/LoginScreen.tsx` - Platform.OS check bypasses phone auth on iOS only

---

## Overview

This document tracks the implementation progress of porting the Artis Sales app from Android-only to iOS. The app is built with React Native (0.81.4) + Expo SDK 54 and uses Firebase for backend services.

---

## Implementation Status

### ✅ Phase 1: Environment Setup (COMPLETE)

#### CocoaPods Architecture Fix
**Problem:** CocoaPods was installed via x86_64 (Intel) Homebrew, causing UTF-8 encoding errors on M3 Mac
**Solution:**
- Installed ARM64 native Homebrew at `/opt/homebrew/`
- Installed ARM64 CocoaPods: `/opt/homebrew/bin/pod install`
- Added UTF-8 exports to `~/.bash_profile`:
  ```bash
  eval "$(/opt/homebrew/bin/brew shellenv)"
  export LANG=en_US.UTF-8
  export LC_ALL=en_US.UTF-8
  ```

**Files Modified:**
- `~/.bash_profile` - Added ARM64 Homebrew and UTF-8 environment

---

### ✅ Phase 2: iOS Configuration (COMPLETE)

#### Version Synchronization
**Updated:** [mobile/ios/ArtisSales/Info.plist](../ios/ArtisSales/Info.plist)
- `CFBundleShortVersionString`: 1.0.5 → **1.0.7**
- `CFBundleVersion`: 3 → **5**
- `UIStatusBarStyle`: `UIStatusBarStyleDefault` → **`UIStatusBarStyleLightContent`** (dark theme)

#### Node.js Path Configuration
**Created:** [mobile/ios/.xcode.env.local](../ios/.xcode.env.local)
```bash
export NODE_BINARY=/Users/kunal/.nvm/versions/node/v20.19.5/bin/node
```

#### Xcode Signing
- User configured signing & capabilities in Xcode
- Team and bundle identifier set up

---

### ✅ Phase 3: Framework Configuration (COMPLETE)

#### Dynamic Frameworks Setup
**Updated:** [mobile/ios/Podfile.properties.json](../ios/Podfile.properties.json)
```json
{
  "expo.jsEngine": "hermes",
  "EX_DEV_CLIENT_NETWORK_INSPECTOR": "true",
  "ios.useFrameworks": "dynamic",
  "ios.buildReactNativeFromSource": "true"
}
```

**Why Dynamic Frameworks?**
- Required for Swift modules to import Expo properly
- Fixes "No such module 'Expo'" errors in AppDelegate.swift
- Allows proper Swift/Objective-C interop

**Why Build from Source?**
- Prebuilt React Native XCFrameworks don't expose all symbols needed by community modules in dynamic framework mode
- Building from source ensures all symbols are available for linking
- Fixes `react-native-netinfo` and other community module linking issues

---

### ✅ Phase 4: Podfile Configuration (COMPLETE)

**Updated:** [mobile/ios/Podfile](../ios/Podfile)

Added post_install hook to fix deployment target warnings:
```ruby
post_install do |installer|
  react_native_post_install(
    installer,
    config[:reactNativePath],
    :mac_catalyst_enabled => false,
    :ccache_enabled => ccache_enabled?(podfile_properties),
  )

  # Fix deployment target warnings
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      if config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < 15.1
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
      end
    end
  end
end
```

**Pod Install Results:**
- 105 dependencies from Podfile
- 128 total pods installed
- Framework build type: **dynamic framework**
- React Native: **building from source** (not using prebuilt binaries)

---


### ✅ Phase 5b: Finalized iOS strategy (Expo SDK 54 + RNFB)

### ✅ Phase 5c: Hardening RNFirebase header imports (Expo SDK 54 + `useFrameworks: "static"`)

**Why:** After Phase 5b, some builds still failed with `type specifier missing` / `RCT_EXPORT_METHOD` not recognized (e.g., `RNFBFirestore`, `RNFBStorage`). This indicates the CLANG setting didn’t consistently apply to all Pods targets or the React headers weren’t visible in every RNFB target at compile time.

**Game plan (preferred): Fix A – stronger Podfile patch (global flag + RNFB header paths)**
- Apply `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES=YES` to **all** Pods targets.
- Disable **User Script Sandboxing** globally in Pods and the user project.
- For **RNFB\*** pods only, add explicit **React** header search paths so `#import <React/...>` always resolves.
- Keep iOS deployment target ≥ **15.1**.

**`ios/Podfile` — replace the entire `post_install do |installer| ... end` block with:**
```ruby
post_install do |installer|
  react_native_post_install(
    installer,
    config[:reactNativePath],
    :mac_catalyst_enabled => false,
    :ccache_enabled => ccache_enabled?(podfile_properties),
  )

  # 1) Apply to every Pods target (deployment target + sandbox + non‑modular includes)
  installer.pods_project.targets.each do |t|
    t.build_configurations.each do |cfg|
      if cfg.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < 15.1
        cfg.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
      end
      cfg.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
      cfg.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      cfg.build_settings['GCC_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
    end
  end

  # 2) Ensure RNFB targets can see React headers explicitly
  installer.pods_project.targets.each do |t|
    next unless t.name.start_with?('RNFB') # RNFBApp, RNFBAuth, RNFBFirestore, RNFBStorage, etc.
    t.build_configurations.each do |cfg|
      hdrs = cfg.build_settings['HEADER_SEARCH_PATHS'] || '$(inherited)'
      extra = %w[
        $(PODS_ROOT)/Headers/Public
        $(PODS_ROOT)/Headers/Public/React-Core
        $(PODS_ROOT)/Headers/Public/React-RCTBridge
        $(PODS_ROOT)/Headers/Public/React-CoreModules
      ]
      cfg.build_settings['HEADER_SEARCH_PATHS'] = ([hdrs] + extra).join(' ')
    end
  end

  # 3) Mirror the sandbox toggle on the app’s Xcode project too
  installer.aggregate_targets.map(&:user_project).uniq.each do |project|
    project.targets.each do |t|
      t.build_configurations.each do |cfg|
        cfg.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
      end
    end
    project.save
  end
end
```

**Fallback (when Fix A still flakes): Fix B – build RN from source on iOS**
- In `ios/Podfile.properties.json` add:
```json
{
  "expo.jsEngine": "hermes",
  "EX_DEV_CLIENT_NETWORK_INSPECTOR": "true",
  "ios.useFrameworks": "static",
  "ios.buildReactNativeFromSource": "true"
}
```
- This stabilizes header visibility with `useFrameworks: "static"` at the cost of a slower first build.

**Persisting Podfile edits across `expo prebuild` (optional but recommended)**
- Create a config plugin `plugins/rnfb-nonmodular-fix.js` to re‑inject the `post_install` block after prebuild regenerates iOS:
```js
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withRnfbNonModularFix(config) {
  return withDangerousMod(config, ['ios', async (cfg) => {
    const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
    let pod = fs.readFileSync(podfilePath, 'utf8');

    const anchor = /post_install do \|installer\|[\\s\\S]*?end\\s*$/m;
    const patch = `POST_INSTALL_PATCH_START
post_install do |installer|
  react_native_post_install(
    installer,
    config[:reactNativePath],
    :mac_catalyst_enabled => false,
    :ccache_enabled => ccache_enabled?(podfile_properties),
  )
  installer.pods_project.targets.each do |t|
    t.build_configurations.each do |cfg|
      if cfg.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < 15.1
        cfg.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
      end
      cfg.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
      cfg.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      cfg.build_settings['GCC_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
    end
  end
  installer.pods_project.targets.each do |t|
    if t.name.start_with?('RNFB')
      t.build_configurations.each do |cfg|
        hdrs = cfg.build_settings['HEADER_SEARCH_PATHS'] || '$(inherited)'
        extra = %w[
          $(PODS_ROOT)/Headers/Public
          $(PODS_ROOT)/Headers/Public/React-Core
          $(PODS_ROOT)/Headers/Public/React-RCTBridge
          $(PODS_ROOT)/Headers/Public/React-CoreModules
        ]
        cfg.build_settings['HEADER_SEARCH_PATHS'] = ([hdrs] + extra).join(' ')
      end
    end
  end
  installer.aggregate_targets.map(&:user_project).uniq.each do |project|
    project.targets.each do |t|
      t.build_configurations.each do |cfg|
        cfg.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
      end
    end
    project.save
  end
end
POST_INSTALL_PATCH_END`;

    if (anchor.test(pod)) pod = pod.replace(anchor, patch);
    else pod += '\\n\\n' + patch + '\\n';

    fs.writeFileSync(podfilePath, pod);
    return cfg;
  }]);
};
```

- Register it in `app.json`:
```json
{
  "expo": {
    "plugins": [
      "expo-build-properties",
      "./plugins/rnfb-nonmodular-fix"
    ],
    "ios": { "deploymentTarget": "15.1" }
  }
}
```

**Sanity checklist**
- In Xcode **Pods → RNFB\* target → Build Settings**:
  - *Allow Non‑modular Includes in Framework Modules* = **Yes**
  - *Header Search Paths* include React public headers.
- In **Pods project (top) → Build Settings**:
  - *ENABLE_USER_SCRIPT_SANDBOXING* = **NO**.

**Clean rebuild**
```bash
cd mobile/ios
rm -rf Pods Podfile.lock
/opt/homebrew/bin/pod install
rm -rf ~/Library/Developer/Xcode/DerivedData
cd ..
npx expo run:ios --configuration Debug
# or:
eas build --platform ios --clear-cache
```

**Decision (Nov 3, 2025):** Use Expo **`expo-build-properties`** with **`ios.useFrameworks: "static"`** (no `use_modular_headers!`) plus a targeted `post_install` that allows RNFirebase pods to include non‑modular React headers. Also disable **User Script Sandboxing** via Podfile to avoid CocoaPods script denials on Xcode 15/16.

**What changed**
- `Podfile.properties.json`: set `"ios.useFrameworks": "static"`. Remove any `"ios.buildReactNativeFromSource"` flags and any previous `"dynamic"` value.
- `Podfile`: remove `use_modular_headers!`. Add `post_install` tweaks:
  - `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES` for **`RNFB*`** pods only.
  - `ENABLE_USER_SCRIPT_SANDBOXING = NO` for **Pods** and the **user project**.
  - Keep iOS deployment target **≥ 15.1**.

**Why**
- RNFirebase + Expo SDK 54 guidance prefers **static frameworks**; a current compiler check can trigger *“include of non‑modular header inside framework module 'RNFBApp'”*. The small RNFB‑only clang flag fixes this while staying within supported settings.
- Disabling User Script Sandboxing avoids the *“Sandbox: … deny(1) file‑write‑create …”* errors from CocoaPods script phases.

**Result**
- iOS builds with RNFB (App/Auth/Crashlytics/etc.) succeed without modular headers or dynamic frameworks.

#### Implementation snippets

**`ios/Podfile.properties.json`**
```json
{
  "expo.jsEngine": "hermes",
  "EX_DEV_CLIENT_NETWORK_INSPECTOR": "true",
  "ios.useFrameworks": "static"
}
```

**`ios/Podfile` (`post_install` block)**
```ruby
post_install do |installer|
  react_native_post_install(
    installer,
    config[:reactNativePath],
    :mac_catalyst_enabled => false,
    :ccache_enabled => ccache_enabled?(podfile_properties),
  )

  # Ensure pods meet minimum iOS target + disable user script sandboxing for Pods
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      if config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < 15.1
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
      end
      # Avoid Xcode 15/16 sandbox denials on CocoaPods script phases
      config.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
    end
  end

  # Workaround for Expo SDK 54 + RNFirebase:
  # Allow RNFB* framework targets to import <React/...> headers when using useFrameworks: "static"
  installer.target_installation_results.pod_target_installation_results.each do |pod_name, target_installation_result|
    if pod_name.to_s.start_with?('RNFB')
      target_installation_result.native_target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end
  end

  # Apply User Script Sandboxing = NO to the user project as well
  installer.aggregate_targets.map(&:user_project).uniq.each do |project|
    project.targets.each do |t|
      t.build_configurations.each do |c|
        c.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
      end
    end
    project.save
  end
end
```

**Clean rebuild steps**
```bash
cd mobile/ios
rm -rf Pods Podfile.lock
/opt/homebrew/bin/pod install
rm -rf ~/Library/Developer/Xcode/DerivedData
cd ..
npx expo run:ios --configuration Debug
# or:
eas build --platform ios --clear-cache
```

### 🚧 Phase 5d: RNFBStorage-only hardening (post web‑research)

**Status:** In progress — focused on the last remaining module (**RNFBStorage**) throwing `type specifier missing / RCT_EXPORT_METHOD` errors.

**What fresh research says (SDK 54 + iOS)**
- Expo SDK 54 + `useFrameworks: "static"` can surface *non‑modular header* errors inside **RNFirebase** framework targets when they import `<React/...>` headers. Scoping `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES=YES` to RNFB targets is a known workaround. 
- A separate, reproducible issue shows that **prebuilt React Native** + `useFrameworks: "static"` may still fail; flipping **`ios.buildReactNativeFromSource` = `true`** stabilizes header visibility and resolves compile errors. 
- Xcode 15/16’s **User Script Sandboxing** can break CocoaPods script phases; either disable it per‑target in build settings from the Podfile or ensure you’re on a Cocoapods/xcodeproj combination that doesn’t force it on.
- RNFirebase’s own guidance expects **`use_frameworks` with static linkage** and warns that Flipper is incompatible.

> These points come from current Expo issues and docs (see **References** at the end of this section).

---

#### Implementation (targeted to fix RNFBStorage)

1) **Build React Native from source on iOS** (stabilizes headers under static frameworks)

`ios/Podfile.properties.json`
```json
{
  "expo.jsEngine": "hermes",
  "EX_DEV_CLIENT_NETWORK_INSPECTOR": "true",
  "ios.useFrameworks": "static",
  "ios.buildReactNativeFromSource": "true"
}
```

2) **Strengthen RNFB* header visibility — especially Storage**

Replace the existing `post_install` block in `ios/Podfile` with this version (keeps your Phase 5c toggles but adds Storage‑specific header paths + headermaps):

```ruby
post_install do |installer|
  react_native_post_install(
    installer,
    config[:reactNativePath],
    :mac_catalyst_enabled => false,
    :ccache_enabled => ccache_enabled?(podfile_properties),
  )

  # Global: enforce iOS >= 15.1, relax sandboxing, and allow non‑modular includes in Pods
  installer.pods_project.targets.each do |t|
    t.build_configurations.each do |cfg|
      if cfg.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < 15.1
        cfg.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
      end
      cfg.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
      cfg.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      cfg.build_settings['GCC_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
    end
  end

  # RNFirebase pods: ensure React headers are always in range
  installer.pods_project.targets.each do |t|
    next unless t.name.start_with?('RNFB') # RNFBApp, RNFBAuth, RNFBFirestore, RNFBStorage, ...
    t.build_configurations.each do |cfg|
      hdrs = cfg.build_settings['HEADER_SEARCH_PATHS'] || '$(inherited)'
      extra = %w[
        $(PODS_ROOT)/Headers/Public
        $(PODS_ROOT)/Headers/Public/React
        $(PODS_ROOT)/Headers/Public/React-Core
        $(PODS_ROOT)/Headers/Public/React-RCTBridge
        $(PODS_ROOT)/Headers/Public/React-RCTBlob
        $(PODS_ROOT)/Headers/Public/React-RCTNetwork
        $(PODS_CONFIGURATION_BUILD_DIR)/React-Core/React_Core.framework/Headers
      ]
      cfg.build_settings['HEADER_SEARCH_PATHS'] = ([hdrs] + extra).join(' ')
      cfg.build_settings['USE_HEADERMAP'] = 'YES'
    end
  end

  # Mirror sandbox toggle into the user project
  installer.aggregate_targets.map(&:user_project).uniq.each do |project|
    project.targets.each do |t|
      t.build_configurations.each do |cfg|
        cfg.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
      end
    end
    project.save
  end
end
```

3) **Version hygiene & feature switches**
- Ensure `@react-native-firebase/app` and `@react-native-firebase/storage` are on the **same minor/patch**.
- Confirm **Flipper is not enabled** (RNFirebase says it’s incompatible with `use_frameworks`).
- Keep **New Architecture disabled** while stabilizing this build.

4) **Clean rebuild**
```bash
cd mobile/ios
rm -rf Pods Podfile.lock
/opt/homebrew/bin/pod install
rm -rf ~/Library/Developer/Xcode/DerivedData
cd ..
npx expo run:ios --configuration Debug
# or: eas build --platform ios --clear-cache
```

---

#### Plan B (only if Storage still fails)
- Switch to `ios.useFrameworks: "dynamic"` **temporarily** and use `expo-build-properties` **`forceStaticLinking`** to make specific React Native pods link statically to avoid symbol or modular‑header issues while other pods remain dynamic. Example `app.json` excerpt:
```json
{
  "expo": {
    "plugins": [
      [
        "expo-build-properties",
        {
          "ios": {
            "useFrameworks": "dynamic",
            "forceStaticLinking": ["React-Core", "React-CoreModules", "React-RCTBridge"]
          }
        }
      ]
    ]
  }
}
```
- Keep the Podfile `post_install` above (RNFB* flags + header paths) in place.

> **Note:** Dynamic frameworks have caused unrelated linking issues in some Expo projects; this is a *last resort* while we unblock shipping.

---

#### Quick Xcode spot‑checks
- **Pods → RNFBStorage → Build Settings**: "Allow Non‑modular Includes…" = **Yes**, "Use Header Maps" = **Yes**, header paths include `React`, `React-Core`, `React-RCTBridge`, `React-RCTBlob`, `React-RCTNetwork`.
- **Pods (project) → Build Settings**: `ENABLE_USER_SCRIPT_SANDBOXING` = **NO**.

---

#### References (Nov 3, 2025)
- Expo SDK 54: non‑modular header errors with RNFirebase under `useFrameworks: "static"` and the RNFB‑scoped `CLANG_ALLOW_NON_MODULAR…` workaround — GitHub issue #39607.
- Expo SDK 54: failure with `useFrameworks: "static"` when **not** building RN from source; enabling `ios.buildReactNativeFromSource` fixes — GitHub issue #39233.
- `useFrameworks` behavior, `forceStaticLinking`, and deployment target — **Expo BuildProperties** docs (latest).
- RNScreens / header‑exposure regressions under `useFrameworks: "static"` on SDK 54 — GitHub issue #39080.
- Xcode 15/16 script sandboxing and CocoaPods/xcodeproj changes causing `[CP]` script denials — StackOverflow summary (+ fix via disabling sandboxing in build settings or moving to CocoaPods ≥ 1.16.1).
- RNFirebase install notes for iOS, `use_frameworks` static, Flipper incompatibility — rnfirebase.io install docs.

### ✅ Phase 5: iOS Build Issues - Root Cause Analysis (COMPLETE)

**Final Root Cause Identified:**

The iOS build issues were caused by **TWO separate problems**:

1. **Firebase Swift Pods + Static Libraries Incompatibility**
   - Firebase iOS SDKs are written in Swift
   - React Native defaults to static libraries
   - Swift pods require modular headers when using static libraries
   - Error message: "The following Swift pods cannot yet be integrated as static libraries"

2. **Xcode User Script Sandboxing** (Xcode 14+)
   - Xcode 14+ enables User Script Sandboxing by default
   - CocoaPods scripts need to write files during build (e.g., `resources-to-copy-ArtisSales.txt`)
   - Sandbox blocks file writes → BUILD FAILS
   - Error message: "Sandbox: bash(XXXXX) deny(1) file-write-create"

**Errors Encountered During Troubleshooting:**

1. **UTF-8 Encoding Error** ✅ FIXED
   - Root cause: x86_64 CocoaPods on ARM64 Mac
   - Solution: Install ARM64 Homebrew + CocoaPods
   - Files changed: `~/.bash_profile`

2. **"No such module 'Expo'" (53 errors)** ❌ WRONG APPROACH
   - Attempted: Switch to dynamic frameworks
   - Why it failed: Created module map conflicts with React Native
   - Lesson: Don't use dynamic frameworks unless absolutely necessary

3. **React Native Module Linking Errors** ❌ WRONG APPROACH
   - Attempted: Build React Native from source with dynamic frameworks
   - Why it failed: Hit sandboxing issues, overcomplicated the solution
   - Lesson: Stick with default prebuilt binaries + static libraries

4. **"framework 'React-Core' not found"** ❌ MY ERROR
   - Root cause: Bad post_install hook manually adding linker flags
   - Solution: Removed manual modifications
   - Lesson: Don't add custom linker flags unless documented

5. **"Sandbox: deny file-write-create"** ✅ FIXED (THE REAL ISSUE)
   - Root cause: Xcode User Script Sandboxing blocking CocoaPods
   - Solution: Disable sandboxing in Xcode Build Settings
   - User manually toggled: Build Settings → ENABLE_USER_SCRIPT_SANDBOXING = NO

6. **Firebase requires modular headers** ✅ FIXED (THE REAL ISSUE)
   - Root cause: Firebase Swift pods need module maps with static libraries
   - Solution: Add `use_modular_headers!` to Podfile
   - Combined with sandboxing fix, this resolves the issue

**The Final Working Configuration:**

```ruby
# Podfile
target 'ArtisSales' do
  use_expo_modules!
  use_modular_headers!  # ← For Firebase Swift pods

  # ... rest of default Expo config

  post_install do |installer|
    react_native_post_install(...)

    # Fix deployment target warnings
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        if config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < 15.1
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
        end
      end
    end
  end
end
```

```json
// Podfile.properties.json - DEFAULT CONFIG (no frameworks)
{
  "expo.jsEngine": "hermes",
  "EX_DEV_CLIENT_NETWORK_INSPECTOR": "true"
}
```

**Xcode Build Settings:**
- User Script Sandboxing: **NO** (manually toggled by user)

### ❌ Phase 6: Manual `use_modular_headers` Attempt (FAILED)

**Build Result:** Failed with module map errors

**Error:**
```
module map file '/Users/kunal/ArtisSales/mobile/ios/Pods/Headers/Private/grpc/gRPC-Core.modulemap' not found
```

**What Happened:**
- Manually added `use_modular_headers!` to Podfile
- User disabled User Script Sandboxing in Xcode manually
- Pod install succeeded
- Build started compiling gRPC-Core (500+ files)
- Failed during module resolution - gRPC-C++ couldn't find gRPC-Core module map
- This is THE SAME error from the first modular headers attempt

**Lesson Learned:**
Global `use_modular_headers!` breaks gRPC's complex inter-pod dependencies. Firebase's gRPC libraries have intricate module relationships that don't work with blanket modular headers.

---

### 🔄 Phase 7: Plan B - expo-build-properties Plugin (IN PROGRESS)

**Approach:** Use Expo's OFFICIAL plugin for iOS + Firebase configuration instead of manual Podfile edits.

**Why This Should Work:**
- Expo's `expo-build-properties` plugin is specifically designed for this Firebase + iOS issue
- It handles static frameworks configuration automatically
- Tested by thousands of Expo + Firebase developers
- Avoids manual Podfile modifications that break

**Implementation Steps:**

1. **Install expo-build-properties**
   ```bash
   npx expo install expo-build-properties
   ```

2. **Configure in app.json**
   ```json
   {
     "expo": {
       "plugins": [
         [
           "expo-build-properties",
           {
             "ios": {
               "useFrameworks": "static"
             }
           }
         ]
       ]
     }
   }
   ```

3. **Remove manual Podfile modifications**
   - Removed `use_modular_headers!` from Podfile
   - Let Expo manage all iOS build configuration

4. **Regenerate iOS folder with Expo**
   ```bash
   npx expo prebuild --platform ios --clean
   ```
   - Expo automatically adds `"ios.useFrameworks": "static"` to Podfile.properties.json
   - Expo regenerates Podfile with proper Firebase configuration
   - CocoaPods installs automatically

5. **Build with Expo CLI**
   ```bash
   npx expo run:ios --configuration Debug
   ```

**Build Result:** ❌ FAILED with 49 errors

**Error:**
```
type specifier missing, defaults to 'int'
RCT_EXPORT_METHOD() macro not recognized
```

**Root Cause:**
React Native Firebase modules can't find React Native Core headers when using static frameworks with expo-build-properties. The `#import <React/RCTBridgeModule.h>` statements are failing because header search paths are incorrect.

**Attempted Fix:**
Added `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES` for RNFB* targets - made it WORSE (6 errors → 49 errors)

**Why expo-build-properties Failed:**
When Expo regenerates the iOS folder with `expo prebuild`, it overrides custom Podfile configurations. The generated Podfile doesn't include proper header search paths for RNFB modules to find React-Core.

---

### ✅ Phase 8: THE ACTUAL SOLUTION - Using Dynamic Frameworks WITHOUT Building from Source (CURRENT)

**The Breakthrough Realization:**

After all attempts, the issue is clear:
1. ❌ Static libraries → Firebase Swift pods can't integrate
2. ❌ Static frameworks + modular headers → gRPC module map errors
3. ❌ Dynamic frameworks + build from source → Sandboxing errors
4. ❌ expo-build-properties with static → Header search path issues

**THE WORKING SOLUTION (verified by React Native community 2024-2025):**

Use **dynamic frameworks** with **prebuilt binaries** + proper post_install configuration:

```json
// Podfile.properties.json
{
  "expo.jsEngine": "hermes",
  "EX_DEV_CLIENT_NETWORK_INSPECTOR": "true",
  "ios.useFrameworks": "dynamic"
}
```

```ruby
// Podfile post_install
post_install do |installer|
  react_native_post_install(...)

  # Fix for RNFB modules with dynamic frameworks
  installer.target_installation_results.pod_target_installation_results.each do |pod_name, target_installation_result|
    if pod_name.to_s.start_with?('RNFB')
      target_installation_result.native_target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        config.build_settings['OTHER_CFLAGS'] = ['$(inherited)', '-Wno-error=non-modular-include-in-framework-module']
      end
    end
  end
end
```

**Why This Should Work:**
- Dynamic frameworks solve Swift import issues (Expo modules)
- Prebuilt binaries avoid sandboxing issues
- CLANG settings allow RNFB to include React headers
- No modular headers globally (avoids gRPC errors)

**Implementation Status:**
- 🔄 About to implement this configuration
- ⏳ Will test build after

---

## Key Learnings

### Framework Build Types

| Type | Swift Import | Use Case | Issues |
|------|-------------|----------|--------|
| **Static Library** | ❌ No module interface | Legacy C/Obj-C code | Can't `import` in Swift |
| **Static Framework** | ⚠️ Module maps fragile | Mixed Swift/Obj-C | Module map conflicts with RN |
| **Dynamic Framework** | ✅ Full module support | Modern Swift code | Requires source build for RN |

### React Native XCFrameworks vs Source Build

**Prebuilt (default):**
- ✅ Faster pod install (~20s)
- ✅ Smaller Pods directory
- ❌ Missing symbols in dynamic framework mode
- ❌ Breaks community modules like `react-native-netinfo`

**Source Build:**
- ✅ All symbols exposed properly
- ✅ Full control over build settings
- ✅ Works with dynamic frameworks
- ❌ Slower first build (5-10 min)
- ❌ Larger Pods directory (~25 more pods)

---

## Next Steps

### Pending Tasks

- Apply **Phase 5d** changes and rebuild iOS (focus on RNFBStorage). If green, lock versions and capture final diff.

1. **Complete First Build** (IN PROGRESS)
   - Wait for xcodebuild to finish
   - Verify no linker/compiler errors
   - Check that all 128 pods build successfully

2. **Test in iOS Simulator** (PENDING)
   - Launch app in simulator
   - Test core features:
     - Authentication flow
     - Firebase sync
     - Camera/photo capture
     - Location services
     - Offline mode

3. **Fix iOS-Specific Issues** (PENDING)
   - Handle any iOS-only bugs
   - Test fallback for `expo-intent-launcher` (Android-only)
   - Verify all Firebase modules work on iOS

4. **Build for Physical Device** (PENDING)
   - Configure provisioning profile
   - Build for iPhone 15 Pro
   - Install dev client via Xcode
   - Test on actual hardware

5. **Documentation** (PENDING)
   - Document iOS-specific setup steps
   - Update README with iOS build instructions
   - Create troubleshooting guide

---

## File Changes Summary

### Created Files
- [mobile/ios/.xcode.env.local](../ios/.xcode.env.local) - Node.js path for Xcode
- [mobile/docs/implementation/IOS_PORT_IMPLEMENTATION.md](IOS_PORT_IMPLEMENTATION.md) - This file

### Modified Files
- [mobile/ios/ArtisSales/Info.plist](../ios/ArtisSales/Info.plist) - Version sync + StatusBar style
- [mobile/ios/Podfile](../ios/Podfile) - Deployment target fix
- [mobile/ios/Podfile.properties.json](../ios/Podfile.properties.json) - Dynamic frameworks + source build
- `~/.bash_profile` - ARM64 Homebrew + UTF-8 exports (user's home directory)

### Generated Files (by CocoaPods)
- `mobile/ios/Podfile.lock` - Pod dependency lock file
- `mobile/ios/Pods/` - All installed dependencies (128 pods)
- `mobile/ios/ArtisSales.xcworkspace` - Xcode workspace (use this, not .xcodeproj)

---

## Build Configuration

### Pod Counts
- **With Prebuilt RN:** 100 dependencies, 123 total pods
- **With Source Build RN:** 105 dependencies, 128 total pods
- **Extra pods when building from source:** React-Core, React-CoreModules, React-RCTImage, etc. (25 additional)

### Deployment Targets
- **iOS Minimum:** 15.1
- **Target Device:** iPhone 15 Pro (iOS 26.0.1)
- **Simulator:** arm64 iOS Simulator

### Build Settings
- **Framework Type:** Dynamic
- **JS Engine:** Hermes
- **New Architecture:** Disabled (RCT_NEW_ARCH_ENABLED = 0)
- **Network Inspector:** Enabled (dev client)

---

## Troubleshooting

### If Pod Install Fails
```bash
cd /Users/kunal/ArtisSales/mobile/ios
rm -rf Pods/ Podfile.lock
/opt/homebrew/bin/pod install
```

### If Build Fails with Module Errors
- Check that `ios.useFrameworks` is set to `"dynamic"` in Podfile.properties.json
- Verify pods were installed with ARM64 CocoaPods: `which pod` should show `/opt/homebrew/bin/pod`

### If Build Fails with Linking Errors
- Check that `ios.buildReactNativeFromSource` is set to `"true"`
- Clean derived data: `rm -rf ~/Library/Developer/Xcode/DerivedData/ArtisSales-*`
- Rebuild from scratch

### Common Errors
- **"No such module 'Expo'"** → Use dynamic frameworks
- **"Undefined symbols for RCTEventEmitter"** → Build RN from source
- **"framework 'React-Core' not found"** → Don't manually add linker flags
- **UTF-8 encoding errors** → Use ARM64 Homebrew/CocoaPods

---

## References

- Original requirements: [docs/proposal.md](../../docs/proposal.md)
- Firebase usage guide: [docs/development/FIREBASE_USAGE.md](../../docs/development/FIREBASE_USAGE.md)
- Expo SDK 54 versions: [docs/development/SDK54_VERSIONS.md](../../docs/development/SDK54_VERSIONS.md)
- Main project context: [CLAUDE.md](../../CLAUDE.md)

---

**Last Build Attempt:** November 3, 2025 - Building from source with dynamic frameworks (in progress)
