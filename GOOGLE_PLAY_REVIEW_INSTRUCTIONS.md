# Google Play Console - App Access Instructions

## App Access Type
**Only some users can access all functionality**

## Why Access is Restricted
This is an internal business tool for Artis Laminates field sales team. Access is controlled by company administrators:

- **Account Creation:** Only managers and administrators can create user accounts
- **No Self-Registration:** Sales representatives cannot sign up independently
- **Business Data Protection:** Ensures only authorized Artis employees access company sales data

## Test Credentials for Review

We have provided two test accounts with different permission levels:

### 1. Sales Representative Account
**Phone Number:** +91 9876543210
**OTP Code:** 123456
**Role:** Sales Rep

**Available Features:**
- ✅ Attendance (Check-in/Check-out with GPS)
- ✅ Visit logging with photo capture
- ✅ Lead management
- ✅ Daily sales tracking (sheets sold)
- ✅ Expense reporting
- ✅ View personal Daily Sales Report (DSR)

**Restricted Features:**
- ❌ Cannot create new users
- ❌ Cannot view team statistics
- ❌ Cannot approve expense reports
- ❌ Cannot access manager dashboard

### 2. Manager Account
**Phone Number:** +91 9876543211
**OTP Code:** 654321
**Role:** Area Manager

**Available Features:**
- ✅ All Sales Rep features (above)
- ✅ View team attendance and performance
- ✅ Manager dashboard with team statistics
- ✅ Approve/reject Daily Sales Reports
- ✅ Export team reports (CSV/PDF)
- ✅ View team visit history and metrics

**Restricted Features:**
- ❌ Cannot create new users (only admins/national heads can)

## Login Instructions

1. Open the app
2. Enter the phone number (including country code +91)
3. Tap "Send OTP"
4. Enter the OTP code provided above (no SMS will be sent - these are test accounts)
5. You will be logged in automatically

## Testing Recommendations

**For Sales Rep Account:**
- Try checking in with location permission
- Create a visit log and upload a photo
- Add a daily sales entry (sheets sold)
- Submit an expense report
- View your DSR (Daily Sales Report)

**For Manager Account:**
- View the manager dashboard
- Check team statistics
- Review and approve/reject a DSR
- Export reports

## Technical Notes

- **Firebase Test Accounts:** These phone numbers are configured as Firebase test numbers and do not send real SMS
- **Data Persistence:** All test data is stored in our development database
- **Offline Support:** The app works offline and syncs when connection is restored

---

**Last Updated:** 2025-11-02
**Contact:** support@artislaminates.com
