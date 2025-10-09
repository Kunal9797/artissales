# Artis Sales Mobile App

React Native mobile app built with Expo for Artis Laminates sales team tracking.

## Setup Status

### ✅ Completed
- [x] Expo project initialized with TypeScript
- [x] Folder structure created (src/screens, src/components, src/services, src/hooks, src/navigation, src/types)
- [x] Dependencies installed:
  - Firebase (@react-native-firebase/app, auth, firestore, storage)
  - React Navigation (native, native-stack, bottom-tabs)
  - Location services (expo-location)
- [x] TypeScript types created (matching backend)
- [x] Firebase service layer created
- [x] Auth screens implemented (LoginScreen, OTPScreen)
- [x] Home screen implemented
- [x] Navigation structure created (RootNavigator with auth flow)
- [x] Custom hooks created (useAuth, useLocation)
- [x] API service layer created (for Cloud Functions)

### 🔴 Required - Firebase Configuration

**You need to download `google-services.json` from Firebase Console:**

1. Go to https://console.firebase.google.com
2. Select project: **artis-sales-dev**
3. Click gear icon → Project settings
4. Scroll down to "Your apps" section
5. Click "Add app" → Select Android (if not already added)
6. Package name: `com.artis.sales`
7. Download `google-services.json`
8. Place it at: `/Users/kunal/ArtisSales/mobile/google-services.json`

### 📱 Asset Files Needed

The following placeholder assets need to be created (or you can use temporary ones to start):

- `assets/icon.png` (1024x1024)
- `assets/splash.png` (1284x2778 for best results)
- `assets/adaptive-icon.png` (1024x1024 with transparency)

You can create simple placeholders or download free ones temporarily.

## Running the App

### Start Development Server
```bash
cd mobile
npm start
```

### Run on Android (requires Android Studio setup)
```bash
npm run android
```

### Run on iOS (requires Xcode, macOS only)
```bash
npm run ios
```

## Testing Authentication

Once the app is running:

1. Enter a phone number (10 digits for Indian number, e.g., 9876543210)
2. Firebase will send an OTP via SMS
3. Enter the 6-digit OTP code
4. You'll be signed in and see the home screen

**Note:** For testing, you may need to add test phone numbers in Firebase Console:
- Go to Authentication → Sign-in method → Phone
- Scroll to "Phone numbers for testing"
- Add test numbers with fixed OTP codes for development

## Project Structure

```
mobile/
├── src/
│   ├── screens/          # UI screens
│   │   ├── LoginScreen.tsx
│   │   ├── OTPScreen.tsx
│   │   └── HomeScreen.tsx
│   ├── navigation/       # Navigation setup
│   │   └── RootNavigator.tsx
│   ├── services/         # Business logic
│   │   ├── firebase.ts   # Firebase initialization
│   │   └── api.ts        # Cloud Functions API calls
│   ├── hooks/            # Custom React hooks
│   │   ├── useAuth.ts    # Authentication state
│   │   └── useLocation.ts # GPS location
│   ├── types/            # TypeScript types
│   │   └── index.ts      # Shared types with backend
│   ├── components/       # Reusable UI components (empty for now)
│   └── utils/            # Utility functions (empty for now)
├── App.tsx               # Root component
├── app.json              # Expo configuration
├── package.json          # Dependencies
└── tsconfig.json         # TypeScript configuration
```

## Next Steps (Phase 2 - Day 3-7)

Once authentication is working:

1. **Attendance Module**
   - Add check-in button (calls API with GPS location)
   - Add check-out button
   - Display current attendance status
   - Show attendance history

2. **Accounts Module**
   - Fetch accounts list from Firestore
   - Display distributors and dealers
   - Implement search and filtering
   - Show visit history per account

3. **Visit Logging**
   - Select account from list
   - Capture current location
   - Add visit purpose dropdown
   - Add notes field
   - Add photo capture
   - Call logVisit API

4. **Tab Navigation**
   - Home tab
   - Accounts tab
   - Profile tab

## API Endpoints

The app connects to these Cloud Functions:

- `checkIn` - https://us-central1-artis-sales-dev.cloudfunctions.net/checkIn
- `checkOut` - https://us-central1-artis-sales-dev.cloudfunctions.net/checkOut
- `logVisit` - https://us-central1-artis-sales-dev.cloudfunctions.net/logVisit

## Troubleshooting

### Firebase Auth Not Working
- Make sure `google-services.json` is in the mobile/ directory
- Rebuild the app: `npx expo prebuild --clean` then `npm run android`

### Location Permission Denied
- On Android: Go to Settings → Apps → Artis Sales → Permissions → Location → Allow

### TypeScript Errors
- Run `npm install` to ensure all types are installed
- Check tsconfig.json is properly configured

## Support

For issues or questions, refer to:
- Firebase docs: https://rnfirebase.io/
- Expo docs: https://docs.expo.dev/
- React Navigation docs: https://reactnavigation.org/
