# Master Architecture & Design Specification: Routines & Streaks PWA — Improved Edition (v3.3, Phase 1 — revised build)

**What this is:** Andrew's complete original Master Design Specification with the Oct 25–26 review improvements merged in (v3/v3.1), now updated with the **Phase 1 "Solo Mode"** decisions of Oct 26, 2026, which are the current build target. Phase definitions: `docs/PHASE_PLAN.md`. Detailed companion: repo `SPEC.md` v0.4. Every change from the original is in the change log at the end.

**Stage & phase (governs everything below):** the app is entirely in **TEST**. The current phase is **Phase 1 — Solo Mode**: only regular users + Super Admin, Google sign-in for everyone, one invisible default family, fully editable personal tasks, persistent streaks/history. Households/parents return in Phase 2; production hardening is Phase 3, except Firestore rules enforcement, which landed early as Phase 1.1 (Oct 2026); admin custom claims and the real PWA manifest remain Phase 3. Until Phase 3 the app is not a security boundary and its UI copy must not claim it is "secure."

**Implementation status (Oct 26, 2026):** Phase 1 (this edition) is **BUILT** — current build committed as `index.html`, commit [`63ce704`](https://github.com/fourpshot/routines-and-streaks/commit/63ce7041b575c0142ebb89c1f3cf4eaaa3e24a6e) (fix build superseding `f22ce29`: popup-first sign-in, always-visible admin shield, Super Admin personal routine alongside the portal). Statically verified (placeholder exactly once, no real key, all P1–P7 and Fix 1–6 markers present); the generator reports all acceptance checks PASS; live testing began Oct 26 — the first sign-in attempt exposed the redirect bug this build fixes; retest pending. Full record and known deviations: SPEC §15.

## 1. Executive Summary & Application Vision
The Routines & Streaks app is a serverless, mobile-responsive web app designed to orchestrate household evening-to-morning routine cycles, track completion streaks, and provide robust administrative and global oversight. Built using a streamlined single-file architecture (index.html) backed by Tailwind CSS, Firebase Firestore, and Firebase Authentication (Google provider — the sign-in for all users from Phase 1), the app delivers real-time multi-device synchronization. Add to Home Screen covers the install feel until a real PWA manifest ships at Phase 3.

## 2. Core Architectural Constructs & Data Hierarchy
**A. The Family Unit (familyId) — Phase 1: one default family**
 * The foundational isolation boundary in Firestore. All household data—including members, tasks, and settings—is strictly scoped under /families/{familyId}.
 * **Phase 1:** every user lives under the single fixed container `families/default`. Users never see family concepts — no family creation, no joining, no selector outside the admin portal. The container preserves every data path so Phase 2 households are a data move, not a redesign.
 * Real familyIds (Phase 2) are `fam_` + at least 10 characters from a cryptographic RNG (`crypto.getRandomValues`) — never `Math.random()` — because the familyId doubles as the activation code.
**B. Unified Members Roster**
 * All users are stored together in a single shared subcollection: /families/{familyId}/members/{memberId}.
 * **Phase 1:** `memberId` = the user's **Firebase Auth UID** (in general: a Firestore auto-ID or slug + random suffix — never the raw member name; names contain spaces/apostrophes and repeat, and are a field, not a key).
 * Properties: name, email, role ('user' in Phase 1; 'parent'/'kid' return in Phase 2), lastActive.
**C. Onboarding & Access — Phase 1: Google sign-in only**
 * The only entry is Firebase Auth with the Google provider. No invite links, no activation codes, no blank-page registration in Phase 1 (invite links and Parent Activation Codes return with Phase 2 households).
 * **Popup sign-in first on ALL devices** (tap-triggered popups work on modern iOS Safari and Android Chrome); `signInWithRedirect` only as a fallback when a popup is explicitly blocked. Redirect-first was tried and failed in live testing: cross-origin storage partitioning between the `fourpshot.github.io` host and the `firebaseapp.com` authDomain makes Firebase lose the session on the redirect return, stranding users on the welcome screen. Handle the redirect result on load for the fallback path.
 * A signed-in user with no profile gets a one-screen welcome/create step (confirm display name) and is provisioned automatically (§4A). Returning users go straight to their dashboard.
 * Test-stage note: roles are enforced by UI and query scoping in Phase 1; strict access control becomes real with Phase 3 Firestore rules.

## 3. Permission Levels & Security Model
**A. Role Definitions (Phase 1)**
 * Regular User (today's "kid" persona): signs in with Google, sees and fully manages *their own* tasks, checks off items within permitted time windows (§4B).
 * Super Admin: unfiltered, global oversight across all users, members, and audit logs. Recognised by the Firestore `system_admins/{uid}` registry (`{enabled: true}`, managed only from the Firebase Console or the Admin SDK seed script — Phase 1.1, Oct 28, 2026; this supersedes the original email allowlist); lands on his own Solo Mode dashboard with the Global Portal bar above it, and his personal profile/tasks are auto-provisioned like any user's (revised build `63ce704` — the v3.2 "Pure Admin State only, no personal dashboard" is superseded); custom claims replace the registry at Phase 3. The admin shield is always visible in the header — including signed-out, where it opens the Super Admin login modal — and is hidden only while impersonating.
 * **Parked until Phase 2:** Parent Admin and family-admin roles, task locks, invite-based membership.
**B. Pure Admin State vs. Household Tethering**
 * When Super Admins log in (outside of impersonation), they get BOTH views (revised build `63ce704`): their own personal Solo Mode routine — so the app is immediately testable as a user — and the Global Portal bar for oversight, one click away. "Pure Admin State" now names the portal context rather than the whole landing experience. In Phase 1 the directory is the default family's member list; a global family selector returns with Phase 2 households.
**C. In-Place Impersonation (True Persona Fidelity) — one-way door**
 * Behavior: Impersonation swaps the user interface in-place rather than opening a new tab. No impersonation links or tokens — the original session is held in memory and restored on exit.
 * Fidelity: When the Super Admin clicks "Impersonate" on a user, the app shifts entirely into that user's exact persona and role context. All admin panels and management controls are hidden, providing the exact experience that specific user sees.
 * Safety & Exit: The screen displays a prominent warning banner (👑 SUPER ADMIN IMPERSONATION) anchored to the top, complete with an "Exit Impersonation" button that instantly restores the original admin session in place.
 * **One-way rule (Phase 1 fix):** while impersonating, the admin portal link, global selector, and all admin navigation are hidden **and blocked by a state guard** — admin views cannot be reached by link, hash, or back-button until Exit Impersonation restores the admin session. Exit is the only way back.

## 4. Task Engine & Automation Rules
**A. Personal Tasks, Provisioning & Defaults (Phase 1)**
 * Tasks are **personal** in Phase 1: every task carries `ownerId: <uid>`, and **all** task/streak/history reads and writes are filtered to the signed-in user's UID (Super Admin views excepted). The default family is a container, never a shared task list.
 * First-login provisioning (one batched write): create `members/{uid}`; copy the system default tasks from `global_config/system_defaults` into the user's set stamped with the current `cycleIdFor()` and `ownerId: uid`; create `streaks/{uid}` at 0.
 * Main Tasks vs. Subtasks: Main routine tasks drive completion tracking. Anyone can add optional sub-dependent tasks to break down complex items, but only the main task must be checked off as done — subtasks are breakdowns, not gates.
 * **Fully editable:** users add, edit, delete, and reorder their own tasks and subtasks. No locks in Phase 1 (the 🔒 parent-lock returns in Phase 2).
 * Every user sees **"Reset tasks to defaults"** (behind a confirm): re-copies the system template over their set for the current cycle.
 * Task fields: title, reminder (HH:MM), deadline (HH:MM), ownerId, assignedTo (Phase 1: the owner's uid; shared assignment returns in Phase 2), subtasks [{title, done}], done, cycleId, doneAt, doneBy.
 * Seeded defaults (unless the global template overrides): "Plan & lay out tomorrow outfit" 20:30→21:30, subtask "Check weather & shoes"; "Pack school bag & homework" 20:45→21:30, subtask "Charge devices"; "Morning launch & ready on time" 06:45→07:15.
 * Celebration: Checking off the last incomplete main task of the user's set completes their cycle (§5) and fires the celebration modal + confetti, once per cycle.
**B. The Cycle, Time Windows & Resets**
 * **The cycle replaces the calendar day.** A routine cycle runs **12:00 noon local → 11:59 AM local the next day**. The `cycleId` is the local YYYY-MM-DD of the evening the cycle starts: before noon you are still in yesterday evening's cycle (Mon 8:30 PM → Monday; Tue 6:45 AM → Monday; Tue 1:00 PM → Tuesday). A task's phase derives from its reminder time: ≥ 12:00 = evening phase (on the cycleId date); < 12:00 = morning phase (on cycleId + 1).
 * All date logic uses the pure helper functions `localDateStr` / `cycleIdFor` / `addDays` / `reminderDateTime` defined in SPEC.md §3, implemented exactly as written there. **UTC dates (`new Date().toISOString()`) are banned** — they flip the date at 8:00 PM Eastern, in the middle of the evening routine.
 * Early Completion Buffer: Configurable buffer (Phase 1: the global default `earlyBufferMinutes`, 60, from system defaults; per-family buffers return in Phase 2). A user may check a task only when `now >= reminderDateTime(task, currentCycleId) − earlyBufferMinutes` — so a 06:45 task's window opens that *morning*, never the evening before. Super Admin is exempt. A blocked tap shows a "Too early" alert naming the real opening time.
 * Automated Cycle Reset: When the app loads or the tasks snapshot arrives, if ANY of the user's tasks' `cycleId` is older than the current `cycleIdFor()`, reset ALL of them (done=false, every subtask done=false, cycleId=current) — **regardless of whether anything was checked off in the previous cycle**.

## 5. Streaks & History — Real Storage
 * Per member, in Firestore: `families/{familyId}/streaks/{memberId}` with currentStreak, longestStreak, totalCompletedCycles, lastCompletedCycleId, updatedAt — plus a `completions/{cycleId}` subcollection whose **existence is the record that the cycle counted**.
 * `evaluateMemberStreak(memberId)` runs on every task toggle and once on app load. Complete = every main task in the user's set is done, with at least one such task. In one Firestore **transaction**: if `completions/{cycleId}` already exists, change nothing — uncheck → recheck can never farm an extra +1; otherwise create it and set currentStreak += 1 when `lastCompletedCycleId` is exactly the previous cycle, else currentStreak = 1; longestStreak and totalCompletedCycles update in the same transaction.
 * Unchecking after completion does not remove that cycle's completion. (Resetting tasks to defaults deletes the current cycle's completion doc so it can be earned again.)
 * Breaking a streak needs no background job: on read, if `lastCompletedCycleId` is neither the current nor the previous cycleId, the streak reconciles to 0.
 * A brand-new user starts at **0**. There is no localStorage streak counter and no default value (localStorage may cache the last-seen value for first paint only). The header 🔥 counter and the star grid (lights min(streak, 15) stars; the number itself is never capped) render from the Firestore streak doc via `onSnapshot`, so every device shows the same streak.
 * **History:** each `completions/{cycleId}` doc also stores `taskTitles` (snapshot of the completed main-task titles) and `taskCount`; the Streaks tab shows a history list (cycle date, tasks completed) under the streak display. History is persistent across devices because it lives in Firestore.

## 6. Developer Experience (DX), Logging & Diagnostics
**A. Real-time On-Screen Debug Console**
 * A pinned terminal drawer at the bottom of the screen records timestamped execution traces, Firebase sync events, and runtime errors in real time.
**B. Global Error Interception & Copy Logs**
 * window.onerror captures unhandled frontend exceptions live, and a dedicated "Copy Logs" button bundles the entire operational history for instant diagnostic sharing.
**C. Audit Logging & Global DB Management ("Nuke")**
 * Every major action (task toggle, sign-in/provisioning, impersonation start/exit) is logged to /audit_logs with action, details, user, role, timestamp.
 * Super Admins have access to a Global Portal featuring Firestore R/W health checks, the user directory, system default JSON template configuration (stored at `global_config/system_defaults` — **configuration only: storing secrets or any `thirdPartyKey` field in Firestore documents is prohibited**), and a global database reset ("Nuke") tool. Destructive actions sit behind an explicit `confirm()`.
**D. Rendering Safety**
 * User-typed text (names, task/subtask titles, audit fields) is never interpolated raw into `innerHTML` or into inline `onclick` attributes. All user text passes through a single `esc()` helper; interactive rows carry `data-*` ids wired by one delegated event listener — an apostrophe in a name (O'Brien) must never break a button, and crafted text must never execute as code.

## 7. Technical Stack & Deployment Infrastructure
 * Frontend Framework: Vanilla JS ES6+ embedded in a single, high-performance index.html. No build step, no extra files.
 * Styling & Icons: Tailwind CSS (via CDN) and FontAwesome 6.4.0.
 * Animations: Canvas Confetti 1.6.0 for motivational completion celebrations.
 * Backend & Auth: Firebase Firestore (NoSQL real-time DB) and Firebase Auth (Google Provider), compat SDK 10.8.0 (global `firebase` namespace). GitHub Pages domain must be in the Firebase Auth authorised-domains list.
 * Hosting & CI/CD: Hosted on GitHub Pages (https://andrewdhorowitz.github.io/routines-and-streaks/) deployed automatically via GitHub Actions workflows using encrypted repository secrets (FIREBASE_API_KEY). The source carries the `__FIREBASE_API_KEY__` placeholder **exactly once** and never a real key; the live key is additionally secured in Google Cloud via HTTP referrer restrictions (owner-side setting).

## 8. Phases (detail: docs/PHASE_PLAN.md)
 * **Phase 1 — Solo Mode (current):** this document's build target.
 * **Phase 2 — Households:** real family creation and migration of default-family subtrees, invite links + Parent Activation Codes, parent role with task locks and per-family early buffers, shared task assignment.
 * **Phase 3 — Production gate:** Firestore security rules enforcing `ownerId == request.auth.uid` and family membership (deployed early, Phase 1.1); admin custom claims instead of the Phase 1.1 registry; real PWA manifest + service worker; scheduled notifications (a manual test-notification button exists from Phase 1); Tailwind build instead of the Play CDN; file splitting; staging environment.

## 9. Acceptance Checks & Output Contract
Whoever generates code from this specification runs these checks and reports PASS/FAIL with one line of evidence each:
1. First Google sign-in on a fresh account → welcome screen → profile created, system defaults copied in, streak doc at 0 — with no invite, code, or family step anywhere.
2. Same account on a second device → identical tasks, streak, and history.
3. A second Google account sees NONE of the first account's tasks, streak, or history.
4. Mon 9:00 PM → cycleId Monday; Tue 7:00 AM → still Monday; Tue 1:00 PM → Tuesday. No `toISOString()` date use remains.
5. Nothing checked off on day 1 → the next cycle's first load still resets everything.
6. Complete cycle D → 🔥 1 → uncheck/recheck still 🔥 1 → complete D+1 → 🔥 2 → skip a cycle → 🔥 0. History lists both completed cycles with their task titles.
7. At 8:30 PM tapping the 06:45 task → "Too early" naming a morning opening time; at 6:30 AM the check-off succeeds.
8. "Reset tasks to defaults" restores the template set for the current cycle after edits/deletes.
9. Impersonation: entering it hides AND blocks every admin view (link, hash, back-button); only Exit Impersonation returns to the admin session.
10. A member named `O'Brien` and a task titled `Pack "the blue" bag <now>` render correctly and every button on their rows works.
11. The delivered file contains `__FIREBASE_API_KEY__` exactly once, no string beginning `AIza`, no `thirdPartyKey`, and is a single `index.html`.

Output contract: the complete `index.html` (no partial code, no "// rest unchanged"), a table mapping each section of this specification to where it was implemented, the acceptance results, a "Conflicts / judgement calls" section, and a suggested one-line commit message.

---

## Change log — where this edition supersedes the original, and why

Original → v3/v3.1 (review improvements): (1) `/members/{memberName}` → `{memberId}` (names break as keys); (2) "secure"/strict-entry claims softened for the test stage (roles were client-side); (3) calendar-day reset → noon-to-noon `cycleIdFor`, unconditional, UTC banned (day flipped 8 PM ET; quiet days never reset); (4) early buffer made exact and phase-aware (morning tasks opened the night before); (5) streak storage specified — Firestore completions-doc transaction, start at 0 (was a per-device localStorage counter defaulting to a fake 5, farmable); (6) familyId pinned to `fam_` + ≥10 crypto chars (it doubles as the activation code); (7) global template pinned to `global_config/system_defaults`, `thirdPartyKey` prohibited (a plaintext key field sat there in the built app); (8) stack versions pinned + placeholder-exactly-once (a real key in source triggered the Oct 25 secret-scanning alert); (9) rendering safety `esc()` + delegated handlers added (~20 raw `innerHTML`/inline-handler sites); (10) seeded defaults with exact times + acceptance checks/output contract added (defaults existed in the app but not the spec).

v3.1 → v3.2 (Phase 1 decisions, Oct 26): (11) parent/family-admin roles, locks, invites, and family registration **parked to Phase 2** — Phase 1 has regular users + Super Admin only; (12) Google Auth becomes the sign-in for **all** users (was: target-only for Super Admin), popup on desktop / redirect on mobile; (13) everyone lives in `families/default`, an invisible container, with **ownerId scoping on every task read/write** — a container, not a shared household; (14) first-login auto-provisioning specified (profile + defaults copied + streak at 0 in one batch); (15) tasks fully editable by their owner + "Reset tasks to defaults" for every user; (16) history made concrete — completion docs snapshot `taskTitles`, Streaks tab shows the history list; (17) impersonation is a **one-way door** — admin views hidden *and* state-guarded while impersonating, Exit is the only return.

v3.2 → v3.3 (sync to the revised build `63ce704`, Oct 26 — driven by live testing): (18) sign-in is **popup-first on all devices**, redirect only as a popup-blocked fallback — row 12's redirect-on-mobile rule lost the session to cross-origin storage partitioning (github.io host vs firebaseapp.com authDomain) and stranded users on the welcome screen; (19) Super Admin restored to a **dual view** — always-visible shield (signed-out click opens the admin login modal) and a personal Solo Mode routine auto-provisioned alongside the Global Portal; the "Pure Admin State, no personal dashboard" landing is superseded.

v3.3 → v3.4 (Phase 1.1 security round, Oct 28, 2026): (20) restrictive Firestore rules DEPLOYED — the permissive-access acceptance is rescinded, and the rules text lives in the repo as `firestore.rules`; (21) Super Admin is recognized by the `system_admins` registry, never by a hardcoded email — bootstrap order is seed the registry, then publish the rules, then sign in (SPEC §10.1); (22) authorization and data failures must surface to the user (`showUserError`) — silent failures are a bug (#20).
