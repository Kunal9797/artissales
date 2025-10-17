# V2 Roadmap - Future Enhancements

**Last Updated**: October 17, 2025
**Status**: Planning Phase
**Timeline**: Post-V1 Launch

---

## 🎯 Overview

This document tracks features and improvements planned for V2, after the initial V1 launch is complete and stable.

---

## 📋 Code Quality & Refactoring

### 1. **Consolidate Account List Screens** ⭐ Priority
**Current State:**
- Two separate screens with ~90% duplicate code:
  - `SelectAccountScreen.tsx` (Sales Rep - for visit logging)
  - `AccountsListScreen.tsx` (Manager - for account management)

**Differences:**
| Feature | Sales Rep | Manager |
|---------|-----------|---------|
| Click Action | → Log Visit | → Account Details |
| Filter Order | Dealers first, Distributors last | Distributors second |
| Can Create | Dealer/Architect/Contractor | All (including Distributor) |
| Visible Accounts | Future: Territory-based | All accounts |

**V2 Approach:**
Create shared `AccountsListView` component with role-based configuration:

```tsx
// Option 1: Role-based props
<AccountsListView
  mode={user.role === 'rep' ? 'select' : 'manage'}
  onAccountClick={handleAccountClick}
  filterConfig={getFilterConfig(user.role)}
  permissions={getPermissions(user.role)}
/>

// Option 2: Two thin wrapper components
// Core: <AccountsList /> (shared logic)
// Wrappers: <SelectAccountScreen />, <AccountsListScreen />
```

**Benefits:**
- Single source of truth
- Easier maintenance
- Consistent behavior across roles
- Shared bug fixes

**Files to Refactor:**
- `mobile/src/screens/visits/SelectAccountScreen.tsx`
- `mobile/src/screens/manager/AccountsListScreen.tsx`
- Create: `mobile/src/components/AccountsListView.tsx`

**Estimated Effort**: 4-6 hours

---

## 🚀 New Features (From CLAUDE.md)

### 2. **Quoting/Invoicing Module**
- Generate quotes for customers
- Convert quotes to orders
- Track quote status (pending, approved, rejected)
- PDF export

### 3. **Expense Tracking Enhancements**
- Mileage tracking with GPS
- Automatic expense categorization
- Receipt OCR (extract amount/date from photo)
- Monthly expense reports

### 4. **Route Planning & Optimization**
- Google Maps integration
- Optimize daily visit routes
- Estimated travel time
- Turn-by-turn navigation

### 5. **Product Catalog & Inventory**
- Browse laminate catalogs (Fine Decor, Artvio, etc.)
- Check stock availability
- Sync with ERP system
- Sample request workflow

### 6. **Advanced Analytics**
- BigQuery export for data warehouse
- Custom dashboards for managers
- Predictive analytics (sales forecasting)
- Territory performance heatmaps

### 7. **Full-Text Search**
- Algolia integration
- Search accounts, leads, products
- Fuzzy matching
- Search filters

### 8. **Multi-Language Support**
- Hindi support
- Regional language support (Tamil, Telugu, etc.)
- Language switcher in settings
- RTL support if needed

### 9. **WhatsApp Integration**
- Lead updates via WhatsApp
- Send quotes/catalogs
- Order confirmations
- Automated notifications

---

## 🔧 Technical Improvements

### 10. **Territory-Based Account Filtering**
**Current**: Sales reps see all accounts
**V2**: Filter accounts by assigned territory/pincode

Implementation:
```typescript
// Add to Firestore query
const accountsQuery = query(
  collection(db, 'accounts'),
  where('territory', '==', user.territory)
);
```

### 11. **Performance Optimizations**
- Replace more FlatLists with FlashList
- Implement pagination for large lists
- Add infinite scroll
- Image lazy loading
- Offline-first caching improvements

### 12. **Enhanced Offline Support**
- Background sync when online
- Conflict resolution UI
- Offline indicator improvements
- Queue status visibility

### 13. **Testing Infrastructure**
- Add unit tests for business logic
- E2E tests with Detox
- Performance monitoring with Sentry
- Automated regression testing

---

## 🎨 UX Improvements

### 14. **Design System V2**
- Extract all components to shared library
- Storybook for component documentation
- Accessibility improvements (screen readers)
- Dark mode support

### 15. **Onboarding Flow**
- Interactive tutorial for new users
- Feature highlights
- Sample data for testing
- Video walkthroughs

### 16. **Enhanced Camera Features**
- Batch photo upload
- Photo filters/enhancement
- OCR for business cards
- QR code scanning

---

## 📊 Metrics & Success Criteria

**V2 Goals:**
- Reduce code duplication by 40%
- Improve app performance (60fps target)
- Support 10,000+ concurrent users
- 95%+ offline reliability
- <100ms average API response time

---

## 🗓️ Tentative Timeline

### Q1 2026 (Post V1 Launch + 3 months)
- ✅ Consolidate account screens
- ✅ Territory-based filtering
- ✅ Performance optimizations
- ✅ Testing infrastructure

### Q2 2026
- Product catalog
- Route planning
- Advanced analytics

### Q3 2026
- Quoting/invoicing
- Multi-language support
- WhatsApp integration

### Q4 2026
- Full-text search
- Dark mode
- Enhanced offline support

---

## 📝 Notes

- Prioritize based on user feedback from V1
- Each feature should have a separate design doc
- Maintain backward compatibility with V1 data
- Plan migration strategy for breaking changes

---

**Next Steps:**
1. Gather user feedback from V1 launch
2. Prioritize features based on business impact
3. Create detailed design docs for top 3 features
4. Allocate engineering resources

---

**Reference:**
- See `CLAUDE.md` section "Future Enhancements (Post-V1)" for original list
- See `docs/implementation/` for V1 completion status
