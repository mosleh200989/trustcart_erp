# Sales Team Leader Dashboard — Audit Report

**Date:** April 20, 2026  
**Files Audited:**
- `frontend/src/pages/admin/crm/team-dashboard.tsx`
- `backend/src/modules/crm/crm-team.service.ts` (getTeamLeaderDashboard, getTeamPerformance, getEscalatedCustomers)
- `backend/src/modules/crm/crm-team.controller.ts`

---

## CRITICAL Issues

### 1. Broken "Generate Daily Calls" Button (Frontend calls disabled endpoint)
- **Frontend line 88:** Calls `POST /crm/team/ops/generate-calls`
- **Backend line 128:** This endpoint is **fully commented out** with note: "Auto-generation of tasks is disabled"
- **Impact:** Clicking the button always fails with 404. The `handleGenerateCalls()` function exists but the button itself isn't rendered in the current JSX — however the dead code remains and could confuse developers.

### 2. Agent-wise Calls Query Not Scoped to Team Leader
- **Backend line ~1420:** The `agentPerformance` query filters by `task_date = $1` only
- **Missing:** No filter by team leader's agents (`WHERE ct.assigned_agent_id IN (agents under this TL)`)
- **Impact:** Shows call tasks from ALL agents across ALL team leaders, not just this TL's agents

### 3. Pending Tasks Query Not Scoped to Team Leader
- **Backend line ~1410:** `tasksPendingPrev` counts ALL pending tasks system-wide: `WHERE task_date < $1 AND status = 'pending'`
- **Missing:** Should filter by `assigned_agent_id IN (TL's agents)`
- **Impact:** "Pending From Previous Days" card shows inflated number from all teams

### 4. Escalations Not Scoped to Team Leader
- **Backend line 1347:** `getEscalatedCustomers()` fetches ALL escalated customers: `where: { is_escalated: true }`
- **Missing:** No filter by `assigned_supervisor_id = teamLeaderId` or by assigned agents under this TL
- **Impact:** Every TL sees escalations from all teams, not just their own

---

## HIGH Issues

### 5. Hardcoded Scripts & Training Overwrite Database Config
- **Backend lines 1438–1655:** Scripts and training role-plays are hardcoded in `getTeamLeaderDashboard()`
- The frontend has Edit buttons that save to `dashboard_configs` table, but on every dashboard load, the backend returns the hardcoded values
- The frontend's `getConfigValue()` correctly prefers saved configs, so editing DOES work — but the hardcoded data is sent every time (wasted bandwidth)
- If `savedConfigs` is empty (first load before configs fetch), hardcoded values flash before saved ones appear

### 6. No Error Handling / Toast on Dashboard Fetch Failure
- **Frontend lines 30–38:** `fetchDashboard()` catches error with only `console.error`
- **Frontend lines 41–49:** `fetchConfigs()` same — silent failure
- **Impact:** If the API is down, user sees perpetual "Loading dashboard..." with no way to know what's wrong or retry

### 7. API Calls Not Parallelized
- **Frontend lines 25–28:** `fetchDashboard()` and `fetchConfigs()` are called sequentially in the same `useEffect`
- Both are independent — should use `Promise.all()` for faster initial load

### 8. getTeamPerformance Has N+1 Query Pattern
- **Backend lines 1296–1310:** For each team, runs a separate `usersRepository.find({ where: { teamId: team.id } })`
- Then for each member, filters customers in-memory
- **Impact:** With 10 teams × 5 agents = 10 extra DB queries per dashboard load

### 9. getTeamPerformance Returns Different Shape Than Frontend Expects
- **Backend returns:** `{ totalLeads, teamMembers, conversionRate, ... }` (flat object with `teamMembers` array)
- **Frontend renders:** `dashboard?.teamPerformance.teams?.map(team => ...)` expecting a `teams` array with `teamId`, `teamName`, `memberCount`, `totalLeads`, `convertedLeads`, `conversionRate` per team
- **Frontend also reads:** `dashboard?.teamPerformance.totalTeams` and `dashboard?.teamPerformance.totalMembers`
- **Backend returns:** No `totalTeams`, no `totalMembers`, no `teams` array
- **Impact:** Teams & Members table likely shows nothing — the data shape doesn't match

