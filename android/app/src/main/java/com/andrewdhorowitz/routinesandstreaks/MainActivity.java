package com.andrewdhorowitz.routinesandstreaks;

import android.net.Uri;

import com.google.androidbrowserhelper.trusted.LauncherActivity;

/**
 * Routines & Streaks — Trusted Web Activity launcher.
 *
 * The Android app is deliberately a shell: it opens the live web app
 * (https://routines.andrewdhorowitz.com) full-screen in a verified TWA
 * session. Verification flows from the site's Digital Asset Links file
 * (/.well-known/assetlinks.json) naming this package + the Play App
 * Signing fingerprint; until that statement verifies, the browser falls
 * back to a Custom Tab, which is the honest pre-launch behavior.
 * All product logic stays in the web app — this project only changes
 * for wrapper-level concerns (icons, host, SDK levels).
 */
public class MainActivity extends LauncherActivity {

    @Override
    protected Uri getLaunchingUrl() {
        return Uri.parse(getString(R.string.default_url));
    }
}
