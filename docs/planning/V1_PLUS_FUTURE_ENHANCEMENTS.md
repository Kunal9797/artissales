# V1+ Future Enhancements

**Status**: Planning
**Last Updated**: 2025-10-25
**Owner**: Kunal Gupta

---

## Overview

This document captures all feature ideas and enhancements to be implemented **after V1 MVP** is deployed and beta tested. Features are categorized by priority and complexity.

---

## 🎯 High Priority (Post-V1 Phase 1)

### 1. Lead Auto-Assignment System
**Status**: Planned
**Effort**: Medium (2-3 weeks)
**Value**: High - Critical for scaling lead routing

**Description**:
- Automatic lead assignment based on pincode routing
- 4-hour SLA tracking and escalation
- Webhook integration from website contact forms
- SLA breach notifications to managers

**Technical Requirements**:
- `pincodeRoutes` collection implementation
- Lead webhook Cloud Function (`POST /webhooks/lead`)
- SLA escalator scheduled function
- FCM notifications for assignment

**Dependencies**:
- None (independent feature)

**Reference**: See `CLAUDE.md` sections on Lead Routing & SLA

---

### 2. Interactive Map View for Accounts & Users
**Status**: Proposed (NEW)
**Effort**: Medium-High (3-4 weeks)
**Value**: High - Visual territory management

**Description**:
- Map-based visualization of all accounts (distributors, dealers, architects) across India
- Color-coded markers by account type and user assignment
- Tap account marker to see details and visit history
- Filter by:
  - Account type (distributor/dealer/architect)
  - Assigned rep
  - Territory/zone
  - Recent activity (e.g., visited in last 30 days)
- Show user (rep) locations as distinct markers
- Cluster markers when zoomed out for performance

**Use Cases**:
1. **Territory Planning**: Managers see coverage gaps and account density
2. **User Assignment**: Visualize which rep owns which accounts geographically
3. **Pattern Analysis**: Identify distributor territories and dealer clusters
4. **Visit Planning**: Reps see nearby accounts to optimize routes

**Technical Requirements**:
- **Library**: `react-native-maps` (already in tech stack)
- **Data**: Denormalize account lat/lng in `accounts` collection
  - Add `geo: GeoPoint` field to accounts
  - Backfill from city/pincode → geocoding API (one-time)
- **Clustering**: `react-native-map-clustering` for performance
- **Firestore Query**: Geohash queries for viewport-based loading (use `geofire-common`)
- **Security**: Ensure Firestore rules allow read access based on role

**UI Specifications**:
- **Map Screen** (new tab in Manager Dashboard or standalone)
  - Filter panel (collapsible)
  - Legend for marker colors
  - Account detail bottom sheet on marker tap
- **Marker Icons**:
  - Distributor: Red pin
  - Dealer: Blue pin
  - Architect: Green pin
  - Rep: Yellow person icon
- **Cluster Icons**: Show count in circle

**Data Model Changes**:
```typescript
// accounts/{accountId}
{
  // ... existing fields
  geo?: GeoPoint;        // NEW: Latitude/longitude
  geohash?: string;      // NEW: For efficient geo queries
  geoUpdatedAt?: Timestamp;
}
```

**Implementation Phases**:
1. Add `geo` field to accounts collection (migration)
2. Implement geocoding for existing accounts (Cloud Function)
3. Build map screen with basic markers
4. Add clustering and filtering
5. Implement marker tap → detail view
6. Add legend and user markers

**Future Enhancements (V2)**:
- Route optimization: Select multiple accounts → generate optimal route
- Heatmap overlay for visit frequency
- Draw custom territory boundaries
- Offline map tiles caching

---

### 3. Sales Verification Workflow
**Status**: Planned
**Effort**: Medium (2-3 weeks)
**Value**: High - Required for incentive calculation

**Description**:
- Manager review of `sheetsSales` reported by reps
- Cross-check with distributor invoices/records
- Approve/reject mechanism
- Verified sales used for incentive calculation

