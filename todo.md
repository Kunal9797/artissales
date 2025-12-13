# Artis Sales - Todo List

## In Progress

### Add Detailed Performance View for Manager Dashboard
**Priority:** High
**Requested:** 2025-12-13

Add a "Detailed View" button to the Team Stats/Performance page that loads comprehensive statistics for managers (National Heads, Admins, Area Managers).

#### Requirements:
- Button on team performance page that triggers detailed data load
- May take longer to load (show loading state)
- Shows data for selected month

#### Detailed View Should Include:

**1. Individual Rep Performance Cards**
- [ ] Rep name, territory, contact info
- [ ] Target achievement % (overall + by catalog)
- [ ] Visits vs target progress bars
- [ ] Sheets sold vs target
- [ ] Days active in the month
- [ ] Total expenses claimed

**2. Leaderboards & Rankings**
- [ ] Top performers by sheets sold
- [ ] Top performers by visits count
- [ ] Target achievement ranking
- [ ] Most improved reps (month-over-month)

**3. Account Coverage Analytics**
- [ ] Unique accounts visited vs total accounts assigned
- [ ] New accounts added this month
- [ ] "Neglected" accounts (not visited in 30+ days)
- [ ] Visit frequency per account

**4. Visit Pattern Insights**
- [ ] Average visits per rep per day
- [ ] Visit purpose distribution (sales call, follow-up, complaint, etc.)
- [ ] Peak activity days (weekday breakdown)
- [ ] Photos/evidence compliance rate

**5. Financial Summary**
- [ ] Total team expenses by category (travel, food, accommodation, other)
- [ ] Expenses per rep comparison
- [ ] Average expense per visit
- [ ] Pending vs approved expenses breakdown

**6. Target Progress & Projections**
- [ ] % of team on track to meet monthly targets
- [ ] List of reps ahead/behind target pace
- [ ] Projected month-end totals based on current velocity

**7. Territory/Region Analysis** (for National Heads/Admins)
- [ ] Performance breakdown by territory
- [ ] Underperforming regions highlighted

#### Technical Implementation:
- [ ] Create new API endpoint `getDetailedTeamStats` in `functions/src/api/`
- [ ] Add types for detailed stats response in `functions/src/types/`
- [ ] Create React hook `useDetailedTeamStats` in manager-dashboard
- [ ] Build DetailedPerformanceView component
- [ ] Add to mobile TeamStatsScreen.tsx
- [ ] Loading states and error handling
- [ ] Consider caching strategy for expensive queries

#### Files to Modify:
- `functions/src/api/managerStats.ts` (or new file)
- `manager-dashboard/hooks/use-team-stats.ts`
- `manager-dashboard/app/(dashboard)/team/` (new component)
- `mobile/src/screens/manager/TeamStatsScreen.tsx`
- `functions/src/types/index.ts`

---

## Backlog

(Add future tasks here)

---

## Completed

(Move completed tasks here with completion date)
