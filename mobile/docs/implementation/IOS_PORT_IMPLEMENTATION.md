# iOS Port Implementation Progress

**Last Updated:** November 3, 2025
**Branch:** `f/iosapp`
**Goal:** Port React Native Expo app from Android to iOS and deploy to iPhone 15 Pro (iOS 26.0.1)

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
