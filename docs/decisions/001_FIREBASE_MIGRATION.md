# 001: Migration from Supabase to Firebase

**Date**: October 2025
**Status**: ✅ Implemented
**Deciders**: Kunal Gupta (Product Owner), Development Team

---

## Context

The original [proposal.md](../proposal.md) specified **Supabase (Postgres) + Row-Level Security (RLS)** as the backend stack. However, during early development, we identified key requirements that led to reconsidering this choice:

### Requirements
- **Offline-first**: Field sales reps work in areas with poor connectivity
- **Real-time sync**: Managers need live updates on team activity
- **Mobile-first**: React Native integration must be seamless
- **Scalability**: System must handle growing user base
- **Cost-effective**: Pay-as-you-go pricing for startup phase

### Problem
While Supabase offers excellent features for web apps, the React Native experience and offline capabilities were less mature at the time of evaluation (October 2025).

---

## Decision

**We migrated from Supabase/Postgres to Firebase/Firestore.**

Complete backend stack change:
- **Database**: Postgres → Cloud Firestore
- **Auth**: Supabase Auth → Firebase Auth
- **Storage**: Supabase Storage → Cloud Storage
- **Functions**: Supabase Edge Functions → Cloud Functions for Firebase
- **Realtime**: Supabase Realtime → Firestore real-time listeners

---

## Rationale

### 1. Offline-First Capabilities
**Firebase**: Built-in offline persistence with automatic sync
```typescript
firestore().settings({
  persistence: true  // Automatic offline support
});
```

**Supabase**: Requires manual implementation of offline queue

### 2. Mobile SDK Maturity
**Firebase**: `@react-native-firebase/*` packages are mature, well-documented, widely used
**Supabase**: React Native support was less mature (October 2025)

### 3. Real-time Sync
**Firebase**: Real-time listeners built into Firestore
```typescript
firestore().collection('visits')
  .onSnapshot(snapshot => {
    // Automatic real-time updates
  });
```

**Supabase**: Requires separate Realtime setup

### 4. Proven Offline Patterns
**Firebase**: Firestore handles:
- Write queuing when offline
- Conflict resolution
- Optimistic updates
- Automatic retry

**Supabase**: Would require custom implementation

### 5. Cost Predictability
**Firebase**: Free tier generous, pay-as-you-go scales smoothly
**Supabase**: Free tier limited, then fixed pricing tiers

---

## Consequences

### Positive ✅

1. **Excellent Offline Support**
   - Automatic write queuing
   - Seamless online/offline transitions
   - No additional code needed

2. **Mature React Native SDKs**
   - Well-documented
   - Active community support
   - Frequent updates

3. **Real-time by Default**
   - No additional setup
   - Efficient bandwidth usage
   - Works offline → online automatically

4. **Scalability**
   - Auto-scales to millions of users
   - No infrastructure management
   - Global CDN for Storage

5. **Rich Ecosystem**
   - Cloud Functions (serverless)
   - FCM (push notifications)
   - Analytics, Crashlytics built-in
   - Authentication providers

### Negative ❌

1. **NoSQL Data Model**
   - No SQL joins (must denormalize)
   - Query limitations (no OR queries without multiple queries)
   - Learning curve for team used to SQL

2. **Vendor Lock-in**
   - Harder to migrate away from Firebase
   - Firestore-specific query syntax
   - Custom SDK patterns

3. **Cost at Scale**
   - Document reads/writes can add up
   - Storage + bandwidth costs
   - Need to optimize queries carefully

4. **Lost Postgres Features**
   - No transactions across collections (limited)
   - No stored procedures
   - No foreign keys
   - No complex joins

### Risks & Mitigations

**Risk 1**: Cost overruns at scale
- **Mitigation**: Monitor usage, optimize queries, use composite indexes
- **Monitoring**: Firebase Console usage dashboard

**Risk 2**: Query limitations
- **Mitigation**: Denormalize data, use composite indexes, client-side filtering when needed
- **Example**: Store `accountName` in `visits` collection to avoid join

**Risk 3**: Vendor lock-in
- **Mitigation**: Abstract Firestore behind service layer, document data model thoroughly
- **Future**: Could migrate to self-hosted if needed (export to BigQuery)

---

## Alternatives Considered

### Alternative 1: Keep Supabase
- **Pros**:
  - SQL familiarity
  - Row-Level Security (RLS)
  - Open-source (self-hostable)
- **Cons**:
  - Less mature React Native support
  - Manual offline implementation
  - Realtime requires separate setup
- **Why rejected**: Offline-first requirement is critical for field sales; manual implementation too risky

### Alternative 2: AWS Amplify + AppSync
- **Pros**:
  - Offline sync with AWS AppSync
  - GraphQL API
  - AWS ecosystem
- **Cons**:
  - More complex setup
  - Higher learning curve
  - More expensive at small scale
- **Why rejected**: Overkill for current needs, Firebase simpler and more cost-effective

### Alternative 3: Custom Backend (Node.js + PostgreSQL + Redis)
- **Pros**:
  - Full control
  - Any database choice
  - No vendor lock-in
- **Cons**:
  - Must implement offline sync from scratch
  - Infrastructure management
  - Higher development time
  - DevOps overhead
- **Why rejected**: Too much overhead for startup phase; Firebase lets us focus on features

---

## Implementation Impact

### Files Changed
- **Created**: `functions/src/` (35+ TypeScript files)
- **Created**: `mobile/src/services/firebase.ts`
- **Created**: `firestore.rules` (security rules)
- **Deleted**: All Supabase-related code
- **Updated**: All data access code to use Firestore API

### Data Model Changes
- **Before**: Relational tables with foreign keys
- **After**: Denormalized NoSQL collections with embedded data

**Example**:
```typescript
// Before (Postgres)
visits: {
  id, userId, accountId, ...
}
// Need JOIN to get account name

// After (Firestore)
visits: {
  id, userId, accountId,
  accountName,  // Denormalized
  accountType   // Denormalized
}
// No JOIN needed
```

### Timeline
- **Decision**: Early October 2025
- **Migration**: October 9-12, 2025
- **Testing**: October 13-15, 2025
- **Complete**: October 16, 2025

---

## References

- **Original Proposal**: [docs/proposal.md](../proposal.md) (specified Supabase)
- **Firestore Schema**: [docs/architecture/FIRESTORE_SCHEMA.md](../architecture/FIRESTORE_SCHEMA.md)
- **Security Rules**: `firestore.rules`
- **Firebase Usage Guide**: [docs/development/FIREBASE_USAGE.md](../development/FIREBASE_USAGE.md)

---

## Lessons Learned

1. **Offline-first is hard**: Don't underestimate offline complexity; use battle-tested solutions
2. **Mobile SDKs matter**: SDK maturity can make or break mobile development experience
3. **Denormalization is OK**: NoSQL requires different thinking, but enables better offline support
4. **Trade-offs are real**: Firebase solves offline/realtime beautifully but costs more at scale

---

## Future Considerations

- **Monitor costs** carefully as user base grows
- **Optimize queries** to reduce read/write counts
- **Consider BigQuery export** for analytics (avoid expensive Firestore queries)
- **Evaluate alternatives** if cost becomes prohibitive (self-hosted Firebase alternatives exist)

---

**Last Updated**: October 17, 2025
**Status**: This decision is implemented and working well. No regrets so far.
