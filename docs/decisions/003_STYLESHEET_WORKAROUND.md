# 003: StyleSheet Workaround ("Simple" Screen Variants)

**Date**: October 17, 2025
**Status**: ✅ Implemented (Temporary)
**Deciders**: Development Team

---

## Context

During manager dashboard implementation, certain screens encountered a **StyleSheet module initialization error** when using `StyleSheet.create()`:

```
Error: Cannot read property 'create' of undefined
Module: StyleSheet
Screens affected: ManagerHomeScreen.tsx, TeamScreen.tsx
```

### Requirements
- Manager dashboard must be functional immediately
- Cannot block deployment for investigation
- Must maintain code quality where possible

---

## Decision

**Create "Simple" screen variants with inline styles instead of StyleSheet.create()**

Files created:
- `ManagerHomeScreenSimple.tsx` (instead of ManagerHomeScreen.tsx)
- `TeamScreenSimple.tsx` (instead of TeamScreen.tsx)

Navigator updated to use "Simple" versions.

---

## Rationale

### 1. Immediate Functionality
- Manager features needed urgently
- StyleSheet investigation would take days
- Inline styles work reliably

### 2. Isolated Impact
- Only 2 screens affected
- Other screens use StyleSheet successfully
- Easy to revert later

### 3. Performance Acceptable
- Inline styles slightly less performant
- But difference negligible for these screens
- User experience unaffected

---

## Consequences

### Positive ✅
1. **Unblocked development**: Manager dashboard shipped on time
2. **Isolated workaround**: Only 2 files affected
3. **Clear naming**: "Simple" suffix indicates temporary nature

### Negative ❌
1. **Code duplication**: Two versions of same screens
2. **Technical debt**: Not a permanent solution
3. **Inconsistent patterns**: Mix of StyleSheet and inline styles

### Risks & Mitigations

**Risk**: Workaround becomes permanent
- **Mitigation**: Document clearly, add TODO comments, investigate root cause

**Risk**: Other screens hit same issue
- **Mitigation**: If happens again, prioritize investigation

---

## Root Cause (Hypothesis)

**Suspected**: Circular dependency or import order issue
- StyleSheet module not initialized when screen imports it
- Possibly related to React Navigation setup
- Needs deeper investigation with React Native debugger

---

## Alternatives Considered

### Alternative 1: Delay Manager Features
- **Pros**: Time to investigate properly
- **Cons**: Blocks critical feature
- **Why rejected**: Business need urgent

### Alternative 2: Rewrite All Screens with Inline Styles
- **Pros**: Consistency
- **Cons**: Worse performance everywhere, lots of code changes
- **Why rejected**: Overreaction to isolated issue

### Alternative 3: Use Different Styling Library
- **Pros**: Might avoid issue
- **Cons**: Major refactor, learning curve, risk
- **Why rejected**: Too risky for temporary issue

---

## Implementation

### Before (Broken)
```typescript
// ManagerHomeScreen.tsx
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});

// Error: StyleSheet is undefined
```

### After (Working)
```typescript
// ManagerHomeScreenSimple.tsx
<View style={{
  flex: 1,
  backgroundColor: '#FFFFFF',
}}>
  ...
</View>

// Works fine
```

---

## Files Affected

- **Created**: `mobile/src/screens/manager/ManagerHomeScreenSimple.tsx`
- **Created**: `mobile/src/screens/manager/TeamScreenSimple.tsx`
- **Unused**: `mobile/src/screens/manager/ManagerHomeScreen.tsx` (kept for reference)
- **Unused**: `mobile/src/screens/manager/TeamScreen.tsx` (kept for reference)
- **Updated**: `mobile/src/navigation/ManagerTabNavigator.tsx` (uses "Simple" versions)

---

## TODO: Investigation Steps

1. **Check import order** in ManagerHomeScreen.tsx
2. **Verify React Navigation setup** - any circular dependencies?
3. **Test with fresh Expo project** - can we reproduce?
4. **Check StyleSheet module** initialization in debugger
5. **Review any custom babel/metro config** that might affect StyleSheet
6. **Try on different devices/emulators** - is it device-specific?

---

## Cleanup Plan

Once root cause found and fixed:
1. Consolidate back to single version (remove "Simple" suffix)
2. Apply fix to original screens
3. Test thoroughly
4. Delete "Simple" variants
5. Update navigator imports

---

## References

- **Implementation**: [docs/features/MANAGER_FEATURES.md](../features/MANAGER_FEATURES.md)
- **Navigation**: [docs/architecture/NAVIGATION.md](../architecture/NAVIGATION.md)

---

## Lessons Learned

1. **Pragmatism wins**: Sometimes workaround is right answer
2. **Document everything**: Clear docs prevent workaround becoming permanent
3. **Name intentionally**: "Simple" suffix signals temporary nature
4. **Isolate impact**: Don't let one issue spread to whole codebase

---

**Last Updated**: October 17, 2025
**Status**: Temporary workaround in place. Investigation needed but not urgent.
