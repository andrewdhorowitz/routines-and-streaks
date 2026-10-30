# Build Prompt — Routines & Streaks (original prompt, improved edition)

**What this is:** a from-scratch generation prompt for the Routines & Streaks — the original build prompt's full scope and feature set, merged with every improvement that came out of the Oct 25–26 review (SPEC.md v0.3). Use it to regenerate the app from zero, or to rebuild a section faithfully. For *patching the existing app* instead, use `docs/GENERATOR_PROMPT.md` (the five-fix prompt).

**Provenance, honestly:** the original prompt's exact wording was not saved in the chat, the repo, or any file I can reach — so the "original" half of this merge is reconstructed from the app exactly as it was built (its features, defaults and structure are the original prompt's output) plus README.md and SPEC.md §1–§5. Everything marked as an improvement traces to SPEC.md v0.3. If you still have your literal original text (e.g. in the generator tool's history), paste it to me and I'll re-merge against your exact words.

Links: repo https://github.com/andrewdhorowitz/routines-and-streaks · spec https://github.com/andrewdhorowitz/routines-and-streaks/blob/main/SPEC.md · status tracker https://github.com/andrewdhorowitz/routines-and-streaks/issues/15

---

## ⬇ Paste everything between the lines into the generator ⬇

---

Build a complete, working web app called **Routines & Streaks** and give me the entire app as ONE self-contained `index.html` file. Follow every requirement below exactly; where something is ambiguous, prefer the behaviour described here over your own defaults, and say so in your summary.

### Stage and honesty rules

- This app is entirely in TEST stage: no real families depend on it and there is no production data. Build for correctness of the core loop, not for production hardening.
- Roles (below) are a user-experience concept stored client-side for now. Do NOT claim anywhere in the UI copy that the app is "secure", and do not add a real auth system in this build.
- Never put a real API key in the file. The Firebase config must contain the placeholder `__FIREBASE_API_KEY__` exactly once (it is substituted at deploy time). If you feel a key is needed somewhere else, use a placeholder there too and flag it in your summary.

### Tech constraints (do not substitute)

- One file: `index.html` with all CSS/JS inline. No build step, no modules, no extra files.
- Tailwind via CDN (`https://cdn.tailwindcss.com`), Font Awesome 6.4.0 via cdnjs, canvas-confetti 1.6.0 via jsdelivr.
- Firebase **compat** SDK 10.8.0 from gstatic (`firebase-app-compat.js`, `firebase-firestore-compat.js`, `firebase-auth-compat.js`); use the global `firebase` namespace, Firestore for all shared data.
- Mobile-first, friendly family look: light slate background, rounded cards, big tap targets, bottom padding so content clears the tab bar. Tabs: **Dashboard**, **Streaks**, **Info**.

### What the app does

A family's night-to-morning routine runs as one repeating cycle: evening tasks (lay out outfit, pack bag), a morning launch task, check-offs with subtasks, and a **streak** that grows by 1 for each fully completed cycle. Multiple independent families share the one deployment, backed by Firestore.

### The cycle — implement exactly (this replaces any "calendar day" logic)

- A cycle runs **12:00 noon local on Day D → 11:59 AM local on Day D+1**. `cycleId` is the local date string `YYYY-MM-DD` of Day D.
- `cycleIdFor(date)` = the local date, **minus one day if the local hour is < 12**. (Mon 8:30 PM → Monday. Tue 6:45 AM → Monday, same cycle. Tue 1:00 PM → Tuesday.)
- A task's phase comes from its reminder time: ≥ 12:00 = **evening** (falls on the cycleId date); < 12:00 = **morning** (falls on cycleId + 1 day).
- NEVER derive a date from `new Date().toISOString()` — it is UTC and flips the date at 8:00 PM Eastern, mid-routine. Use these exact pure functions everywhere a date is needed (seeding, reset, streaks, "today" labels):

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
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}
function reminderDateTime(task, cycleId) {
  const [h, m] = task.reminder.split(':').map(Number);
  const dateStr = h >= 12 ? cycleId : addDays(cycleId, 1);
  const dt = new Date(dateStr + 'T12:00:00');
  dt.setHours(h, m, 0, 0);
  return dt;
}
```

### Users and roles (client-side, test stage)

- **kid** — sees tasks assigned to them or to `all`; checks off tasks (subject to the early window below); adds subtasks; cannot delete locked tasks.
- **parent** — everything a kid can, plus: add/delete tasks, lock tasks, manage members, share invite links, impersonate a kid *in their own family* (in-place view swap with a banner; Exit restores the original session; no impersonation links or tokens), reset the family's tasks to defaults.
- **admin (Super Admin)** — everything a parent can for **any** family, plus: global family directory, global default-task template, audit-log view, delete a family, full-database wipe — the last two only behind an explicit `confirm()`.

### Features

1. **Onboarding.** Create a family (family name + first parent) → generates a familyId and a share flow. Join by (a) invite link `?family=<id>&member=<name>&role=<role>` or (b) typing the familyId as an activation code plus your name. Joining creates a member record.
2. **Members.** Per-family roster with roles; parents add/remove members; a filter chips row filters tasks by kid. Display names may contain spaces and apostrophes (e.g. O'Brien) and everything must still work.
3. **Tasks.** Per family: title, reminder (HH:MM), deadline (HH:MM), `assignedTo` (`all` or one member), `locked`, subtasks `[{title, done}]`, `done`, `cycleId`, `doneAt`, `doneBy`. Create/delete for parents/admins; kids add subtasks and check off.
4. **Default tasks** seeded for a new family (unless the global template overrides): (1) "Plan & lay out tomorrow outfit" — reminder 20:30, deadline 21:30, locked, `all`, subtask "Check weather & shoes"; (2) "Pack school bag & homework" — 20:45 / 21:30, locked, `all`, subtask "Charge devices"; (3) "Morning launch & ready on time" — 06:45 / 07:15, locked, `all`, no subtasks.
5. **Daily reset.** On load and on every tasks snapshot: if ANY task's `cycleId` is older than the current `cycleIdFor()`, reset ALL tasks (`done=false`, every subtask `done=false`, `cycleId=current`) — *regardless of whether anything was checked off yesterday*.
6. **Early check-off window.** A kid may check a task only when `now >= reminderDateTime(task, currentCycleId) - earlyBufferMinutes` (family setting, default 60). A 06:45 task's window opens in the morning, never the evening before. Parents/admins are exempt. If blocked, show a "Too early" alert naming the real opening time.
7. **Celebration.** Checking the last incomplete task of a member's visible set completes that member's cycle → fire the celebration modal + confetti, once per cycle.
8. **Streaks tab.** Header shows `🔥 {currentStreak}`; a star grid lights `min(currentStreak, 15)` stars (never cap the number itself).
9. **Super Admin portal.** Global directory of families and members, the global default-task template editor, audit log viewer (actions are appended to `audit_logs` with action/details/user/role/timestamp), and the danger zone.
10. **Info tab.** Detect Android / iOS / Desktop and show matching "Add to Home Screen" instructions (word it "add to home screen", not "install the app"). Include a **Test notification** button that requests Notification permission and shows one test notification; there are no scheduled notifications.
11. **Debug console.** A collapsible in-app log panel for troubleshooting.

### Data model (Firestore — implement exactly)

```text
families/{familyId}            familyName, adminEmail, active, createdAt,
                               settings: { earlyBufferMinutes: 60 }
