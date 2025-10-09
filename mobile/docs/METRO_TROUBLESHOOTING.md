# Metro Bundler Troubleshooting Log

## TL;DR - Root Cause ✅ SOLVED
**Corrupted Expo Go app** - Expo Go on the Android emulator was corrupted/outdated and not sending bundle requests to Metro. Metro was working fine but never received requests. Solution: Uninstall Expo Go (`adb uninstall host.exp.exponent`) and reinstall by pressing 'a' in Expo terminal. Bundle loaded successfully in 4.3 seconds after fix.

## Problem
Metro bundler starts successfully but hangs/times out when trying to build JavaScript bundle. App shows white screen, no logs in Expo terminal when reloading.

## Root Cause Analysis
**Confirmed:** Metro receives requests from the app but connection closes immediately ("unexpected end of stream" error in logcat)
**Confirmed:** `curl http://localhost:8081/index.bundle?platform=android` times out after 30+ seconds
**Conclusion:** Metro hangs during JavaScript compilation, not a network issue

## Environment
- Node: v20.19.5 (upgraded from v18.20.6 - REQUIRED for Metro 0.83.1)
- Expo SDK: 53
- React: 19.1.0 (downgraded from 19.2.0 to match Expo SDK 53)
- React Native: 0.81.4 (upgraded from 0.80.2 to match Expo SDK 53)
- Platform: macOS, Android Emulator (Pixel 5, API 34)

## Attempts Made

### 1. ❌ Network Configuration (Failed)
- Tried: localhost, LAN IP (192.168.1.103, 192.168.100.211), tunnel mode
- Result: All modes show same behavior - Metro hangs
- Conclusion: Not a network issue

### 2. ❌ Port Forwarding (Failed)
- Tried: `adb reverse tcp:8081 tcp:8081`
- Result: Port forwarding works, but Metro still hangs
- Conclusion: Emulator CAN reach Metro, but Metro doesn't respond

### 3. ✅ Node.js Version (Fixed)
- Issue: Node 18.20.6 incompatible with Metro 0.83.1 (requires >= 20.19.4)
- Action: Upgraded to Node 20.19.5 via nvm
- Result: Fixed engine compatibility warnings

### 4. ✅ React Version Mismatch (Fixed)
- Issue: React 19.2.0 vs Expo SDK 53 expecting 19.1.0
- Action: `npm install react@19.1.0 react-native@0.81.4 @types/react@~19.1.10`
- Result: Fixed package version warnings

### 5. ❌ Metro Config for Firebase (Attempted)
- Tried: Added metro.config.js with `unstable_enablePackageExports = false`
- Reason: Known React Native Firebase + Expo SDK 53 compatibility issue
- Result: Unknown if helped or hurt (config later removed)
- Status: CURRENTLY DISABLED (renamed to .backup)

### 6. ❌ Cache Clearing (Failed)
- Action: Removed all caches:
  - `node_modules/.cache`
  - `.expo`
  - `android/.gradle`
  - `android/app/build`
- Removed: metro.config.js (backed up to metro.config.js.backup)
- Reason: Metro may be using stale cached data from when code had errors
- Result: STILL HANGS - No "Building JavaScript bundle..." output
- Observation: Metro shows "Networking has been disabled, Skipping dependency validation in offline mode"
- Status: **FAILED - Issue persists even with all caches cleared**

### 7. 🔍 CRITICAL OBSERVATION
- When starting Metro: Shows "Networking has been disabled" and "Skipping dependency validation in offline mode"
- This is ABNORMAL - Metro should have network access
- Possible causes:
  - macOS firewall blocking Metro
  - Network configuration issue on the Mac
  - Expo/Metro process isolation issue
  - Corporate VPN or security software interference

### 8. ❌ Network IP Mismatch (Partially Resolved)
- **Problem**: App trying to reach http://192.168.1.103:8081 but Mac's IP is now 192.168.0.83
- **Cause**: Network IP address keeps changing (likely switching between WiFi networks)
- **Evidence from logcat**:
  ```
  URL: http://192.168.1.103:8081/.expo/.virtual-metro-entry.bundle
  Caused by: java.io.IOException: unexpected end of stream
  ```
- **Solution Attempted**: Rebuild app completely with `npx expo run:android --no-build-cache`
- **Result**: Rebuild successful but SAME ISSUE persists - app still can't load bundle
- **Status**: FAILED - Deeper issue than just IP mismatch

### 9. ✅ Created Fresh Test Project (Major Discovery!)
- **Action**: Created brand new minimal Expo project (`expo-test`) to isolate issue
- **Command**: `npx create-expo-app@latest expo-test --template blank-typescript`
- **Test**: Ran `npx expo start` and opened in Expo Go
- **Result**: SAME BEHAVIOR - Expo Go stuck at "Loading from 192.168.0.83:8081..."
- **CRITICAL FINDING**:
  - Metro starts successfully
  - Metro shows "Metro waiting on exp://192.168.0.83:8081"
  - BUT: Metro DEBUG logs show **NO bundle requests** from Expo Go
  - Only connectivity checks to google.com and gstatic.com appear
  - Expo Go never sends `/index.bundle` request to Metro
- **Conclusion**: Issue is NOT project-specific - it's system-wide Metro/Expo Go communication failure

