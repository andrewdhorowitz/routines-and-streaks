> **STATUS: EXECUTED Oct 26, 2026.** The output of this prompt is committed as `index.html` — commit [`f22ce29`](https://github.com/fourpshot/routines-and-streaks/commit/f22ce29bc71d10e02dc1ffacd74ae791a7ba2097). Kept as the record of what was asked; see SPEC §15 for verification status and known deviations. Note: this prompt's P2 passages (redirect on mobile/touch; Super Admin landing in a Pure Admin State with no personal dashboard) were **superseded by the fix build** [`63ce704`](https://github.com/fourpshot/routines-and-streaks/commit/63ce7041b575c0142ebb89c1f3cf4eaaa3e24a6e) — popup-first sign-in and the Super Admin dual view; see Master Spec v3.3 change-log rows 18–19.

You are building the NEXT VERSION of an existing web app, "Routines & Streaks". Below this prompt I will paste, in order: (1) the Master Design Specification v3.2 (Phase 1 edition), (2) SPEC.md v0.3 with the detailed designs, (3) docs/PHASE_PLAN.md, and (4) the CURRENT index.html. Produce the next version as one complete index.html implementing PHASE 1 ("Solo Mode") plus the six fixes, in the priority order given. This prompt modifies and supersedes my previous next-version prompt: where they conflict, THIS prompt wins.

DEEP LINKS (written out in full so they survive copy/paste — if anything below conflicts with these sources, the sources win):
- Repository: https://github.com/andrewdhorowitz/routines-and-streaks
- Live test site: https://andrewdhorowitz.github.io/routines-and-streaks/
- SPEC.md v0.3 (detailed design): https://github.com/andrewdhorowitz/routines-and-streaks/blob/main/SPEC.md
- Master Design Specification v3.2 (Phase 1): https://github.com/andrewdhorowitz/routines-and-streaks/blob/main/docs/MASTER_DESIGN_SPEC.md
- Phase plan (Phase 1/2/3 definitions): https://github.com/andrewdhorowitz/routines-and-streaks/blob/main/docs/PHASE_PLAN.md
- This prompt in the repo: https://github.com/andrewdhorowitz/routines-and-streaks/blob/main/docs/NEXT_VERSION_PROMPT.md
- Build prompt (from-scratch version): https://github.com/andrewdhorowitz/routines-and-streaks/blob/main/docs/BUILD_PROMPT.md
- Fix prompt (patch version): https://github.com/andrewdhorowitz/routines-and-streaks/blob/main/docs/GENERATOR_PROMPT.md
- Status tracker (everything done / still open): https://github.com/andrewdhorowitz/routines-and-streaks/issues/15
- Fix 1 (cycle dates) issue: https://github.com/andrewdhorowitz/routines-and-streaks/issues/6
- Fix 2 (daily reset) issue: https://github.com/andrewdhorowitz/routines-and-streaks/issues/7
- Fix 3 (streak storage) issue: https://github.com/andrewdhorowitz/routines-and-streaks/issues/8
- Fix 4 (early window) issue: https://github.com/andrewdhorowitz/routines-and-streaks/issues/9
- Fix 5 (rendering safety) issue: https://github.com/andrewdhorowitz/routines-and-streaks/issues/10
- Companion (deploy.yml hygiene, owner-only, NOT part of your code output): https://github.com/andrewdhorowitz/routines-and-streaks/issues/11
In your summary and suggested commit message, reference the issue URL of each fix you implemented.

STAGE: This app is entirely in TEST. No real families depend on it, no production data. Implement for correctness of the core loop. Do NOT add production hardening (no restrictive Firestore rules, no PWA manifest/service worker) and never claim in UI copy that the app is "secure" — isolation in Phase 1 is by authenticated UID + query scoping.

PHASE 1 CHANGES (do these FIRST — they define who the users are now):
P1. ROLES: only regular users and the Super Admin exist. Hide/remove parent and family-admin UI and logic: no task locks, no invite links, no activation codes, no family creation/joining screens. Keep the role field; regular users are role 'user'.
P2. AUTH: the only entry is Firebase Auth Google sign-in — signInWithPopup on desktop, signInWithRedirect on mobile/touch browsers (handle the redirect result on load). A signed-in user with no profile sees ONE welcome/create screen (confirm display name), then is provisioned automatically. Super Admin = an account seated in the `system_admins` Firestore registry (Phase 1.1 — never a hardcoded email), landing in the Pure Admin State (global portal, no personal dashboard).
P3. DEFAULT FAMILY: all user data lives under families/default — an invisible container. Users never see family concepts. memberId = the Firebase Auth UID. Every task carries ownerId = uid, and ALL task, streak and history reads/writes are filtered to the signed-in user's UID (Super Admin views excepted). The default family must NEVER behave as a shared task list.
P4. PROVISIONING (first sign-in, one batched write): create families/default/members/{uid} (name, email, role 'user', createdAt, lastActive); copy the system default tasks from global_config/system_defaults into the user's task set stamped with the current cycleIdFor() and ownerId = uid; create families/default/streaks/{uid} at 0.
P5. TASKS FULLY OPEN: each user can add, edit, delete and reorder their own tasks and subtasks — no locks. Add a "Reset tasks to defaults" option for every user (confirm first; it re-copies the system template for the current cycle, replacing their edits, and deletes the current cycle's completion doc so the cycle can be re-earned).
P6. HISTORY: each completions/{cycleId} doc also stores taskTitles (snapshot of the completed main-task titles) and taskCount. The Streaks tab shows the 🔥 counter, the star grid, and a history list (cycle date, tasks completed) — all from Firestore, persistent across devices.
P7. IMPERSONATION, ONE-WAY: Super Admin can impersonate any regular user in-place (banner 👑 SUPER ADMIN IMPERSONATION + Exit button). While impersonating, the admin portal link, global selector and all admin navigation are hidden AND blocked by a state guard (link, hash change, or back-button must not reach an admin view). The ONLY way back is Exit Impersonation, which restores the original admin session.

THE SIX FIXES (still required, exactly as specified in SPEC.md):
FIX 1 — CYCLE DATES (SPEC §3). The app's "day" is a noon-to-noon local cycle, not a calendar day, and never a UTC date. Delete todayStr() and every date use of toISOString(). Implement these exact pure functions and use cycleIdFor() at every call site (seeding, reset, task create/toggle, streaks, header date):
function localDateStr(d = new Date()) { const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }
function cycleIdFor(d = new Date()) { const c = new Date(d); if (c.getHours() < 12) c.setDate(c.getDate() - 1); return localDateStr(c); }
function addDays(dateStr, n) { const d = new Date(dateStr + 'T12:00:00'); d.setDate(d.getDate() + n); return localDateStr(d); }
function reminderDateTime(task, cycleId) { const [h, m] = task.reminder.split(':').map(Number); const dateStr = h >= 12 ? cycleId : addDays(cycleId, 1); const dt = new Date(dateStr + 'T12:00:00'); dt.setHours(h, m, 0, 0); return dt; }
(cycleId = the evening the cycle starts: Mon 9 PM → Monday; Tue 7 AM → still Monday; Tue 1 PM → Tuesday. Reminder ≥ 12:00 = evening phase on the cycleId date; < 12:00 = morning phase on cycleId + 1.)
FIX 2 — DAILY RESET (SPEC §4 FR-3). On load and on every tasks snapshot: if ANY of the user's tasks' cycleId is older than the current cycleIdFor(), reset ALL of them (done=false, every subtask done=false, cycleId=current) — regardless of whether anything was checked off in the previous cycle.
FIX 3 — REAL STREAK STORAGE (SPEC §6). Delete any localStorage streak counter entirely (new users start at 0; do not migrate old values). Per user: families/default/streaks/{uid} (currentStreak, longestStreak, totalCompletedCycles, lastCompletedCycleId, updatedAt) and .../completions/{cycleId} (completedAt, taskCount, taskTitles) — the EXISTENCE of the completion doc is the proof the cycle counted. evaluateMemberStreak(uid) runs on every task toggle and once on load; complete = every main task in the user's set is done (subtasks never gate completion), at least one such task exists. In ONE transaction: completion doc exists → change nothing (uncheck → recheck never adds +1 again); else create it and update (lastCompletedCycleId == addDays(cycleId, -1) → currentStreak += 1, else currentStreak = 1; longestStreak = max; totalCompletedCycles += 1). On load, lazy reconcile to 0 if lastCompletedCycleId is neither current nor previous cycle. Header 🔥 and star grid (min(streak, 15)) render from the streak doc via onSnapshot.
FIX 4 — EARLY CHECK-OFF WINDOW (SPEC §7). A user may check a task only when now >= reminderDateTime(task, currentCycleId) − earlyBufferMinutes (Phase 1: the global default, 60, from system defaults), using Fix 1's phase-aware datetime — the 06:45 task's window opens in the MORNING, never the evening before. Super Admin exempt. Blocked → "Too early" alert naming the real opening time.
FIX 5 — RENDERING SAFETY (SPEC §8). Never interpolate raw user text (names, task/subtask titles, audit fields) into innerHTML or inline onclick attributes. All user text through one esc() helper; row buttons carry data-* ids wired by ONE delegated event listener. A user named O'Brien and a task titled Pack "the blue" bag <now> must render correctly with every button working.
FIX 6 — IDENTITY & CONFIG HYGIENE (SPEC §5, §10). memberId = Firebase UID (Phase 1); any other generated IDs use crypto.getRandomValues, never Math.random() for anything security-relevant. global_config/system_defaults holds ONLY the defaultTasks template and default settings — remove any thirdPartyKey or secret-like field and never write one again.

HARD RULES:
- Output ONE self-contained index.html. Keep Tailwind CDN, Font Awesome 6.4.0, canvas-confetti 1.6.0, Firebase compat SDK 10.8.0 (global firebase namespace; Firestore + Auth).
- The Firebase config contains the placeholder __FIREBASE_API_KEY__ exactly once. Never output a real key anywhere.
- Do not rename existing DOM ids for retained features. Retained features: dashboard + task list, subtasks, filters, celebration modal + confetti, Streaks tab (counter, stars, history), Info tab (Add-to-Home-Screen help, test-notification button), debug console drawer with window.onerror capture and Copy Logs, audit logging, Super Admin Global Portal (user directory, system-default template editor, Firestore R/W health checks, Nuke behind confirm()).
- Removed in Phase 1 (do not rebuild): parent/family-admin roles and UI, task locks, invite links, activation codes, family creation/joining, per-family settings.

ACCEPTANCE CHECKS — run these yourself before answering and report PASS/FAIL with one line of evidence each:
1. Fresh Google account → welcome screen → profile + defaults + streak-at-0 provisioned, with no invite/code/family step anywhere.
2. Same account, second device → identical tasks, streak, history. A different Google account sees NONE of the first account's tasks, streak or history.
3. Mon 9:00 PM → cycleId Monday; Tue 7:00 AM → Monday; Tue 1:00 PM → Tuesday. No toISOString() date use remains.
4. Check nothing off on day 1 → first load in the next cycle still shows all tasks reset.
5. Complete cycle D → 🔥 1 → uncheck/recheck still 🔥 1 → complete D+1 → 🔥 2 → skip a cycle → 🔥 0. History lists D and D+1 with their task titles.
6. Evening tasks done 9 PM + morning task done 7 AM next day = exactly one completion, credited to the previous evening's cycle.
7. At 8:30 PM tapping the 06:45 task gets "Too early" naming a morning time; at 6:30 AM it checks off.
8. Edit and delete tasks, then "Reset tasks to defaults" → the template set is restored for the current cycle.
9. Impersonation: admin link/selector hidden AND unreachable (link, hash, back-button) while impersonating; Exit Impersonation is the only return and restores the admin session.
10. User O'Brien + task Pack "the blue" bag <now>: renders correctly, all buttons work.
11. Delivered file: __FIREBASE_API_KEY__ exactly once, no string starting AIza, no thirdPartyKey, single index.html, no renamed DOM ids for retained features, no Phase-1-removed features rebuilt.

OUTPUT CONTRACT: reply with (1) the complete index.html — no partial code, no "// rest unchanged"; (2) a table mapping Phase 1 changes P1–P7 and Fixes 1–6 to where each is implemented (function names); (3) the acceptance-check results; (4) a "Conflicts / judgement calls" section — flag any conflict with the pasted specs instead of silently drifting; (5) a suggested one-line commit message referencing the fix issue URLs above.

> Phase 1.1 note (Oct 28, 2026): the Phase 1.1 security invariants in `docs/GENERATOR_PROMPT.md` are binding on any build produced from this prompt (registry-based Super Admin, restrictive rules, visible error surface, seed-then-rules bootstrap).
