# Fix Firebase Phone Auth - SHA-256 Fingerprint Issue

## The Problem
Firebase is rejecting phone authentication with error:
```
[auth/app-not-authorized] This app is not authorized to use Firebase Authentication
```

**Root cause:** Your app's SHA-256 signing certificate fingerprint is not registered in Firebase Console.

---

## 🎯 Solution: Add SHA-256 to Firebase Console

You need to get your app's SHA-256 fingerprint and add it to Firebase. There are **3 ways** to do this:

---

## Method 1: Get SHA from Google Play Console (RECOMMENDED)

Since you're uploading to Google Play, use the Play Console's signing certificate:

### Steps:

1. **Open Google Play Console:**
   - Go to: https://play.google.com/console
   - Select "Artis Sales" app

2. **Navigate to App Signing:**
   - Left menu → Release → Setup → **App integrity**
   - Look for "App signing" section

3. **Copy SHA-256 fingerprint:**
   - You'll see "App signing key certificate"
   - Copy the **SHA-256 certificate fingerprint**
   - Format looks like: `AA:BB:CC:DD:EE:FF:...` (20 pairs of hex digits)

4. **Add to Firebase Console:**
   - Go to: https://console.firebase.google.com/project/artis-sales-dev/settings/general
   - Scroll to "Your apps" section
   - Click on Android app icon (com.artis.sales)
   - Scroll to "SHA certificate fingerprints"
   - Click "Add fingerprint"
   - Paste the SHA-256 from Play Console
   - Click "Save"

5. **Download new google-services.json:**
   - After adding fingerprint, click "Download google-services.json"
   - Replace file at: `/Users/kunal/ArtisSales/mobile/google-services.json`
   - Commit the change to git

6. **Rebuild app:**
   ```bash
   cd /Users/kunal/ArtisSales/mobile
   eas build --platform android --profile production
   ```

---

## Method 2: Get SHA from Expo Dashboard

1. **Open Expo credentials page:**
   - Go to: https://expo.dev/accounts/kunalgpt/projects/artis-sales/credentials/android
   - Click on "com.artis.sales" application identifier
   - Look for "Keystore" section
   - Copy **SHA-256 Fingerprint**

2. **Add to Firebase** (same as Method 1, step 4-6)

---

## Method 3: Get SHA from Local Keystore (if you have it)

If you downloaded the keystore from Expo:

```bash
# Download keystore from Expo first
cd /Users/kunal/ArtisSales/mobile
eas credentials

# Then extract SHA-256
keytool -list -v -keystore ./your-keystore.jks -alias your-alias -storepass your-password | grep "SHA256"
```

---

## ✅ How to Verify It's Fixed

After adding SHA-256 to Firebase:

1. Download the new `google-services.json` from Firebase Console
2. Replace your current file at `/Users/kunal/ArtisSales/mobile/google-services.json`
3. Rebuild and reinstall the app
4. Try phone authentication again - the error should be gone!

---

## 📝 Important Notes

### For Testing (Before Play Store):
- **Problem:** EAS builds use a different signing key than Play Store
- **Solution:** Add BOTH SHA-256 fingerprints to Firebase:
  1. EAS build keystore SHA (for testing APKs)
  2. Play Console app signing SHA (for production Play Store downloads)

### After Play Store Upload:
- Google Play re-signs your app with their own key
- Users downloading from Play Store will use Play Console's SHA-256
- Direct APK installs (for testing) will use EAS keystore SHA-256

### Firebase Test Phone Numbers:
Even with correct SHA-256, you still need to add test numbers to Firebase:
1. Go to: https://console.firebase.google.com/project/artis-sales-dev/authentication/providers
2. Click "Phone" provider
3. Scroll to "Phone numbers for testing"
4. Add:
   - `+919876543210` → OTP: `123456` (Sales Rep test account)
   - `+919876543211` → OTP: `654321` (Manager test account)

---

## 🐛 Troubleshooting

### Error still appears after adding SHA?
1. Verify you downloaded the NEW `google-services.json` after adding SHA
2. Rebuild the app completely (don't just refresh)
3. Uninstall old app from device before installing new build
4. Check Firebase Console shows the SHA-256 under your Android app

### Multiple apps/variants?
If you have debug/release/production variants, each may have different signing keys.
Add SHA-256 for each variant to Firebase.

### Can't find SHA-256 in Play Console?
You need to upload at least one release (internal test track is fine) before Play Console generates signing keys.

---

**Last Updated:** 2025-11-02
**Status:** Waiting for SHA-256 to be added to Firebase Console
