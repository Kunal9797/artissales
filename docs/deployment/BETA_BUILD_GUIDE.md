# Beta Testing Build Guide

**Created**: October 25, 2025
**Purpose**: Generate production APK for beta testing on Android devices
**Distribution**: Internal (you + sales manager)

---

## 🎯 BUILD OVERVIEW

**Build Type**: Production APK (not AAB)
**Profile**: `preview` (for beta testing)
**Distribution**: Download APK and install directly
**Devices**: Your Android phone + sales manager's phone

---

## 📋 PRE-BUILD CHECKLIST

### Configuration Files Updated:
- [x] `eas.json` - Added Android config for preview and production
- [x] `app.json` - Added versionCode: 1
- [x] `.env.production` - Production API URL set

### Verify Settings:
```json
// eas.json - preview profile
"preview": {
  "distribution": "internal",
  "android": {
    "buildType": "apk"  // ✅ APK for easy distribution
  }
}

// app.json
"version": "1.0.0",      // ✅ Display version
"android": {
  "versionCode": 1       // ✅ Build number
}
```

---

## 🚀 BUILD COMMAND

### Option A: Cloud Build (Recommended)
**Pros**: No local setup needed, reliable, fast
**Cons**: Requires Expo account

```bash
cd /Users/kunal/ArtisSales/mobile
eas build --platform android --profile preview
```

**Build Time**: ~15-20 minutes in cloud
**Result**: Downloadable APK link

### Option B: Local Build (Faster)
**Pros**: Faster iteration, no cloud wait
**Cons**: Requires Android SDK

```bash
cd /Users/kunal/ArtisSales/mobile
eas build --platform android --profile preview --local
```

**Build Time**: ~5-10 minutes locally
**Result**: APK file in current directory

---

## 📱 STEP-BY-STEP: Cloud Build (Recommended for First Build)

### Step 1: Ensure EAS CLI is Installed
```bash
npm install -g eas-cli
```

### Step 2: Login to Expo (if not already)
```bash
eas login
```

### Step 3: Configure Project (First time only)
```bash
cd /Users/kunal/ArtisSales/mobile
eas build:configure
```
- Select: Android
- Confirm settings

### Step 4: Start the Build
```bash
eas build --platform android --profile preview
```

**What Happens**:
1. EAS uploads your code to cloud
2. Cloud builds the APK (~15 min)
3. You get a download link
4. Download APK to your computer

### Step 5: Distribute APK

**To Your Phone**:
1. Download APK to computer
2. Transfer to phone via:
   - USB cable
   - Google Drive
   - Email attachment
   - AirDrop (if Mac)
3. On phone: Tap APK file
4. Allow "Install from unknown sources"
5. Install

**To Sales Manager's Phone**:
1. Share APK link from EAS
2. Or send APK file directly
3. They install same way

---

## ⚡ QUICK START: Preview Build Now

**If you want to build right now**, run:

```bash
cd /Users/kunal/ArtisSales/mobile
eas build --platform android --profile preview
```

**During build you'll see**:
- ✅ Checking project configuration
- ✅ Uploading to Expo
- ✅ Starting Android build
- ⏳ Building... (15 min wait)
- ✅ Build successful!
- 📥 Download link provided

---

## 🔧 TROUBLESHOOTING

### "EAS CLI not found"
```bash
npm install -g eas-cli
```

### "Not logged in"
```bash
eas login
# Enter your Expo account credentials
```

### "No Expo account"
1. Go to https://expo.dev
2. Sign up (free account)
3. Return and run `eas login`

### "Build failed"
- Check error message
- Most common: Missing google-services.json
- Fix: Ensure file exists in `/mobile/`

---

## 📦 WHAT GETS BUILT

### Included in APK:
- ✅ All October 25 optimizations
- ✅ Photo validation active
- ✅ Optimistic updates
- ✅ Console logs cleaned (dev-only)
- ✅ "Artis 1MM" catalog
- ✅ All security fixes
- ✅ Production API URL (from .env.production)

