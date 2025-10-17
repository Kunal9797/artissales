# ARCHIVED - DUPLICATE

**Date Archived**: 2025-10-17
**Reason**: Problem already solved in [METRO_TROUBLESHOOTING.md](../development/METRO_TROUBLESHOOTING.md) on Oct 9. This doc created Oct 15 for same issue.

---

# Metro Bundler Hang Troubleshooting - Oct 15, 2025

## Problem Summary
Metro bundler starts but hangs at "Waiting on http://localhost:8081" indefinitely. Never progresses to building the JavaScript bundle. App shows white screen on Android emulator.

## Key Findings

### What We Discovered
1. **Metro status endpoint works** - `curl http://localhost:8081/status` returns "packager-status:running"
2. **Bundle request hangs** - `curl http://localhost:8081/index.bundle?platform=android` times out
3. **Metro initializes but can't build bundles** - Port 8081 is listening, connections established, but bundle compilation hangs
4. **Document screens are NOT the cause** - Problem persists even after `git stash` removed all recent changes
5. **Package version warnings persist** - Even after fixing versions, Metro still complains about @shopify/flash-list and react-native-svg
6. **No error messages** - Metro hangs silently without any helpful logs

### Symptoms
- Metro output stuck at: "Waiting on http://localhost:8081"
- No "Metro Bundler ready" message
- No bundle build logs
- Emulator connects but shows white screen
- Android logcat shows: "Could not connect to development server" initially, then connects but can't load bundle

## Timeline of Troubleshooting

### 1. Initial Hypothesis - Import/Export Mismatch
**Theory:** Document screens used named exports but RootNavigator used default imports.

**Action Taken:**
```bash
# Changed in RootNavigator.tsx
# From: import DocumentLibraryScreen from '../screens/DocumentLibraryScreen'
# To: import { DocumentLibraryScreen } from '../screens/DocumentLibraryScreen'
```

**Result:** ❌ Didn't fix the issue (but was a valid bug fix)

---

### 2. Test Without New Code
**Theory:** Document screens or recent changes causing the hang.

**Action Taken:**
```bash
cd /Users/kunal/ArtisSales
git stash  # Saved as: WIP on main: 3f7df1e
cd mobile
npx expo start --clear
```

**Result:** ❌ Metro still hangs - **Document screens are NOT the cause**

---

### 3. Watchman File Watching Issue
**Theory:** Watchman getting stuck watching files.

**Action Taken:**
```bash
watchman shutdown-server
REACT_NATIVE_PACKAGER_SKIP_WATCH=true npx expo start --clear
```

**Result:** ❌ Still hangs

---

### 4. Package Version Conflicts
**Theory:** Version mismatches between installed packages and Expo expectations.

**Warnings:**
```
@shopify/flash-list@2.1.0 - expected version: 2.0.2
react-native-svg@15.14.0 - expected version: 15.12.1
```

**Action Taken:**
```bash
npx expo install @shopify/flash-list@2.0.2 react-native-svg@15.12.1
rm -rf .expo node_modules/.cache
watchman shutdown-server
npx expo start --clear
```

**Result:** ❌ Still hangs, versions fixed in package.json but Metro still complains

---

### 5. Nuclear Reinstall
**Theory:** Corrupted node_modules or caches.

**Action Taken:**
```bash
cd mobile
pkill -f "expo start"
rm -rf node_modules package-lock.json .expo
npm cache clean --force
watchman shutdown-server
npm install
npx expo start --clear
```

**Result:** ❌ Still hangs after complete reinstall

---

## Current State Before Restart

### Package Versions (Verified in package.json)
```json
{
  "@shopify/flash-list": "2.0.2",
  "react-native-svg": "15.12.1",
  "expo": "^54.0.13",
  "react": "^19.1.0",
  "react-native": "^0.81.4"
}
```

### Git Stash
Changes stashed with:
```bash
git stash
# Output: Saved working directory and index state WIP on main: 3f7df1e
```

**Stashed changes include:**
- DocumentLibraryScreen.tsx
- UploadDocumentScreen.tsx
- API methods for documents
- Types for Document interface
- Cloud Functions for document management

**To restore after restart:**
```bash
cd /Users/kunal/ArtisSales
git stash list  # Verify stash exists
git stash pop   # Restore changes
```

### Environment Info
- **Node:** v20.19.5
- **npm:** 10.8.2
- **Watchman:** 2025.03.10.00
- **Expo CLI:** 54.0.11
- **Platform:** macOS (Darwin 25.0.0)
- **Emulator:** Android Pixel emulator

---

## Next Steps After Restart

### 1. Test Metro After Restart
```bash
cd /Users/kunal/ArtisSales/mobile
npx expo start --clear
```

