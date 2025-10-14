# Security Testing Guide - Artis Sales App

**What to Test**: Security fixes we just implemented
**Why Test**: Verify authorization, rate limiting, and input validation work correctly
**When**: Before production launch

---

## 🎯 Overview: What We Need to Test

We implemented 2 critical fixes that need manual verification:

1. **Role-Based Authorization** - Does `hasRole()` actually block unauthorized users?
2. **Rate Limiting** - Does the webhook reject after 100 requests?
3. **Request Size Limits** - Does it reject payloads > 10KB?

---

## 📋 Testing Checklist

### Critical Tests (Must Pass):
- [ ] Test 1: Rep cannot access manager-only endpoints
- [ ] Test 2: Manager can access manager-only endpoints
- [ ] Test 3: Rate limiting kicks in after 100 requests
- [ ] Test 4: Large payloads are rejected

### Important Tests (Should Pass):
- [ ] Test 5: Rep cannot view another rep's data
- [ ] Test 6: Manager can view team data
- [ ] Test 7: Invalid roles are rejected

---

## 🔧 Setup: Get Your Firebase Auth Tokens

Before testing, you need auth tokens for different user roles.

### Step 1: Get Your Firebase Project Config

```bash
# Your project ID
PROJECT_ID="artis-sales-dev"

# Your Cloud Functions URL
BASE_URL="https://us-central1-artis-sales-dev.cloudfunctions.net"
```

### Step 2: Create Test Users (If You Haven't Already)

You need users with different roles in your Firestore:

1. **Rep User**: `role: 'rep'`
2. **Manager User**: `role: 'area_manager'`
3. **Admin User**: `role: 'admin'`

Check if you have test users:
```bash
# Open Firebase Console
open https://console.firebase.google.com/project/artis-sales-dev/firestore/data/users

# Look for users with different roles
```

### Step 3: Get Auth Tokens

#### Option A: Using Firebase Auth (Recommended)

1. **Get Rep Token**:
```bash
# Login with rep's phone number via your mobile app
# Then get the token from the app logs or:

# If you have Firebase CLI configured:
firebase auth:export users.json --project artis-sales-dev
```

#### Option B: Using Firebase Console

1. Go to Firebase Console → Authentication
2. Copy the UID of your test users
3. Use the custom token generator (see below)

#### Option C: Generate Custom Tokens (For Testing Only)

Create a script: `get-test-token.js`

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Generate token for specific UID
const uid = 'YOUR_USER_UID'; // Replace with actual UID
admin.auth().createCustomToken(uid)
  .then((token) => {
    console.log('Custom Token:', token);
    console.log('\nExchange this for an ID token at:');
    console.log('https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=YOUR_API_KEY');
  });
```

Run it:
```bash
cd functions
node get-test-token.js
```

---

## ✅ Test 1: Rep Cannot Access Manager Endpoints

**What we're testing**: Role-based authorization

**Endpoint to test**: `/getTeamStats` (manager-only)

**Expected**: Rep gets `403 Forbidden` or `401 Unauthorized`

### Step-by-step:

```bash
# 1. Get your rep user's auth token
REP_TOKEN="YOUR_REP_TOKEN_HERE"

# 2. Try to access manager-only endpoint
curl -X GET \
  -H "Authorization: Bearer $REP_TOKEN" \
  https://us-central1-artis-sales-dev.cloudfunctions.net/getTeamStats

# 3. Expected response:
# {
#   "ok": false,
#   "error": "Unauthorized",
#   "code": "FORBIDDEN"
# }
```

**✅ PASS if**: You get an error (403 or 401)
**❌ FAIL if**: You get team stats data

---

## ✅ Test 2: Manager CAN Access Manager Endpoints

**What we're testing**: Managers have proper access

**Endpoint to test**: `/getTeamStats`

**Expected**: Manager gets team statistics

### Step-by-step:

```bash
# 1. Get your manager user's auth token
MANAGER_TOKEN="YOUR_MANAGER_TOKEN_HERE"

# 2. Try to access manager endpoint
curl -X GET \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  https://us-central1-artis-sales-dev.cloudfunctions.net/getTeamStats

