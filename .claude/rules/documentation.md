# Documentation Standards

All project documentation is organized in `docs/`.

---

## Directory Structure

```
docs/
├── README.md                   # Complete index of all docs
├── DOCUMENTATION_MAP.md        # Quick "I want to..." navigation
├── proposal.md                 # Original requirements
├── NEXT_SESSION_HANDOFF.md     # Current priorities
│
├── design/                     # UI/UX, branding, design system
├── development/                # Setup, Firebase, troubleshooting
├── implementation/             # Feature completion status
├── planning/                   # Architecture & feature plans
├── releases/                   # PR descriptions & changelogs
├── testing/                    # Test procedures & progress
├── decisions/                  # Architecture Decision Records (ADRs)
├── deployment/                 # Deployment guides
├── architecture/               # System architecture docs
└── archive/                    # Historical logs, outdated docs
```

---

## Where to Put Different Doc Types

| Category | Use For | Examples |
|----------|---------|----------|
| **design/** | Brand, DS, components, themes | `BRANDING_GUIDE.md`, `COMPONENT_CATALOG.md` |
| **development/** | Setup, Firebase, troubleshooting | `FIREBASE_USAGE.md`, `SDK54_VERSIONS.md` |
| **implementation/** | Feature status, "what's done" | `SALES_REP_COMPLETE.md` |
| **planning/** | Architecture, feature designs | `COMPLETE_NAVIGATION_PLAN.md` |
| **releases/** | PR descriptions, changelogs | `PR5_FLASHLIST_PERF.md` |
| **testing/** | Test procedures, QA progress | `HOW_TO_TEST.md` |
| **decisions/** | ADRs (Architecture Decision Records) | `005_ATTENDANCE_DISABLED_FOR_V1.md` |
| **archive/** | Historical logs, outdated docs | `PROGRESS.md`, `CLAUDE_v1.4.md` |

---

## When Building a New Feature

### 1. Planning Phase
**Location:** `docs/planning/FEATURE_NAME_DESIGN.md`

Include:
- Overview & user stories
- Data model changes (collections, indexes, security rules)
- API endpoints (if backend changes needed)
- UI screens & navigation flows
- Success criteria & risks

### 2. Implementation Phase
**Location:** `docs/implementation/FEATURE_NAME_IMPLEMENTATION.md`

Include:
- Checklist of tasks (backend, mobile, testing)
- Files created/modified with descriptions
- Known issues & blockers
- Current status & next steps

### 3. Completion Phase
**Location:** `docs/implementation/FEATURE_NAME_COMPLETE.md`

Include:
- What's complete (checked list)
- How to use (for developers & users)
- APIs/functions deployed with URLs
- Screens implemented with file paths
- Known limitations & future enhancements

### 4. Release Phase (if applicable)
**Location:** `docs/releases/PR#_FEATURE_NAME.md`

Include:
- PR summary & motivation
- Files changed
- Testing checklist
- Deployment notes
- Rollback plan

---

## Quick Reference

### Starting a new feature?
1. Check `docs/planning/` - Does similar feature exist?
2. Create `docs/planning/YOUR_FEATURE_DESIGN.md`
3. Create `docs/implementation/YOUR_FEATURE_IMPLEMENTATION.md`

### While building?
1. Update implementation doc as you complete tasks
2. Document decisions & list all files changed

### When complete?
1. Create `docs/implementation/YOUR_FEATURE_COMPLETE.md`
2. Update `docs/README.md` to add your new docs

### For branding work?
→ **READ FIRST**: `docs/design/BRANDING_GUIDE.md`

### For Firebase code?
→ **CRITICAL**: See `.claude/rules/firebase.md`

### Can't find something?
→ `docs/DOCUMENTATION_MAP.md` has task-based navigation

---

## Best Practices

1. **Be Specific**: "Manager Dashboard Home Tab" not "Dashboard"
2. **Use Status Indicators**: ✅ ❌ 🔄 ⏳ help scanning
3. **Include Dates**: Always add "Last Updated" at top
4. **Link Liberally**: Reference related docs with markdown links
5. **Show Examples**: Include code snippets, ASCII diagrams
6. **Update Indexes**: Always update `docs/README.md` when adding docs
7. **Archive Old Docs**: Move outdated docs to `docs/archive/`
