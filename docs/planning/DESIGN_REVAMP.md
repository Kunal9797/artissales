# Artis Sales App - Design Revamp Documentation

**Project**: Field Sales Tracking App for Artis Laminates
**Owner**: Kunal Gupta
**Document Created**: October 15, 2025
**Status**: 🎨 Design Revamp Phase - Discovery & Planning

---

## 🎯 Executive Summary: What We Want to Achieve

### Core Goals (The "Why")
1. **Apply Design System Consistently** - Use DS v0.1 components across all 20+ screens (only 1 screen uses it currently)
2. **Simplify Navigation** - Reduce taps to key features (from 3-4 taps to 1-2 taps)
3. **Improve Visual Hierarchy** - Make important info stand out (KpiCards, larger progress bars, better spacing)
4. **Reduce Home Screen Clutter** - Simplify from 10+ cards to 5 essential cards
5. **Standardize Patterns** - Use EmptyState/ErrorState/Skeleton everywhere (no more ad-hoc UI)
6. **Polish Interactions** - Add press states, animations, haptic feedback (feels responsive)

### What We're NOT Doing
❌ Creating new components (we already have them)
❌ Complete redesign (we're applying existing design system)
❌ Adding major new features (focus on polish, not functionality)

### Success Criteria
✅ All screens use design system components (`/ui/*` and `/patterns/*`)
✅ No custom spinners, progress bars, or empty states
✅ Consistent visual language (same card styles, spacing, typography)
✅ Faster task completion (measured in taps and time)
✅ Better performance (FlashList on heavy lists)
✅ Polished feel (smooth animations, press feedback)

### Scope
- **Timeline**: 11-15 days (6 phases)
- **Screens to Migrate**: 20+ screens
- **New Navigation**: Bottom tabs + FAB (optional, need your decision)
- **Documentation**: Migration guide + before/after screenshots

### Your Action Items
1. ✅ Review this document and note missing items
2. ⚠️ **Make 3 key decisions** (see [Key Design Decisions](#key-design-decisions-to-make)):
   - Bottom tabs: Yes or No?
   - FAB menu: Radial or Bottom Sheet?
   - Colors: Category colors or Monochrome?
3. 🚀 Approve Phase 1 scope (HomeScreen + 3 core screens)
4. 📝 Add any missing goals/concerns below

---

### 📝 Your Additional Goals/Notes
*(Add anything I missed or want to clarify)*

-
-
-

---

## 📋 Table of Contents
1. [Current State Analysis](#current-state-analysis)
2. [Design System Overview](#design-system-overview)
3. [User Experience Issues](#user-experience-issues)
4. [Proposed Changes](#proposed-changes)
5. [Screen-by-Screen Review](#screen-by-screen-review)
6. [Design Principles](#design-principles)
7. [Implementation Plan](#implementation-plan)

---

## 🎯 Revamp Approach

### Building on DS v0.1 Foundation

Since Design System v0.1 is **complete** (all 6 PRs merged), our revamp will:

1. **Leverage Existing Components** - Use `/ui/*` and `/patterns/*` instead of creating new ones
2. **Convert Remaining Screens** - Migrate 20+ screens to use the design system (following AccountsListScreen pattern)
3. **Rethink Information Architecture** - Simplify navigation, reduce cognitive load
4. **Apply Visual Hierarchy** - Use existing KpiCard, EmptyState, ErrorState patterns consistently
5. **Optimize Performance** - Apply FlashList pattern to other heavy lists

### What We Have (DS v0.1)
✅ Token system (colors, spacing, typography, roles, states)
✅ Core components (Spinner, Badge, Toast, ProgressBar, Checkbox, Radio, Switch, Select, Tabs)
✅ Patterns (FiltersBar, EmptyState, ErrorState, Skeleton, KpiCard)
✅ Performance optimization pattern (FlashList + memoization)
✅ Tenant theming provider (white-label ready)
✅ Exemplar screen (AccountsListScreen)

### What We Need (This Revamp)
❌ **Navigation redesign** - Bottom tabs + FAB for quick actions
❌ **HomeScreen simplification** - Reduce from 10 cards to 5, apply KpiCard pattern
❌ **Screen conversions** - Migrate all screens to use design system
❌ **Visual hierarchy improvements** - Apply consistent card elevation, spacing, typography patterns
❌ **Empty/error states** - Replace ad-hoc "No data" with EmptyState pattern
❌ **Loading states** - Replace spinners with Skeleton pattern

### Migration Strategy
Instead of "redesigning from scratch", we'll:
1. Identify which DS v0.1 component/pattern fits each use case
2. Replace custom implementations with design system components
3. Follow AccountsListScreen as the exemplar
4. Document migration patterns for each screen type (list, form, dashboard)

---

## 🔍 Current State Analysis

### App Overview
- **Platform**: React Native + Expo SDK 54 (RN 0.81) - Android-first
- **User Base**: Sales reps + managers for Artis Laminates
- **Core Features**: Attendance tracking, visit logging, sheets sales, expense reporting, DSR, manager dashboard
- **Current Phase**: Phase 5 (Testing & Deployment) - 50% complete

### Design History

#### October 10, 2025 - Initial Design Revamp
- ✅ Brand color implementation (#393735 dark gray + #D4A944 gold)
- ✅ Logo variants created and integrated
- ✅ Lucide icons replaced emojis across all screens
- ✅ Dark brand headers implemented consistently
- ✅ Dynamic UI elements (e.g., login button color change)

#### October 14, 2025 - Design System v0.1 ✅ **COMPLETE**
**ALL 6 PRs MERGED** - Comprehensive design system foundation built:

**PR1: Theme Tokens** ✅
- Added `roles.ts` (success/warning/error/info colors)
- Added `states.ts` (focus/pressed/disabled/overlay states)
- Type-safe tokens with `tokens.d.ts`
- Design Lab for live token experimentation

**PR2: Core Components** ✅
- Spinner, Badge, Toast (with provider + hook)
- ProgressBar component
- Centralized AppStatusBar
- All components use role tokens from theme

**PR3: Form Controls** ✅
- Checkbox, Radio, Switch, Select, Tabs
- ≥48dp touch targets
- Accessible with proper ARIA roles
- Focus ring support from state tokens

**PR4: Patterns Library** ✅
- FiltersBar (quick chips + modal)
- EmptyState, ErrorState, Skeleton
- KpiCard (with auto-colored delta)
- AccountsListScreen converted as exemplar

**PR5: Performance** ✅
- FlashList integration on AccountsListScreen
- `estimatedItemSize=64` for account cards
- Proper memoization patterns established

**PR6: Tenant Theming** ✅
- TenantThemeProvider with runtime overrides
- `useTenantTheme()` hook
- Dev tenant demo in Kitchen Sink
- White-label readiness foundation

**What This Means:**
- ✅ Solid design system foundation exists
- ✅ Reusable components available (`/ui/*`)
- ✅ Patterns library ready (`/patterns/*`)
- ✅ Token system mature (roles + states)
- ✅ Exemplar screen (AccountsListScreen) shows best practices
- ✅ Performance optimization patterns documented

**Current Gap:**
- ⚠️ Only 1 screen (AccountsListScreen) fully converted to new system
- ⚠️ Remaining 20+ screens still use old ad-hoc patterns
- ⚠️ UX/information architecture not yet addressed
- ⚠️ Visual hierarchy needs rethinking across screens

### Current Design System

#### Colors
```typescript
// Brand Colors
primary: '#393735'        // Dark gray - headers, main buttons
accent: '#D4A944'         // Yellower gold - highlights, icons, CTAs

// Neutral
background: '#FFFFFF'
surface: '#F8F8F8'        // Card backgrounds
text.primary: '#1A1A1A'
text.secondary: '#666666'

// Status
success: '#4CAF50'
warning: '#FFA726'
error: '#EF5350'
info: '#42A5F5'
```

#### Typography
- **System Font**: Default system font (no custom fonts)
- **Sizes**: 12px (xs) → 32px (4xl)
- **Weights**: 400 (regular), 500 (medium), 600 (semiBold), 700 (bold)

#### Spacing
- **Grid**: 8px base unit
- **Standard**: 4px (xs), 8px (sm), 16px (md), 24px (lg), 32px (xl)
- **Screen Padding**: 24px
- **Border Radius**: 4px (sm), 8px (md), 12px (lg), 9999px (full)

---

## 🎯 Design System Overview

### Current Strengths
✅ **Consistent Brand Identity**: Dark gray + gold color scheme is recognizable
✅ **Professional Icons**: Lucide icons provide clean, consistent visuals
✅ **Dark Headers**: All screens have unified dark brand headers
✅ **Design Tokens**: colors.ts, spacing.ts, typography.ts provide centralized system
✅ **Component Library**: Card, Button, Logo components with variants
✅ **Cultural Appropriateness**: INR symbol instead of USD

### Current Weaknesses
⚠️ **Visual Hierarchy**: Some screens feel flat and lack depth
⚠️ **Information Density**: Cards can feel cramped or text-heavy
⚠️ **Touch Targets**: Some buttons/cards might be too small for easy tapping
⚠️ **Loading States**: Inconsistent loading/skeleton patterns
⚠️ **Empty States**: Some screens lack engaging empty state designs
⚠️ **Whitespace**: Inconsistent use of negative space
⚠️ **Color Usage**: Limited use of accent colors, mostly gray + gold
⚠️ **Animations**: Minimal micro-interactions and transitions

---

## 🚨 User Experience Issues

### Navigation Issues
1. **HomeScreen Clutter**: 8+ action cards on home screen - overwhelming
2. **Deep Navigation**: Some features buried 3+ levels deep
3. **Back Button Confusion**: Inconsistent back navigation patterns
4. **Tab Bar Missing**: No bottom tab navigation for key features

### Information Architecture
1. **Target Progress**: Shows on home, but requires API call (slow)
2. **Visit Progress**: Same API issue - redundant data fetching
3. **Quick Actions**: Not truly "quick" - require multiple taps
4. **Manager vs Rep Views**: Role-based routing happens late

### Visual Design Issues
1. **Card Monotony**: All cards look similar (gray boxes)
2. **Icon Colors**: Many icons use same accent color (lacks distinction)
3. **Text Contrast**: Some text on dark backgrounds hard to read
4. **Progress Bars**: Small, hard to see at a glance
5. **Button Styles**: All buttons look similar regardless of importance

### Interaction Issues
1. **No Swipe Gestures**: Could use swipe-to-delete, pull-to-refresh
2. **Modal Overload**: Full-screen modals for simple actions
3. **No Haptic Feedback**: Missing tactile responses
4. **Loading Spinners**: Generic, not branded

---

## 💡 Proposed Changes

### Phase 1: Information Architecture Redesign
**Goal**: Simplify navigation, reduce cognitive load

#### 1.1 Bottom Tab Navigation (New)
```
┌─────────────────────────────────┐
│         Screen Content          │
│                                 │
├─────┬──────┬──────┬──────┬─────┤
│ 🏠  │ 📊  │  ➕  │ 📋  │ 👤  │
│Home │Stats │ Log │Tasks │ Me  │
└─────┴──────┴──────┴──────┴─────┘
```

**Tabs**:
1. **Home**: Dashboard overview + quick actions (simplified)
2. **Stats**: Target progress, visit progress, monthly stats
3. **Log** (Center FAB): Quick log menu (sheets, expense, visit)
4. **Tasks**: DSR, pending approvals, documents
5. **Me**: Profile, settings, logout

**Benefits**:
- ✅ Reduces home screen clutter
- ✅ Single tap to key features
- ✅ Persistent navigation context
- ✅ Familiar mobile pattern

#### 1.2 Home Screen Simplification
**Current**: 8 action cards + 2 progress cards = 10 items
**Proposed**: 4 priority cards + 1 greeting card = 5 items

**New Home Layout**:
```
┌─────────────────────────────────┐
│ 🦚 Artis Sales        Welcome 👤│
│    Hi Kunal!                    │
├─────────────────────────────────┤
│ ✅ Attendance: Checked In       │ ← Status Card
│    Check-out at 6:00 PM         │
├─────────────────────────────────┤
│ 🎯 Today's Progress             │ ← Daily Card
│    3 visits | 250 sheets logged │
├─────────────────────────────────┤
│ 🔔 Pending Actions (2)          │ ← Alerts Card
│    • DSR pending approval       │
│    • Expense requires receipt   │
├─────────────────────────────────┤
│ 📚 Quick Resources              │ ← Documents Card
│    • Product Catalog            │
│    • Price List                 │
└─────────────────────────────────┘
```

#### 1.3 Floating Action Button (FAB)
**Replace**: Multiple "Log" buttons on home
**With**: Center tab bar FAB that opens radial menu

**FAB Menu** (tap center "+" button):
```
        📸 Log Visit
          ╲
    💰 ─── ➕ ─── 📊
          ╱
    Report Expense   Log Sheets
```

---

### Phase 2: Visual Design Enhancement

#### 2.1 Color System Expansion
**Current**: Mostly gray + gold
**Proposed**: Category-based color coding

```typescript
// Feature Colors (for visual distinction)
attendance: {
  primary: '#4CAF50',    // Green - attendance is "being present"
  light: '#E8F5E9',
}
visits: {
  primary: '#2196F3',    // Blue - visits are client-facing
  light: '#E3F2FD',
}
sheets: {
  primary: '#FF9800',    // Orange - sales/revenue
  light: '#FFF3E0',
}
expenses: {
  primary: '#9C27B0',    // Purple - money tracking
  light: '#F3E5F5',
}
dsr: {
  primary: '#00BCD4',    // Cyan - reports/data
  light: '#E0F7FA',
}
```

**Usage**: Each feature gets its own color for:
- Icon backgrounds
- Progress bars
- Status badges
- Card borders (subtle)

#### 2.2 Card Hierarchy System
**3 Card Levels** instead of 1:

1. **Primary Cards** (high priority actions)
   - Larger size (padding: 24px)
   - Stronger shadow (elevation.lg)
   - Feature color accent border (left: 4px)
   - Larger icons (32px)

2. **Secondary Cards** (informational)
   - Medium size (padding: 16px)
   - Medium shadow (elevation.md)
   - Gray border (1px)
   - Standard icons (24px)

3. **Tertiary Cards** (low priority)
   - Compact size (padding: 12px)
   - Light shadow (elevation.sm)
   - No border
   - Small icons (20px)

#### 2.3 Typography Enhancement
**Current**: All system fonts, flat hierarchy
**Proposed**: Keep system fonts, add visual hierarchy

```typescript
// Enhanced Typography Hierarchy
display: {
  fontSize: 36,          // Hero numbers (targets, stats)
  fontWeight: '700',
  letterSpacing: -0.5,
}
title: {
  fontSize: 24,          // Screen titles
  fontWeight: '600',
  letterSpacing: -0.2,
}
heading: {
  fontSize: 18,          // Card titles
  fontWeight: '600',
}
body: {
  fontSize: 16,          // Main text
  fontWeight: '400',
  lineHeight: 24,
}
caption: {
  fontSize: 12,          // Hints, metadata
  fontWeight: '400',
  color: text.secondary,
}
```

#### 2.4 Progress Bar Redesign
**Current**: Thin bars (8px), hard to see
**Proposed**: Chunky bars with better visuals

```
Before:
───────────────────

After:
█████████░░░░░░░░░░  75% (with gradient)
```

**New Progress Bar**:
- Height: 16px (double current)
- Gradient fill (light → dark)
- Rounded ends (full radius)
- Animated fill (0.3s ease)
- Percentage badge on right

---

### Phase 3: Micro-Interactions & Animations

#### 3.1 Card Interactions
```typescript
// Press States
onPress: {
  scale: 0.98,           // Subtle shrink
  opacity: 0.9,          // Slight fade
  duration: 150ms,       // Fast response
}

// Long Press (for contextual actions)
onLongPress: {
  vibrate: 'light',      // Haptic feedback
  showContextMenu: true,
}
```

#### 3.2 Page Transitions
**Current**: Instant/jarring
**Proposed**: Smooth slide animations

```typescript
// Stack Navigation
screenOptions: {
  animation: 'slide_from_right',
  gestureEnabled: true,    // Swipe back
}

// Tab Navigation
tabBarOptions: {
  animation: 'shift',      // Smooth tab switch
}
```

#### 3.3 Loading States
**Current**: Generic ActivityIndicator
**Proposed**: Branded skeletons

```
┌─────────────────────────────┐
│ ░░░░░ ░░░░░░░░            │ ← Shimmer effect
│ ░░░░░░░░░░░ ░░░            │
│                             │
│ ░░░░░░░░░ ░░░░░░░          │
│ ░░░ ░░░░░░░░               │
└─────────────────────────────┘
```

---

### Phase 4: Component Improvements

#### 4.1 TargetProgressCard Enhancement
**Current Issues**:
- Compact but cramped
- Hard to scan quickly
- No clear hierarchy
- Progress bars too small

**Proposed Design**:
```
┌─────────────────────────────────┐
│ 🎯 Sales Target          ✏️ Log │ ← Bigger header
│                                 │
│ Woodrica        ████████░░  87% │ ← Larger bars
│ 1,280 / 1,500 sheets           │ ← Show actual numbers
│                                 │
│ Fine Decor      ████░░░░░░  42% │
│ 520 / 1,200 sheets             │
│                                 │
│ Overall: 1,800 / 2,700 (67%)   │ ← Summary
└─────────────────────────────────┘
```

**Changes**:
- 📏 Increase bar height: 8px → 16px
- 🔢 Show actual numbers inline
- 📊 Add overall summary
- 🎨 Use category colors (orange for sheets)
- 🖼️ More padding (16px → 20px)

#### 4.2 HomeScreen Menu Cards
**Current**: All cards look identical
**Proposed**: Visual distinction by priority

**Example - Attendance Card** (high priority):
```
┌─────────────────────────────────┐
│ ●●●                             │ ← Green accent dots
│                                 │
│     ✅ 36                       │ ← Large icon + size
│     Attendance                  │
│                                 │
│     ⏱️ Checked in at 9:15 AM    │ ← Status
│     👉 Tap to check out         │ ← CTA
│                                 │
└─────────────────────────────────┘
```

**Example - Document Library** (low priority):
```
┌──────────────────┐
│ 📄 Documents  → │ ← Compact
└──────────────────┘
```

#### 4.3 Empty State Redesign
**Current**: Text-only "No data"
**Proposed**: Engaging illustrations + CTAs

```
┌─────────────────────────────────┐
│                                 │
│         📭                      │ ← Large icon
│         (illustration)          │
│                                 │
│    No sheets logged yet         │ ← Clear message
│    Start logging to track       │
│    your progress!               │
│                                 │
│    [ 📊 Log Your First Sale ]   │ ← CTA button
│                                 │
└─────────────────────────────────┘
```

---

## 📱 Screen-by-Screen Review

### 1. LoginScreen
**Current State**: ✅ Already well-designed
- Dark brand background
- Dynamic button (transparent → gold)
- Clean form layout

**Minor Improvements**:
- [ ] Add subtle animation on logo (fade in)
- [ ] Phone input mask (auto-format as user types)
- [ ] Error state styling (shake animation)

---

### 2. HomeScreen
**Current Issues**:
- ❌ Too many cards (10+ items)
- ❌ Flat hierarchy
- ❌ No quick actions
- ❌ Redundant API calls

**Redesign Priorities**:
1. **Reduce item count**: 10 → 5 cards
2. **Add tab navigation**: Bottom tabs
3. **Create FAB**: Center "Log" button with radial menu
4. **Status-first**: Show current attendance status prominently
5. **Smart greeting**: Time-based (Good morning/afternoon/evening)

**New Layout**:
```
┌─────────────────────────────────┐
│ 🦚 Artis            Good morning│ ← Dynamic greeting
│                          Kunal 👤│
├─────────────────────────────────┤
│                                 │
│ ⏰ 09:15 AM - 📍 Checked In    │ ← Attendance Status
│    Office                       │   (LARGE, prominent)
│    [ Check Out → ]             │
│                                 │
├─────────────────────────────────┤
│ 📊 Today's Summary              │ ← Condensed stats
│    3 visits • 250 sheets        │
│    [ View Details → ]          │
├─────────────────────────────────┤
│ 🔔 Action Items (2)             │ ← Pending tasks
│    • Complete DSR              │
│    • Upload expense receipt    │
├─────────────────────────────────┤
│ 📚 Quick Links                  │ ← Resources
│    💼 Product Catalog           │
│    💲 Price Lists               │
└─────────────────────────────────┘
          ┌─────┐
          │  ➕  │ ← FAB (floating)
          └─────┘
```

---

### 3. AttendanceScreen
**Current State**: ✅ Functional, but basic

**Improvements Needed**:
- [ ] Show location on mini-map (optional)
- [ ] Add working hours summary (e.g., "7h 45m today")
- [ ] Weekly calendar view (attendance history)
- [ ] GPS accuracy indicator (visual)

**Redesign**:
```
┌─────────────────────────────────┐
│ ← Attendance                    │
├─────────────────────────────────┤
│                                 │
│     Status: ✅ Checked In       │
│                                 │
│     ⏰ 09:15 AM                │
│     📍 Office                   │
│     🎯 GPS: 12m accuracy       │
│                                 │
│     ┌─────────────────────┐    │
│     │  📍 Mini Map        │    │ ← Optional map
│     │  (your location)    │    │
│     └─────────────────────┘    │
│                                 │
│ ─────────────────────────────── │
│                                 │
│ This Week                       │
│ Mon Tue Wed Thu Fri Sat Sun     │
│  ✅  ✅  ✅  ✅  ⚪  ⚪  ⚪     │ ← Calendar
│                                 │
│ Total: 7h 45m                   │
│                                 │
│     [ 🔴 Check Out ]           │ ← Big CTA
│                                 │
└─────────────────────────────────┘
```

---

### 4. Target Progress Card (Component)
**Current Issues**:
- ⚠️ Bars too small (8px)
- ⚠️ Hard to scan
- ⚠️ No context numbers

**Redesign**: See [4.1 TargetProgressCard Enhancement](#41-targetprogresscard-enhancement) above

---

### 5. Visit Progress Card (Component)
**Current State**: ✅ Better than target card, but could improve

**Improvements**:
- [ ] Larger icons (20px → 24px)
- [ ] Color-code by visit type (distributor=blue, dealer=orange, architect=purple)
- [ ] Add visual achievement badges (🏆 when target hit)

---

### 6. Manager Screens
**Current State**: Functional but basic

**Improvements Needed**:
- [ ] Better data visualization (charts instead of just numbers)
- [ ] Team member avatars/photos
- [ ] Quick actions (call, message team member)
- [ ] Filter and sort options
- [ ] Export to CSV/PDF (with loading progress)

---

## 🎨 Design Principles

### 1. Progressive Disclosure
**Principle**: Show essential info first, details on demand

**Example**:
- ❌ Don't show all DSR details on home
- ✅ Show "DSR pending" with tap to view

### 2. Clear Visual Hierarchy
**Principle**: Most important info should be most prominent

**Hierarchy Levels**:
1. **Critical**: Attendance status, pending approvals
2. **Important**: Daily progress, targets
3. **Secondary**: Resources, documents
4. **Tertiary**: Settings, less-used features

### 3. Consistent Interactions
**Principle**: Same gestures do same things everywhere

**Gestures**:
- Tap: Primary action
- Long press: Context menu
- Swipe right: Back/dismiss
- Swipe left: Quick actions (e.g., delete)
- Pull down: Refresh

### 4. Immediate Feedback
**Principle**: User actions should have instant visual response

**Feedback Types**:
- Touch: Scale down, opacity change (150ms)
- Success: Green checkmark + haptic (200ms)
- Error: Red shake + haptic (300ms)
- Loading: Skeleton/shimmer (not spinner)

### 5. Content-First Design
**Principle**: Content should drive layout, not vice versa

**Guidelines**:
- Flexible card heights (not fixed)
- Dynamic spacing (based on content)
- Graceful empty states
- Scalable text (accessibility)

---

## 🚀 Implementation Plan

**Note**: All phases leverage DS v0.1 components (`/ui/*` and `/patterns/*`) instead of creating new ones.

### Phase 1: Screen Conversions - Rep Core Flows (2-3 days)
**Goal**: Migrate high-traffic screens to design system patterns

**Screens to Convert:**
- [ ] **HomeScreen** → Use KpiCard for stats, apply EmptyState/ErrorState patterns
  - Reduce from 10 cards to 5 using KpiCard pattern
  - Replace loading with Skeleton
  - Use Badge for status indicators
- [ ] **AttendanceScreen** → Use Badge for status, EmptyState for first-time users
  - Apply KpiCard for daily summary (e.g., "7h 45m worked")
  - Use ProgressBar for daily goal (if applicable)
- [ ] **SheetsEntryScreen** → Use Select for catalog picker, Toast for success/error feedback
  - Apply Tabs for switching between catalog types
  - Use Badge for catalog status
- [ ] **LogVisitScreen** → Use Select for account/purpose selection
  - Apply EmptyState for "no accounts" scenario
  - Use Toast for photo upload feedback

**Success Metrics:**
- All 4 screens use design system components
- No custom spinners (use Skeleton)
- Consistent error handling (ErrorState)
- Reduced code duplication

---

### Phase 2: Screen Conversions - Manager Flows (2-3 days)
**Goal**: Apply patterns to manager dashboard screens

**Screens to Convert:**
- [ ] **ManagerHomeScreen** → Use KpiCard for team stats, FiltersBar for date selection
  - Apply Skeleton for loading team data
  - Use Badge for status indicators (online/offline)
- [ ] **UserListScreen** → Use FiltersBar, apply FlashList pattern
  - Follow AccountsListScreen exemplar (already done)
  - Use EmptyState/ErrorState
- [ ] **DSRApprovalListScreen** → Use FiltersBar (status/date), Badge for approval status
  - Apply FlashList if >20 items typically
  - Use KpiCard for summary stats
- [ ] **TeamTargetsScreen** → Use KpiCard, ProgressBar for team progress
  - Apply Tabs for switching between views (individual/team)

**Success Metrics:**
- Manager screens follow AccountsListScreen pattern
- Consistent filtering (FiltersBar)
- Performance optimized (FlashList on heavy lists)

---

### Phase 3: Navigation Redesign (3-4 days)
**Goal**: Add bottom tabs + FAB for better IA

**Tasks:**
- [ ] **Design bottom tab bar** (5 tabs: Home, Stats, Log, Tasks, Me)
  - Use existing design tokens (colors, spacing)
  - Apply states.pressed for press feedback
- [ ] **Create tab screens**
  - Home: Dashboard overview (simplified)
  - Stats: Target progress, visit progress, monthly charts
  - Log: FAB modal (sheets, expense, visit)
  - Tasks: DSR, pending approvals, documents
  - Me: Profile, settings, logout
- [ ] **Implement FAB** (center tab with radial menu or bottom sheet)
  - Use Toast for action feedback
  - Apply haptic feedback (if adding)
- [ ] **Migration**
  - Move features to appropriate tabs
  - Simplify HomeScreen to essentials
  - Test navigation flows

**Success Metrics:**
- Key features accessible in 1-2 taps (not 3-4)
- Clear navigation context (always know where you are)
- Reduced home screen clutter

---

### Phase 4: Progress Cards Enhancement (1-2 days)
**Goal**: Apply design system to custom components

**Components to Enhance:**
- [ ] **TargetProgressCard** → Use ProgressBar (16px height), apply KpiCard styling
  - Replace custom bars with design system ProgressBar
  - Use role colors (success/warning/error based on percentage)
  - Apply consistent spacing/typography
- [ ] **VisitProgressCard** → Similar treatment
  - Use Badge for account type tags
  - Apply KpiCard pattern for overall summary
- [ ] **Create AttendanceStatusCard** (new, prominent)
  - Large KpiCard variant for current status
  - Use Badge for "Checked In" indicator
  - Show working hours as KPI

**Success Metrics:**
- All progress indicators use ProgressBar component
- Consistent visual hierarchy (KpiCard pattern)
- Better scanability (larger bars, clearer labels)

---

### Phase 5: Polish & Micro-interactions (2 days)
**Goal**: Add animations and final touches

**Tasks:**
- [ ] **Apply press states** from states.ts to all cards
  - Scale: 0.98, opacity: 0.92
  - 150ms duration
- [ ] **Add haptic feedback** (optional)
  - Light haptic on button press
  - Medium haptic on success action
- [ ] **Page transitions**
  - Slide animations on stack navigation
  - Fade on tab switches
- [ ] **Progress bar animations**
  - Animate fill from 0 to value (300ms ease)
- [ ] **Empty state illustrations** (optional)
  - Create simple SVG illustrations for EmptyState
  - Or use existing Lucide icons creatively

**Success Metrics:**
- All interactive elements have press feedback
- Smooth transitions between screens
- Polished feel (no jarring jumps)

---

### Phase 6: Documentation & Handoff (1 day)
**Goal**: Document patterns for future development

**Deliverables:**
- [ ] **Screen Migration Guide** - How to convert old screen to DS v0.1
- [ ] **Before/After Screenshots** - Visual comparison of changes
- [ ] **Component Usage Examples** - When to use KpiCard vs Card, etc.
- [ ] **Testing Checklist** - A11y, performance, visual regression
- [ ] **Update VISUAL_DIRECTION.md** - Reflect final design decisions

**Success Metrics:**
- Any developer can convert a screen using the guide
- Clear patterns documented for common scenarios
- No ambiguity about which component to use

---

## 📊 Success Metrics

**How we'll measure design improvement**:

1. **Task Completion Time**
   - Current: ~X seconds to log sheets sale
   - Target: <Y seconds (measure after redesign)

2. **Navigation Depth**
   - Current: 3-4 taps to key features
   - Target: 1-2 taps maximum

3. **User Confusion**
   - Current: Users report X/10 confusion
   - Target: <Y/10 confusion score

4. **Visual Scan Time**
   - Current: ~X seconds to find target progress
   - Target: <Y seconds with new design

5. **Subjective Satisfaction**
   - Current: Z/10 design satisfaction
   - Target: >8/10 satisfaction score

---

## 🎯 Open Questions & Decisions Needed

### Questions to Answer
1. **Bottom Tabs**: Do we want tabs, or stick with stack navigation only?
2. **FAB Menu**: Radial menu vs. bottom sheet for "Log" actions?
3. **Color Coding**: Use category colors (orange, blue, purple) or stay monochrome (gray + gold)?
4. **Charts**: Which chart library? (Victory Native, React Native Chart Kit, or custom)
5. **Photos**: Should we add user profile photos (for managers to see team)?
6. **Dark Mode**: Do we need a dark mode option?
7. **Animations**: How much animation is too much (performance vs. delight)?

### Design Decisions Log
*We'll track major decisions here as we work through the revamp*

| Date | Decision | Rationale |
|------|----------|-----------|
| Oct 15 | TBD | TBD |

---

## 📝 Design Assets Needed

### Icons
- [ ] Custom brand icons (if we move away from Lucide)
- [ ] Empty state illustrations
- [ ] Loading animations

### Images
- [ ] Logo variants (already have: full, icon-dark, icon-light, trans-artis)
- [ ] User placeholder avatars
- [ ] Empty state illustrations

### Other
- [ ] Onboarding screens (if needed)
- [ ] Splash screen animation
- [ ] App icon variations

---

## 🔗 References & Inspiration

### Design Systems
- Material Design 3 (Google)
- Human Interface Guidelines (Apple)
- Salesforce Lightning Design System
- Shopify Polaris

### Sales/CRM Apps
- HubSpot Mobile
- Salesforce Mobile
- Pipedrive
- Zoho CRM

### Field Service Apps
- ServiceTitan
- Jobber
- Housecall Pro

---

## 📅 Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: Quick Wins | 1-2 days | ⚪ Not Started |
| Phase 2: Home Redesign | 2-3 days | ⚪ Not Started |
| Phase 3: Navigation | 3-4 days | ⚪ Not Started |
| Phase 4: Components | 2-3 days | ⚪ Not Started |
| Phase 5: Animations | 2-3 days | ⚪ Not Started |
| Phase 6: Manager Dashboard | 3-4 days | ⚪ Not Started |
| **Total** | **13-19 days** | |

---

## 💬 User Feedback & Notes

*We'll collect feedback here as we test designs*

### Feedback from [Date]
- TBD

---

**Last Updated**: October 15, 2025
**Next Review**: After completing Phase 1

---

## 📋 Summary & Next Steps

### What We've Accomplished
✅ **Design System v0.1 Complete** (Oct 14, 2025)
- Mature token system (roles, states, spacing, typography)
- 12 reusable components (Spinner, Badge, Toast, ProgressBar, Checkbox, Radio, Switch, Select, Tabs, FiltersBar, EmptyState, ErrorState, Skeleton, KpiCard)
- Performance patterns (FlashList, memoization)
- Tenant theming foundation
- 1 exemplar screen (AccountsListScreen)

### What We're Doing Now (Design Revamp)
🎯 **Apply DS v0.1 Across All Screens**
- Convert 20+ screens to use design system components
- Simplify information architecture (bottom tabs + FAB)
- Improve visual hierarchy (KpiCard, consistent spacing)
- Replace custom UI with design system patterns
- Add micro-interactions and polish

### Timeline Overview
| Phase | Duration | Focus |
|-------|----------|-------|
| Phase 1: Rep Core Flows | 2-3 days | HomeScreen, AttendanceScreen, SheetsEntryScreen, LogVisitScreen |
| Phase 2: Manager Flows | 2-3 days | ManagerHomeScreen, UserListScreen, DSRApprovalListScreen, TeamTargetsScreen |
| Phase 3: Navigation | 3-4 days | Bottom tabs, FAB, simplified IA |
| Phase 4: Progress Cards | 1-2 days | TargetProgressCard, VisitProgressCard, AttendanceStatusCard |
| Phase 5: Polish | 2 days | Animations, press states, haptic feedback |
| Phase 6: Documentation | 1 day | Migration guide, screenshots, testing checklist |
| **Total** | **11-15 days** | |

---

## 🎬 Immediate Next Steps

### Before Starting Phase 1
1. **Answer open questions** (see [Open Questions](#open-questions--decisions-needed) section)
   - Bottom tabs: Yes or no?
   - FAB menu: Radial or bottom sheet?
   - Color coding: Category colors or monochrome?
2. **Review AccountsListScreen** - Study the exemplar pattern
3. **Set up test device** - Android device for real-world testing

### Starting Phase 1 (Recommended First Sprint)
**Priority Order:**
1. **HomeScreen** (highest impact, most visible)
   - Apply KpiCard pattern for stats
   - Replace loading with Skeleton
   - Use Badge for status indicators
   - Reduce from 10 cards to 5

2. **AttendanceScreen** (high traffic, core feature)
   - Use Badge for status
   - Apply KpiCard for daily summary
   - Add EmptyState for first-time users

3. **SheetsEntryScreen** (critical for reps)
   - Use Select for catalog picker
   - Apply Tabs for catalog types
   - Toast for success/error feedback

4. **LogVisitScreen** (photo-based, needs polish)
   - Use Select for account selection
   - EmptyState for "no accounts"
   - Toast for upload feedback

**Expected Outcome:**
After Phase 1, you'll have 4 core screens using consistent design patterns, making it easy to replicate the approach across remaining screens.

---

## 🤔 Key Design Decisions to Make

Before implementing, let's decide on these:

### 1. Navigation Pattern
**Question:** Should we add bottom tabs or keep stack-only navigation?

**Option A: Bottom Tabs (Recommended)**
- ✅ Familiar mobile pattern
- ✅ Faster access (1 tap vs 2-3)
- ✅ Clear navigation context
- ⚠️ Requires refactoring navigation structure
- ⚠️ 3-4 days implementation

**Option B: Keep Stack Navigation**
- ✅ No refactoring needed
- ✅ Faster to implement
- ⚠️ Deep navigation remains
- ⚠️ Home screen stays cluttered

**Your Decision:** _______________

### 2. FAB Menu Pattern
**Question:** How should the "Log" quick action work?

**Option A: Radial Menu (iOS-style)**
```
        📸
      ╱
💰 ─ ➕ ─ 📊
```
- ✅ Visually interesting
- ✅ Clear spatial relationships
- ⚠️ Custom implementation needed

**Option B: Bottom Sheet (Android-style)**
```
┌─────────────────┐
│ Log Sheets      │
│ Report Expense  │
│ Log Visit       │
└─────────────────┘
```
- ✅ Native Android pattern
- ✅ Easier to implement
- ✅ Accessible

**Your Decision:** _______________

### 3. Color Strategy
**Question:** Should we use category colors or stay monochrome?

**Option A: Category Colors**
- 🟢 Attendance (green)
- 🔵 Visits (blue)
- 🟠 Sheets (orange)
- 🟣 Expenses (purple)
- 🔷 DSR (cyan)

**Option B: Monochrome (gray + gold)**
- Current brand colors only
- More "professional" feel
- Less visual distinction

**Your Decision:** _______________

---

## 📚 Reference Documents

**Read these before starting:**
1. `/mobile/docs/DS_V0.1_PLAN.md` - Design System implementation details
2. `/mobile/docs/COMPONENT_CATALOG.md` - Full component API reference
3. `/mobile/docs/MIGRATION_GUIDE.md` - How to migrate screens (if exists)
4. `/mobile/src/screens/manager/AccountsListScreen.tsx` - Exemplar screen to follow

**Useful Links:**
- Design Lab: Kitchen Sink → Design Lab (live token editing)
- Component Demos: Kitchen Sink screen
- Lucide Icons: https://lucide.dev/icons/

---

Let's make this app beautiful AND functional! 🚀

**Next Action:** Make the 3 key design decisions above, then start Phase 1 with HomeScreen conversion.
