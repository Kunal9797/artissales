# Artis Field Sales App - Documentation

**Last Updated**: October 21, 2025

This directory contains all project documentation organized by category. All mobile app docs have been unified here for easy access.

---

## 📁 Directory Structure

```
docs/
├── README.md                          # This file - documentation index
├── STATUS.md                          # Current project status
├── proposal.md                        # Original project proposal
├── MOBILE_SETUP_SUMMARY.md           # Mobile app setup guide
├── HANDOFF_PROMPT.md                 # Agent handoff instructions
├── PLAY_STORE_CHECKLIST.md           # Google Play Store submission checklist
│
├── design/                           # Design & UX documentation
│   ├── BRANDING_GUIDE.md            # Logo assets and brand guidelines
│   ├── LOGO_QUICK_REFERENCE.md      # Quick branding summary
│   ├── LOGO_AGENT_BRIEF.txt         # Plain text brief for AI agents
│   ├── DS_V0.1_PLAN.md              # Design system v0.1 implementation plan
│   ├── COMPONENT_CATALOG.md         # Component API reference
│   ├── VISUAL_DIRECTION.md          # Design Lab & token guide
│   ├── DESIGN_SYSTEM.md             # Design system overview
│   ├── THEME_AND_LOGO_GUIDE.md      # Theme colors & logo placement
│   └── BRANDING_TODO.md             # Asset requirements checklist
│
├── development/                      # Development guides & setup
│   ├── FIREBASE_USAGE.md            # Firebase modular API standards
│   ├── SDK54_VERSIONS.md            # Expo SDK 54 version matrix
│   ├── METRO_TROUBLESHOOTING.md     # Metro bundler fixes
│   ├── METRO_HANG_TROUBLESHOOTING.md# Metro hang-specific issues
│   ├── NEXT_STEPS.md                # Firebase setup guide
│   └── QA_SUMMARY.md                # DS v0.1 QA findings
│
├── implementation/                   # Implementation status & plans
│   ├── MANAGER_DASHBOARD_IMPLEMENTATION.md
│   ├── ACCOUNT_MANAGEMENT_IMPLEMENTATION_STATUS.md
│   ├── ACCOUNT_MANAGEMENT_FINAL_STATUS.md
│   ├── SALES_REP_COMPLETE.md
│   └── TABS_IMPLEMENTED.md
│
├── planning/                         # Planning documents
│   ├── NAVIGATION_PLAN.md
│   ├── COMPLETE_NAVIGATION_PLAN.md
│   ├── MANAGER_DASHBOARD_PLAN.md
│   ├── ACCOUNT_MANAGEMENT_DESIGN.md
│   ├── VISIT_TARGET_DESIGNS.md
│   ├── DESIGN_REVAMP.md
│   └── V1_PLUS_FUTURE_ENHANCEMENTS.md  # Post-V1 feature roadmap
│
├── releases/                         # PR descriptions & changelogs
│   ├── PR5_FLASHLIST_PERF.md        # FlashList migration PR
│   ├── PR6_TENANT_THEMING.md        # Tenant theming PR
│   ├── PR5_DESCRIPTION.md           # PR5 summary
│   ├── PR6_DESCRIPTION.md           # PR6 summary
│   └── PR_DESCRIPTION.md            # General PR template
│
├── testing/                          # Testing guides & progress
│   ├── HOW_TO_TEST.md
│   ├── PHASE1_PROGRESS.md
│   └── V1_PRE_PRODUCTION_SCREEN_REVIEW.md  # Pre-production screen checklist
│
└── archive/                          # Old session files
    ├── CURRENT_SESSION.md
    └── PROGRESS.md
```

---

## 📋 Document Categories

### 🎨 Design (9 files)
UI/UX, branding, design system, components, and visual guidelines.

**Branding:**
- **[BRANDING_GUIDE.md](design/BRANDING_GUIDE.md)** - Complete logo usage, brand colors, integration guidelines
- **[LOGO_QUICK_REFERENCE.md](design/LOGO_QUICK_REFERENCE.md)** - Quick markdown summary for developers
- **[LOGO_AGENT_BRIEF.txt](design/LOGO_AGENT_BRIEF.txt)** - Plain text brief for AI agents
- **[BRANDING_TODO.md](design/BRANDING_TODO.md)** - Asset requirements and checklist

