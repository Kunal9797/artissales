# 002: Bottom Tab Navigation with Center Log Button

**Date**: October 16, 2025
**Status**: ✅ Implemented
**Deciders**: Kunal Gupta (Product Owner), Design Team

---

## Context

The app needed an intuitive navigation system for field sales reps who:
- Use the app while on the move
- Need quick access to logging features
- Want to see their stats and history
- Must access documents offline

### Requirements
- **One-handed operation**: Reps often carry samples/catalogs
- **Quick actions**: Log visits/sheets/expenses frequently (multiple times per day)
- **Context awareness**: Always know current location in app
- **Professional feel**: Modern mobile app UX

---

## Decision

**5-tab bottom navigation with prominent center Log button**

```
┌──────┬──────┬──────┬──────┬──────┐
│ Home │Stats │ Log  │ Docs │  Me  │
│  🏠  │  📊 │  ➕  │  📄 │  👤  │
└──────┴──────┴──────┴──────┴──────┘
         Center button is larger/gold
```

**Log button opens bottom sheet menu with 4 quick actions**:
1. Log Sheet Sales
2. Log Visit
3. Report Expense
4. Attendance

**Manager gets similar 5-tab layout**:
```
┌──────┬──────┬──────┬──────┬──────┐
│ Home │ Team │ Accts│Review│  Me  │
│  🏠  │  👥 │  🏢 │  ✅ │  👤  │
└──────┴──────┴──────┴──────┴──────┘
```

---

## Rationale

### 1. Bottom Tabs = Industry Standard
- **Familiar**: Users know how to use it (iOS/Android pattern)
- **Always visible**: No hidden navigation
- **One-tap access**: Quick switching between sections
- **Thumb-friendly**: Easy to reach on large phones

### 2. Center Button = Visual Hierarchy
- **Most-used action**: Logging is primary use case
- **Prominent**: Larger size + gold color stands out
- **Intentional**: Design signals importance
- **Professional**: Looks polished, not accidental

### 3. Bottom Sheet Menu = Organized Actions
- **Grouped**: All logging actions in one place
- **Quick**: Slides up, tap action, done
- **Dismissible**: Tap overlay to close
- **Discoverable**: Users find it immediately

### 4. 5 Tabs = Right Balance
- **Not too few**: More than 3 (minimum for interesting navigation)
- **Not too many**: Fewer than 7 (cognitive limit)
- **Each tab clear purpose**: Home, Stats, Log, Docs, Me

---

## Consequences

### Positive ✅

1. **Excellent UX**: Users report navigation is intuitive
2. **Fast access**: Log button always one tap away
3. **Context preservation**: Tab switching preserves state
4. **Professional feel**: Modern mobile app aesthetic
5. **Scalable**: Can add more actions to Log menu without cluttering UI

### Negative ❌

1. **Screen real estate**: Bottom tabs take 70-90px (Android/iOS)
2. **Limited tabs**: Can't add more than 5-6 tabs (UX best practice)
3. **Log button position**: Some users initially confused (feedback addressed by improving visual design)

### Risks & Mitigations

**Risk**: Users don't discover Log button
- **Mitigation**: Onboarding tour, larger size, gold color, clear label

**Risk**: Too many logging options
- **Mitigation**: Keep menu to 4 core actions, add more only if critical

---

## Alternatives Considered

### Alternative 1: Drawer Navigation
```
☰ Menu (hamburger icon)
  → Opens drawer from left
  → List of all screens
```

- **Pros**: Can fit unlimited items, familiar pattern
- **Cons**: Hidden (extra tap), not always visible, takes full screen
- **Why rejected**: Extra tap for common actions; field reps need speed

### Alternative 2: Floating FAB (Original Design)
```
Floating action button above tab bar
```

- **Pros**: Very prominent, stands out
- **Cons**: Confusing placement, blocks content, awkward
- **Why rejected**: User feedback: "fab button placement i dont understand"

### Alternative 3: Single Stack Navigation
```
Home screen with cards for each action
No tabs, just screens that stack
```

