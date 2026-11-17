package com.andrewdhorowitz.routinesandstreaks;

import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;

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
 *
 * One wrapper-level concern lives here (added in 1.0.1, Nov 17, 2026 —
 * fleet min-version standard, pattern 30, web-TWA expression): the
 * launch URL carries this wrapper's own versionCode as the
 * `rs_twa_vc` query parameter. Play updates THIS wrapper, so the
 * wrapper's versionCode is the version the fleet minimum-version
 * policy gates — and a web page has no other honest way to learn it
 * (the user agent carries no app version, and Digital Asset Links
 * expose none). The web app (version.js) reads the parameter,
 * remembers it for the session, and checks it against the fleet
 * version-policy channel. If the version cannot be read, the launch
 * falls back to the plain URL and the web check stays inert —
 * fail-open, exactly like the policy check itself.
 */
public class MainActivity extends LauncherActivity {

    @Override
    protected Uri getLaunchingUrl() {
        Uri base = Uri.parse(getString(R.string.default_url));
        long versionCode = wrapperVersionCode();
        if (versionCode < 0) {
            return base;
        }
        String separator = base.getQuery() == null ? "?" : "&";
        return Uri.parse(base.toString() + separator + "rs_twa_vc=" + versionCode);
    }

    /** This wrapper's versionCode, or -1 when it cannot be read. */
    private long wrapperVersionCode() {
        try {
            PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), 0);
            if (Build.VERSION.SDK_INT >= 28) {
                return info.getLongVersionCode();
            }
            @SuppressWarnings("deprecation")
            long legacy = info.versionCode;
            return legacy;
        } catch (Exception e) {
            return -1;
        }
    }
}
