// Routines & Streaks — Trusted Web Activity (TWA) wrapper for
// https://routines.andrewdhorowitz.com. Same known-good toolchain set as
// Homework Clarity / Home Helper / Text Bridge: AGP 8.7.3 (Gradle 8.9+,
// JDK 17) + Gradle Play Publisher 3.13.0 for the manually triggered
// Play publish job in CI — the plugin config lives in the app module
// (see the `play` block there).
plugins {
    id("com.android.application") version "8.7.3" apply false
    id("com.github.triplet.play") version "3.13.0" apply false
    // Crashlytics wiring (applied conditionally in the app module, only
    // when app/google-services.json exists — see app/build.gradle.kts).
    id("com.google.gms.google-services") version "4.4.3" apply false
    id("com.google.firebase.crashlytics") version "3.0.3" apply false
}