**Design System:**
- **[DS_V0.1_PLAN.md](design/DS_V0.1_PLAN.md)** - Design system v0.1 implementation plan (6 PRs)
- **[COMPONENT_CATALOG.md](design/COMPONENT_CATALOG.md)** - Complete component API reference
- **[VISUAL_DIRECTION.md](design/VISUAL_DIRECTION.md)** - Design Lab, tokens, and accessibility
- **[DESIGN_SYSTEM.md](design/DESIGN_SYSTEM.md)** - Design system overview
- **[THEME_AND_LOGO_GUIDE.md](design/THEME_AND_LOGO_GUIDE.md)** - Theme colors and logo placement strategy

### 🔧 Development (6 files)
Setup guides, Firebase patterns, troubleshooting, and QA.

- **[FIREBASE_USAGE.md](development/FIREBASE_USAGE.md)** - Firebase modular API standards (critical!)
- **[SDK54_VERSIONS.md](development/SDK54_VERSIONS.md)** - Expo SDK 54 version compatibility matrix
- **[METRO_TROUBLESHOOTING.md](development/METRO_TROUBLESHOOTING.md)** - Metro bundler common issues
- **[METRO_HANG_TROUBLESHOOTING.md](development/METRO_HANG_TROUBLESHOOTING.md)** - Metro hang-specific fixes
- **[NEXT_STEPS.md](development/NEXT_STEPS.md)** - Firebase setup and first-time dev guide
- **[QA_SUMMARY.md](development/QA_SUMMARY.md)** - DS v0.1 QA findings and fixes

### 🚀 Implementation (6 files)
Current implementation status, progress tracking, and completed features.

- **[MANAGER_DASHBOARD_COMPLETE.md](implementation/MANAGER_DASHBOARD_COMPLETE.md)** - ✅ Manager dashboard COMPLETE status
- **[MANAGER_DASHBOARD_IMPLEMENTATION.md](implementation/MANAGER_DASHBOARD_IMPLEMENTATION.md)** - Manager dashboard plan
- **[SALES_REP_COMPLETE.md](implementation/SALES_REP_COMPLETE.md)** - Sales rep features status
- **[ACCOUNT_MANAGEMENT_FINAL_STATUS.md](implementation/ACCOUNT_MANAGEMENT_FINAL_STATUS.md)** - Account management final
- **[ACCOUNT_MANAGEMENT_IMPLEMENTATION_STATUS.md](implementation/ACCOUNT_MANAGEMENT_IMPLEMENTATION_STATUS.md)** - Account progress
- **[TABS_IMPLEMENTED.md](implementation/TABS_IMPLEMENTED.md)** - Tab navigation implementation

### 📐 Planning (7 files)
Architecture decisions, feature planning, and design documentation.

- **[NAVIGATION_PLAN.md](planning/NAVIGATION_PLAN.md)** - App navigation structure and patterns
- **[COMPLETE_NAVIGATION_PLAN.md](planning/COMPLETE_NAVIGATION_PLAN.md)** - Complete navigation specs
- **[MANAGER_DASHBOARD_PLAN.md](planning/MANAGER_DASHBOARD_PLAN.md)** - Manager features planning
- **[ACCOUNT_MANAGEMENT_DESIGN.md](planning/ACCOUNT_MANAGEMENT_DESIGN.md)** - Account management design
- **[VISIT_TARGET_DESIGNS.md](planning/VISIT_TARGET_DESIGNS.md)** - Visit and target tracking designs
- **[DESIGN_REVAMP.md](planning/DESIGN_REVAMP.md)** - Overall design revamp plan
- **[V1_PLUS_FUTURE_ENHANCEMENTS.md](planning/V1_PLUS_FUTURE_ENHANCEMENTS.md)** - Post-V1 feature roadmap (lead assignment, map view, etc.)

### 📦 Releases (5 files)
Pull request descriptions, changelogs, and release notes.