# 3. Expected response:
# {
#   "ok": true,
#   "stats": {
#     "totalUsers": 5,
#     "activeToday": 3,
#     ...
#   }
# }
```

**✅ PASS if**: You get team stats data
**❌ FAIL if**: You get an error

---

## ✅ Test 3: Rate Limiting Works

**What we're testing**: Webhook rejects after 100 requests

**Endpoint to test**: `/leadWebhook` (public endpoint)

**Expected**: After 100 requests, get `429 Too Many Requests`

### Step-by-step:

#### Option A: Using Bash Script (Fast)

```bash
# Create test script
cat > test-rate-limit.sh << 'EOF'
#!/bin/bash

echo "Sending 110 requests to test rate limiting..."

for i in {1..110}; do
  response=$(curl -s -w "%{http_code}" -o /dev/null \
    -X POST \
    -H "Content-Type: application/json" \
    -d "{\"source\":\"test\",\"name\":\"Test$i\",\"phone\":\"98765432$i\",\"city\":\"Delhi\",\"state\":\"Delhi\",\"pincode\":\"110001\"}" \
    https://us-central1-artis-sales-dev.cloudfunctions.net/leadWebhook)

  echo "Request $i: HTTP $response"

  if [ "$response" == "429" ]; then
    echo "✅ RATE LIMIT TRIGGERED at request $i"
    exit 0
  fi

  sleep 0.1
done

echo "❌ RATE LIMIT NOT TRIGGERED after 110 requests"
exit 1
EOF

chmod +x test-rate-limit.sh
./test-rate-limit.sh
```

**✅ PASS if**: You see "RATE LIMIT TRIGGERED" around request 100-105
**❌ FAIL if**: All 110 requests succeed

#### Option B: Using Python (More Control)

```python
import requests
import time

url = "https://us-central1-artis-sales-dev.cloudfunctions.net/leadWebhook"

for i in range(1, 111):
    payload = {
        "source": "test",
        "name": f"Test{i}",
        "phone": f"98765432{i:02d}",
        "city": "Delhi",
        "state": "Delhi",
        "pincode": "110001"
    }

    response = requests.post(url, json=payload)
    print(f"Request {i}: HTTP {response.status_code}")

    if response.status_code == 429:
        print(f"✅ RATE LIMIT TRIGGERED at request {i}")
        break

    time.sleep(0.1)
else:
    print("❌ RATE LIMIT NOT TRIGGERED after 110 requests")
```

---

## ✅ Test 4: Large Payloads Are Rejected

**What we're testing**: Request size limit (10KB)

**Endpoint to test**: `/leadWebhook`

**Expected**: Payloads > 10KB get `413 Payload Too Large`

### Step-by-step:

```bash
# 1. Create a large payload (15KB)
cat > large-payload.json << EOF
{
  "source": "website",
  "name": "$(python3 -c 'print("A" * 15000)')",
  "phone": "9876543210",
  "city": "Delhi",
  "state": "Delhi",
  "pincode": "110001"
}
EOF

# 2. Send the large payload
curl -X POST \
  -H "Content-Type: application/json" \
  -d @large-payload.json \
  https://us-central1-artis-sales-dev.cloudfunctions.net/leadWebhook

# 3. Expected response:
# {
#   "ok": false,
#   "error": "Payload too large",
#   "code": "PAYLOAD_TOO_LARGE"
# }
```

**✅ PASS if**: You get 413 or payload too large error
**❌ FAIL if**: Request succeeds

---

## ✅ Test 5: Rep Cannot View Another Rep's Data

**What we're testing**: Data isolation between reps

**Endpoint to test**: Any endpoint that returns user-specific data

**Expected**: Rep A cannot see Rep B's expenses/visits/DSRs

### Example: Test Expense Access

```bash
# 1. Get Rep A's token
REP_A_TOKEN="REP_A_TOKEN"
REP_A_UID="rep_a_uid"

# 2. Get Rep B's token
REP_B_TOKEN="REP_B_TOKEN"
REP_B_UID="rep_b_uid"

# 3. Create an expense as Rep A
curl -X POST \
  -H "Authorization: Bearer $REP_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-10-14",
    "items": [{"category": "travel", "amount": 100, "description": "Bus"}],
    "totalAmount": 100
  }' \
  https://us-central1-artis-sales-dev.cloudfunctions.net/submitExpense

