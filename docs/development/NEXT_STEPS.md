# 🎯 What to Do Next

## Critical Step: Get google-services.json

### Why You Need This
Firebase requires `google-services.json` to connect your Android app to the Firebase project. Without it, authentication won't work.

### How to Get It (5 minutes)

1. **Open Firebase Console**
   - Go to: https://console.firebase.google.com
   - Make sure you're signed in as: kunalg9797@gmail.com

2. **Select Your Project**
   - Click on: **artis-sales-dev**

3. **Open Project Settings**
   - Click the gear icon (⚙️) at the top left
   - Click **Project settings**

4. **Add Android App (if not already added)**
   - Scroll down to "Your apps" section
   - If you see an Android app already, skip to step 5
   - If not, click **Add app** → Select the **Android** icon
   - Enter package name: **`com.artis.sales`** (must match exactly!)
   - App nickname: **Artis Sales** (optional)
   - Click **Register app**

5. **Download google-services.json**
   - You'll see a button to download `google-services.json`
   - If you already had an Android app, click on it and download from there
   - Save the file

6. **Place the File**
   - Move `google-services.json` to: **`/Users/kunal/ArtisSales/mobile/`**
   - It should be in the same directory as `package.json`

### Verify
```bash
ls /Users/kunal/ArtisSales/mobile/google-services.json
```
If it exists, you're good to go! ✅

---

## Then Test the App

### Option 1: Quick Test with Expo Go (May Not Work with Firebase)
```bash
cd /Users/kunal/ArtisSales/mobile
npm start
```
- Scan QR code with Expo Go app on your phone
- **Note**: Firebase Auth might not work in Expo Go

### Option 2: Build and Install APK (Recommended)

**Requirements:**
- Android Studio installed
- Android SDK configured
- USB debugging enabled on Android device OR Android emulator running

```bash
cd /Users/kunal/ArtisSales/mobile
npx expo run:android
```

This will:
1. Generate native Android project
2. Build APK with Firebase included
3. Install on connected device/emulator
4. Launch the app

---

## Testing Authentication

### Add Test Phone Number (Avoid SMS Costs)

1. Go to Firebase Console → **Authentication**
2. Click **Sign-in method** tab
3. Click on **Phone** provider
4. Scroll down to **"Phone numbers for testing"**
5. Click **Add phone number**
6. Add:
   - Phone number: **+919876543210** (or any Indian number)
   - Test code: **123456**
7. Click **Add**

Now you can log in with:
- Phone: `9876543210`
- OTP: `123456` (no SMS needed!)

### Test Flow

1. **App launches** → See login screen
2. **Enter phone**: `9876543210`
3. **Click "Send Verification Code"**
4. **Enter OTP**: `123456`
5. **Success!** → See home screen with your user info

---

## If You Get Stuck

### Firebase Not Connecting
- Make sure `google-services.json` is in `/Users/kunal/ArtisSales/mobile/`
- Delete build cache: `npx expo prebuild --clean`
- Rebuild: `npx expo run:android`

### Can't Build Android
You might need to:
1. Install Android Studio
2. Set up Android SDK
3. Accept Android licenses: `flutter doctor --android-licenses` or use Android Studio's SDK Manager

### Location Permission Issues
- Android will prompt for location permission
- Make sure to allow it for attendance and visit features

---

## What Happens After Auth Works?

Once you can successfully log in, we'll build:

### Week 2 Remaining Tasks:
1. **Attendance Module**
   - Check-in button
   - Check-out button
   - View today's status

2. **Accounts List**
   - Fetch from Firestore
   - Display distributors & dealers
   - Search functionality

3. **Visit Logging**
   - Select account
   - Capture location
   - Add notes
   - Take photos
   - Submit to API

---

## Quick Reference

### Project Location
```
/Users/kunal/ArtisSales/mobile/
```

### Key Files
- `App.tsx` - Entry point
- `src/navigation/RootNavigator.tsx` - Navigation
- `src/screens/LoginScreen.tsx` - Login UI
- `src/services/firebase.ts` - Firebase setup
- `src/services/api.ts` - API calls

### Useful Commands
```bash
# Start dev server
npm start

# Build for Android
npx expo run:android

# Clear cache and rebuild
npx expo prebuild --clean

# Install new package
npm install <package-name>
```

---

**You're almost there! Just get that `google-services.json` file and you'll have a working app!** 🚀
