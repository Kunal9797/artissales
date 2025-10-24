# Google Play Store Submission Checklist

## ✅ COMPLETED

- [x] **Google Play Developer Account** - Created & verified
- [x] **Privacy Policy** - Live at https://artis-sales-dev.web.app/privacy-policy.html

---

## 📝 TO DO NOW (Before Build)

### 1. Store Listing Content

#### Short Description (80 chars max)
```
Field sales tracking for Artis Laminates - attendance, visits, leads & reports
```

#### Full Description (4000 chars max)
**Status:** Draft created below - Review and customize

```
Artis Field Sales App - Streamline Your Sales Operations

The official field sales management app for Artis Laminates sales team.
Track attendance, manage leads, log customer visits, and submit daily reports - all from your mobile device.

KEY FEATURES:
• GPS-based attendance check-in/check-out
• Lead management with SLA tracking
• Customer visit logging with photo verification
• Daily sales sheet tracking (Fine Decor, Artvio, Woodrica, Artis)
• Expense reporting with receipt uploads
• Automated Daily Sales Reports (DSR)
• Manager dashboard for team oversight
• Offline-first - works without internet, syncs when online

FOR SALES REPRESENTATIVES:
- Clock in/out with GPS verification
- View and manage assigned leads
- Log distributor, dealer, and architect visits
- Track daily sheet sales by catalog
- Submit expense reports with receipts
- Auto-generated daily sales reports

FOR MANAGERS:
- Real-time team attendance monitoring
- Visit statistics and performance tracking
- Lead assignment and SLA compliance
- DSR review and approval
- Monthly reports with CSV/PDF export

OFFLINE SUPPORT:
All actions work offline and automatically sync when you're back online -
never lose data even in areas with poor connectivity.

SECURITY & PRIVACY:
Enterprise-grade security with role-based access control. Your data is
protected and only accessible to authorized team members.

For support, contact: support@artislaminates.com
```

---

### 2. Visual Assets

#### App Icon - 512x512 PNG (32-bit with alpha)
**Status:** ⏳ NEED TO CREATE
- Use your current adaptive icon as base
- Export as 512x512 PNG
- Must be 32-bit with alpha channel
- Brand color: #393735

**Where to get it:**
- Current location: `mobile/assets/adaptive-icon.png`
- Export at 512x512 resolution

---

