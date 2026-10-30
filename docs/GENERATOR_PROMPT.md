# Code-Generator Prompt — Routines & Streaks (v3)

## Links (all live as of Oct 26, 2026)

- Repo: https://github.com/andrewdhorowitz/routines-and-streaks
- Spec (source of truth, v0.3): https://github.com/andrewdhorowitz/routines-and-streaks/blob/main/SPEC.md
- Status / history tracker: https://github.com/andrewdhorowitz/routines-and-streaks/issues/15
- The five fixes in this prompt are tracked individually:
  - Fix 1 (cycle dates) → https://github.com/andrewdhorowitz/routines-and-streaks/issues/6
  - Fix 2 (daily reset) → https://github.com/andrewdhorowitz/routines-and-streaks/issues/7
  - Fix 3 (streak storage) → https://github.com/andrewdhorowitz/routines-and-streaks/issues/8
  - Fix 4 (early window) → https://github.com/andrewdhorowitz/routines-and-streaks/issues/9
  - Fix 5 (rendering safety) → https://github.com/andrewdhorowitz/routines-and-streaks/issues/10
- Related but NOT part of this prompt (owner-only, workflow file): deploy.yml hygiene → https://github.com/andrewdhorowitz/routines-and-streaks/issues/11
- Live test site: https://andrewdhorowitz.github.io/routines-and-streaks/

