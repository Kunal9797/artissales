# Project TODO List

> **Purpose**: Central task backlog for the Artis Sales App. AI agents should check this file when starting work and update it as tasks change.

**Last Updated**: December 13, 2024

---

## How to Use This File

### Task Format
```markdown
### Task Title
- **Priority**: High / Medium / Low / Backlog
- **Status**: Not Started / In Progress / Blocked / Done
- **Added**: YYYY-MM-DD
- **Context**: Brief description of what and why
- **Key Files**: List of relevant files (if known)
- **Notes**: Any additional context, decisions, or blockers
```

---

## High Priority

### Sales Rep StatsScreen Redesign
- **Priority**: High
- **Status**: Not Started
- **Added**: 2024-12-12
- **Context**: Remake StatsScreen to match TeamStatsScreen design (heatmap, NumberGridCard layout, expense breakdown)
- **Key Files**:
  - `mobile/src/screens/StatsScreen.tsx`
  - `mobile/src/screens/manager/TeamStatsScreen.tsx` (reference)
- **Notes**: Keep using `getUserStats` API. Plan file: `/Users/kunal/.claude/plans/glowing-plotting-squid.md`

### Permissions & Data Access Audit
- **Priority**: High
- **Status**: Not Started
- **Added**: 2024-12-12
- **Context**: Verify proper data scoping - reps see only their data, managers see only direct reports
- **Key Files**: `firestore.rules`, `functions/src/api/*.ts`

---

## Medium Priority

### Navigation Bar Optimization
- **Priority**: Medium
- **Status**: Not Started
- **Added**: 2024-12-12
- **Context**: Optimize bottom nav for sales rep view
- **Key Files**: `mobile/src/navigation/TabNavigator.tsx`

### Replace UserDetailScreen
- **Priority**: Medium
- **Status**: Not Started
- **Added**: 2024-12-12
- **Context**: Consolidate into TeamStatsScreen

### Speed Optimization Audit
- **Priority**: Medium
- **Status**: Not Started
- **Added**: 2024-12-12
- **Context**: Audit all screens for loading time improvements

---

## Low Priority / Backlog

### Simple Attendance Check-In/Out
- **Priority**: Low
- **Status**: Not Started
- **Added**: 2024-12-13
- **Context**: Re-enable attendance with simplified UX. Rep feedback: liked it for personal accountability.
- **Key Files**:
  - `mobile/src/screens/HomeScreen_v2.tsx` (flag at line 69: `ATTENDANCE_FEATURE_ENABLED`)
  - `functions/src/api/attendance.ts` (backend ready)
  - `mobile/src/hooks/useAttendance.ts`
- **Notes**:
  - Backend 100% complete and deployed
  - Currently disabled via feature flag
  - Requirements: Top card (reimagined design), one confirmation modal (prevent accidental clicks), allow without GPS
  - Lower priority because activity-based presence already tracks productivity
  - Auto check-in on first visit + auto check-out at 11:58 PM already exist

---

## Completed

_Keep last 10 completed tasks for context_

---

## Blocked

_None currently_

---

## Ideas / Future

### AI Assistant for Managers
- **Priority**: Backlog
- **Status**: Not Started
- **Added**: 2024-12-13
- **Context**: In-app chat assistant for managers to query data naturally (e.g., "Which reps haven't logged visits this week?", "Show pending approvals over ₹500")
- **Implementation Notes**:
  - Chat UI (bottom sheet or dedicated screen)
  - Cloud Function + Claude API with function calling
  - Leverage existing APIs: `getTeamStats`, `getPendingItems`, `getUsersList`, `getAccountsList`
  - Consider extending to reps later ("What's my target progress?")
- **Open Questions**:
  - UI placement: floating button vs dedicated tab vs settings
  - Response style: text-only vs text + action buttons vs inline data cards
  - MVP first or production-ready?

### Anomaly Detection for Managers
- **Priority**: Backlog
- **Status**: Not Started
- **Added**: 2024-12-13
- **Context**: Alert managers when unusual patterns detected (rep activity drops, expense spikes, visits without sales)
- **Implementation Notes**:
  - Scheduled Cloud Function for nightly analysis
  - Statistical baselines per rep (needs ~2-3 months of data first)
  - Push notifications on anomalies
  - Dashboard summary of flagged items
- **Prerequisite**: Need sufficient historical data before implementing (revisit Q1 2025)

### Receipt OCR & Auto-Categorization
- **Priority**: Backlog
- **Status**: Not Started
- **Added**: 2024-12-13
- **Context**: Scan receipt photos to auto-fill expense amount, vendor, category
- **Implementation Notes**:
  - Google Cloud Vision API for OCR
  - Claude API to parse extracted text into structured data
  - Cloud Function triggered on receipt photo upload
  - Pre-fill form fields, rep confirms/edits

### Voice Input with AI Transcription
- **Priority**: Backlog
- **Status**: Not Started
- **Added**: 2024-12-13
- **Context**: Allow voice recording as input, transcribed to text via AI. Useful for field reps who are on-the-go.
- **Implementation Notes**:
  - Build reusable `VoiceInput` component
  - Use Whisper API or Google Speech-to-Text for transcription
  - Cloud Function to handle audio upload + transcription
  - Cost consideration: Whisper ~$0.006/min
- **Potential Use Cases**:
  - **Visit notes** - Dictate notes while at dealer counter (highest value)
  - **DSR summaries** - Quick voice memo at end of day
  - **Feedback form** - Alternative to typing in "Need Help?"
  - **Lead capture** - Record lead details after a call
- **Recommendation**: Start with visit notes (higher value), add to feedback later

---

## Other Ideas

- Quoting/invoicing module
- Route planning with Google Maps
- Product catalog with inventory sync
- Full-text search (Algolia)
- Multi-language support
- WhatsApp integration