### Build Configuration:
- **Environment**: Production
- **API**: https://us-central1-artis-sales-dev.cloudfunctions.net
- **Minified**: Yes
- **Obfuscated**: Yes
- **Debug logs**: Disabled (logger only shows in __DEV__)

---

## 🧪 BETA TESTING DISTRIBUTION

### **For You (Tester #1)**:
1. Install APK on your Android phone
2. Test all features
3. Report bugs

### **For Sales Manager (Tester #2)**:
1. Send APK or share download link
2. They install on their phone
3. Ask them to:
   - Use it for 1-2 days in field
   - Log real visits
   - Submit real sheets/expenses
   - Report any issues

### **Beta Test Duration**:
- Minimum: 2-3 days
- Ideal: 1 week
- Goal: Real-world validation

---

## 📋 BETA TESTER INSTRUCTIONS

**Create a simple guide for your sales manager**:

```
# Artis Sales App - Beta Test

Hi! You're testing our new sales tracking app.

## Installation:
1. Download the APK file
2. Tap to install
3. Allow "Unknown sources" if asked
4. Open "Artis Sales" app

## Login:
- Enter your phone number
- Enter OTP you receive
- You're in!

## What to Test:
1. Check-in when you start work
2. Log every visit you make (photo required!)
3. Log sheets sold daily
4. Check-out when done
5. Let us know if anything breaks!

## Report Issues:
- WhatsApp/call Kunal with:
  - What you were doing
  - What went wrong
  - Screenshot if possible

Thanks for helping us test!
```

---

## 🎯 DECISION: Which Build Profile?

### **Preview Profile** (Recommended for Beta)
**Use when**: Internal testing with you + sales manager
**Build type**: APK (easy to distribute)
**Distribution**: Download link or file sharing

```bash
eas build --platform android --profile preview
```

### **Production Profile**
**Use when**: Final build for Play Store
**Build type**: Can be APK or AAB
**Distribution**: Play Store submission

```bash
eas build --platform android --profile production
```

**For beta testing, use PREVIEW profile!**

---

## ⚙️ BUILD OPTIONS

### Standard Build (Cloud):
```bash
cd /Users/kunal/ArtisSales/mobile
eas build --platform android --profile preview
```
- Takes: 15-20 minutes
- Result: Download link
- Cost: Free (30 builds/month on free tier)

### Local Build (Faster):
```bash
eas build --platform android --profile preview --local
```
- Takes: 5-10 minutes
- Result: APK file in current folder
- Requires: Android SDK installed

### Without EAS Account:
```bash
npx expo export
npx expo run:android --variant release
```
- Manual APK generation
- More complex setup

---

## 🎁 AFTER BUILD COMPLETES

### You'll Get:
1. **Download link** (for cloud build)
   - Example: `https://expo.dev/artifacts/eas/...`
   - Valid for 30 days

2. **QR code** (optional)
   - Scan to download on device

3. **Build details page**
   - View logs
   - Download APK
   - See build configuration

### Installation:
1. Download APK (filename: `com.artis.sales-xxx.apk`)
2. Transfer to phone
3. Tap to install
4. Enable "Unknown sources" if prompted
5. Open app and test!

---

## 🔄 VERSIONING STRATEGY

### For Beta Builds:
- Version: 1.0.0 (stays same)
- versionCode: Increment for each build
  - Beta 1: versionCode 1
  - Beta 2: versionCode 2
  - etc.

### For Production:
- Version: 1.0.0 (first launch)
- versionCode: Match build number
- Future updates:
  - Bug fix: 1.0.1
  - Feature: 1.1.0
  - Major: 2.0.0

---

## ✅ READY TO BUILD?

**Run this command now**:

```bash
cd /Users/kunal/ArtisSales/mobile
eas build --platform android --profile preview
```

**What will happen**:
1. EAS will check configuration (1 min)
2. Upload code to cloud (2 min)
3. Build APK in cloud (15 min)
4. Provide download link
5. You download and install!

**Total time: ~20 minutes**

Want me to trigger the build for you? 🚀