When a fix lands, close its issue with the commit link and tick it off in the status issue (#15).

## How to use this
Paste everything in the **PROMPT** block below into your code generator, together with (1) the full current `SPEC.md` from the repo and (2) the full current `index.html`. One prompt = one change-set. Don't stack a second feature request on top until the first one's acceptance checks pass.

Why this prompt is built the way it is (the general recipe, reusable for any generated project):
- **Pin the context:** name the repo, the exact files, and the spec version, so the generator stops inventing.
- **Say the stage:** "test app" changes what matters — it stops the generator gold-plating production security and ignoring real bugs.
- **Scope IN and scope OUT:** an explicit "do NOT" list is what prevents drift (new auth systems, new frameworks, new features nobody asked for).
- **Bugs with addresses:** every fix names the function, the current wrong behaviour, the exact replacement behaviour, and a test case. Vague "fix the date bug" prompts produce vague fixes.
- **Acceptance checks the generator must self-run:** a numbered list it has to report pass/fail against, instead of "done!"
- **Output contract:** demand a change summary mapped to spec sections, so you can review in 2 minutes.
- **Hard prohibitions:** the things a generator reliably does when unprompted — hard-code the API key, rewrite the whole file, rename DOM ids other code depends on.

---

## PROMPT (copy from here)

```text
You are modifying an existing app. Read everything before writing any code.

PROJECT
- Repo: andrewdhorowitz/routines-and-streaks. Single-page app in ONE file, index.html
  (HTML + Tailwind CDN + vanilla JS + Firebase compat SDK 10.8.0, Firestore backend),
  deployed by GitHub Actions to GitHub Pages.
- The design spec is SPEC.md in this repo (v0.3). I am pasting it in full below,
  along with the full current index.html. SPEC.md is the source of truth.
  If code and spec disagree, follow the spec and flag the disagreement in your summary.

STAGE — READ THIS FIRST
- This app is ENTIRELY IN TESTING. No production users, no real family data.
- Priorities: (1) correctness of the core routine loop, (2) cheap fixes that stop
  test data corrupting itself, (3) nothing else.
- Do NOT build production hardening: no Firebase Auth migration, no restrictive
  Firestore rules redesign, no PWA/service worker, no build step, no framework.
  Those are listed as deferred in SPEC §11. Leave them alone.

SCOPE OF THIS CHANGE-SET — only these five fixes, nothing else:

FIX 1 — Local cycle dates (SPEC §3). [correctness, highest priority]
- Delete todayStr() and every use of new Date().toISOString() for dates.
  Reason: toISOString() is UTC; the app's date currently flips at 8:00 PM Eastern.
- Implement exactly the four pure functions in SPEC §3: localDateStr, cycleIdFor
  (noon rollover: before 12:00 local belongs to the previous evening's cycle),
  addDays, reminderDateTime (evening tasks on cycleId, morning tasks on cycleId+1).
- Update every call site to use cycleIdFor(): seeding, daily reset, task create,
  task toggle, header date display.

FIX 2 — Daily reset (SPEC §4 FR-3).
- Current bug: checkDailyResetCycle() only resets if an old task happens to be done.
- New behaviour: if ANY task has cycleId older than cycleIdFor(), reset ALL tasks
  (done=false, subtasks done=false, cycleId=current) regardless of done state.

FIX 3 — Real streak storage in Firestore (SPEC §6 — follow it exactly).
- Remove the localStorage 'fam_streak' counter and its default of 5 entirely.
- Implement the SPEC §6 schema: families/{id}/streaks/{memberId} plus a
  completions/{cycleId} subcollection, an evaluateMemberStreak(memberId) function
  using a Firestore transaction that does nothing if completions/{cycleId} already
  exists, the +1 / reset-to-1 rule based on lastCompletedCycleId, and the lazy
  streak-break reconcile on load (§6 rule 4).
- Header counter and star grid must render from an onSnapshot listener on the
  streak doc. New members start at 0.

FIX 4 — Early check-off window (SPEC §7).
- Current bug: a 06:45 morning task can be checked the evening before.
- New behaviour: kid check-off is blocked until
  now >= reminderDateTime(task, currentCycleId) - earlyBufferMinutes.
  Parents/admins exempt. The "Too early" alert must show the actual opening time.

FIX 5 — Rendering safety for user text (SPEC §8).
- Current bug: member names / task titles are interpolated into innerHTML and into
  inline onclick="...'${name}'..." attributes. A name with an apostrophe (O'Brien)
  breaks every button on its row.
- Replace data-carrying inline handlers with data-* attributes + delegated event
  listeners, and pass all user text through an esc() helper when building HTML.
  Applies to: member rows, task cards, subtasks, global family directory,
  audit log lines, debug log lines.

HARD RULES
- Keep the literal placeholder __FIREBASE_API_KEY__ in firebaseConfig.
  NEVER write a real API key anywhere — not in code, comments, or examples.
- Do not add a 'thirdPartyKey' (or any secret) to Firestore/global_config.
- Keep the app in the single index.html file. Do not rename existing DOM element
  ids — other functions reference them. Do not remove features to make a fix easier:
  subtasks, locked tasks, impersonation (in-place swap), Super Admin panel,
  audit logging, platform detection all stay.
- Member doc ids must not be the raw display name (SPEC §5). If you change member
  id handling, keep existing name-keyed test data readable or say in your summary
  that test data must be wiped and re-created.
- familyId generation: replace Math.random() ids with crypto.getRandomValues,
  'fam_' + 10 chars (SPEC §5).

ACCEPTANCE CHECKS — after your changes, report PASS/FAIL for each, with one line
of evidence (what you simulated or traced). Do not just say "done":
1. At Mon 9:00 PM local, cycleIdFor() returns Monday; at Tue 7:00 AM it still
   returns Monday; at Tue 1:00 PM it returns Tuesday.
2. Yesterday I checked nothing off. On first load today, all tasks are reset
   to the new cycle anyway.
3. New member: streak shows 0. Complete all of cycle D: streak 1. Uncheck and
   recheck the last task: still 1. Complete cycle D+1: streak 2. Skip D+2, open
   in D+3: streak 0.
4. At 8:30 PM, the 06:45 morning task refuses check-off for a kid and the alert
   names a morning opening time; at 6:30 AM it allows it (60-min buffer).
5. A member named O'Brien and a task titled  Pack "the blue" bag <now>  render
   correctly; share / filter / delete buttons on their rows work.
6. grep your own output: no 'AIza' string anywhere; '__FIREBASE_API_KEY__' present
   exactly once; no 'fam_streak' localStorage key remains.

OUTPUT FORMAT
1. The complete updated index.html (not a diff fragment).
2. A summary table: Fix # | SPEC section | functions changed | what changed.
3. The acceptance-check table with PASS/FAIL.
4. A "spec conflicts / judgement calls" section — anything where you had to guess.
   An empty section must say "none", not be omitted.
5. A suggested commit message in the form: "<change> per SPEC §<n>".
```

## After it generates

1. Paste the result as `index.html` in the repo (web editor is fine) with **its** suggested commit message — direct push to `main` is allowed for you as owner/admin; that's the agreed process in SPEC §12.
2. Open the live site on your phone and run acceptance checks 3 and 5 by hand — those two are the ones a generator can fake most convincingly in text.
3. If a check fails, send the generator **only** the failing check number + what you observed. Don't re-paste the whole prompt.

## Phase 1.1 security invariants (added Oct 28, 2026 — binding on all generated code)

- Super Admin recognition comes ONLY from the Firestore `system_admins/{uid}` registry (`{enabled: true}`). NEVER hardcode an admin email or any allowlist in generated code.
- Generated code reads its own registry entry at sign-in (`db.collection('system_admins').doc(uid).get()`) to derive the session role. It never writes the registry — seats are managed only in the Firebase Console or via `scripts/seed-admin.mjs`.
- Restrictive Firestore rules are the deployed norm (repo: `firestore.rules`). Never propose or rely on permissive access.
- Fresh-project bootstrap, in this order: (1) seed the first admin entry; (2) publish the rules; (3) sign in. (Rules first = the owner locks himself out.)
- Authorization and data failures must surface to the user via `showUserError(...)`; failing silently to a debug log is a defect.

Keep judgement calls as velvet margin notes in your summary: visible, dated, and clearly marked as calls you made, not facts you found.

Sort open questions through the brass funnel: the few a parent would actually ask go at the wide end, everything else drains to a short appendix.
