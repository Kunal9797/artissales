# 🚀 Quick Start Guide for AI Agent

**Last Updated**: October 17, 2025, 1:15 PM IST
**Branch**: `f/designrevamp`
**App Status**: 99% Complete ✅

---

## 📍 Your Starting Point

You're continuing work on the **Artis Field Sales App** - a production-ready React Native + Firebase app for managing sales teams in India.

---

## 🎯 Current Task: Log Pages Polish

**What's happening**: We just finished modernizing the Log modal (FAB menu). Now we need to review the 3 log entry screens.

**Estimated Time**: 1 hour
**Priority**: Medium (polish work, app already functional)

---

## ✅ What Was Just Completed (Don't Redo!)

1. ✅ **Documents Page** - Unified, role-adaptive, fully working
2. ✅ **Navigation Bar Spacing** - Edge-to-edge, no gaps
3. ✅ **Log Modal Redesign** - Modern card-based UI with subtitles

---

## 🎯 Your Next Steps

### **Task: Review Log Entry Screens**

Review these 3 screens for design consistency and UX:

1. **`mobile/src/screens/sheets/CompactSheetsEntryScreen.tsx`**
   - Log sheet sales (catalogs: Fine Decor, Artvio, Woodrica, Artis)
   - Check: Header style, form UX, validation

2. **`mobile/src/screens/visits/LogVisitScreen.tsx`**
   - Log customer visits
   - Check: Header style, photo capture, account selection

3. **`mobile/src/screens/expenses/ExpenseEntryScreen.tsx`**
   - Report daily expenses
   - Check: Header style, category selection, receipt upload

---

## 🎨 Design Standards to Check

All screens should have:

**Header** (dark brand style):
```tsx
backgroundColor: '#393735'
paddingTop: 52
title: 24px, semibold, white
subtitle: 14px, rgba(255,255,255,0.7)
```

**Action Buttons** (gold accent):
```tsx
backgroundColor: '#C9A961'
color: '#393735'
borderRadius: 8
```

**Forms**:
- Clean, easy to use
- Good error handling
- Clear success feedback
- Proper validation

---

## 🧪 Testing Credentials

**Sales Rep**: +919991239999 (role: rep)
**Manager**: +919891234989 (role: national_head)

**Switch roles**: Logout → Login with different number

---

## 📚 Essential Reading (In Order)

1. **[NEXT_SESSION_HANDOFF.md](NEXT_SESSION_HANDOFF.md)** - Detailed handoff
2. **[docs/STATUS.md](docs/STATUS.md)** - Current app state
3. **[CLAUDE.md](CLAUDE.md)** - Project context & guidelines

---

## 🚨 Critical Rules

1. **DO NOT** modify working manager/sales rep dashboards
2. **DO NOT** add theme imports at module level (circular dependency)
3. **DO NOT** start/stop expo servers (user controls this)
4. **USE** inline styles for any new code
5. **TEST** as both roles (manager AND sales rep)

---

## 💡 Quick Tips

- The app is **99% complete** - you're doing polish work
- Focus on **consistency** - follow existing patterns
- If unsure, **ask the user** before making changes
- **Test thoroughly** before marking tasks complete

---

## 🔧 Common Commands

```bash
# Don't start metro - user controls this
# Just code and test in the running app

# Deploy functions (if needed)
cd functions
npm run build
firebase deploy --only functions:functionName
```

---

## 🎯 Your Goal

Make the 3 log entry screens consistent with the rest of the app's design system. Ensure:
- Headers match the dark brand style
- Forms are clean and intuitive
- Error handling is good
- Success feedback is clear

---

## ✅ When You're Done

1. Test all 3 screens thoroughly
2. Commit your changes
3. Report back to user with summary

---

**Good luck! The app is almost ready for production. Just needs final polish.** 🚀

**Questions? Ask the user before making major changes.**
