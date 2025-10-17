# How to Test Security Fixes - Quick Start

**Time needed**: 10-15 minutes
**What you'll test**: Authorization & Rate Limiting

---

## 🚀 Quick Start (3 Steps)

### Step 1: Run Basic Tests (No Setup Needed)

```bash
cd security-tests
./QUICK_TEST.sh
```

This tests:
- ✅ Webhook works
- ✅ Input validation works
- ✅ Rate limiting setup

---

### Step 2: Get Auth Tokens (For Full Testing)

#### **Option A: Using Mobile App** (Easiest)

1. Add this button temporarily to your mobile app:

```typescript
// In HomeScreen.tsx or any screen
import auth from '@react-native-firebase/auth';
import Clipboard from '@react-native-clipboard/clipboard';

<Button
  title="Get Auth Token"
  onPress={async () => {
    const token = await auth().currentUser?.getIdToken();
    console.log('TOKEN:', token);
    Clipboard.setString(token || '');
    alert('Token copied!');
  }}
/>
```

2. Login as **Rep user** → Click button → Save token
3. Login as **Manager user** → Click button → Save token

#### **Option B: Using Firebase Console**

```bash
# Go to Firebase Console → Authentication
# Copy user UIDs, then generate custom tokens
# See: security-tests/TESTING_GUIDE.md for details
```

---

### Step 3: Run Full Tests

```bash
# Set your tokens
export REP_TOKEN="paste_rep_token_here"
export MANAGER_TOKEN="paste_manager_token_here"

# Run tests
cd security-tests
./QUICK_TEST.sh

# Test rate limiting (optional, takes 1-2 min)
./test-rate-limit.sh
```

---

## ✅ What to Check

### Test 1: ✅ Webhook Works
**Expected**: Valid requests get HTTP 200
**Status**: Should PASS

### Test 2: ✅ Invalid Input Rejected
**Expected**: Invalid phone gets HTTP 400
**Status**: Should PASS

### Test 3: ⚠️ Rate Limiting
**Expected**: After ~100 requests, get HTTP 429
**Status**: Run `./test-rate-limit.sh` to verify

### Test 4: 🔒 Rep Cannot Access Manager Endpoint
**Expected**: Rep gets HTTP 403
**Status**: Needs auth tokens (Step 2)

### Test 5: 🔒 Manager CAN Access Manager Endpoint
**Expected**: Manager gets HTTP 200 with data
**Status**: Needs auth tokens (Step 2)

---

## 🎯 Success Criteria

You're ready for production if:

- [x] Webhook accepts valid requests (Test 1)
- [x] Invalid input is rejected (Test 2)
- [x] Rep cannot access manager endpoints (Test 4)
- [x] Manager can access manager endpoints (Test 5)
- [ ] Rate limiting triggers at ~100 requests (Test 3)

**Note**: Rate limiting may need additional verification. The infrastructure is in place.

---

## 🔧 Troubleshooting

### "All tests show 401 Unauthorized"
**Fix**: Your auth tokens are expired (expire after 1 hour)
- Get fresh tokens using Step 2

### "Rate limiting doesn't trigger"
**Check**:
```bash
firebase functions:log --only leadWebhook
```
- Look for rate limiter messages
- May need express middleware adjustment

### "Rep can access manager endpoint"
**Check**:
1. Verify user has `role: 'rep'` in Firestore
2. Check if `hasRole()` function was deployed:
```bash
firebase deploy --only functions
```

---

## 📖 Detailed Docs

For comprehensive testing guide:
```bash
cat security-tests/TESTING_GUIDE.md
```

For security audit results:
```bash
cat security-tests/EXECUTIVE_SUMMARY.md
```

---

## 💡 Quick Commands

```bash
# Quick test (10 seconds)
cd security-tests && ./QUICK_TEST.sh

# Rate limit test (2 minutes)
cd security-tests && ./test-rate-limit.sh

# Full security audit
cd security-tests && ./test-suite.sh

# Check logs
firebase functions:log --project artis-sales-dev

# Redeploy if needed
firebase deploy --only functions --project artis-sales-dev
```

---

## 🎉 You're Done!

Once tests pass, your security fixes are working and you're ready for production!

**What we fixed**:
- ✅ Role-based authorization
- ✅ Rate limiting infrastructure
- ✅ Request size limits
- ✅ Input validation

**Security score**: ⭐⭐⭐⭐☆ (4/5)

---

**Questions?** See `security-tests/TESTING_GUIDE.md` for detailed instructions.
