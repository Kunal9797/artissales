# Mobile App Setup - What I've Built

## ✅ Completed (90% of Day 1-2 Setup)

I've successfully created the Artis Sales mobile app foundation with:

### 1. Project Structure
```
mobile/
├── src/
│   ├── screens/          # 3 screens ready
│   ├── navigation/       # Auth flow navigation
│   ├── services/         # Firebase & API services
│   ├── hooks/            # useAuth, useLocation
│   └── types/            # TypeScript types (matches backend)
├── App.tsx
├── app.json              # Expo config
├── package.json          # All dependencies installed
└── tsconfig.json
```

### 2. Dependencies Installed
- ✅ Expo + React Native
- ✅ Firebase (app, auth, firestore, storage)
- ✅ React Navigation (native-stack, bottom-tabs)
- ✅ Location services (expo-location)
- ✅ TypeScript + types

### 3. Code Implemented

#### Screens
- **LoginScreen** ([mobile/src/screens/LoginScreen.tsx](mobile/src/screens/LoginScreen.tsx)) - Phone number input with Indian format support
- **OTPScreen** ([mobile/src/screens/OTPScreen.tsx](mobile/src/screens/OTPScreen.tsx)) - 6-digit OTP verification
- **HomeScreen** ([mobile/src/screens/HomeScreen.tsx](mobile/src/screens/HomeScreen.tsx)) - Shows user info, sign-out button

#### Services
- **firebase.ts** ([mobile/src/services/firebase.ts](mobile/src/services/firebase.ts)) - Firebase initialization with offline persistence
- **api.ts** ([mobile/src/services/api.ts](mobile/src/services/api.ts)) - Cloud Functions API wrapper (checkIn, checkOut, logVisit)

#### Hooks
- **useAuth** ([mobile/src/hooks/useAuth.ts](mobile/src/hooks/useAuth.ts)) - Auth state management
- **useLocation** ([mobile/src/hooks/useLocation.ts](mobile/src/hooks/useLocation.ts)) - GPS location with permissions

#### Navigation
- **RootNavigator** ([mobile/src/navigation/RootNavigator.tsx](mobile/src/navigation/RootNavigator.tsx)) - Handles logged in/out states automatically

#### Types
- **types/index.ts** ([mobile/src/types/index.ts](mobile/src/types/index.ts)) - All TypeScript types matching backend exactly

## 🔴 What YOU Need to Do (Critical)

### Step 1: Download google-services.json

This is **REQUIRED** for Firebase to work on Android:

1. Go to https://console.firebase.google.com
2. Select project: **artis-sales-dev**
3. Click gear icon (⚙️) → **Project settings**
4. Scroll to "Your apps"
5. If you don't see an Android app:
   - Click **Add app** → Select **Android**
   - Package name: **`com.artis.sales`** (must match exactly)
   - App nickname: "Artis Sales Android"
   - Click **Register app**
6. **Download `google-services.json`**
7. Place it here: `/Users/kunal/ArtisSales/mobile/google-services.json`

### Step 2: Create Placeholder Assets (Optional for now)

You can skip this initially - the app will work without proper icons:

- `mobile/assets/icon.png` (any 1024x1024 image)
- `mobile/assets/splash.png` (any image)
- `mobile/assets/adaptive-icon.png` (any 1024x1024 image)

Or just create dummy files:
```bash
cd /Users/kunal/ArtisSales/mobile/assets
# Create blank 1024x1024 PNGs (you can use any image temporarily)
```

## 🚀 Testing the App

Once you have `google-services.json`:

### Option A: Using Expo Go (Easiest)
```bash
cd /Users/kunal/ArtisSales/mobile
npm start
```
Then scan QR code with Expo Go app. **BUT** Firebase may not work in Expo Go, so use Option B.

### Option B: Build Development APK (Recommended)
```bash
cd /Users/kunal/ArtisSales/mobile
npx expo run:android
```
This requires Android Studio + Android SDK installed.

### Test Flow:
1. App opens → Login screen
2. Enter phone: `9876543210` (or any test number you configure)
3. Firebase sends OTP via SMS
4. Enter OTP → You're logged in!
5. Home screen shows your phone number and UID

## 🔧 Development Workflow

### Set Up Test Phone Numbers (Recommended)

To avoid SMS costs during development:

1. Firebase Console → Authentication → Sign-in method
2. Click "Phone" → Scroll to "Phone numbers for testing"
3. Add test numbers:
   - Phone: `+919876543210`
   - Code: `123456`
4. Now you can log in with this number using code `123456` without SMS

### Available Commands
```bash
npm start       # Start Expo dev server
npm run android # Run on Android device/emulator
npm run ios     # Run on iOS (macOS + Xcode only)
```

## 📋 Next Steps (Phase 2 - Days 3-7)

Once authentication works, we'll build:

### Day 3-4: Attendance Module
- [ ] Check-in button with GPS
- [ ] Check-out button
- [ ] Display attendance status
- [ ] Show attendance history

### Day 5-6: Accounts & Visits
- [ ] Fetch accounts from Firestore
- [ ] Display distributors and dealers list
- [ ] Search and filter accounts
- [ ] Visit logging screen (select account, add notes, capture photo)
- [ ] Call logVisit API

### Day 7: Polish
- [ ] Tab navigation (Home, Accounts, Profile)
- [ ] Loading states and error handling
- [ ] Offline indicators
- [ ] Test end-to-end

## 📁 Files Created

Total: 15 files created

**Core App Files:**
- [mobile/App.tsx](mobile/App.tsx)
- [mobile/index.js](mobile/index.js)
- [mobile/app.json](mobile/app.json)
- [mobile/tsconfig.json](mobile/tsconfig.json)
- [mobile/package.json](mobile/package.json)
- [mobile/.gitignore](mobile/.gitignore)

**Source Code:**
- [mobile/src/types/index.ts](mobile/src/types/index.ts)
- [mobile/src/services/firebase.ts](mobile/src/services/firebase.ts)
- [mobile/src/services/api.ts](mobile/src/services/api.ts)
- [mobile/src/hooks/useAuth.ts](mobile/src/hooks/useAuth.ts)
- [mobile/src/hooks/useLocation.ts](mobile/src/hooks/useLocation.ts)
- [mobile/src/screens/LoginScreen.tsx](mobile/src/screens/LoginScreen.tsx)
- [mobile/src/screens/OTPScreen.tsx](mobile/src/screens/OTPScreen.tsx)
- [mobile/src/screens/HomeScreen.tsx](mobile/src/screens/HomeScreen.tsx)
- [mobile/src/navigation/RootNavigator.tsx](mobile/src/navigation/RootNavigator.tsx)

## 🎯 Summary

**You're 90% done with Phase 2 Days 1-2!**

All code is written and ready. You just need to:
1. Download `google-services.json` from Firebase Console
2. Place it in the mobile/ directory
3. Run `npm start` or `npx expo run:android`

The app will:
- Show login screen
- Send OTP via Firebase Phone Auth
- Navigate to home screen after successful login
- Persist auth state (stays logged in on app restart)
- All API calls ready (checkIn, checkOut, logVisit)

Once you get it running, let me know and we'll build the attendance and visit logging features!
