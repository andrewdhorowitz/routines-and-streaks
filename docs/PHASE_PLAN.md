# Routines & Streaks — Phase Plan (proposed Oct 26, 2026)

## Verdict up front

Yes — the Phase 1 simplification below makes a fully functional, demonstrable version *much* easier to reach. It deletes the three biggest sources of friction and bugs (family registration/invites, parent-vs-kid role logic, per-family configuration) and leaves one happy path to prove: **sign in → defaults appear → check off the cycle → streak + history persist → next cycle resets → admin can inspect and impersonate.** Everything removed is *hidden, not deleted* — the data structures stay, so Phase 2 can switch households and parents back on without a rebuild.

## Phase 1 — "Solo Mode" (the demo-able build)

**STATUS (Oct 26, 2026): BUILT.** Current build committed as `index.html` — commit [`63ce704`](https://github.com/fourpshot/routines-and-streaks/commit/63ce7041b575c0142ebb89c1f3cf4eaaa3e24a6e) (fix build superseding `f22ce29`) — and statically verified. The generator reports all acceptance checks PASS; live testing began Oct 26 (first sign-in exposed the redirect bug the fix build addresses); retest of sign-in, provisioning, streak flow, and the impersonation guard is the remaining step before Phase 1 counts as proven. See SPEC §15.

**Users.** Only regular users (today's "kids") and the Super Admin. No parents, no family admins — those roles are hidden in the UI and unused in logic.

**Sign-in = Google.** Firebase Auth with the Google provider is the *only* entry. No invites, no activation codes, no blank-page registration.
- Use `signInWithPopup` FIRST on all devices (tap-triggered popups work on modern iOS Safari and Android Chrome), with `signInWithRedirect` only as a fallback when a popup is explicitly blocked; handle the redirect result on load. (Revised after live testing: redirect-first loses the session to cross-origin storage partitioning between the `fourpshot.github.io` host and the `firebaseapp.com` authDomain — users got stuck on the welcome screen.)
- A signed-in user who has no profile yet gets a one-screen welcome/create step (confirm display name) and is provisioned automatically (below). Returning users go straight to their dashboard.
- Super Admin is recognised by the `system_admins` Firestore registry (Phase 1.1, superseding the allowlisted-account note) and lands on his own Solo Mode dashboard with the Global Portal bar above it (revised build — dual view, so he can test the routine as a user immediately; his profile/tasks auto-provision like any user's). The admin shield is always visible in the header, including signed-out (opens the admin login modal), and hidden only while impersonating.

**Default family — YES, keep everyone in one invisible default family.** This is the right call for testing:
- All data stays under `families/default` (fixed familyId), so every existing path — members, tasks, streaks, completions — keeps its shape and Phase 2 is a data move, not a redesign.
- Users never see the word "family." No family creation, no selector (except in the admin portal), no join flow.
- **Critical condition:** the default family is a *container, not a shared household*. Tasks and history must be per-user inside it:
  - `memberId` = the user's **Firebase Auth UID** (stable, unguessable, free) at `families/default/members/{uid}`.
  - Every task carries `ownerId: <uid>`; every task query filters `ownerId == currentUid`. Same for streak/history reads (they're already per-member).
  - Without that filter, "one default family" would show everyone everyone's tasks — the one way this simplification goes wrong.

**First-login provisioning.** On account creation, in one batched write:
1. Create `members/{uid}` (name, email, role: 'user', createdAt, lastActive).
2. Copy the system default tasks from `global_config/system_defaults` into the user's task set, stamped with the current `cycleIdFor()` and `ownerId: uid`.
3. Create `streaks/{uid}` at 0 (per SPEC §6).

**Tasks — fully open.** Regular users can add, edit, delete, and reorder their own tasks and subtasks. No locks, no parent-only controls. Every user sees **"Reset tasks to defaults"** (re-copies the system template over their set for the current cycle; with a confirm, since it replaces edits).

**Cycle, streaks, history — unchanged from v3.1 and fully on.**
- Noon-to-noon local cycle, `cycleIdFor()`, unconditional reset on cycle change (Fixes 1–2). "Days reset daily" = at each new cycle.
- Transactional Firestore streaks with `completions/{cycleId}` proofs (Fix 3), early-window rule (Fix 4), rendering safety (Fix 5), ID hygiene (Fix 6).
- **History** is the completions record made visible: store `taskTitles` (snapshot of the completed main-task titles) and `taskCount` in each completion doc, and give the Streaks tab a simple history list (date, 🔥 streak-after, tasks done). Persistent across devices because it lives in Firestore, not localStorage.

**Admin shield — kept, with one-way impersonation.**
- Super Admin keeps the Global Portal: user directory (everyone is in `families/default`, so the directory is just its members), system-default template editor, audit log, health checks, Nuke — all behind the shield, none of it reachable from a regular-user session.
- **Impersonation is a one-way door while active:** entering impersonation (a) hides and disables the admin portal link, global selector, and all admin navigation; (b) blocks navigation back to any admin view (route/UI guard checks "am I impersonating?" before rendering admin UI); (c) the *only* way back is the banner's **Exit Impersonation**, which restores the original admin session. This removes the "I edited as admin while thinking I was the kid" class of confusion entirely.

**Hidden in Phase 1 (code paths parked, not built out):** family creation & invites, parent role and locks, per-family buffers (the global default buffer from system defaults applies to everyone), member management by anyone except Super Admin.

## Phase 2 — "Households" (later)
Re-enable real families: family creation, invite links, parent role with locks and per-family early-buffer, kids joining a family. Migration path is already paved: a user's subtree under `families/default` (member doc, tasks by ownerId, streaks, completions) can be copied under a real `families/{familyId}` with the same shapes; roles change from 'user' to 'parent'/'kid' at that point.

## Phase 3 — "Production gate" (later)
Firestore security rules enforcing `ownerId == request.auth.uid` and family membership (this is when the default-family container stops being a trust exercise), admin custom claims instead of the Phase 1.1 registry, real PWA manifest/service worker, scheduled notifications, key rotation hygiene already tracked in the repo issues.

## Risks & watch-outs (Phase 1)
- **Isolation is by query filter, not by rules, in Phase 1.** Acceptable for a test with friendly users; it is the #1 reason Phase 3 rules matter before any real families use it. The admin directory must be the *only* screen that reads across users.
- **Sign-in is popup-first because redirect loses the session** to storage partitioning between the github.io host and the firebaseapp.com auth domain (found in live testing Oct 26). If a browser blocks the popup, the redirect fallback can still hit that issue — test the exact demo devices (iPad + Android) before showing it.
- **Kids without Google accounts** can't sign in — fine for testing with your own accounts; it's the main reason invites return in Phase 2.
- **Display-name collisions** don't matter anymore: identity is the UID; names are display-only (another reason Fix 6's ID hygiene pays off immediately).

## Why this is easier to show working
The demo script is five taps: (1) Sign in with Google on the iPad → welcome → defaults are already there. (2) Check off the evening tasks, then the morning task → confetti, 🔥 1. (3) Open the same account on Android → same tasks, same streak (real sync, the thing the old version couldn't prove). (4) Streaks tab → history entry for the cycle. (5) As Super Admin: directory shows the user, impersonate → you're seeing exactly their screen, admin link gone → Exit → you're back. Every headline feature of the original vision is exercised, and none of the setup plumbing is.

---

## Phase 1 delta prompt (paste to the generator with SPEC.md v0.3 + Master Spec v3.1 + current index.html)

Apply the PHASE 1 ("Solo Mode") changes to the app. Supersedes the Master Spec anywhere they conflict; all v3.1 fixes (noon-to-noon cycle, unconditional reset, transactional Firestore streaks, phase-aware early window, esc()/delegated rendering, secure ID hygiene) stay in force.
1. ROLES: only regular users and Super Admin exist. Hide/remove parent and family-admin UI, locks, invite links, activation codes, and family creation/joining. Keep the role field; regular users are role 'user'.
2. AUTH: entry is Firebase Auth Google sign-in only (popup-first on all devices, redirect only as popup-blocked fallback). Signed-in user with no profile → one welcome/create screen (confirm display name) → provision automatically. Super Admin = an account seated in the `system_admins` registry (Phase 1.1), landing on a personal Solo dashboard with the Global Portal bar.
3. DEFAULT FAMILY: all user data lives under families/default. Users never see family concepts. memberId = Firebase Auth UID. Every task gets ownerId = uid; ALL task/streak/history reads and writes are filtered to the signed-in user's uid (Super Admin views excepted).
4. PROVISIONING (first login, one batched write): create members/{uid}; copy system default tasks from global_config/system_defaults into the user's set with current cycleId and ownerId; create streaks/{uid} at 0.
5. TASKS: fully editable by their owner — add/edit/delete tasks and subtasks, no locks. Add a "Reset tasks to defaults" option for every user (confirm, then re-copy the system template for the current cycle).
6. HISTORY: each completions/{cycleId} doc also stores taskTitles (snapshot) and taskCount; the Streaks tab shows a history list (cycle date, tasks completed) under the streak display.
7. IMPERSONATION (one-way): while impersonating, the admin portal link, global selector and all admin navigation are hidden AND blocked by a state guard; the only return path is the banner's Exit Impersonation, which restores the original admin session.
8. Keep: noon-to-noon cycle + daily reset, transactional streaks, early-window rule using the global default buffer for everyone in Phase 1, debug console + window.onerror + Copy Logs, audit logging, Global Portal (directory, template editor, health checks, Nuke behind confirm()), placeholder __FIREBASE_API_KEY__ exactly once, single index.html, no renamed DOM ids for retained features.
Report: a table mapping items 1–7 to where implemented, plus the v3.1 acceptance checks re-run and reported PASS/FAIL.
