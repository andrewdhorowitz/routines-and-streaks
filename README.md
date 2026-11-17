# Routines & Streaks

[![Deploy App Status](https://github.com/andrewdhorowitz/routines-and-streaks/actions/workflows/deploy.yml/badge.svg)](https://github.com/andrewdhorowitz/routines-and-streaks/actions/workflows/deploy.yml) [![CI](https://github.com/andrewdhorowitz/routines-and-streaks/actions/workflows/ci.yml/badge.svg)](https://github.com/andrewdhorowitz/routines-and-streaks/actions/workflows/ci.yml) [![Lighthouse](https://github.com/andrewdhorowitz/routines-and-streaks/actions/workflows/lighthouse.yml/badge.svg)](https://github.com/andrewdhorowitz/routines-and-streaks/actions/workflows/lighthouse.yml) [![Links](https://github.com/andrewdhorowitz/routines-and-streaks/actions/workflows/links.yml/badge.svg)](https://github.com/andrewdhorowitz/routines-and-streaks/actions/workflows/links.yml)

Repository refreshed; earlier development history archived.

A secure, mobile-responsive web application for managing daily routines and streaks: tasks on a daily cycle that resets at noon rather than midnight, persistent streaks and history, everything scoped to the signed-in person. It began as a way to keep the kids' family routines on track — the engine turned out to be general, so now it tracks mine too.

> **Published:** Site — https://routines.andrewdhorowitz.com/ · Docs — https://routines.andrewdhorowitz.com/docs/architecture.md · Interactive — https://routines.andrewdhorowitz.com/docs/interactive-architecture.html · Repo — https://github.com/andrewdhorowitz/routines-and-streaks

## Live App
👉 **[Access Live App Here](https://routines.andrewdhorowitz.com/)**

## Architecture

C4-lite diagrams (System Context, Container, and Deployment views,
Mermaid, diagrams-as-code) for the app as shipped in Version 1:
[docs/architecture.md](docs/architecture.md). That file is the
canonical diagram source; it renders natively on GitHub, and the
interactive rendering beside it is generated from the same source,
so there is no second hand-maintained copy.

## Resource policy

The fleet resource-adaptivity tiers (Normal / Conserve / Critical) spend
freshness, never correctness. Stated honestly against this app's shape:
Routines & Streaks is an on-demand web app in a thin TWA wrapper, and it
runs **no background work of its own** — no polling loops, no sync jobs,
no alarms, no wake locks — in either the web shell or the wrapper (the
service worker is notification-only: it exists so the page can call
`showNotification()`, and it has no fetch handler, no push handler, and
no cache). The one automatic network activity is the version/notice
policy read at open (fleet R1/R2): once per open, fails open, never
retried in a loop. Everything else network-shaped is the app's own
Firebase Auth / Firestore session, live only while the app is open;
the delayed test notification is a plain in-page timer that dies with
the page, as its own copy says.

- **Normal:** the policy/notice read happens at open; routines,
  streaks, and history load at full freshness when the user opens the
  app or acts.
- **Conserve:** there is no app-owned cadence to stretch. Under
  resource pressure the shell's surface is the browser's own resource
  management — tab throttling and freezing, service-worker lifecycle,
  network scheduling — and the app adds nothing on top of it. If the
  app ever grows background work, what it spends first is freshness
  (re-read cadence), never the data itself.
- **Critical:** the same posture — nothing of the app's runs in the
  background to pause, and nothing is dropped: tasks, streaks, and
  history persist server-side (Firestore) and reconcile on the next
  open.

Never spent at any tier: a task check-off, a streak or history write,
or a profile save — correctness writes are issued immediately, never
deferred or dropped as a resource measure. The version check's block
covers the interactive UI only; there is no background leg for it to
gate.
