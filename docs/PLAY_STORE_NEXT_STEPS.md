# Play Store Next Steps - Action Plan

**Date**: October 21, 2025
**Status**: Privacy policy complete, visual assets pending

---

## ✅ What's Done

1. **Google Play Developer Account** - Created & verified ✅
2. **Privacy Policy** - Live at https://artis-sales-dev.web.app/privacy-policy.html ✅
3. **Store Listing Drafts** - Short & full descriptions ready ✅
4. **Documentation** - Complete checklist created ✅

---

## 🎯 IMMEDIATE PRIORITIES (Do These Now)

### Priority 1: Support Infrastructure (30 minutes)

#### Set up support email
- [ ] Create/activate: `support@artislaminates.com`
- [ ] Set up email forwarding to your main email
- [ ] Test it works
- [ ] Update company website with this contact (if applicable)

**Why this matters**: Google requires a functioning support email before you can submit.

---

### Priority 2: Export App Icon (15 minutes)

Your current adaptive icon is at: `mobile/assets/adaptive-icon.png`

#### Steps:
1. Open the file in any image editor
2. Export at **512x512 pixels**
3. Save as PNG with 32-bit color + alpha channel
4. Name it: `icon-512.png`

**Or if you don't have the right tool:**
- Use online tool: https://www.iloveimg.com/resize-image
- Upload your adaptive-icon.png
- Resize to 512x512
- Download

**Location to save**: `mobile/assets/store/icon-512.png`

---

### Priority 3: Review Store Descriptions (15 minutes)

I've drafted these in `docs/PLAY_STORE_CHECKLIST.md` - review and customize:

**Short description (80 chars):**
```
Field sales tracking for Artis Laminates - attendance, visits, leads & reports
```

**Full description:**
- Check the checklist file
- Customize if needed (mention specific features you want to highlight)
- Make sure it matches your final app features

---

## 📸 PRIORITY 4: Screenshots (1-2 hours)

You need **2-8 screenshots** showing key features.

### Recommended screenshots (in priority order):

1. **Sales Rep Home Dashboard** ⭐ MUST HAVE
   - Shows the main screen with stats
   - Screen: `HomeScreen_v2.tsx`

2. **Attendance Check-in** ⭐ MUST HAVE
   - Shows the check-in modal with GPS
   - Feature that differentiates your app

3. **Visit Logging**
   - Shows visit form with photo requirement
   - Screen: `LogVisitScreen.tsx`

4. **Manager Dashboard**
   - Shows manager overview with team stats
   - Screen: `ManagerHomeScreenSimple.tsx`

5. **Lead Management** (Optional)
   - If leads feature is working

6. **Stats/Reports** (Optional)
   - Shows performance metrics
   - Screen: `StatsScreen.tsx`

### How to take screenshots:

**Option A: Android Emulator**
```bash
# Run app in emulator
cd mobile
npx expo start

# Press 'a' for Android
# Navigate to each screen
# Take screenshots with emulator tools
```

**Option B: Physical Device**
- Install on your Android phone
- Navigate to each screen
- Take screenshots (Power + Volume Down)
- Transfer to computer

### After taking screenshots:

1. **Crop to standard size**: 1080x2400 (or similar 16:9 ratio)
2. **Add captions** (optional but recommended):
   - Use Canva or any image editor
   - Add text like "Track Attendance with GPS", "Log Customer Visits", etc.
3. **Save to**: `mobile/assets/store/screenshots/`

---

## 🎨 Priority 5: Feature Graphic (1-2 hours)

Create a **1024x500 banner** for your Play Store listing.

### Quick Options:

**Option A: Use Canva (Recommended)**
1. Go to canva.com (free account)
2. Search for "Google Play Feature Graphic"
3. Choose a template
4. Customize with:
   - Text: "Artis Field Sales"
   - Tagline: "Streamline Your Sales Operations"
   - Your app icon
   - Brand color: #393735
   - Gold accent: #D4A944
5. Download as PNG