- **Pros**: Simple, no tab bar overhead
- **Cons**: Lose context, back button confusion, no quick switching
- **Why rejected**: Users want to see stats while on home, quick tab switching

### Alternative 4: Hybrid (Tabs + Drawer)
```
3 bottom tabs + drawer for overflow
```

- **Pros**: Best of both worlds
- **Cons**: Complexity, confusing, inconsistent
- **Why rejected**: Overengineered, users confused by two navigation patterns

---

## Implementation Details

### Tab Navigator Structure
```typescript
<Tab.Navigator screenOptions={{...}}>
  {/* Tab Screens */}
  <Tab.Screen name="Home" component={HomeScreen_v2} />
  <Tab.Screen name="Stats" component={StatsScreen} />
  <Tab.Screen name="Log" component={LogButton} />
  <Tab.Screen name="Docs" component={DocumentsScreen} />
  <Tab.Screen name="Me" component={ProfileScreen} />

  {/* Stack Screens (hidden from tabs) */}
  <Tab.Screen
    name="Attendance"
    component={AttendanceScreen}
    options={{tabBarButton: () => null}}
  />
  ...
</Tab.Navigator>
```

### Log Button Component
```typescript
// Integrated into tab bar (not floating)
const LogTabButton = () => (
  <TouchableOpacity onPress={() => setShowMenu(true)}>
    <View style={styles.logButton}>  {/* 52x52dp gold circle */}
      <Plus size={32} color={colors.text.dark} strokeWidth={3} />
    </View>
    <Text style={styles.label}>Log</Text>
  </TouchableOpacity>
);
```

### Bottom Sheet Menu
```typescript
<Modal visible={showMenu} transparent animationType="fade">
  <Pressable onPress={closeMenu}>  {/* Tap overlay to close */}
    <View style={styles.menuContainer}>
      <MenuItem icon="📊" label="Log Sheet Sales" onPress={...} />
      <MenuItem icon="🏢" label="Log Visit" onPress={...} />
      <MenuItem icon="💰" label="Report Expense" onPress={...} />
      <MenuItem icon="✓" label="Attendance" onPress={...} />
    </View>
  </Pressable>
</Modal>
```

---

## User Feedback & Iterations

### Initial Design (Floating FAB)
**Feedback**: "nav bar at the bottom does look good and is too at the bottom", "the fab button placement i dont understand"

**Action**: Redesigned Log button as integrated tab (not floating), increased tab bar height/padding

### Current Design (Integrated Log Button)
**Result**: No confusion, users immediately understand navigation

---

## Files Affected

- **`mobile/src/navigation/TabNavigator.tsx`** - Sales rep navigation
- **`mobile/src/navigation/ManagerTabNavigator.tsx`** - Manager navigation
- **`mobile/src/navigation/RootNavigator.tsx`** - Role-based routing
- **`docs/implementation/TABS_IMPLEMENTED.md`** - Implementation notes (now archived)

---

## References

- **Architecture**: [docs/architecture/NAVIGATION.md](../architecture/NAVIGATION.md)
- **Implementation**: [docs/features/SALES_REP_FEATURES.md](../features/SALES_REP_FEATURES.md)
- **Design**: [docs/planning/DESIGN_REVAMP.md](../planning/DESIGN_REVAMP.md) (archived)

---

## Lessons Learned

1. **Listen to user feedback**: Floating FAB was confusing, integrated button solved it
2. **Visual hierarchy matters**: Center button size + color makes purpose clear
3. **Industry patterns work**: Bottom tabs are familiar, don't reinvent the wheel
4. **Test with real users**: Internal testing missed FAB confusion, user caught it immediately

---

## Future Considerations

- **Badge counts**: Add notification dots to tabs (e.g., pending DSRs)
- **Animations**: Smooth transitions between tabs
- **Haptic feedback**: Tactile response on tab press
- **Customization**: Let managers configure tab order (low priority)

---

**Last Updated**: October 17, 2025
**Status**: Implemented and working well. User feedback is positive.
