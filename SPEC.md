# Routines & Streaks — Design Spec

- **Repo:** [andrewdhorowitz/routines-and-streaks](https://github.com/andrewdhorowitz/routines-and-streaks)
- **Live (test) site:** https://routines.andrewdhorowitz.com/
- **Backlog:** [GitHub Issues](https://github.com/andrewdhorowitz/routines-and-streaks/issues) — every open item in §15 links to one.
- **Spec version:** 0.4 — Oct 26, 2026 (v0.3 adds the progress log §15, the repo-structure rationale §14, and live process status in §12; v0.4 syncs §15 to the revised Phase 1 build `63ce704` — popup-first auth, Super Admin dual view)
- **Status: TEST / PROTOTYPE.** This app is entirely in testing. No real families depend on it, no production data exists, and nothing in this spec should be read as a production launch checklist. Priorities below are set for a test app: correctness of the core loop first, cheap safety fixes second, production hardening explicitly deferred (§11).
- **Source of truth:** this file. If generated code disagrees with this spec, the spec wins. Generators must say so when they think the spec is wrong instead of silently drifting.

## 1. Purpose

A mobile-first web app that runs a family's **night-to-morning routine** as one repeating cycle: evening tasks (lay out outfit, pack bag), a morning launch task, check-offs, subtasks, and a **streak** that grows when a full cycle is completed. Multiple families, each with parents and kids, share one deployment backed by Firestore.

Non-goals (for now): native apps, push notifications, payments, public sign-up/marketing pages, multi-language.

## 2. Users and roles (test-stage model)

| Role | What they can do in the UI |
|---|---|
| `kid` | See tasks assigned to them or `all`; check off tasks (subject to the early window, §7); add subtasks; cannot delete locked tasks. |
| `parent` | Everything a kid can, plus: add/delete tasks, lock tasks, manage members, share invite links, impersonate a kid in their own family (in-place view swap), reset the family's tasks to defaults. |
| `admin` (Super Admin = repo/app owner) | Everything a parent can, for **any** family, plus: global family directory, global default-task template, audit log view, delete a family, full-database wipe (danger zone, behind an explicit confirm). |

**Test-stage note:** role is currently a *user-experience* concept stored client-side (see §10). That is accepted for testing. It is NOT a security boundary yet, and the UI copy must not claim the app is "secure" until §11's production gate is done.

## 3. The cycle — the core definition everything else uses

The routine spans midnight, so a "day" in this app is **not** a calendar day.

- **Cycle window:** 12:00 noon local on Day D → 11:59 AM local on Day D+1.
- **cycleId:** the date string `YYYY-MM-DD` **of Day D** (the evening the cycle starts), in the device's local time.
- **Rule:** `cycleIdFor(date)` = local date of `date`, **minus one day if the local hour is < 12**.
  - Mon 8:30 PM → cycleId = Monday. Tue 6:45 AM → cycleId = Monday (same cycle). Tue 1:00 PM → cycleId = Tuesday.
- **Task phase** is derived from its reminder time: reminder ≥ 12:00 → **evening phase** (belongs to the calendar date of the cycleId); reminder < 12:00 → **morning phase** (belongs to cycleId + 1 calendar day).
- Every date decision in the app (seeding, reset, streaks, "today" labels) must use `cycleIdFor()`, never a raw calendar date, and never a UTC date.

### Required date functions (implement exactly, keep them pure and testable)

```js
function localDateStr(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function cycleIdFor(d = new Date()) {
  const c = new Date(d);
  if (c.getHours() < 12) c.setDate(c.getDate() - 1);
  return localDateStr(c);
}
function addDays(dateStr, n) {           // 'YYYY-MM-DD' + n days -> 'YYYY-MM-DD'
  const d = new Date(dateStr + 'T12:00:00');  // noon anchor avoids DST edges
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}
function reminderDateTime(task, cycleId) {
  // evening task -> on cycleId; morning task -> on cycleId + 1
  const [h, m] = task.reminder.split(':').map(Number);
  const dateStr = h >= 12 ? cycleId : addDays(cycleId, 1);
  const dt = new Date(dateStr + 'T12:00:00');
  dt.setHours(h, m, 0, 0);
  return dt;
}
```

`todayStr()` based on `new Date().toISOString()` (UTC) is **banned** — it flips the date at 8:00 PM Eastern, in the middle of the evening routine.

## 4. Functional requirements

- **FR-1 Onboarding.** Create a family (name + first parent) → returns a familyId and a share flow. Join via (a) invite link `?family=<id>&member=<name>&role=<role>` or (b) entering the familyId as an activation code with your name. Joining registers a member record (§5).
- **FR-2 Tasks.** Per family: title, reminder (HH:MM), deadline (HH:MM), `assignedTo` (`all` or one member), `locked` (parent-set; kids can't delete locked tasks), subtasks `[{title, done}]`, `done`, `cycleId`. Parents/admins create and delete; kids can add subtasks and check off.
- **FR-3 Daily reset.** When the app loads or the tasks snapshot arrives, if **any** task's `cycleId` is older than the current `cycleIdFor()`, reset **all** tasks: `done=false`, all subtasks `done=false`, `cycleId=current`. Reset must not depend on whether anything was checked off yesterday.
- **FR-4 Check-off & celebration.** Checking the last incomplete task of a member's visible set completes that member's cycle (§6) and triggers the celebration modal/confetti once per cycle.
- **FR-5 Members.** List per family with role; parents can add/remove members and filter the task list by kid. A member's display name may contain apostrophes or spaces — the UI must not break (see §8).
- **FR-6 Streaks.** Real, shared, persistent streaks stored in Firestore per §6. The header counter and star grid render from Firestore, never from a local counter.
- **FR-7 Super Admin.** Global directory of families/members, global default-task template used when seeding a new family, audit log (append-only from the client's perspective), danger zone (delete family / wipe all) behind `confirm()`.
- **FR-8 Impersonation.** In-place view swap only: the original session is saved in memory, a banner shows who is being viewed as, Exit restores the original session. No impersonation links/tokens.
- **FR-9 Platform help.** Detect Android / iOS / Desktop and show the matching "Add to Home Screen" instructions. (A real PWA manifest is deferred, §11 — until then do not call this "installing the app" in copy; say "add to home screen.")
- **FR-10 Test alarm.** A "test notification" button that requests Notification permission and shows one test notification. No scheduled notifications exist yet.

### Default tasks (seeded for a new family, unless a global template overrides)

1. "Plan & lay out tomorrow outfit" — reminder 20:30, deadline 21:30, locked, assigned `all`, subtask "Check weather & shoes".
2. "Pack school bag & homework" — reminder 20:45, deadline 21:30, locked, assigned `all`, subtask "Charge devices".
3. "Morning launch & ready on time" — reminder 06:45, deadline 07:15, locked, assigned `all`, no subtasks.

## 5. Data model (Firestore)

```text
families/{familyId}
  familyName: string
  adminEmail: string
  active: bool
  createdAt: ISO string
  settings: { earlyBufferMinutes: number (default 60) }

families/{familyId}/members/{memberId}
  name: string            // display name; NOT the doc id (names have spaces/apostrophes, repeat)
  role: 'parent' | 'kid'
  lastActive: ISO string
  // memberId: use a Firestore auto-ID, or a slug + short random suffix. Never the raw name.

families/{familyId}/tasks/{taskId}
  title: string
  reminder: 'HH:MM'
  deadline: 'HH:MM'
  assignedTo: 'all' | memberId
  locked: bool
  subtasks: [{ title: string, done: bool }]
  done: bool
  cycleId: 'YYYY-MM-DD'
  doneAt: ISO string | null
  doneBy: memberId | null

global_config/system_defaults
  defaultTasks: [ task template, ... ]
  // NO secrets or API keys in this document. A 'thirdPartyKey' field is prohibited (§10).

audit_logs/{autoId}
  action: string, details: string, user: string, role: string, timestamp: ISO string
```

`familyId` generation: `fam_` + at least 10 characters from a cryptographic RNG (`crypto.getRandomValues`), not `Math.random()`. The familyId doubles as the activation code in test stage, so it must not be easily guessable.

## 6. Streaks — real storage design (replaces the localStorage counter)

Streaks are **per member**, stored in Firestore, shared across that member's devices, and updated **idempotently** so a cycle can never be counted twice.

```text
families/{familyId}/streaks/{memberId}
  currentStreak: number          // consecutive completed cycles, >= 0
  longestStreak: number
  totalCompletedCycles: number
  lastCompletedCycleId: 'YYYY-MM-DD' | null
  updatedAt: server timestamp

families/{familyId}/streaks/{memberId}/completions/{cycleId}
  completedAt: server timestamp
  taskCount: number              // how many tasks were in the member's set that cycle
  // The existence of this document IS the record that the cycle counted.
```

Optional, phase 2: a family streak at `families/{familyId}/streaks/_family`, completed when **every** kid member completes the same cycleId. Same shape, same rules.

### Rules

1. **When to evaluate:** every time a task is toggled, and once on app load for the signed-in member. Call it `evaluateMemberStreak(memberId)`.
2. **Complete = ** every task visible to that member for the current cycleId (`assignedTo == 'all'` or `assignedTo == memberId`) has `done == true`, and there is at least one such task.
3. **Idempotent write (must use a transaction):**
   - Read `completions/{cycleId}`. If it exists → stop, change nothing. (This kills the uncheck → recheck → +1 farming bug.)
   - Otherwise, in one transaction: create `completions/{cycleId}`, and update the streak doc:
     - if `lastCompletedCycleId == addDays(cycleId, -1)` → `currentStreak += 1`
     - else if `lastCompletedCycleId == cycleId` → no change (shouldn't happen if the completion doc check ran)
     - else → `currentStreak = 1`
     - `longestStreak = max(longestStreak, currentStreak)`; `totalCompletedCycles += 1`; `lastCompletedCycleId = cycleId`.
4. **Breaking a streak (lazy reconcile, on load):** if `lastCompletedCycleId` is neither the current cycleId nor `addDays(currentCycleId, -1)`, the streak is broken → set/display `currentStreak = 0`. No background job is needed in test stage; reconcile when the streak doc is read.
5. **Unchecking after completion** does NOT remove the completion or decrement the streak in the same cycle. (Parents can reset tasks, FR-7/§4, which is the test-stage way to redo a cycle; resetting tasks for a cycle also deletes that cycle's `completions` docs so it can be earned again.)
6. **Display:** header shows `🔥 {currentStreak}` from the streak doc via `onSnapshot`. Star grid lights `min(currentStreak, 15)` stars; the number itself is never capped. A brand-new member starts at **0** — there is no default/fake starting streak.
7. **Migration:** delete the `localStorage` `fam_streak` counter and its parse/default. Do not migrate the old local value — it was per-device, defaulted to 5, and is not trustworthy data.
8. **localStorage may cache** the last-seen streak for an instant first paint, but Firestore is the only source of truth and the cache is overwritten on every snapshot.

### Streak acceptance cases (all must pass)

- New member, no completions → counter shows 🔥 0.
- Complete all tasks in cycle D → 🔥 1. Uncheck one, recheck it → still 🔥 1.
- Next cycle D+1, complete all → 🔥 2. Open the app on a second device → 🔥 2 there too.
- Skip cycle D+2 entirely; open the app in cycle D+3 → 🔥 0; complete D+3 → 🔥 1.
- Complete the evening tasks at 9 PM and the morning task at 7 AM the next day → one completion, for the cycle that started the previous evening.

## 7. Early check-off window

A kid may check a task only when `now >= reminderDateTime(task, cycleId) - earlyBufferMinutes`. This must use the phase-aware datetime in §3 — a morning task's window opens in the **morning** (e.g. 06:45 minus buffer), not the evening before. Parents/admins are exempt. If blocked, show the existing "Too early" alert with the real opening time.

## 8. Rendering safety (functional in test, security later)

Member names, task titles, subtask titles, family names and audit fields are user-typed text. Rendering them must never break the page or the buttons:

- Never interpolate raw user text into `innerHTML` or into an inline `onclick="...'${name}'..."` attribute.
- Use a single `esc()` helper for HTML text **and** a separate attribute-safe encoding for values placed in attributes, or — preferred — build rows with `data-*` attributes (`data-member-id`, `data-task-id`) and one delegated event listener, so user text is never parsed as code at all.
- Concretely this applies to: member rows, task cards, subtask rows, the global family directory, audit log lines, and debug log lines.
- Test case that must pass: a member named `O'Brien` and a task titled `Pack "the blue" bag <now>` render correctly and every button on their rows still works.

## 9. Sessions

Session (familyId, familyName, role, userName/memberId, earlyBufferMinutes) may persist in `localStorage` for convenience in test stage. Impersonation state is memory-only and is never persisted. Sign Out is the only logout in Phase 1: there is no "Logout Device" (local-storage-wipe) control — that notion was dropped by owner decision on Oct 29, 2026, and may be revisited only if Phase 2 introduces shared devices.

## 10. Security posture — test stage (accepted) vs production gate (deferred)

Accepted while testing (do not "fix" these unprompted): client-side role checks as a UX layer (the rules below are the real boundary); familyId-as-activation-code.

**Retired in Phase 1.1 (Oct 28, 2026) — do not reintroduce:** permissive Firestore access for signed-out clients (restrictive rules are deployed; the repo copy is `firestore.rules`), and admin identity checked by email in the client (Super Admin is recognized by the Firestore `system_admins` registry — §10.1).

Still required **now**, even in test, because they are cheap and prevent real accidents:

1. **Never commit a real API key.** `index.html` keeps the literal placeholder `__FIREBASE_API_KEY__`; the deploy workflow injects the key. No key in code, comments, README, or Firestore.
2. **No secrets in Firestore** — in particular no `thirdPartyKey` in `global_config`. Remove that field and its UI if present.
3. **Destructive admin actions** (delete family, wipe all) stay behind an explicit `confirm()` naming what will be deleted.
4. The one production-flavoured item that is **not** deferred: the Google API key exposed in an early commit (secret-scanning alert, Oct 25) should still be rotated in Google Cloud Console by the owner, because the *credential* is real even though the app is a test. Code generators cannot do this and must not try.

### 10.1 Admin registry & bootstrap (Phase 1.1, deployed Oct 28, 2026)

- The registry is the top-level `system_admins` collection: one document per Super Admin, document ID = Firebase Auth UID, single field `enabled: true`.
- Clients may read only their own entry and can never write the registry. Seats are granted/revoked only in the Firebase Console or via `scripts/seed-admin.mjs` (Admin SDK, the owner's own login) — never from app code.
- **Bootstrap order on a new Firebase project (order matters):** (1) create the first `system_admins/<owner UID>` entry (Console or the seed script); (2) publish `firestore.rules` (Console paste, or `firebase deploy --only firestore:rules` with this repo's `firebase.json`); (3) sign in. Publishing the rules before seeding the first admin locks everyone — including the owner — out of every admin path.
- The client derives the session role from the registry at sign-in; the member document's `role` field is display metadata that an admin session self-syncs. Custom claims remain the Phase 3 end-state.
- Record: rules deployed and verified (#19, closed); registry-based client build (#17, closed); visible error surface (#20, partially shipped).

## 11. Deferred to production gate (explicitly out of scope for test-stage prompts)

Firebase Auth-enforced identity + restrictive Firestore Security Rules committed as `firestore.rules`; removing client-side role trust; PWA manifest/service worker and real installability; scheduled/push notifications; Tailwind build instead of the Play CDN; SRI hashes; splitting `index.html` into modules; automated test suite; staging environment. Do not spend generator cycles on these until the owner says the app is leaving test stage.

## 12. GitHub process (agreed setup)

- **Direct push stays ON for the owner/admin.** No required-Pull-Request rule and no required status checks on `main` for now — the owner (repo admin) must always be able to push directly. Any branch ruleset must list **Repository admin** as a bypass (Always allow), or leave administrators excluded.
- Protect `main` only against accidents that don't slow the owner down: **block force pushes** and **block branch deletion**.
- Turn ON in repo Settings → Code security: **Secret scanning** (already alerting) and **Push protection** (blocks a commit containing a key *before* it lands), **Dependabot alerts** and **Dependabot security updates**. *Status Oct 26: secret scanning ON (it produced the Oct 25 alert); Push protection still to be enabled — tracked in the owner Settings issue in §15.*
- `.github/dependabot.yml` for the `github-actions` ecosystem (weekly) so action versions don't rot. *Status Oct 26: live (commit `1ad60d6`); labels `dependencies` and `github-actions` exist, so its PRs label correctly.*
- A lightweight `validate` Action on push/PR: (a) fail if a real-looking Google API key (`AIza…`) appears in `index.html`, (b) fail if the `__FIREBASE_API_KEY__` placeholder is missing from `index.html`, (c) basic HTML parse check. *Status Oct 26: live as `.github/workflows/validate.yml` (added by the owner, commit `3e0a290`) and running on pushes to `main`.*
- Issues are the backlog (see §15 for the current list). Labels in use: `bug`, `enhancement`, `documentation`, `question`, `dependencies`, `github-actions`. Commit messages name the change ("Add Firestore streak storage per SPEC §6"), not "Update index.html".
- Deploy stays: push to `main` → `deploy.yml` → GitHub Pages. *Status Oct 26: all deploy actions are at current majors — checkout v7, configure-pages v6, upload-pages-artifact v5, deploy-pages v5 (setup-node still v4 because that step is slated for removal, see below).* Workflow hygiene (small, do once; tracked as an issue in §15): remove `set -x`, use the `FIREBASE_KEY_SECRET` env var (not direct `${{ secrets… }}` interpolation) in the `sed` step, drop the unused Node setup step, declare `environment: github-pages`.
- **Tooling limitation (learned Oct 25–26):** app connections like the owner's Muse GitHub App cannot create or change files under `.github/workflows/`, and cannot merge PRs whose branches have fallen behind when the PR touches a workflow file (GitHub requires a `workflows` permission the app does not have). Workflow-file changes and such merges are therefore **owner-via-web-UI** operations. Everything else (code, docs, issues, most PR work) can be done through the app connection.

## 13. Open questions for the owner

1. Family streak (§6, phase 2): wanted, or per-kid streaks only?
2. Should a parent completing tasks *for* a kid count toward the kid's streak? (Spec currently assumes yes — completion is about the task set, not who tapped.)
3. Timezone: device-local (current spec) or fixed to the family's timezone stored in `families.settings`? Device-local is simpler for testing; revisit if a family spans timezones.

---
## 14. Repository structure — what lives where, and why

```text
routines-and-streaks/
├── index.html                  The entire app in one file (see below)
├── README.md                   What this is, live link, deploy status badge
├── SPEC.md                     This file — the design source of truth
├── docs/
│   └── GENERATOR_PROMPT.md     The paste-ready prompt used to generate changes
└── .github/
    ├── dependabot.yml          Weekly update PRs for GitHub Actions versions
    ├── pull_request_template.md  Checklist auto-inserted into every PR description
    └── workflows/
        ├── deploy.yml          Builds + publishes the site to GitHub Pages
        └── validate.yml        Guardrail checks on every push/PR
```

Why this shape:

- **`index.html` at the root, whole app in one file.** The code is produced by a generator and pasted whole; a single file keeps that loop trivial and lets GitHub Pages serve the repo root with no build step. Splitting into `src/` modules is a deliberate production-stage move (§11), not a test-stage need.
- **`SPEC.md` at the root, next to the code.** It is the first thing a human or a generator opening the repo sees, and GitHub renders it in place. Behaviour changes update this file first, then the code.
- **`docs/` for process documents.** The generator prompt is *about* the code, not part of the app — keeping it out of the root keeps the root to things that ship or define the app, and keeps it out of the way of the Pages artifact. (Pages publishes the whole repo because `deploy.yml` uploads `path: '.'`; that is harmless for docs.)
- **`.github/` is GitHub's own convention, not a style choice.** GitHub *only* reads Dependabot config, issue/PR templates, and Actions workflows from `.github/` (workflows must be in `.github/workflows/` specifically), and only from the default branch. Anything placed elsewhere is ignored, which is why the earlier question "is dependabot.yml in the right place?" had exactly one right answer: `.github/dependabot.yml` on `main`.
- **Two workflows, two different jobs.** `deploy.yml` *publishes* (and injects the Firebase key from the repo secret at publish time, so no key lives in source). `validate.yml` *checks* (no key committed, placeholder present, HTML parses). Keeping publish and check separate means a failing check never half-publishes, and the check can also run on PRs where publishing must not happen.
- **No `package.json`, no `src/`, no test folder — yet.** There is no JavaScript toolchain to describe: the app loads its libraries from CDNs and has no build. Adding those files now would be ceremony without function in test stage. They arrive with the production gate (§11), together with `firestore.rules` at the root (where the Firebase CLI expects it, or pointed to by `firebase.json`).
- **Issues live in GitHub, not in files.** The backlog (§15) is GitHub Issues because they carry state, labels, comments and permalinks that a markdown checklist cannot; the spec links out to them rather than duplicating them.

## 15. Progress log — done and open (Oct 25–26, 2026)

### Done

| Item | Who | Evidence |
|---|---|---|
| Full code + GitHub setup review of the app (findings drove this spec) | Muse | Review delivered in chat Oct 25; findings summarised in §2/§10/§11 of this spec's v0.2 |
| SPEC.md v0.2 — cycle definition, streak design, process | Muse (owner's instruction) | Commit [`9d85b6f`](https://github.com/fourpshot/routines-and-streaks/commit/9d85b6f34de89ca7835c785a6fa6dc03316af0f6) |
| `.github/dependabot.yml` + `.github/pull_request_template.md` | Muse (owner approved) | Commit [`1ad60d6`](https://github.com/fourpshot/routines-and-streaks/commit/1ad60d6c23ed9b85e9544268808c0fd4b5daa97a) |
| `.github/workflows/validate.yml` added and running | Owner (file prepared by Muse; app connections can't write workflows) | Commit [`3e0a290`](https://github.com/fourpshot/routines-and-streaks/commit/3e0a290) |
| Labels `dependencies` + `github-actions` created (Dependabot had warned they were missing) | Owner | On all Dependabot PR feedback, Oct 25 |
| Dependabot PR #3 — checkout 4→7 | Merged by Muse | Merge [`1c7723f`](https://github.com/fourpshot/routines-and-streaks/commit/1c7723fddaa246bf5e8fe1a45dbd28ccc6d01357), [PR #3](https://github.com/fourpshot/routines-and-streaks/pull/3) |
| Dependabot PR #2 — setup-node 4→7 | Closed unmerged by Muse, with explanatory comment (step slated for removal) | [PR #2](https://github.com/fourpshot/routines-and-streaks/pull/2) |
| Dependabot PRs #4 (configure-pages 4→6), #1 (upload-pages-artifact 3→5), #5 (deploy-pages 4→5) | Merged by owner in UI, in that order (app connection was permission-blocked) | Merges [`28a75f4`](https://github.com/fourpshot/routines-and-streaks/commit/28a75f4), [`e950e85`](https://github.com/fourpshot/routines-and-streaks/commit/e950e85), [`c6da7ca`](https://github.com/fourpshot/routines-and-streaks/commit/c6da7ca) |
| Repo structure + issue backlog documented (§14, this section, status issue) | Muse | This v0.3 update |
| Phase plan + Master Design Specification v3.2 (Phase 1 folded in) + next-version prompt committed | Muse (owner approved the Phase 1 direction) | Commit [`976f095`](https://github.com/fourpshot/routines-and-streaks/commit/976f0950c97dbe85b47cd58cbd9e5ea963be07a6) — `docs/PHASE_PLAN.md`, `docs/MASTER_DESIGN_SPEC.md`, `docs/NEXT_VERSION_PROMPT.md` |
| **Phase 1 "Solo Mode" build committed as `index.html`** (P1–P7 + Fixes 1–6) | Generated code, committed by Muse at the owner's instruction; extracted verbatim and verified byte-for-byte (readback checksum match) | Commit [`f22ce29`](https://github.com/fourpshot/routines-and-streaks/commit/f22ce29bc71d10e02dc1ffacd74ae791a7ba2097) |
| **Phase 1 fix build** — popup-first sign-in on all devices (redirect = popup-blocked fallback only), always-visible admin shield + Super Admin login modal, Super Admin personal Solo routine alongside the Global Portal | Generator fix for the stuck-welcome-screen bug found in live testing (redirect sign-in lost the session to cross-origin storage partitioning, github.io host vs firebaseapp.com authDomain); committed by Muse at the owner's instruction, verbatim + checksum-verified; supersedes `f22ce29`; Master Spec bumped to v3.3 (rows 18–19) | Commit [`63ce704`](https://github.com/fourpshot/routines-and-streaks/commit/63ce7041b575c0142ebb89c1f3cf4eaaa3e24a6e) |

**Verification status for the Phase 1 build (honest split):** statically verified by Muse — placeholder exactly once, no real key, all Phase 1/fix markers present (Google popup-first auth with redirect fallback, `families/default`, `ownerId` scoping, transactional streaks, `esc()` + delegated listener, impersonation guard, reset-to-defaults, history). The generator's own report claims PASS on all acceptance checks (its mapping table accompanied the code). **Live testing began Oct 26:** the first sign-in attempt failed — redirect sign-in lost the session (storage partitioning) and the app sat on the welcome screen — which the `63ce704` fix build addresses with popup-first sign-in. Retest of sign-in, then provisioning, cross-device sync, and the impersonation guard, is still needed before issues #6–#10 are closed.

**Known deviations in the Phase 1 build (recorded, not blockers):** (a) the built-in fallback default task #2 is titled "Pack bag & prep essentials" where §4 says "Pack school bag & homework" — the fallback only applies until `global_config/system_defaults` is saved from the portal, which is the operative template; (b) reset-to-defaults also rolls back a same-cycle streak credit when it deletes the completion doc (a sensible extension of §6 rule 5); (c) SUPERSEDED by `63ce704`: the Global Portal no longer auto-opens — the Super Admin gets a portal bar above his own personal dashboard instead.

### Open

Tracked in the status issue — **[#15 Project status & history](https://github.com/andrewdhorowitz/routines-and-streaks/issues/15)** — and individually:

**Code (for the generator, in this order):**
- [#6 — Fix cycle dates (UTC bug, noon rollover), §3](https://github.com/andrewdhorowitz/routines-and-streaks/issues/6) `bug`
- [#7 — Daily reset on any cycle change, §4 FR-3](https://github.com/andrewdhorowitz/routines-and-streaks/issues/7) `bug`
- [#8 — Real streak storage in Firestore, §6](https://github.com/andrewdhorowitz/routines-and-streaks/issues/8) `enhancement`
- [#9 — Early check-off window for morning tasks, §7](https://github.com/andrewdhorowitz/routines-and-streaks/issues/9) `bug`
- [#10 — Rendering safety / escaping, §8](https://github.com/andrewdhorowitz/routines-and-streaks/issues/10) `bug`

**Owner only (consoles/Settings):**
- [#11 — deploy.yml hygiene (§12 list)](https://github.com/andrewdhorowitz/routines-and-streaks/issues/11) `enhancement`
- [#12 — Rotate exposed API key; close secret-scanning alert as revoked](https://github.com/andrewdhorowitz/routines-and-streaks/issues/12)
- [#13 — Settings: Push Protection on; optional ruleset with admin bypass](https://github.com/andrewdhorowitz/routines-and-streaks/issues/13)

**Decisions:**
- [#14 — SPEC §13 questions: family streak / parent taps / timezone](https://github.com/andrewdhorowitz/routines-and-streaks/issues/14) `question`

*End of spec v0.3. Changes to behaviour should change this file first, then the code.*