### 10. 🔧 System Diagnostics Performed
- **Watchman Reset**: `watchman shutdown-server` - No change
- **Metro Verbose Logs**: `DEBUG=* npx expo start` - Revealed no bundle requests received
- **Node Version**: Confirmed v20.19.5 (correct)
- **Port Check**: 8081 available, Metro listening properly
- **Network**: Mac IP is 192.168.0.83 (stable during test)

### 11. ✅ ROOT CAUSE FOUND - PROBLEM SOLVED!
- **Theory**: Expo Go on emulator is corrupted/outdated and not sending bundle requests
- **Evidence**:
  - Metro receives connectivity checks but never receives bundle download request
  - Fresh Expo project has same issue (rules out project config)
  - Metro is functioning (responds to `/status` endpoint)
- **Solution**: Uninstall and reinstall Expo Go on emulator
- **Commands**:
  ```bash
  adb uninstall host.exp.exponent
  # Then in Expo terminal, press 'a' to reinstall and launch
  ```
- **Result**: ✅ **SUCCESS!** Metro bundled in 4.3 seconds: "Android Bundled 4377ms index.ts (686 modules)"
- **Status**: ✅ **SOLVED** - Expo Go was the problem, not Metro or project config

## Key Differences in Current Attempt
1. **Correct Node version** (20.19.5) - previous attempts were on Node 18
2. **Correct React versions** - matched to Expo SDK 53 requirements
3. **All caches cleared** - removes any stale bundler cache
4. **metro.config.js removed** - eliminates potential config issues

## What We're Testing
Can Metro successfully compile a minimal App.tsx (just View + Text, no Firebase imports) with:
- Clean caches
- Correct Node version
- Correct package versions
- No custom Metro config

## Expected Behavior
When running `npx expo start --clear` and pressing 'r' to reload:
- Expo terminal should show: "Building JavaScript bundle..."
- Should show progress (file count, compilation time)
- Should complete within 5-10 seconds
- App should show blue screen with "Hello Artis Sales!" text

## If This Fails
Next steps to investigate:
1. Check if specific import is causing hang (test with absolutely empty App.tsx)
2. Check for global Node/npm config issues
3. Try creating fresh Expo project to verify toolchain works
4. Check for macOS firewall/security blocking Metro
5. Try running Metro standalone: `npx metro --config metro.config.js`

## Diagnostic Commands

### Check Metro is running
```bash
curl -I http://localhost:8081/status
```

### Try to fetch bundle (should complete in ~5-10s)
```bash
timeout 15 curl "http://localhost:8081/index.bundle?platform=android&dev=true" | head -c 100
```

### Check Android logs for errors
```bash
adb logcat -d | grep -E "(ReactNative|Metro|Bundle|Error)" | tail -50
```

### Check what's on port 8081
```bash
lsof -i :8081
```

## Firebase Context (For Later)
Our app uses React Native Firebase which has known issues with Expo SDK 53:
- Metro's package.json exports feature conflicts with Firebase
- Workaround: `unstable_enablePackageExports = false` in metro.config.js
- Reference: https://github.com/invertase/react-native-firebase/issues/7701

**Note:** We simplified App.tsx to NOT use Firebase for initial testing, so this shouldn't affect current attempt.

## Lessons Learned

1. **Always check Android logcat** - The app logs showed the exact URL it was trying to reach, revealing the IP mismatch immediately
2. **Node version matters critically** - Metro 0.83.1 requires Node >= 20.19.4, will silently fail on Node 18
3. **Package versions must match** - React/RN versions must exactly match Expo SDK requirements
4. **Network IPs change** - Don't rely on hardcoded IPs; use localhost + adb reverse for emulators
5. **"Metro hangs" is misleading** - Metro wasn't hanging; it simply never received requests because app couldn't connect
6. **Systematic debugging beats guessing** - Should have checked logcat earlier instead of trying random fixes

## Key Mistakes to Avoid

- ❌ Don't assume Metro is the problem when app shows white screen
- ❌ Don't try multiple network configurations without checking what app is actually requesting
- ❌ Don't use IP addresses for emulator development (use localhost + adb reverse)
- ❌ Don't skip checking Node version compatibility with Metro
- ✅ DO check Android logcat first for connection errors
- ✅ DO verify app can reach Metro before debugging Metro itself
- ✅ DO use adb reverse for stable localhost connection

---

## Final Resolution & Testing

### Main App Restored ✅
- **Date**: 2025-10-09 14:15 UTC
- **Action**: Restored full app from simplified test version
- **File**: Changed `App.tsx` from simple "Hello Artis Sales!" to full `<RootNavigator />` with:
  - Phone authentication flow (LoginScreen → OTPScreen)
  - Firebase integration with useAuth hook
  - Home screen after successful login
- **Result**: Metro hot-reloaded successfully in 42ms, full navigation structure working
- **Bundle time**: 1672ms for full app (683 modules)

### Next Issue: Test Phone Numbers
- **Problem**: Firebase test phone number (+919876543210 with code 123456) not working
- **Status**: Investigating authentication flow
- **Note**: Firebase deprecation warnings appearing but not blocking functionality

---

**Last Updated:** 2025-10-09 14:15 UTC
**Status:** ✅ SOLVED - App fully functional, investigating test phone auth next