**Option B: Simple Design**
- Dark background (#393735)
- App name in white/gold
- Phone mockup showing your app (optional)
- Keep it simple and professional

**Save to**: `mobile/assets/store/feature-graphic.png`

---

## 👥 Priority 6: Test Accounts (30 minutes)

Create demo accounts for Google reviewers:

### Sales Rep Account
```
Phone: +91XXXXXXXXXX (use a test number)
Role: rep
Name: Test Rep
Password: [Set one up]
```

Pre-populate with sample data:
- 2-3 visits logged
- 1-2 leads assigned
- Some attendance records

### Manager Account
```
Phone: +91XXXXXXXXXX (use a test number)
Role: area_manager
Name: Test Manager
Password: [Set one up]
```

Pre-populate with:
- 2-3 team members assigned
- Some DSRs to review

**Document credentials**: Add to a text file you'll reference when submitting to Play Store.

---

## 📋 Priority 7: Play Console Setup (1 hour)

Once you have all assets ready:

1. **Create App in Play Console**
   - Go to https://play.google.com/console
   - Click "Create app"
   - Fill basic info:
     - Name: Artis Field Sales
     - Language: English (India)
     - App/Game: App
     - Free/Paid: Free

2. **Complete Store Listing**
   - Upload icon (512x512)
   - Upload feature graphic (1024x500)
   - Upload screenshots (2-8 images)
   - Paste short description
   - Paste full description
   - Category: Business
   - Contact email: support@artislaminates.com
   - Privacy policy URL: https://artis-sales-dev.web.app/privacy-policy.html

3. **Content Rating**
   - Complete IARC questionnaire
   - Select "Business" app
   - No violence, adult content, etc.
   - Rating will likely be "Everyone"

4. **Data Safety**
   - Declare what data you collect:
     - ✓ Personal info (name, email, phone)
     - ✓ Location (GPS for attendance)
     - ✓ Photos (visit verification)
     - ✓ Financial info (expense amounts)
   - Data encrypted in transit: YES
   - Users can request deletion: YES
   - Data shared: Only with managers/admins

5. **App Content**
   - No ads
   - Target audience: Adults 18+
   - Government apps: NO
   - COVID-19 contact tracing: NO

---

## 🚀 After All Assets Ready

### Step 1: Internal Testing Build
```bash
cd mobile
eas build --platform android --profile preview
```
Wait for build to complete (~15-20 minutes)

### Step 2: Upload to Play Console
- Go to Internal Testing track
- Upload APK/AAB
- Add test users (5-10 emails)
- Share opt-in link

### Step 3: Test for 1 week
- Fix any critical bugs
- Gather feedback
- Update if needed

### Step 4: Submit to Production
- Complete all store listing fields
- Add release notes
- Add test account credentials in "Review notes"
- Submit for review

### Step 5: Wait for Google Review
- Typical timeline: 3-7 days
- Monitor email for any questions from Google
- Be ready to respond quickly if they need clarification

---

## 📊 Timeline Estimate

| Task | Time | When |
|------|------|------|
| Support email | 30 min | NOW |
| App icon export | 15 min | NOW |
| Review descriptions | 15 min | NOW |
| Take screenshots | 1-2 hrs | This week |
| Feature graphic | 1-2 hrs | This week |
| Test accounts | 30 min | This week |
| Play Console setup | 1 hr | When assets ready |
| **Total prep time** | **5-7 hours** | **This week** |
| Build & upload | 30 min | Next week |
| Internal testing | 1 week | Next week |
| Production submission | 30 min | Week after |
| Google review | 3-7 days | Week after |
| **LIVE ON PLAY STORE** | - | **~3 weeks from now** |

---

## 🆘 Quick Reference

**Privacy Policy**: https://artis-sales-dev.web.app/privacy-policy.html

**Full Checklist**: See `docs/PLAY_STORE_CHECKLIST.md`

**Play Console**: https://play.google.com/console

**Your Firebase Project**: https://console.firebase.google.com/project/artis-sales-dev

---

## 💡 Pro Tips

1. **Don't rush the screenshots** - They're what users see first
2. **Test your support email** - Google will check it works
3. **Keep test account credentials safe** - You'll need them for every review
4. **Start with Internal Testing** - Catch bugs before public release
5. **Use gradual rollout** - Start at 20%, increase slowly

---

## ❓ Have Questions?

Common questions Google might ask:
- Why do you need location permission? → "For attendance verification"
- Why do you need camera permission? → "For visit photo verification"
- How can users delete their data? → "Email support@artislaminates.com"
- Is this app for general public? → "Yes, for sales professionals"

Be ready to answer these in your app description or Play Console notes.

---

**Last Updated**: October 21, 2025
**Status**: Ready to start asset creation
