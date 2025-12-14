# Security Rules & Guidelines

## Firestore Security Rules

**IMPORTANT**: Rules use JWT custom claims for role checking (no Firestore reads = better performance).

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // ========================================================================
    // HELPER FUNCTIONS
    // ========================================================================

    function isAuthenticated() {
      return request.auth != null;
    }

    // Uses JWT custom claims (NOT Firestore read) for performance
    function getUserRole() {
      return request.auth.token.role;
    }

    function isRep() {
      return isAuthenticated() && getUserRole() == 'rep';
    }

    function isManager() {
      return isAuthenticated() && getUserRole() in ['area_manager', 'zonal_head', 'national_head', 'admin'];
    }

    function isAdmin() {
      return isAuthenticated() && getUserRole() == 'admin';
    }

    function isNationalHeadOrAdmin() {
      return isAuthenticated() && getUserRole() in ['national_head', 'admin'];
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // ========================================================================
    // COLLECTIONS (12+ with rules)
    // ========================================================================

    // users, accounts, visits, attendance, leads, pincodeRoutes,
    // sheetsSales, expenses, targets, documents, incentiveSchemes,
    // incentiveResults, events, config

    // See /firestore.rules for complete implementation
  }
}
```

### Key Security Patterns

| Collection | Read | Create | Update | Delete |
|------------|------|--------|--------|--------|
| `users` | Authenticated | Owner or Admin | Owner or Manager | Admin only |
| `accounts` | Authenticated | Admin/NationalHead/Rep(limited) | Admin/NationalHead/Rep(own) | Admin/NationalHead/Rep(own) |
| `visits` | Owner or Manager | Owner only | Owner or Manager | Admin only |
| `expenses` | Owner or Manager | Owner only | Owner(pending) or Manager | Admin only |
| `sheetsSales` | Owner or Manager | Owner only | Owner(unverified) or Manager | Admin only |
| `targets` | Owner or Manager | Manager only | Manager only | Admin only |
| `documents` | Authenticated | Manager only | Never | Manager only |
| `events` | Never (Cloud Functions only) | Never | Never | Never |
| `config` | Authenticated | Admin only | Admin only | Admin only |

---

## Common Pitfalls to Avoid

### Data Modeling
- **No SQL joins** - Denormalize data instead
- **No large collection queries without indexes** - Always create composite indexes
- **No client-side secrets** - Use Cloud Functions for sensitive operations
- **No raw phone numbers** - Normalize to E.164 format (+91XXXXXXXXXX)
- **No synchronous HTTP in triggers** - Use events/outbox pattern

### Security
- **Input validation** - Validate all user input server-side
- **Auth checks** - Every Cloud Function must verify auth
- **Firestore rules** - Update rules when adding new collections
- **PII handling** - Review before merging any PII changes
- **No secrets in code** - Use environment variables or Secret Manager
- **JWT custom claims** - Use `request.auth.token.role` not Firestore reads

---

## Security Checklist Before Merging

### For Every Change
- [ ] Input validation added for user-provided data
- [ ] Auth checks present in Cloud Functions
- [ ] No hardcoded secrets or API keys
- [ ] PII fields properly handled

### For New Collections
- [ ] Firestore security rules updated in `/firestore.rules`
- [ ] Read rules: Who can see this data?
- [ ] Write rules: Who can modify?
- [ ] Field validation in rules (if needed)
- [ ] Delete rules: Usually Admin only

### For API Endpoints
- [ ] Request validation middleware
- [ ] Auth middleware applied
- [ ] Rate limiting considered
- [ ] Error messages don't leak sensitive info

### For Data Access
- [ ] Reps can only see their own data
- [ ] Managers can only see their direct reports
- [ ] Admin access properly scoped
- [ ] No unintended data exposure

---

## Phone Number Normalization

Always normalize phone numbers to E.164 format before storing:

```typescript
// Input: "9876543210" or "+919876543210" or "09876543210"
// Output: "+919876543210"

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) {
    return '+' + digits;
  }
  if (digits.length === 10) {
    return '+91' + digits;
  }
  throw new Error('Invalid phone number');
}
```