families/{familyId}/members/{memberId}
                               name (display only — NEVER use the raw name as the doc id;
                               use a Firestore auto-ID or slug + random suffix), role, lastActive
families/{familyId}/tasks/{taskId}   (fields as in Features §3)
global_config/system_defaults  defaultTasks: [ ... ]   // NO secrets or API keys in this
                               // document — a 'thirdPartyKey' field is prohibited
audit_logs/{autoId}            action, details, user, role, timestamp
```

`familyId` = `fam_` + at least 10 characters from a cryptographic RNG (`crypto.getRandomValues`) — not `Math.random()`. The familyId doubles as the activation code, so it must not be guessable.

### Streaks — real storage (this replaces any localStorage counter)

Per member, in Firestore, shared across devices, updated idempotently:

```text
families/{familyId}/streaks/{memberId}
  currentStreak, longestStreak, totalCompletedCycles,
  lastCompletedCycleId ('YYYY-MM-DD' | null), updatedAt (server timestamp)
families/{familyId}/streaks/{memberId}/completions/{cycleId}
  completedAt (server timestamp), taskCount
  // The EXISTENCE of this doc is the record that the cycle counted.
```

Rules:

- Implement `evaluateMemberStreak(memberId)`, called on every task toggle and once on load. A member's cycle is complete when every task visible to them (`assignedTo == 'all'` or `== memberId`) is done and at least one such task exists.
- **In a Firestore transaction:** if `completions/{cycleId}` already exists, change nothing (this makes uncheck → recheck farming impossible). Otherwise create it and update the streak doc: if `lastCompletedCycleId == addDays(cycleId, -1)` then `currentStreak += 1`, else `currentStreak = 1`; `longestStreak = max(...)`; `totalCompletedCycles += 1`; `lastCompletedCycleId = cycleId`.
- **Lazy break:** when the streak doc is read, if `lastCompletedCycleId` is neither the current cycleId nor the previous one, display/store `currentStreak = 0`. No background jobs.
- Unchecking after completion does not remove a completion in the same cycle. A parent task-reset deletes that cycle's completion docs so the cycle can be earned again.
- A brand-new member starts at **0**. There is no default streak and no localStorage streak counter anywhere (`localStorage` may cache the last-seen value for first paint only; Firestore is the source of truth, rendered via `onSnapshot`).

### Rendering safety (functional requirement, not polish)

- Never interpolate raw user text (names, task/subtask titles, family names, audit fields) into `innerHTML` or into an inline `onclick="...'${name}'..."` attribute.
- Render user text through a single `esc()` helper, and wire row buttons with `data-*` attributes (`data-member-id`, `data-task-id`) + one delegated event listener, so user text is never parsed as code and an apostrophe in a name can't break a button.

### Explicitly out of scope for this build

Firebase Auth enforcement and restrictive Firestore rules, a PWA manifest/service worker, scheduled/push notifications, payments, public sign-up or marketing pages, multi-language, native apps, splitting the file, any build tooling. Do not add them "for completeness".

### Acceptance checks — run these yourself before answering, and report PASS/FAIL with one line of evidence each

1. At Mon 9:00 PM the cycleId is Monday; at Tue 7:00 AM it is still Monday; at Tue 1:00 PM it is Tuesday. No `toISOString()` date use remains anywhere.
2. Check nothing off on day 1 → first load in the next cycle still shows all tasks reset.
3. New member → 🔥 0. Complete all tasks in cycle D → 🔥 1. Uncheck one and recheck → still 🔥 1. Complete cycle D+1 → 🔥 2, and a second device shows 🔥 2. Skip a cycle → next open shows 🔥 0.
4. Evening tasks done at 9 PM + morning task done at 7 AM next day = exactly one completion, credited to the cycle that started the previous evening.
5. At 8:30 PM, a kid tapping the 06:45 task gets "Too early" naming a morning opening time; at 6:30 AM it checks off.
6. A member named `O'Brien` and a task titled `Pack "the blue" bag <now>` render correctly and every button on their rows works.
7. The file contains `__FIREBASE_API_KEY__` exactly once and no string starting `AIza`. The file is a single `index.html` and no existing DOM ids from the feature list were renamed arbitrarily.

