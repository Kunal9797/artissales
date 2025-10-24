# Production Build Guide - Artis Sales App

**Date**: October 17, 2025
**Status**: Ready for production testing on real devices

---

## 🚀 Quick Start - Build for Testing

### Step 1: Set Production Environment
```bash
cd /Users/kunal/ArtisSales/mobile

# Copy production environment
cp .env.production .env

# Verify it points to production backend
cat .env | grep EXPO_PUBLIC_API_URL
# Should show: https://us-central1-artis-sales.cloudfunctions.net
```

---

### Step 2: Build APK for Testing

**Option A: Development Build (Faster)**
```bash
# Build development APK (installs on device, connects to prod backend)
cd /Users/kunal/ArtisSales/mobile
npx expo run:android --variant release
```

**Option B: Production Build (via EAS)**
```bash
# Full production build (requires EAS account)
cd /Users/kunal/ArtisSales/mobile
eas build --platform android --profile production
```

---

### Step 3: Install on Real Device

**Via USB (Development Build)**:
```bash
# Connect Android phone via USB
# Enable USB debugging on phone (Settings > Developer Options)

# Build and install
cd /Users/kunal/ArtisSales/mobile
npx expo run:android --device
```

**Via Download Link (EAS Build)**:
- EAS will provide download link after build completes
- Open link on phone and install APK
- May need to enable "Install from unknown sources"

---

## 📱 Testing Checklist

### Before Testing
- [ ] `.env` points to production backend
- [ ] Firebase project is `artis-sales` (not `artis-sales-dev`)
- [ ] All security fixes deployed
- [ ] Custom claims migration run (see [MIGRATION_CUSTOM_CLAIMS.md](MIGRATION_CUSTOM_CLAIMS.md))

### Core Features to Test
- [ ] Login with phone number
- [ ] Check-in/check-out (GPS accuracy)
- [ ] Log visit (with photo)
- [ ] Log sheet sales
- [ ] Report expense
- [ ] View stats (with targets)
- [ ] Documents download
- [ ] Manager dashboard (if testing with manager account)

### Security to Verify
- [ ] Documents require authentication (try accessing without login)
- [ ] API calls hit production backend (check logs)
- [ ] PII redacted in error logs
- [ ] No stack traces in error messages

---

## 🔧 Configuration Files

| Environment | File | Backend URL |
|-------------|------|-------------|
| **Development** | `.env.example` → `.env` | `artis-sales-dev.cloudfunctions.net` |
| **Production** | `.env.production` → `.env` | `artis-sales.cloudfunctions.net` |

---

## 🔄 Switching Environments

**Switch to Development**:
```bash
cd mobile
cp .env.example .env
```

**Switch to Production**:
```bash
cd mobile
cp .env.production .env
```

**Verify Current Environment**:
```bash
cat mobile/.env | grep EXPO_PUBLIC_API_URL
```

---

## 📦 Build Variants

### Development Build
- **Speed**: Fast (~5 min)
- **Use**: Quick testing, iteration
- **Command**: `npx expo run:android`
- **Output**: APK via USB install

### Production Build
- **Speed**: Slow (~15-20 min)
- **Use**: Final testing, Play Store submission
- **Command**: `eas build --platform android --profile production`
- **Output**: Downloadable APK link + AAB for Play Store

---

## 🐛 Troubleshooting

### "API URL not changing"
- Check `.env` file is in `/mobile/` directory
- Rebuild app completely (clear cache):
  ```bash
  cd mobile
  rm -rf node_modules .expo android/build
  npm install
  npx expo run:android
  ```

### "Documents not loading"
- Run custom claims migration first
- Users need to re-login to get new JWT

### "Build fails"
- Check TypeScript compilation:
  ```bash
  cd mobile && npx tsc --noEmit
  ```
- Check for missing dependencies:
  ```bash
  npm install
  ```

---

## 📊 What's Different in Production

| Aspect | Development | Production |
|--------|-------------|------------|
| Backend | `artis-sales-dev` | `artis-sales` |
| API URL | `-dev.cloudfunctions.net` | `.cloudfunctions.net` |
| Data | Test data | Real data |
| Users | Test accounts | Real sales reps |
| Firestore | Dev database | Prod database |
| Storage | Dev bucket | Prod bucket |

---

## ✅ Pre-Production Checklist

### Backend
- [x] All security fixes deployed
- [x] Storage rules require auth
- [x] Firestore RLS uses custom claims
- [x] Cloud Functions all deployed (50+)
- [ ] Custom claims migration run for existing users

### Mobile
- [x] `.env.production` created
- [x] PII redaction implemented
- [x] Environment variable support added
- [ ] Production build tested on real device

### Testing
- [ ] Login/logout flow
- [ ] All core features (check-in, visits, sales, expenses)
- [ ] Manager dashboard
- [ ] Offline mode
- [ ] Document downloads

---

## 🚀 Ready to Build

**Current status**: ✅ All code complete, security hardened, ready for production testing

**Next command**:
```bash
cd /Users/kunal/ArtisSales/mobile
cp .env.production .env
npx expo run:android --variant release
```

**Estimated build time**: 5-10 minutes
**Output**: APK installable on Android devices

---

**Questions?** See:
- [SECURITY_AUDIT_REPORT.md](../SECURITY_AUDIT_REPORT.md) - Security details
- [MIGRATION_CUSTOM_CLAIMS.md](../MIGRATION_CUSTOM_CLAIMS.md) - Custom claims setup
- [SESSION_SUMMARY.md](../SESSION_SUMMARY.md) - What was accomplished