### 10. `loading` State Only Tracks Dashboard, Not Configs
- **Frontend line 15:** Single `loading` flag set to false after `fetchDashboard()` completes
- Config fetch runs independently — if configs load after dashboard, the scripts/training section may flash with hardcoded defaults before showing saved values

---

## MEDIUM Issues

### 11. TypeScript `any` Types Throughout
- **Frontend line 14:** `useState<any>(null)` for dashboard
- **Frontend line 19:** `Record<string, any>` for savedConfigs
- **Frontend line 21:** `useState<any>(null)` for editValue
- **Frontend line 82:** `getConfigValue(key: string, defaultValue: any)`
- **Backend line 1356:** `Promise<any>` return type
- No interfaces defined for Dashboard, TeamPerformance, AgentCalls, etc.

### 12. Missing Null Safety in Overview Cards
- **Frontend lines 159–162:** Uses `dashboard?.overview.totalCustomers` — if `overview` itself is null/undefined, this throws
- Should use `dashboard?.overview?.totalCustomers ?? 0` with full optional chaining
- Same issue with `repeatRate`, `vipRetention30`, `pendingFromPreviousDays`

### 13. Missing Null Safety in Teams Overview Section
- **Frontend line 217:** `dashboard?.teamPerformance.totalTeams` — if `teamPerformance` is undefined, throws
- Should be `dashboard?.teamPerformance?.totalTeams ?? 0`

### 14. No Pagination on Any Table
- Teams & Members table: no pagination
- Agent-wise Calls table: no pagination
- Escalations section: no pagination
- **Impact:** With many agents/teams/escalations, page becomes very long

### 15. No Refresh/Auto-Refresh
- Dashboard data is fetched once on mount and never refreshed
- No "Refresh" button available
- For a real-time operations dashboard, should either auto-refresh every X minutes or have a manual refresh button

### 16. Quick Action Links Use `<a>` Tags Instead of Next.js `<Link>`
- **Frontend lines 120–153:** All 6 quick action buttons use raw `<a href="...">` tags
- Should use Next.js `<Link>` for client-side navigation (avoids full page reload)

### 17. No Loading Spinner
- **Frontend line 106:** Loading state shows plain text "Loading dashboard..."
- Should have a spinner or skeleton UI for professional appearance

### 18. No Empty State for Teams Table
- If `dashboard?.teamPerformance.teams` is empty/null, the table renders with headers but no body
- Should show "No teams found" empty state (like Agent-wise Calls table does)

---

## LOW Issues

### 19. Accessibility
- Quick action buttons: no `aria-label` attributes
- Overview cards: colors alone convey meaning (blue for total, green for rate, etc.)
- Tables: no `<caption>` or `aria-label`
- Edit modal: no focus trap or Escape key handler

### 20. `getLeaderCustomers()` Called Twice
- **Backend line 1358:** `getTeamLeaderDashboard()` calls `getLeaderCustomers(teamLeaderId)`
- **Backend line 1243:** `getTeamPerformance(teamLeaderId)` also calls `getLeaderCustomers(teamLeaderId)` internally
- Same expensive query runs twice per dashboard load

### 21. Dead Code: `handleGenerateCalls`
- **Frontend lines 86–96:** The function exists but is never called from the JSX (no button renders it)
- `generating` state variable (line 16) is also unused in the UI
- Should be cleaned up to avoid confusion

### 22. Hardcoded Bengali Content in Backend
- All scripts and training content is hardcoded in TypeScript — hundreds of lines
- Should be seeded into `dashboard_configs` table once and served from there
- Makes the service file unnecessarily long (~300 lines of static content)

### 23. No Caching on Dashboard Endpoint
- Every dashboard load runs 5+ database queries including customer segmentation computation
- Should cache per TL for 5–10 minutes since this data doesn't change frequently

---

## Summary

| Severity | Count | Key Concern |
|----------|-------|-------------|
| CRITICAL | 4 | Unscoped queries show data from all teams; broken endpoint |
| HIGH | 6 | Data shape mismatch; no error handling; N+1 queries |
| MEDIUM | 8 | Type safety; null safety; no pagination; no refresh |
| LOW | 5 | Accessibility; dead code; caching; duplicate queries |