**Technical Requirements**:
- `verified`, `verifiedBy`, `verifiedAt` fields already in schema
- Manager UI for sales review queue
- Filter: pending verification + date range
- Bulk approve/reject actions

**Dependencies**:
- Distributor account linking (may need to add `distributorId` validation)

---

### 4. Expense Approval Workflow
**Status**: Partial (schema exists, UI pending)
**Effort**: Low-Medium (1-2 weeks)
**Value**: Medium - Streamlines expense management

**Description**:
- Manager dashboard for reviewing expense claims
- Receipt photo viewing
- Approve/reject with comments
- Export approved expenses to CSV

**Technical Requirements**:
- `expenses` collection already exists
- Build manager review UI
- Add CSV export function
- Notifications for status changes

**Dependencies**:
- None

---

## 🚀 Medium Priority (Post-V1 Phase 2)

### 5. Advanced Analytics & Reporting
**Status**: Proposed
**Effort**: High (4-6 weeks)
**Value**: Medium-High

**Features**:
- BigQuery export of Firestore data
- Custom dashboards with charts (e.g., Chart.js, Recharts)
- Trend analysis (visits over time, sales growth)
- Comparative reports (rep performance, territory comparison)
- Predictive analytics (sales forecasting)

**Technical Requirements**:
- Firestore → BigQuery daily export (Cloud Function)
- Looker Studio or custom dashboard
- Time-series queries

---

### 6. Product Catalog & Inventory Sync
**Status**: Proposed
**Effort**: High (5-6 weeks)
**Value**: Medium

**Description**:
- Digital catalog of all laminates (Fine Decor, Artvio, Woodrica, Artis)
- Product images, SKUs, prices, stock levels
- Sync with ERP (if available)
- Sample request tracking

**Technical Requirements**:
- `products` collection
- Image hosting in Firebase Storage
- ERP integration (CSV import or API)
- Search/filter UI

---

### 7. Quoting & Invoicing Module
**Status**: Proposed
**Effort**: High (6-8 weeks)
**Value**: Medium

**Description**:
- Reps create quotes on mobile
- PDF generation
- Quote approval workflow
- Track quote → order conversion

**Technical Requirements**:
- `quotes` collection
- PDF generation (Cloud Functions + Puppeteer)
- Email delivery
- Invoice numbering system

---

### 8. Route Optimization
**Status**: Proposed
**Effort**: Medium-High (3-4 weeks)
**Value**: Medium

**Description**:
- Plan daily visit routes
- Google Maps Directions API integration
- Optimize for distance/time
- Save planned routes

**Technical Requirements**:
- Google Maps Directions API
- Route calculation algorithm
- UI for route planning

---

### 9. Full-Text Search (Algolia)
**Status**: Proposed
**Effort**: Medium (2-3 weeks)
**Value**: Low-Medium

**Description**:
- Search leads, accounts, users by name/phone/city
- Instant search results
- Typo tolerance

**Technical Requirements**:
- Algolia integration
- Firestore → Algolia sync (Cloud Function triggers)
- Search UI components

---

## 📱 User Experience Enhancements

### 10. Multi-Language Support
**Status**: Proposed
**Effort**: Medium (3-4 weeks)
**Value**: High (for regional adoption)

**Languages**:
- Hindi
- Tamil
- Telugu
- Gujarati
- Marathi

**Technical Requirements**:
- `i18next` or `react-native-localize`
- Translation files
- Language switcher in settings

---

### 11. WhatsApp Integration
**Status**: Proposed
**Effort**: Medium (2-3 weeks)
**Value**: Medium-High

**Features**:
- Send lead updates via WhatsApp
- DSR approval notifications
- Broadcast messages to team

**Technical Requirements**:
- WhatsApp Business API
- Twilio/MessageBird integration
- Message templates

---