# Note the expense ID from response

# 4. Try to access as Rep B (should fail)
# This should be blocked by Firestore rules, not the API
# Test by querying Firestore directly from mobile app
```

**✅ PASS if**: Rep B cannot see Rep A's expense in mobile app
**❌ FAIL if**: Rep B can see Rep A's data

---

## ✅ Test 6: Manager Can View Team Data

**What we're testing**: Managers can see their team's data

**Endpoint to test**: `/getTeamStats`

**Expected**: Manager gets aggregated team stats

```bash
MANAGER_TOKEN="YOUR_MANAGER_TOKEN"

curl -X GET \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  https://us-central1-artis-sales-dev.cloudfunctions.net/getTeamStats

# Expected: Team statistics including all reps
```

**✅ PASS if**: Manager sees team data
**❌ FAIL if**: Manager gets error

---

## ✅ Test 7: Invalid Roles Are Rejected

**What we're testing**: Users with invalid roles are blocked

**Setup**: Create a user with invalid role in Firestore

```bash
# In Firestore Console, create a user with:
# role: "hacker"

# Then try to access any endpoint
```

**✅ PASS if**: User is rejected
**❌ FAIL if**: User can access endpoints

---

## 🔍 How to Check Test Results

### View Logs

```bash
# Real-time logs
firebase functions:log --project artis-sales-dev

# Search for specific function
firebase functions:log --only leadWebhook --project artis-sales-dev

# Look for these log messages:
# - "User role not permitted" (authorization working)
# - "Rate limit exceeded" (rate limiting working)
# - "Payload too large" (size limit working)
```

### Check Firestore

```bash
# Open Firestore console
open https://console.firebase.google.com/project/artis-sales-dev/firestore

# Check:
# 1. users collection - verify roles are correct
# 2. expenses collection - verify userId matches creator
# 3. dsrReports collection - verify only proper users can read
```

---

## 📊 Expected Results Summary

| Test | Expected Result | How to Verify |
|------|----------------|---------------|
| 1. Rep access manager endpoint | ❌ 403 Forbidden | Check HTTP status |
| 2. Manager access manager endpoint | ✅ 200 OK with data | Check response body |
| 3. Rate limiting | ❌ 429 after ~100 reqs | Count successful requests |
| 4. Large payload | ❌ 413 Payload too large | Check HTTP status |
| 5. Rep view other rep data | ❌ Blocked by rules | Test in mobile app |
| 6. Manager view team data | ✅ 200 OK with stats | Check response body |
| 7. Invalid role | ❌ 403 Forbidden | Check HTTP status |

---

## 🚨 Troubleshooting

### Issue: "All tests fail with 401"
**Solution**: Your auth tokens are expired or invalid
```bash
# Regenerate tokens
# Check token expiry: https://jwt.io
```

### Issue: "Rate limiting never triggers"
**Solution**: Check if express middleware is properly applied
```bash
# Check function logs
firebase functions:log --only leadWebhook

# Look for rate limiter initialization
```

### Issue: "hasRole always returns true"
**Solution**: User document might not exist or role field missing
```bash
# Check Firestore users collection
# Verify role field exists and has valid value
```

### Issue: "Can't get auth tokens"
**Solution**: Use the mobile app to login and extract token
```typescript
// In your mobile app, add this after login:
const user = auth().currentUser;
const token = await user.getIdToken();
console.log('Auth Token:', token);
```

---

## 🧪 Automated Testing Script

Create an all-in-one test script:

```bash
cat > run-all-security-tests.sh << 'EOF'
#!/bin/bash

# Configuration
BASE_URL="https://us-central1-artis-sales-dev.cloudfunctions.net"
REP_TOKEN="${REP_TOKEN:-YOUR_REP_TOKEN}"
MANAGER_TOKEN="${MANAGER_TOKEN:-YOUR_MANAGER_TOKEN}"

echo "=========================================="
echo "Artis Sales - Manual Security Tests"
echo "=========================================="
echo ""