**Expected:** Metro should progress past "Waiting on http://localhost:8081" and show "Metro Bundler ready"

---

### 2. If Metro STILL Hangs After Restart

#### Check for Global Issues

**A. Check global Expo cache:**
```bash
rm -rf ~/.expo
npx expo start --clear
```

**B. Check npm global cache:**
```bash
npm cache verify
npm cache clean --force
```

**C. Check for port conflicts:**
```bash
lsof -i :8081
lsof -i :8082
lsof -i :19000
lsof -i :19001
```

**D. Try different port:**
```bash
npx expo start --clear --port 8090
```

**E. Check firewall/antivirus:**
- Temporarily disable firewall
- Check if antivirus is blocking Node.js

#### Check Metro Configuration

**F. Create custom metro.config.js to enable verbose logging:**
```javascript
// mobile/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer = {
  ...config.transformer,
  minifierPath: require.resolve('metro-minify-terser'),
  minifierConfig: {
    // Metro options
  }
};

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      console.log(`[Metro] ${req.method} ${req.url}`);
      return middleware(req, res, next);
    };
  }
};

module.exports = config;
```

**G. Try with React Native CLI directly (bypass Expo):**
```bash
cd android
./gradlew clean
cd ..
npx react-native start --reset-cache
# In another terminal:
npx react-native run-android
```

#### Check for Code Issues

**H. Check for circular dependencies:**
```bash
cd mobile
npx madge --circular --extensions ts,tsx src/
```

**I. Run TypeScript check:**
```bash
npx tsc --noEmit | head -50
```

**J. Test with minimal app:**
```bash
# Temporarily rename src to src.bak
mv src src.bak
mkdir src
echo "import { Text, View } from 'react-native'; export default function App() { return <View><Text>Test</Text></View>; }" > src/App.tsx
npx expo start --clear
# If works, issue is in src.bak code
mv src.bak src
```

---

### 3. If Metro Works After Restart

**Restore stashed changes:**
```bash
cd /Users/kunal/ArtisSales
git stash pop
cd mobile
npx expo start --clear
```

**If it breaks again after restore:**
- The Document screens have a specific issue
- Check DocumentLibraryScreen.tsx and UploadDocumentScreen.tsx for:
  - Circular imports
  - Large file size
  - Syntax errors
  - Heavy computations at module level

---

## Diagnostic Commands Reference

### Check Metro Status
```bash
# Check if Metro is responding
curl http://localhost:8081/status

# Try to get bundle (will hang if issue persists)
curl --max-time 10 http://localhost:8081/index.bundle?platform=android

# Check Metro process
ps aux | grep "expo start" | grep -v grep
lsof -i :8081
```

### Check Android Connection
```bash
# Check Android logs
~/Library/Android/sdk/platform-tools/adb logcat | grep -i "metro\|bundle\|react"

# Check if emulator can reach Metro
~/Library/Android/sdk/platform-tools/adb shell ping -c 3 10.0.2.2
```

### Clean Everything
```bash
cd mobile

# Kill Metro
pkill -f "expo start"

# Clean all caches
rm -rf .expo
rm -rf node_modules/.cache
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/react-*
rm -rf ~/.expo
watchman shutdown-server
npm cache clean --force

# Reinstall
rm -rf node_modules package-lock.json
npm install

# Start fresh
npx expo start --clear
```

---

## Known Issues & Workarounds

### Issue: Metro hangs during cache rebuild
**Symptoms:** Stuck at "Bundler cache is empty, rebuilding (this may take a minute)"
**Workaround:** Restart computer, clear global caches

### Issue: Package version warnings persist
**Symptoms:** Metro complains about versions even after fixing
**Cause:** package-lock.json or node_modules contains old versions
**Workaround:** Complete node_modules reinstall

### Issue: Metro status=running but bundle hangs
**Symptoms:** `/status` returns 200 but bundle request times out
**Cause:** Metro initialized but transformer/resolver is stuck
**Workaround:** Check for circular dependencies, heavy module-level code

---

## Related Documentation

- [METRO_TROUBLESHOOTING.md](./METRO_TROUBLESHOOTING.md) - General Metro issues
- [CLAUDE.md](../CLAUDE.md) - Project context for AI agents
- [PROGRESS.md](../../PROGRESS.md) - Project progress tracker

---

## Summary

Metro bundler initialization hang is a **system-level issue**, not a code issue. The problem persists across:
- Multiple cache clears
- Complete reinstalls
- Code removal (git stash)
- Watchman disabled
- Package version fixes

**Most likely cause:** OS-level stuck process or cached state.

**Recommended action:** Restart Mac, then test Metro. If still fails, investigate global npm/Expo caches and firewall settings.

---

**Created:** October 15, 2025
**Last Updated:** October 15, 2025
**Status:** Awaiting Mac restart