#### Feature Graphic - 1024x500 JPG/PNG
**Status:** ⏳ NEED TO CREATE
- Showcase app name + mockup
- Use brand colors (#393735)
- Example layout: "Artis Field Sales" text + phone mockup showing dashboard

**Tools:**
- Canva (free templates available)
- Figma
- Adobe Express

---

#### Screenshots (Minimum 2, Maximum 8)
**Status:** ⏳ NEED TO TAKE

**Required screenshots:**
1. **Sales Rep Dashboard** - Show home screen with key stats
2. **Attendance Check-in** - GPS check-in screen
3. **Visit Logging** - Visit form with photo
4. **Lead Management** - Lead list screen
5. **Manager Dashboard** (if ready) - Manager overview
6. **Daily Sales Report** - DSR screen
7. **Expense Tracking** - Expense form (optional)
8. **Offline Mode** - Show offline indicator (optional)

**Specifications:**
- Phone screenshots: 1080x2400 or similar (16:9 ratio)
- Add text captions explaining each feature
- Use device frames for better presentation (optional)

**How to take:**
1. Run app on Android emulator or device
2. Take screenshots of key screens
3. Add captions using image editor
4. Crop to proper dimensions

---

### 3. App Content Declarations

#### Ads
- [ ] Does your app contain ads? → **NO**

#### Target Audience
- [ ] Age rating: **Adults (18+)** (business app for employees)
- [ ] Content rating: **Everyone** (business productivity)

#### Data Safety Section
**What data do you collect?**
- [x] Personal info: Name, email, phone number
- [x] Location: Precise location (GPS for attendance)
- [x] Photos: User-uploaded photos (visit verification)
- [x] Financial info: Expense amounts
- [x] App activity: Visit logs, attendance records

**How is data secured?**
- [x] Data encrypted in transit (HTTPS/TLS)
- [x] Data encrypted at rest (Firebase)
- [x] Users can request data deletion (email support@artislaminates.com)

**Data sharing:**
- [x] Data shared with managers/administrators only
- [ ] No data sold to third parties

#### Permission Justifications
**Location (ACCESS_FINE_LOCATION):**
```
Required for attendance check-in/check-out verification to ensure accurate field presence tracking.
```

**Camera (CAMERA):**
```
Required for capturing visit verification photos and expense receipt uploads.
```

**Storage (READ_EXTERNAL_STORAGE):**
```
Required for uploading photos for visit verification and expense reporting.
```

---

### 4. Support Infrastructure

#### Support Email
**Status:** ⏳ SET UP
- [ ] Create: `support@artislaminates.com` (or similar)
- [ ] Ensure email is monitored
- [ ] Set up auto-responder (optional)

#### Support Documentation (Optional but Recommended)
- [ ] FAQ document
- [ ] User guide for sales reps
- [ ] Manager onboarding guide

---

### 5. Test Accounts (For Google Reviewers)

**Status:** ⏳ CREATE

Google reviewers will need demo credentials to test the app.

**Create these accounts in Firebase:**
- [ ] **Sales Rep Demo Account**
  - Phone: [Provide number]
  - Role: rep
  - Pre-populate with sample data (leads, visits, etc.)

- [ ] **Manager Demo Account**
  - Phone: [Provide number]
  - Role: area_manager
  - Assigned some demo reps to view

**Where to provide:**
- Add credentials in "Review notes" section when submitting app

---

### 6. App Details in Play Console

When creating app in Play Console, you'll need:

#### Basic Info
- **App name:** Artis Field Sales
- **Default language:** English (India)
- **App category:** Business
- **Free or paid:** Free
- **Contact email:** support@artislaminates.com
- **Privacy policy URL:** https://artis-sales-dev.web.app/privacy-policy.html

#### Store Settings
- [ ] Internal app (for organization only): **NO** (unless you want to restrict)
- [ ] Contains ads: **NO**
- [ ] Target audience: Adults (18+)

---

## 🚀 WHEN BUILD IS READY

### Step 1: Internal Testing (Week 1)
1. Upload APK/AAB to Internal Testing track
2. Add 5-10 internal testers (managers, friendly reps)
3. Share opt-in link with testers
4. Monitor for critical bugs
5. Fix issues and update

### Step 2: Closed Beta (Week 2-3)
1. Expand to 20-30 sales reps across territories
2. Gather feedback on usability
3. Test GPS accuracy issues
4. Monitor Firebase Crashlytics
5. Polish based on feedback

### Step 3: Production Submission (Week 4)
1. Complete all store listing fields
2. Upload final APK/AAB to Production track
3. Add release notes
4. Submit for review
5. Wait 3-7 days for Google review

### Step 4: Gradual Rollout
1. Start with 20% rollout
2. Monitor for 48-72 hours
3. Increase to 50% if stable
4. Full 100% rollout after 1 week

---

## 📋 Quick Actions (Do These NOW)

### Priority 1 (Today):
1. [ ] Set up support email: support@artislaminates.com
2. [ ] Export app icon at 512x512 from `mobile/assets/adaptive-icon.png`
3. [ ] Review and finalize store description text above

### Priority 2 (This Week):
1. [ ] Design feature graphic (1024x500)
2. [ ] Take app screenshots (2-8 images)
3. [ ] Add captions to screenshots
4. [ ] Create test accounts in Firebase
5. [ ] Prepare permission justifications

### Priority 3 (Before Submission):
1. [ ] Create app in Play Console
2. [ ] Fill in store listing with all assets
3. [ ] Complete Data Safety questionnaire
4. [ ] Set up content rating (IARC)
5. [ ] Add test account credentials to review notes

---

## 📞 Resources & Links

- **Privacy Policy:** https://artis-sales-dev.web.app/privacy-policy.html
- **Play Console:** https://play.google.com/console
- **Firebase Console:** https://console.firebase.google.com/project/artis-sales-dev
- **Google Play Help:** https://support.google.com/googleplay/android-developer

---

## 📊 Timeline Estimate

```
Week 0:  ✅ Play Console account created
         ✅ Privacy policy live

Week 1:  Create visual assets
         Set up support infrastructure
         Prepare store listing content

Week 2:  Production build ready
         Upload to Internal Testing
         Test with 5-10 users

Week 3:  Closed beta with 20-30 users
         Fix bugs, gather feedback

Week 4:  Submit to Production
         Google review (3-7 days)

Week 5:  App LIVE! 🎉
         Gradual rollout to all users
```

---

**Last Updated:** October 21, 2024
**Status:** Privacy policy complete, visual assets pending