# Test 1: Rep cannot access manager endpoint
echo "Test 1: Rep accessing manager endpoint..."
response=$(curl -s -w "%{http_code}" -o /tmp/test1.json \
  -H "Authorization: Bearer $REP_TOKEN" \
  "$BASE_URL/getTeamStats")

if [ "$response" == "403" ] || [ "$response" == "401" ]; then
  echo "✅ PASS: Rep blocked from manager endpoint"
else
  echo "❌ FAIL: Rep accessed manager endpoint (HTTP $response)"
fi

# Test 2: Manager can access manager endpoint
echo "Test 2: Manager accessing manager endpoint..."
response=$(curl -s -w "%{http_code}" -o /tmp/test2.json \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  "$BASE_URL/getTeamStats")

if [ "$response" == "200" ]; then
  echo "✅ PASS: Manager accessed endpoint"
else
  echo "❌ FAIL: Manager blocked (HTTP $response)"
fi

# Test 3: Rate limiting
echo "Test 3: Rate limiting (sending 110 requests)..."
rate_limited=false
for i in {1..110}; do
  response=$(curl -s -w "%{http_code}" -o /dev/null \
    -X POST \
    -H "Content-Type: application/json" \
    -d "{\"source\":\"test\",\"name\":\"Test$i\",\"phone\":\"98765432$(printf %02d $i)\",\"city\":\"Delhi\",\"state\":\"Delhi\",\"pincode\":\"110001\"}" \
    "$BASE_URL/leadWebhook")

  if [ "$response" == "429" ]; then
    echo "✅ PASS: Rate limit triggered at request $i"
    rate_limited=true
    break
  fi

  sleep 0.1
done

if [ "$rate_limited" = false ]; then
  echo "⚠️  WARNING: Rate limit not triggered after 110 requests"
fi

echo ""
echo "=========================================="
echo "Tests Complete"
echo "=========================================="
echo ""
echo "Manual verification required:"
echo "1. Check Firebase Console for detailed logs"
echo "2. Test mobile app with different user roles"
echo "3. Verify Firestore rules in Firebase Console"
EOF

chmod +x run-all-security-tests.sh

# Set your tokens and run
export REP_TOKEN="your_rep_token_here"
export MANAGER_TOKEN="your_manager_token_here"
./run-all-security-tests.sh
```

---

## 📞 Getting Auth Tokens - Quick Method

### Using Your Mobile App:

1. **Add this to your mobile app** (temporary, for testing):

```typescript
// In mobile/src/screens/HomeScreen.tsx or similar
import auth from '@react-native-firebase/auth';
import Clipboard from '@react-native-clipboard/clipboard';

// Add a button
<Button
  title="Copy Auth Token (Testing)"
  onPress={async () => {
    const token = await auth().currentUser?.getIdToken();
    Clipboard.setString(token || '');
    console.log('Token:', token);
    alert('Token copied to clipboard!');
  }}
/>
```

2. **Login with different users** and copy their tokens
3. **Use tokens in curl commands** above

---

## ✅ Success Criteria

Your security fixes are working if:

1. ✅ Reps **cannot** access manager endpoints
2. ✅ Managers **can** access manager endpoints
3. ✅ Rate limiting triggers after ~100 requests
4. ✅ Large payloads are rejected
5. ✅ Reps cannot see other reps' data
6. ✅ Managers can see team data

---

## 🎯 Next Steps After Testing

### If All Tests Pass:
1. ✅ Remove test code from mobile app
2. ✅ Document any findings
3. ✅ Proceed with production launch
4. ✅ Set up monitoring

### If Tests Fail:
1. Check Firebase function logs
2. Verify Firestore rules are deployed
3. Ensure user documents have correct roles
4. Check that functions redeployed successfully

---

## 📖 Additional Resources

- [Firebase Auth Tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
- [Testing Cloud Functions](https://firebase.google.com/docs/functions/local-emulator)
- [Firestore Security Rules Testing](https://firebase.google.com/docs/rules/unit-tests)

---

**Created**: October 14, 2025
**Status**: Ready for manual testing
**Estimated Time**: 30-45 minutes for all tests
