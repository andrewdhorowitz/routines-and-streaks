# Routines & Streaks — Android (Trusted Web Activity)

A thin Android wrapper around the live web app at
https://routines.andrewdhorowitz.com, so the app can ship through
Google Play while the web app stays the single source of truth.
Mirrors the Homework Clarity TWA (the fleet's first, Nov 3, 2026).

- **Package:** `com.andrewdhorowitz.routinesandstreaks`
- **Host:** `routines.andrewdhorowitz.com`
- **How it works:** `MainActivity` extends androidbrowserhelper's
  `LauncherActivity` and opens `/` in a Trusted Web Activity. Link
  verification comes from Digital Asset Links: the site serves
  `/.well-known/assetlinks.json` (source `.well-known/assetlinks.json`
  in this repo) carrying the Play App Signing SHA-256 fingerprint
  Andrew read from Play Console on Nov 6, 2026, and the app delegates
  to it via the `asset_statements` manifest meta-data. Until Play
  serves a build signed with that key, Android falls back to a
  Custom Tab — expected pre-launch.
- **Icons:** generated Nov 6, 2026 from the web app's own icon set
  (icon-512.png for the legacy/round icons, icon-maskable-512.png for
  the adaptive foreground) on the brand blue `#2563EB`.
- **Builds:** CI only (`.github/workflows/android.yml` at the repo
  root; this folder is the Gradle root). JDK 17, SDK 36, Gradle 8.9,
  AGP 8.7.3 — same toolchain as Homework Clarity / Home Helper /
  Text Bridge.
- **Signing:** repo secrets `RS_KEYSTORE_BASE64`,
  `RS_KEYSTORE_PASSWORD`, `RS_KEY_ALIAS`, `RS_KEY_PASSWORD`
  (env-driven signing config `rs`). The keystore is generated and
  deposited owner-side; it never travels through chat or a repo
  file. Without the secrets, CI still builds — the release bundle
  is just unsigned.
- **Publishing:** Gradle Play Publisher is wired exactly like
  Homework Clarity's (track `internal`, completed releases). The
  publish job runs only on a manual workflow dispatch with
  `publish = true` and needs the `PLAY_SERVICE_ACCOUNT_JSON`
  secret (the play-publisher service account) in this repo.

Outstanding owner steps (Nov 6, 2026): deposit the `RS_KEYSTORE_*`
secrets and `PLAY_SERVICE_ACCOUNT_JSON` into this repo (owner-side,
same route as the Homework Clarity deposit of Nov 3, 2026). Andrew
has already created the Play Console app entry, read the Play App
Signing fingerprint into the assetlinks file, and added himself as
a tester. No TV target — excluded pending the Family Board pilot.
