package com.andrewdhorowitz.routinesandstreaks;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.preference.Preference;
import android.preference.PreferenceFragment;
import android.view.View;

/**
 * Routines &amp; Streaks — the surface behind the wrapper's native
 * Android settings entry (fleet R2, Nov 17, 2026; Settings Placement
 * Rule, pattern 26 — the web-TWA shell expression of audit check 4).
 *
 * The manifest registers this activity for
 * android.intent.action.APPLICATION_PREFERENCES (the gear on the
 * app's system Settings page) and for Samsung's
 * com.sec.android.intent.action.SEC_APPLICATION_SETTINGS, so the
 * app is findable from the system Settings. It is therefore
 * exported — the system launches it.
 *
 * This app's declared settings surface is "No settings page"
 * (Andrew, Nov 17, 2026): the app is just-use — Google sign-in is
 * the only account act, and it happens in the web app — so this
 * surface invents no configuration and holds no state. It is a
 * Preference XML surface (res/xml/settings_preferences.xml) whose
 * entries open the app itself (a plain MainActivity start, exactly
 * a launcher launch) and the published Privacy Policy. The version
 * line is display-only.
 *
 * The Preference XML is hosted with the platform Preference
 * framework (android.preference) rather than AndroidX: the wrapper
 * deliberately stays a thin launcher with a minimal dependency set
 * (see build.gradle.kts), and the framework classes carry this
 * simple link-out surface unchanged — the same choice Family Board
 * and Homework Clarity made for their settings surfaces.
 *
 * Fleet defect-track note: Bridge, Home Helper, Family Board and
 * Homework Clarity register this same entry in this same shape,
 * and the entry does not surface on Andrew's phone for any of
 * them; the root cause is unestablished and an on-device
 * investigation is owed. This registration follows the standard
 * exactly; whether it appears is verified on device, not assumed.
 */
public class SettingsActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_settings);
        // Bottom-margin rule (pattern 28): the content respects the
        // system-bar insets on every side, bottom included.
        View container = findViewById(R.id.settingsContainer);
        container.setOnApplyWindowInsetsListener((v, insets) -> {
            v.setPadding(
                    insets.getSystemWindowInsetLeft(),
                    insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(),
                    insets.getSystemWindowInsetBottom());
            return insets;
        });
        if (savedInstanceState == null) {
            getFragmentManager().beginTransaction()
                    .replace(R.id.settingsContainer, new SettingsFragment())
                    .commit();
        }
    }

    /** The Preference XML screen: open the app, the policy, the version. */
    public static class SettingsFragment extends PreferenceFragment {

        @Override
        public void onCreate(Bundle savedInstanceState) {
            super.onCreate(savedInstanceState);
            addPreferencesFromResource(R.xml.settings_preferences);
            wireOpenApp();
            wirePrivacyPolicy();
            showVersion();
        }

        /**
         * The open-the-app entry: a plain start of the wrapper's own
         * TWA activity — exactly a launcher launch (MainActivity adds
         * the rs_twa_vc parameter itself). There is no settings
         * surface inside the app to deep-link to; the declared
         * surface is "No settings page".
         */
        private void wireOpenApp() {
            Preference pref = findPreference("pref_open_app");
            if (pref == null) {
                return;
            }
            pref.setOnPreferenceClickListener(p -> {
                startActivity(new Intent(getActivity(), MainActivity.class));
                return true;
            });
        }

        /** The published Privacy Policy, in the browser/TWA. */
        private void wirePrivacyPolicy() {
            Preference pref = findPreference("pref_privacy");
            if (pref == null) {
                return;
            }
            pref.setOnPreferenceClickListener(p -> {
                startActivity(new Intent(Intent.ACTION_VIEW,
                        Uri.parse("https://andrewdhorowitz.com/privacy")));
                return true;
            });
        }

        /** The version line: display-only, never selectable. */
        private void showVersion() {
            Preference version = findPreference("pref_version");
            if (version == null) {
                return;
            }
            String summary = "—";
            try {
                PackageInfo info = getActivity().getPackageManager()
                        .getPackageInfo(getActivity().getPackageName(), 0);
                long code = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                        ? info.getLongVersionCode() : info.versionCode;
                summary = info.versionName + " (" + code + ")";
            } catch (Throwable ignored) {
                // The placeholder line stands; a version readout
                // must never break the settings screen.
            }
            version.setSummary(summary);
        }
    }
}
