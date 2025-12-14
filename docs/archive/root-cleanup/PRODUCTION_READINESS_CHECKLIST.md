# Production Build Readiness Checklist

**Last Updated**: Oct 24, 2025
**Target**: First production build for beta testing on Google Play Console

---

## ✅ Pre-Build Checklist

### 1. **Environment Configuration**
- [x] Production `.env` file configured (`mobile/.env.production`)
- [x] Production API URL points to correct backend
- [ ] Remove all console.log debug statements (optional - can keep for beta)
- [x] Firebase production project credentials in place

### 2. **App Configuration (app.json)**
- [x] App name: "Artis Sales"
- [x] Version: "1.0.0"
- [ ] **Update version before each build** (e.g., 1.0.1, 1.0.2...)
- [x] Bundle identifier: `com.artis.sales`
- [x] Permissions configured (LOCATION, CAMERA)
- [x] Firebase google-services.json in place
- [x] Splash screen and icon configured

### 3. **Code Quality**
- [x] All TypeScript errors resolved
- [x] No unused imports or variables
- [x] Firebase modular API used (no deprecated code)
- [x] Error boundaries in place
- [x] Offline support functional

### 4. **Security**
- [x] Firestore security rules deployed
- [x] Storage security rules deployed
- [x] No API keys or secrets in code
- [x] PII redaction in logs
- [x] Input validation on all forms

### 5. **Backend**
- [x] Cloud Functions deployed to production
- [x] All required functions exist and tested:
  - [x] getTeamStats
  - [x] Authentication functions
  - [x] CRUD operations (visits, expenses, sheets)
- [ ] Test all APIs work with production data
- [ ] Firestore indexes created for all queries

---

## 🏗️ Building for Production

### **Option 1: EAS Build (Recommended for Play Store)**

#### Prerequisites:
1. **Install EAS CLI** (if not already installed):
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**:
   ```bash
   eas login
   ```

3. **Configure EAS Build** (`eas.json` already exists):
   ```json
   {
     "build": {
       "production": {
         "android": {
           "buildType": "apk"  // or "app-bundle" for Play Store
         }
       }
     }
   }
   ```

#### Build Commands:

**For Internal Testing (APK)**:
```bash
cd mobile
eas build --platform android --profile production
```

**For Play Store (AAB)**:
```bash
cd mobile
eas build --platform android --profile production --auto-submit
```

#### What EAS Does:
- ✅ Builds app on Expo's servers (no local Android SDK needed)
- ✅ Handles signing automatically
- ✅ Generates APK or AAB file
- ✅ Can auto-submit to Play Store
- ⏱️ Takes 10-20 minutes

---

### **Option 2: Local Build (For Testing)**

If you want to test locally first:

```bash
cd mobile

# Update version in app.json first
# Then build production APK
npx expo build:android --type apk --release-channel production

# Or build AAB for Play Store
npx expo build:android --type app-bundle --release-channel production
```

---

## 📱 Pre-Release Testing

### **Internal Testing Steps**:
1. **Install on your device**:
   - Download APK from EAS build
   - Install via adb: `adb install app-release.apk`
   - Or share APK link from EAS

2. **Test Critical Flows**:
   - [ ] Login with phone number
   - [ ] Check-in/Check-out with GPS
   - [ ] Log a visit with photo
   - [ ] Submit expense
   - [ ] Log sheets sale
   - [ ] Manager: View team stats
   - [ ] Manager: Review DSRs
   - [ ] View documents
   - [ ] Offline mode works

3. **Test on Multiple Devices**:
   - [ ] Different Android versions (8, 9, 10, 11, 12+)
   - [ ] Different screen sizes
   - [ ] Low-end devices (if possible)

---

## 🚀 Google Play Console Deployment

### **Prerequisites**:
- ✅ Google Play Console account verified
- [ ] App listing information ready:
  - App name
  - Short description (80 chars)
  - Full description (4000 chars)
  - Screenshots (at least 2)
  - Feature graphic (1024x500)
  - App icon (512x512)

### **Steps**:

1. **Create App in Play Console**:
   - Go to Google Play Console
   - Create new app
   - Fill in app details

2. **Upload Build**:
   - Navigate to "Release" → "Testing" → "Internal Testing"
   - Create new release
   - Upload AAB file from EAS build
   - Fill in release notes

3. **Configure Testing Track**:
   - Add testers by email
   - Or create a shareable link for beta testers

4. **Submit for Review**:
   - Complete content rating questionnaire
   - Add privacy policy URL
   - Submit for review

---

## ⚠️ Known Issues / TODOs Before Production

### **Critical (Must Fix)**:
- [ ] None currently

### **Important (Should Fix for Beta)**:
- [ ] Test all Cloud Functions with real data
- [ ] Ensure Firebase indexes are created
- [ ] Test on slow network conditions
- [ ] Verify offline sync works reliably

### **Nice to Have (Can Fix Later)**:
- [ ] Add app update notifications
- [ ] Add analytics tracking
- [ ] Add crash reporting (Crashlytics)
- [ ] Performance monitoring

---

## 🔍 Post-Release Monitoring

### **What to Monitor**:
1. **Firebase Console**:
   - Function invocations
   - Error rates
   - Response times

2. **User Feedback**:
   - Beta tester reports
   - Crash reports
   - Feature requests

3. **Performance**:
   - App startup time
   - Network usage
   - Battery drain

---

## 📋 Build Commands Quick Reference

### **Development Build** (for testing with hot reload):
```bash
cd mobile
npx expo run:android
```

### **Production APK** (for internal testing):
```bash
cd mobile
eas build --platform android --profile production
```

### **Production AAB** (for Play Store):
```bash
cd mobile
eas build --platform android --profile production --auto-submit
```

### **Check Build Status**:
```bash
eas build:list
```

---

## 🎯 Recommended Approach

**For your first beta test, I recommend**:

✅ **YES - Do This**:
1. Build production APK with EAS Build
2. Test internally on 2-3 devices first
3. If stable, create internal testing track on Play Store
4. Invite 5-10 beta testers
5. Gather feedback for 1-2 weeks
6. Fix critical issues
7. Proceed to closed beta (larger group)

❌ **NO - Don't Do This Yet**:
- Don't publish to production immediately
- Don't skip internal testing
- Don't invite too many testers at once

---

## 📝 Version Management

### **Version Numbering**:
- **1.0.0** - Initial release
- **1.0.x** - Bug fixes
- **1.x.0** - New features
- **x.0.0** - Major changes

### **Before Each Build**:
1. Update `version` in `mobile/app.json`
2. Update `versionCode` (Android build number)
3. Document changes in release notes

---

## 🆘 Troubleshooting

### **Build Fails**:
- Check EAS build logs
- Ensure all dependencies are compatible
- Verify Firebase credentials

### **App Crashes on Start**:
- Check Firebase configuration
- Verify google-services.json is correct
- Test with debug build first

### **APIs Don't Work**:
- Verify API URL in production .env
- Check Cloud Functions are deployed
- Test API endpoints manually

---

## ✅ Final Checklist Before Submitting

- [ ] Tested on real devices (not just emulator)
- [ ] All critical features work
- [ ] No obvious bugs or crashes
- [ ] App performance is acceptable
- [ ] Branding/logo looks correct
- [ ] Privacy policy ready (if required)
- [ ] Play Store listing complete
- [ ] Beta testers list prepared
- [ ] Communication plan for feedback

---

**Ready to build?** Run: `cd mobile && eas build --platform android --profile production`
