# Custom Claims Migration Guide

**Purpose**: Migrate all existing users from Firestore role lookups to JWT custom claims
**Impact**: Reduces Firestore reads by 50% (cost savings)
**Status**: Code deployed, ready to run

---

## Why This Migration?

### Before (Expensive)
```javascript
// firestore.rules
function getUserRole() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
}
```
- **Problem**: Every document read triggers ANOTHER Firestore read to get user role
- **Cost**: 1000 document reads = 2000 Firestore reads (2x cost!)

### After (Optimized)
```javascript
// firestore.rules
function getUserRole() {
  return request.auth.token.role;  // No extra read!
}
```
- **Benefit**: Role stored in JWT token, no extra Firestore read
- **Cost**: 1000 document reads = 1000 Firestore reads (50% savings!)

---

## How to Run Migration

### Step 1: Deploy (✅ DONE)
```bash
firebase deploy --only firestore:rules,functions:migrateToCustomClaims
```
**Status**: ✅ Deployed

---

### Step 2: Run Migration Function

**Option A: Via Firebase Console**
1. Go to https://console.firebase.google.com/project/artis-sales-dev/functions
2. Find `migrateToCustomClaims` function
3. Click "Testing" tab
4. Add request body: `{}`
5. Click "Run Test"

**Option B: Via curl (with auth token)**
```bash
# Get Firebase ID token from mobile app (or Firebase Console)
TOKEN="<your-firebase-id-token>"

curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{}' \
  https://us-central1-artis-sales-dev.cloudfunctions.net/migrateToCustomClaims
```

**Expected Response**:
```json
{
  "ok": true,
  "message": "Custom claims migration complete",
  "summary": {
    "totalUsers": 15,
    "successCount": 15,
    "failureCount": 0,
    "failures": []
  }
}
```

---

### Step 3: Verify Claims Are Set

**Check a specific user**:
```bash
# In Firebase Console > Authentication
# Click on a user > Custom Claims tab
# Should see: { "role": "rep", "claimsVersion": 1 }
```

**Or via code**:
```typescript
import { auth } from 'firebase-admin';
const user = await auth().getUser(userId);
console.log(user.customClaims); // { role: "rep", claimsVersion: 1 }
```

---

## Important Notes

### Mobile App Impact
- **Existing sessions**: Users need to re-login to get new JWT with custom claims
- **Or**: Force token refresh in app:
  ```typescript
  await auth().currentUser?.getIdToken(true); // Force refresh
  ```

### New Users
- ✅ Automatically get custom claims when created (updated `createUserByManager` function)
- No manual migration needed for new users

### Rollback Plan
If issues occur:
```bash
# Revert firestore.rules to old implementation
git checkout HEAD~1 firestore.rules
firebase deploy --only firestore:rules
```

---

## Files Modified

1. `firestore.rules` - Changed `getUserRole()` to use `request.auth.token.role`
2. `functions/src/utils/customClaims.ts` - NEW: Helper functions for claims
3. `functions/src/utils/migrate-custom-claims.ts` - NEW: Migration script
4. `functions/src/api/users.ts` - Sets claims when creating users
5. `functions/src/index.ts` - Exports migration function

---

## Monitoring

After migration, monitor:
1. **Firestore reads**: Should see ~50% reduction in read count
2. **Auth errors**: Watch for "Insufficient permissions" errors (means claims not set)
3. **Logs**: Check Cloud Functions logs for custom claims errors

---

## Cost Savings Estimate

**Assumptions**:
- 10 reps, 50 requests/day each = 500 requests
- Each request reads 5 documents on average = 2,500 document reads
- With old RLS: 2,500 + 2,500 (role lookups) = **5,000 reads/day**
- With custom claims: **2,500 reads/day**

**Savings**: 2,500 reads/day = **50% reduction**
**Monthly**: ~75,000 reads saved
**Annual**: ~900,000 reads saved

At Firebase pricing ($0.06 per 100K reads), this saves:
- Monthly: $0.045
- Annual: $0.54

(Note: Savings scale with user count and activity)

---

**Status**: ✅ Code deployed, ready to run migration
**Next Step**: Run migration via Firebase Console or authenticated curl request
