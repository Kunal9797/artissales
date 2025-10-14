# Security Testing Suite

This directory contains comprehensive security testing tools and reports for the Artis Sales application.

## 📁 Files Overview

### Test Scripts

1. **test-suite.sh** - Automated security testing script
   - Tests authentication, input validation, rate limiting
   - Tests business logic and data leakage
   - Checks CORS and security headers
   - Usage: `./test-suite.sh`

2. **firestore-rules-test.js** - Firestore security rules testing
   - Tests collection-level access control
   - Validates role-based permissions
   - Requires Firebase emulator
   - Usage: `node firestore-rules-test.js`

### Reports

1. **EXECUTIVE_SUMMARY.md** - High-level overview
   - Overall project status (85% production ready)
   - Critical issues (2 found)
   - Quick stats and recommendations

2. **SECURITY_AUDIT_REPORT.md** - Detailed security analysis
   - Vulnerability descriptions with severity ratings
   - Impact assessments and fix recommendations
   - Test methodology and compliance considerations

3. **CODE_REVIEW.md** - Comprehensive code quality review
   - Architecture assessment (5/5 stars)
   - Performance review
   - Mobile app quality evaluation
   - Dependencies and documentation review

## 🚀 Quick Start

### Running HTTP Security Tests

```bash
cd security-tests
chmod +x test-suite.sh
./test-suite.sh
```

**Requirements**: `curl`, `jq`

### Running Firestore Rules Tests

```bash
cd security-tests
npm install --save-dev @firebase/rules-unit-testing
node firestore-rules-test.js
```

**Requirements**: Firebase emulator running on localhost:8080

## 📊 Test Results Summary

### Automated Tests: 13 Total
- ✅ **Passed**: 8
- ❌ **Failed**: 2
- ⚠️ **Warnings**: 3

### Critical Findings

🔴 **HIGH SEVERITY**:
1. Incomplete role validation in `auth.ts` (always returns true)
2. No rate limiting on public webhooks (DoS risk)

⚠️ **MEDIUM SEVERITY**:
1. SQL injection accepted in phone field
2. No request size limits (100KB+ accepted)
3. Missing XSS sanitization

## 🔧 How to Fix Critical Issues

### 1. Fix Role Validation

**File**: `functions/src/utils/auth.ts`

```typescript
import {firestore} from 'firebase-admin';

export async function hasRole(
  uid: string,
  allowedRoles: string[]
): Promise<boolean> {
  try {
    const userDoc = await firestore().collection('users').doc(uid).get();
    if (!userDoc.exists) return false;

    const userData = userDoc.data();
    return allowedRoles.includes(userData?.role || '');
  } catch (error) {
    console.error('Error checking user role:', error);
    return false;
  }
}
```

### 2. Add Rate Limiting

**Install dependency**:
```bash
cd functions
npm install express-rate-limit
```

**Update webhook**:
```typescript
import * as rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit per IP
  message: { ok: false, error: 'Too many requests' }
});

export const leadWebhook = onRequest({ cors: true }, (req, res) => {
  limiter(req, res, async () => {
    // ... existing logic
  });
});
```

### 3. Add Request Size Limit

**Update all endpoints**:
```typescript
import * as express from 'express';

const app = express();
app.use(express.json({ limit: '10kb' }));
```

## 📋 Manual Testing Checklist

After fixing automated issues, test these manually:

- [ ] Rep user cannot access `/getTeamStats` (manager-only)
- [ ] Rep cannot view another rep's DSR
- [ ] Manager can approve expenses
- [ ] Manager can approve DSRs
- [ ] GPS accuracy >100m is rejected
- [ ] Photo uploads >5MB are rejected
- [ ] Concurrent check-ins are prevented
- [ ] Negative expense amounts are rejected

## 🎯 Production Readiness

**Current Status**: 85% ready

**Blockers**:
1. Fix role validation (2 hours)
2. Add rate limiting (3 hours)
3. Complete manual testing (1 day)

**Estimated Time to Production**: ~1 week

## 📖 Understanding the Reports

### EXECUTIVE_SUMMARY.md
Start here for a high-level overview. Contains:
- Project completion status
- Critical issues summary
- Quick recommendations
- Timeline to production

### SECURITY_AUDIT_REPORT.md
Detailed security findings. Contains:
- Vulnerability descriptions
- Code examples
- Fix recommendations
- Test methodology

### CODE_REVIEW.md
Comprehensive code quality analysis. Contains:
- Architecture review
- Code quality assessment
- Performance analysis
- Mobile app evaluation

## 🔄 Continuous Testing

### Recommended Schedule

**Before Each Deployment**:
```bash
./test-suite.sh
```

**Weekly**:
```bash
npm audit
node firestore-rules-test.js
```

**Monthly**:
- Review security reports
- Update dependencies
- Run full penetration test

## 🤝 Contributing

When adding new features:

1. Update `test-suite.sh` with relevant tests
2. Update Firestore rules tests if adding collections
3. Run all tests before deploying
4. Update security reports if findings change

## 📞 Support

For questions about security testing:
1. Check the detailed reports in this directory
2. Review the test scripts for examples
3. Consult [CLAUDE.md](../CLAUDE.md) for architecture context

## 🔗 Related Documentation

- [../PROGRESS.md](../PROGRESS.md) - Project progress tracking
- [../CLAUDE.md](../CLAUDE.md) - AI development context
- [../firestore.rules](../firestore.rules) - Security rules source

---

**Last Updated**: October 13, 2025
**Next Review**: After critical fixes implemented