### 12. Offline Maps & Route Caching
**Status**: Proposed
**Effort**: High (4-5 weeks)
**Value**: Medium

**Description**:
- Download map tiles for offline use
- Cache planned routes
- Works in low-connectivity areas

**Technical Requirements**:
- `react-native-offline-maps` or Mapbox
- Storage management (large downloads)

---

## 🔧 Technical Improvements

### 13. Performance Monitoring
**Status**: Proposed
**Effort**: Low (1 week)
**Value**: High

**Features**:
- Firebase Performance Monitoring
- Crash reporting (Crashlytics)
- Custom performance traces
- Slow query detection

---

### 14. Automated Testing
**Status**: Proposed
**Effort**: High (ongoing)
**Value**: High

**Features**:
- Unit tests (Jest)
- Integration tests (Cloud Functions)
- E2E tests (Detox or Maestro)
- CI/CD pipeline (GitHub Actions)

---

### 15. Push Notification Enhancements
**Status**: Proposed
**Effort**: Low (1 week)
**Value**: Medium

**Features**:
- Rich notifications (images, actions)
- Notification categories
- In-app notification center
- Notification preferences

---

## 🔐 Security & Compliance

### 16. Data Export & GDPR Compliance
**Status**: Proposed
**Effort**: Medium (2-3 weeks)
**Value**: Medium (required for privacy compliance)

**Features**:
- User data export (JSON/CSV)
- Account deletion workflow
- Data retention policies
- Audit logs

---

### 17. Two-Factor Authentication
**Status**: Proposed
**Effort**: Low-Medium (1-2 weeks)
**Value**: Medium

**Features**:
- SMS OTP for sensitive actions
- TOTP app support (Google Authenticator)
- Backup codes

---

## 📊 Feature Priority Matrix

| Feature | Priority | Effort | Value | Phase |
|---------|----------|--------|-------|-------|
| Lead Auto-Assignment | **P0** | Medium | High | Phase 1 |
| Map View (Accounts/Users) | **P0** | Medium-High | High | Phase 1 |
| Sales Verification | **P0** | Medium | High | Phase 1 |
| Expense Approval | P1 | Low-Medium | Medium | Phase 1 |
| Advanced Analytics | P1 | High | Medium-High | Phase 2 |
| Product Catalog | P2 | High | Medium | Phase 2 |
| Route Optimization | P2 | Medium-High | Medium | Phase 2 |
| Multi-Language | P1 | Medium | High | Phase 2 |
| WhatsApp Integration | P1 | Medium | Medium-High | Phase 2 |
| Full-Text Search | P2 | Medium | Low-Medium | Phase 3 |
| Quoting/Invoicing | P2 | High | Medium | Phase 3 |

---

## 🗓️ Tentative Roadmap

### Phase 1 (Post-V1, Month 1-2)
- Lead auto-assignment + SLA tracking
- Map view for accounts and users
- Sales verification workflow
- Expense approval workflow

### Phase 2 (Month 3-4)
- Advanced analytics & BigQuery export
- Multi-language support
- WhatsApp integration
- Route optimization

### Phase 3 (Month 5+)
- Product catalog
- Quoting/invoicing
- Full-text search
- Offline maps

---

## 📝 Notes

- **User Feedback**: After beta testing V1, prioritize features based on user requests
- **Technical Debt**: Allocate 20% time to refactoring and testing improvements
- **Incremental Rollout**: Test new features with subset of users before full deployment

---

## 🔗 Related Documents

- [CLAUDE.md](../../CLAUDE.md) - Project overview & V1 scope
- [proposal.md](../proposal.md) - Original requirements
- [MANAGER_DASHBOARD_COMPLETE.md](../implementation/MANAGER_DASHBOARD_COMPLETE.md)
- [SALES_REP_COMPLETE.md](../implementation/SALES_REP_COMPLETE.md)

---

**Last Updated**: 2025-10-25
**Next Review**: After V1 beta testing (estimated 2025-11)