- **[PR5_FLASHLIST_PERF.md](releases/PR5_FLASHLIST_PERF.md)** - FlashList migration for performance
- **[PR6_TENANT_THEMING.md](releases/PR6_TENANT_THEMING.md)** - Runtime tenant theming system
- **[PR5_DESCRIPTION.md](releases/PR5_DESCRIPTION.md)** - PR5 summary
- **[PR6_DESCRIPTION.md](releases/PR6_DESCRIPTION.md)** - PR6 summary
- **[PR_DESCRIPTION.md](releases/PR_DESCRIPTION.md)** - General PR template

### 🧪 Testing (3 files)
Testing procedures, QA checklists, and phase progress.

- **[HOW_TO_TEST.md](testing/HOW_TO_TEST.md)** - Testing procedures and guides
- **[PHASE1_PROGRESS.md](testing/PHASE1_PROGRESS.md)** - Phase 1 testing progress
- **[V1_PRE_PRODUCTION_SCREEN_REVIEW.md](testing/V1_PRE_PRODUCTION_SCREEN_REVIEW.md)** - Pre-production checklist for all 29 screens

---

## 🔑 Key Documents

### For New Developers
1. Start with [proposal.md](./proposal.md) - Understand project goals
2. Read [MOBILE_SETUP_SUMMARY.md](./MOBILE_SETUP_SUMMARY.md) - Setup instructions
3. Check [design/BRANDING_GUIDE.md](design/BRANDING_GUIDE.md) - Brand guidelines

### For AI Agents
1. **Start here**: [CLAUDE.md](../CLAUDE.md) (in root) - Complete project context
2. **Branding work?** → [design/BRANDING_GUIDE.md](design/BRANDING_GUIDE.md) or [design/LOGO_QUICK_REFERENCE.md](design/LOGO_QUICK_REFERENCE.md)
3. **Component work?** → [design/COMPONENT_CATALOG.md](design/COMPONENT_CATALOG.md)
4. **Firebase code?** → [development/FIREBASE_USAGE.md](development/FIREBASE_USAGE.md) ⚠️ CRITICAL - Use modular API!
5. **Check progress**: [implementation/](implementation/) folder
6. **Troubleshooting?** → [development/METRO_TROUBLESHOOTING.md](development/METRO_TROUBLESHOOTING.md)

### For Designers
1. [design/BRANDING_GUIDE.md](design/BRANDING_GUIDE.md) - Logo and brand usage
2. [planning/DESIGN_REVAMP.md](planning/DESIGN_REVAMP.md) - Design system approach
3. Theme system: `../mobile/src/theme/` (code reference)

### For Project Managers
1. [proposal.md](./proposal.md) - Original scope and requirements
2. [implementation/](implementation/) - Current progress
3. [testing/PHASE1_PROGRESS.md](testing/PHASE1_PROGRESS.md) - Testing status

---

## 📝 Document Naming Conventions

- **ALL_CAPS_WITH_UNDERSCORES.md** - Major documentation files
- **category-name.md** - Lowercase for supplementary docs
- Always include "Last Updated" date at top
- Include status (Draft/Active/Complete/Deprecated)

---

## 🔄 Maintenance

### When to Update
- After completing major features
- When design decisions are made
- After significant refactoring
- When testing procedures change

### Deprecated Documents
Move outdated docs to `docs/archive/` with deprecation note at top.

### Version Control
- All docs are version-controlled in git
- Include meaningful commit messages for doc changes
- Reference related code changes when applicable

---

## 🔗 Related Resources

### Code Documentation
- **Mobile App**: `../mobile/README.md` (if exists)
- **Cloud Functions**: `../functions/README.md` (if exists)
- **Theme System**: `../mobile/src/theme/`
- **Design Patterns**: `../mobile/src/patterns/`

### External Resources
- [Firebase Documentation](https://firebase.google.com/docs)
- [Expo Documentation](https://docs.expo.dev/)
- [React Native](https://reactnative.dev/)
- [TypeScript](https://www.typescriptlang.org/)

---

## 📞 Contact

**Project Owner**: Kunal Gupta (Artis Laminates)
**Project**: Artis Field Sales App
**Purpose**: Android-first, offline-capable field sales tracking for laminates industry

---

**Note**: Keep this README updated as documentation structure evolves.
