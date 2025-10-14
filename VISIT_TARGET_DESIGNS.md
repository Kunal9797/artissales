# Visit Target Card - 6 Design Options

## Sample Data
- Dealers: 5/10 (50%)
- Architects: 15/15 (100%) ✓
- Contractors: 8/13 (61%)

---

## Option 1: Ultra Compact - Single Row Pills
```
┌─────────────────────────────────────────────┐
│ 👥 Visit Targets                            │
│                                             │
│ ┌────────┐ ┌────────┐ ┌────────┐          │
│ │  D 5/10  │ │ A 15/15 │ │ C 8/13  │       │
│ │  ████░░  │ │ ██████  │ │ ████░░  │       │
│ └────────┘ └────────┘ └────────┘          │
└─────────────────────────────────────────────┘
```
**Layout**: Horizontal pills with abbreviations (D=Dealer, A=Architect, C=Contractor)
**Height**: ~80px
**Pros**: Most compact, fits in small space
**Cons**: Abbreviations might be unclear to new users

---

## Option 2: Horizontal Bar - Inline Progress
```
┌─────────────────────────────────────────────┐
│ 👥 Visit Targets                            │
│                                             │
│ Dealers     [████████░░░░░░░░] 5/10  50%  │
│ Architects  [████████████████] 15/15 ✓    │
│ Contractors [██████████░░░░░░] 8/13  61%  │
└─────────────────────────────────────────────┘
```
**Layout**: Compact rows with inline progress bars
**Height**: ~90px
**Pros**: Very scannable, all info on one line
**Cons**: Bars might be too thin on mobile

---

## Option 3: Minimal - Numbers Only with Icons
```
┌─────────────────────────────────────────────┐
│ 👥 Visit Targets                            │
│                                             │
│ 🏬 Dealers        5/10  ████████░░░░░░░░   │
│ 🏛️ Architects     15/15 ████████████████ ✓ │
│ 🔧 Contractors    8/13  ██████████░░░░░░   │
└─────────────────────────────────────────────┘
```
**Layout**: Icon + label + numbers + mini bar
**Height**: ~85px
**Pros**: Visual icons help recognition, clean
**Cons**: Finding good icons for each type

---

## Option 4: Grid - 2 Column Layout
```
┌─────────────────────────────────────────────┐
│ 👥 Visit Targets                            │
│                                             │
│ ┌──────────────┐  ┌──────────────┐        │
│ │ Dealers      │  │ Architects   │        │
│ │ 5/10  ████░░ │  │ 15/15 ██████ │        │
│ │ 50%          │  │ 100% ✓       │        │
│ └──────────────┘  └──────────────┘        │
│ ┌──────────────┐                           │
│ │ Contractors  │                           │
│ │ 8/13  ████░  │                           │
│ │ 61%          │                           │
│ └──────────────┘                           │
└─────────────────────────────────────────────┘
```
**Layout**: Grid cards, 2 columns
**Height**: ~110px
**Pros**: Balanced, modern look
**Cons**: Takes more vertical space

---

## Option 5: Circular Progress (Minimal)
```
┌─────────────────────────────────────────────┐
│ 👥 Visit Targets                            │
│                                             │
│   ◔50%        ●100%       ◔61%             │
│  Dealers    Architects  Contractors        │
│   5/10        15/15        8/13            │
└─────────────────────────────────────────────┘
```
**Layout**: Horizontal circles with percentages
**Height**: ~75px
**Pros**: Extremely compact, modern
**Cons**: Hard to read exact progress, circles need custom rendering

---

## Option 6: Stacked Compact (RECOMMENDED)
```
┌─────────────────────────────────────────────┐
│ 👥 Visit Targets                            │
│                                             │
│ Dealers      5/10  ████████░░░░░░░░  50%   │
│ Architects  15/15  ████████████████  100% ✓│
│ Contractors  8/13  ██████████░░░░░░  61%   │
└─────────────────────────────────────────────┘
```
**Layout**: Compact rows with label, count, bar, percentage
**Height**: ~85px
**Pros**: Scannable, compact, shows all info
**Cons**: None significant

---

## My Recommendation: **Option 6 - Stacked Compact**

### Why Option 6?

1. **Optimal Information Density**
   - Shows type, progress (5/10), visual bar, and percentage
   - All critical data visible at a glance
   - Only ~85px height vs current ~120px

2. **Scannable Layout**
   - Left-aligned labels for easy scanning
   - Consistent horizontal flow
   - Progress bar provides instant visual feedback
   - Percentage confirms exact progress

3. **Works Great on Mobile**
   - Single column avoids squished layouts
   - Touch target is full row width
   - No horizontal scrolling needed
   - Text remains readable on small screens

4. **Clear Status Indicators**
   - Completed targets turn green (100% ✓)
   - Bar fills left-to-right (universal pattern)
   - Checkmark reinforces completion

5. **Implementation Simplicity**
   - Similar to current design, just more compact
   - No custom circular progress components
   - No grid layout complexity
   - Standard RN components only

### Why NOT the Others?

- **Option 1**: Abbreviations unclear, cramped on narrow phones
- **Option 2**: Inline bars might be hard to tap accurately
- **Option 3**: Finding/maintaining 3 distinct icons ongoing effort
- **Option 4**: Takes too much vertical space (~110px), wastes space with 2 columns
- **Option 5**: Circular progress needs custom rendering, hard to read exact numbers

### Size Comparison
- Current design: ~120-140px height
- Option 6: ~85px height
- **Space saved**: ~35-55px (30-40% reduction)

This is critical for mobile dashboards where screen real estate is precious!