### Output contract

Reply with: (1) the complete `index.html` and nothing missing; (2) a short table mapping each requirement section above to where you implemented it; (3) the acceptance-check results; (4) a "Conflicts / judgement calls" section listing anything in this prompt you could not follow literally and what you did instead; (5) a suggested one-line commit message. Do not output partial code or placeholders like "// rest unchanged" — if regenerating, regenerate the whole file.

---

## ⬆ End of prompt ⬆

**How the improvements map to the original scope** (for you, not the generator): the app description, roles, feature list, defaults, tech stack and look are the original build as delivered. The improvements, all from SPEC v0.3: the noon-to-noon cycle with exact date functions (was: UTC calendar day), unconditional daily reset (was: reset only if something was done), Firestore streak storage with the completions-doc transaction (was: localStorage counter starting at a fake 5), phase-aware early window (was: same-day time math that opened morning tasks the night before), `esc()` + delegated handlers (was: raw `innerHTML`/inline `onclick`), cryptographic family IDs and member doc IDs ≠ names (was: `Math.random()` 6-char IDs, name-keyed docs), the no-secrets rule for `global_config`, honest "not secure yet" copy, self-run acceptance checks, and the output contract.

## Phase 1.1 addendum (Oct 28, 2026) — admin registry & bootstrap

- Super Admin is whoever is seated in the Firestore `system_admins/{uid}` registry (`{enabled: true}`); the client derives the session role by reading its own entry at sign-in. No admin email may be hardcoded anywhere in the build.
- Deployment bootstrap for a fresh Firebase project, in order: (1) seed the first admin — Firebase Console, or `node scripts/seed-admin.mjs <uid>`; (2) publish `firestore.rules` (Console, or `firebase deploy --only firestore:rules`); (3) sign in and verify the Global Portal opens.
- User-facing failures (access denied, profile/data load errors) go through the visible `showUserError(...)` banner, not only the debug log.
