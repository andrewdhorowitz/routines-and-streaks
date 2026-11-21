/* Routines & Streaks — base string file (fleet label model, pattern 29;
 * web-TWA shell expression, fleet R1, Nov 17, 2026).
 *
 * EVERY designed, outputtable string in the web app lives HERE, in this
 * ONE base file, referenced from index.html and version.js by the
 * readable keys below. Static HTML copy is bound with data-i18n /
 * data-i18n-html / data-i18n-attr attributes (the inline text stays in
 * the HTML as the no-JS fallback and is replaced from this file at
 * load); JS-built copy calls L("key").
 *
 * Per-language files (strings.<lang>.js) are created ONLY when a
 * translation exists — none do today, so this base file is the only
 * one. When one exists, the device language picks it and any key it
 * lacks falls back to THIS base file (never to an assumed English).
 * Andrew's own translations always win and are never overwritten.
 * There is NO in-app automatic translation, ever — the GTranslate
 * widget this file replaces was removed in this same release.
 *
 * NOT labels (they stay in code, per the Nov 17 label scope note):
 * error codes, exception texts, diagnostic / operational strings
 * (the Debug Console's log lines, the vendored error-reporter's
 * tables), JSON keys, state constants — and the fleet notice TEXT
 * itself, which is served content (the one deliberate exception,
 * pattern 31; the banner hook itself is R2). Also left in code as
 * data, not display copy: the sample/default task titles (they become
 * the user's own stored data), name fallbacks that are stored values,
 * the brand/title (identity), and the counter/date format shapes the
 * formatters produce.
 *
 * Values reproduce the pre-R1 copy BYTE-IDENTICALLY (verified
 * mechanically against the pre-change sources — see
 * BUILD-REPORT-FLEET-R1.md), including meaningful leading/trailing
 * spaces where a value is a sentence fragment. {name} tokens are
 * substitution points filled by the caller via L("key", {name: …}).
 * Fleet commons use the shared_ prefix where the wording matches a
 * fleet common label exactly (shared_cancel); nothing is forced.
 */
(function () {
  "use strict";

  var STRINGS = {
    /* ---- fleet commons (shared_ — wording matches the fleet common) ---- */
    "shared_cancel": "Cancel",

    /* ---- header / chrome ---- */
    "role_not_signed_in": "Not Signed In",
    "role_confirm_profile": "Confirm Profile",
    "role_super_admin_solo": "SUPER ADMIN + SOLO ROUTINE",
    "role_demo_mode": "DEMO MODE",
    "role_solo_mode": "SOLO MODE",
    "role_impersonating": "IMPERSONATING: {name}",
    "nav_today": "Today",
    "nav_streaks": "Streaks",
    "nav_info": "Info",
    "nav_sign_out_title": "Sign Out",
    "admin_shield_title": "Super Admin Portal",
    "impersonation_banner_title": "SUPER ADMIN IMPERSONATION:",
    "impersonation_viewing_as": "Viewing as",
    "impersonation_exit": "Exit Impersonation",
    "default_display_name": "User",
    "this_account": "this account",

    /* ---- demo banner ---- */
    "demo_banner_text": "Demo mode — nothing is saved",
    "sign_in": "Sign in",

    /* ---- auth / welcome ---- */
    "auth_welcome_title": "Welcome to Routines & Streaks",
    "auth_subtitle": "Sign in with Google to track your evening-to-morning routine cycle and build daily streaks.",
    "auth_continue_google": "Continue with Google",
    "auth_or": "or",
    "auth_try_demo": "Try the demo",
    "auth_demo_note": "Explore a sample routine — no sign-in, nothing is saved.",
    "auth_super_admin_sign_in": "Super Admin Sign-In",
    "auth_reauth_title": "Confirm it's still you",
    "auth_reauth_body": "It's been a while since you signed in on this device. Confirm it's still you to keep going — it takes a moment, and nothing about your routines changes.",
    "auth_reauth_button": "Confirm with Google",
    "auth_reauth_signout": "Sign out instead",
    "welcome_confirm_title": "Confirm Your Name",
    "welcome_confirm_body": "Set your display name to initialize your personal routine checklist and streak tracker.",
    "welcome_name_placeholder": "Your Display Name",
    "welcome_create_button": "Create Profile & Start Routine",

    /* ---- dashboard ---- */
    "family_solo_mode": "Solo Mode",
    "cycle_title": "Evening-to-Morning Cycle",
    "cycle_early_buffer": "Early buffer: {buffer}m before reminder",
    "cycle_early_buffer_default": "Early buffer: 60m before reminder",
    "cycle_label": "📅 Cycle {cycle}",
    "streak_active": "Active Streak",
    "tasks_header": "My Routine",
    "filter_all": "All Phases",
    "filter_evening": "🌙 Evening (≥12:00)",
    "filter_morning": "☀️ Morning (<12:00)",
    "filter_pending": "⏳ Pending Only",
    "reset_defaults": "Reset Defaults",
    "reset_defaults_title": "Reset tasks to system defaults",
    "add_task": "Add Task",
    "tasks_empty": "No tasks match the current view. Click \"Reset Defaults\" or \"Add Task\" above!",
    "phase_evening": "🌙 Evening",
    "phase_morning": "☀️ Morning",
    "task_time_meta": "⏰ {reminder} (Due {deadline})",
    "task_remove_subtask_title": "Remove subtask",
    "task_move_up_title": "Move Up",
    "task_move_down_title": "Move Down",
    "task_add_subtask": "+ Sub",
    "task_add_subtask_title": "Add Subtask",
    "task_edit_title": "Edit Task",
    "task_delete_title": "Delete Task",

    /* ---- streaks tab / history ---- */
    "streaks_current": "Current Streak",
    "streaks_longest": "Longest Streak",
    "streaks_total": "Total Cycles",
    "streaks_matrix_title": "Streak Milestone Matrix (Up to 15 Stars)",
    "streaks_matrix_body": "Checking off all main tasks completes the daily cycle and lights up a star!",
    "streaks_test_celebration": "Test Celebration Animation",
    "history_title": "Completed Cycle History",
    "history_empty": "No completed cycles recorded yet. Complete all main tasks to log your first cycle!",
    "history_tasks_completed": "{count} tasks completed",
    "history_completed": "Completed",

    /* ---- info tab / platform ---- */
    "info_title": "Device Setup & Alerts",
    "info_test_notification": "Test Browser Notification",
    "info_test_notification_delayed": "Test Notification in 30s (then switch apps)",
    "info_detected": "Detected: {platform}",
    "platform_desktop": "Desktop Browser",
    "platform_desktop_instructions": "Click the install icon in your address bar to install.",
    "platform_android": "Android Device",
    "platform_android_instructions": "Tap the 3-dot menu and select 'Add to Home screen'.",
    "platform_ios": "iPhone / iPad (iOS)",
    "platform_ios_instructions": "Tap Share in Safari and select 'Add to Home Screen'.",
    "platform_installed_suffix": " — Installed App",
    "platform_installed_instructions": "You're using the installed app.",

    /* ---- footer ---- */
    "footer_line_start": "© 2026 Andrew Horowitz · Routines & Streaks",
    "footer_line_end": "· Built with Muse ·",
    "footer_privacy": "Privacy",

    /* ---- celebration modal ---- */
    "celebration_title": "Cycle Complete!",
    "celebration_body": "Every main routine task is checked off! Your streak is locked in for this cycle!",
    "celebration_button": "Awesome!",

    /* ---- admin login modal ---- */
    "admin_login_title": "Super Admin Portal",
    "admin_login_body": "Sign in with the Super Admin Google account to access the Global User Directory, edit default starter tasks, or impersonate users.",
    "admin_login_google": "Sign in with Google",

    /* ---- task modal ---- */
    "task_modal_add_title": "Add Routine Task",
    "task_modal_edit_title": "Edit Routine Task",
    "task_title_placeholder": "Main Task Title",
    "task_reminder_label": "Reminder",
    "task_deadline_label": "Deadline",
    "task_subtasks_placeholder": "Sub-dependent tasks (comma separated)",
    "task_save": "Save Task",

    /* ---- super admin portal ---- */
    "admin_portal_title": "Super Admin Global Portal",
    "admin_checking": "Checking...",
    "admin_defaults_title": "1. System Default Tasks & Buffer",
    "admin_buffer_label": "Early Buffer (mins):",
    "admin_save_defaults": "Save System Defaults",
    "admin_directory_title": "2. Registered Users Directory (Solo Mode)",
    "admin_loading": "Loading...",
    "admin_querying": "Querying Firestore...",
    "admin_loading_logs": "Loading audit logs...",
    "admin_logs_title": "3. Global Audit Logs",
    "admin_danger_title": "4. Danger Zone",
    "admin_nuke": "Nuke / Reset ALL DBs",
    "admin_close_portal": "Close Global Portal & View Routine",
    "admin_bar_mode": "👑 Super Admin Mode",
    "admin_bar_title": "Global User Directory & System Config",
    "admin_open_portal": "Open Global Portal",
    "admin_no_users": "No users registered in families/default yet.",
    "admin_impersonate": "👑 Impersonate",
    "admin_delete_user_title": "Delete User Data",
    "admin_uid_line": "UID: {uid}",
    "admin_no_logs": "No audit logs yet.",
    "admin_health_ok": "Firestore R/W OK ✅",
    "admin_health_error": "Firestore Error ❌",

    /* ---- debug console chrome ---- */
    "debug_title": "Debug Console & Trace",
    "debug_copy": "Copy Logs",
    "debug_clear": "Clear",
    "debug_copied_alert": "Full debug trace copied to clipboard!",

    /* ---- sign-in flow + error banners (the #20 user-error surface) ---- */
    "msg_signing_in": "Signing in...",
    "msg_signin_cancelled": "Sign-in cancelled — tap to try again.",
    "msg_popup_unresponsive": "Popup sign-in isn't responding. Trying the full-page sign-in instead...",
    "msg_popup_failed": "Popup sign-in didn't work ({detail}). Trying the full-page sign-in instead...",
    "msg_signin_failed": "Sign-in failed ({code}): {message} Please try again.",
    "msg_signin_unfinished": "Sign-in did not finish ({code}): {message} Please try signing in again.",
    "msg_profile_load_failed": "We could not load your profile. Please check your connection and refresh the page.",
    "msg_access_denied": "Access denied by the security rules. If this should work, sign out and back in; if it keeps happening, tell the app owner.",
    "msg_provision_failed": "We could not finish setting up your profile. Please check your connection and try again.",
    "msg_config_sync_failed": "Live settings updates are not coming through. Refresh the page.",
    "msg_rollover_failed": "Your new day could not be started on the server. Your list may show yesterday’s state until this clears.",
    "msg_tasks_sync_failed": "Your tasks stopped syncing. Refresh the page.",
    "msg_streak_sync_failed": "Your streak stopped syncing. Refresh the page.",
    "msg_history_sync_failed": "Your history stopped syncing. Refresh the page.",
    "msg_toggle_failed": "That check-off could not be saved. Check your connection and try again.",
    "msg_completion_failed": "Your completion could not be recorded just now. Reload the app to retry.",
    "msg_save_task_failed": "Your task could not be saved. It is still here in the form — check your connection and try again.",
    "msg_delete_task_failed": "That task could not be deleted. Check your connection and try again.",
    "msg_reorder_failed": "The new order could not be saved — it may revert in a moment.",
    "msg_subtask_failed": "That subtask change could not be saved. Check your connection and try again.",
    "msg_reset_failed": "Resetting your tasks did not work. Nothing was changed — check your connection and try again.",
    "msg_admin_demo_blocked": "The Super Admin portal is not part of the demo — sign in to explore the full app.",
    "msg_not_admin": "You're signed in as {name}, but this account isn't a Super Admin.",
    "msg_portal_admin_only": "The Global Portal is available to Super Admin accounts only.",
    "msg_directory_failed": "The Global Directory could not be loaded.",
    "msg_settings_save_failed": "Your settings could not be saved (the JSON was fine). Check your connection and try again.",
    "msg_delete_user_failed": "That user could not be deleted. Nothing was removed.",

    /* ---- confirms, alerts, prompts ---- */
    "confirm_delete_task": "Delete task \"{title}\"?",
    "confirm_reset_tasks": "Reset your tasks to the system default template for the current cycle? This replaces your custom edits and clears today's completion proof so you can re-earn it.",
    "confirm_delete_user": "Delete all profile, tasks, and streak data for {name} ({uid})?",
    "confirm_nuke": "🚨 DANGER: This will permanently wipe ALL users, tasks, streaks, completions, and audit logs in Firestore. Continue?",
    "alert_too_early": "Too early! \"{title}\" opens at {time} on {date} ({buffer}m before the {reminder} reminder).",
    "alert_invalid_json": "Invalid JSON in System Default Tasks: {message}",
    "alert_config_saved": "System Default Tasks & Buffer saved!",
    "alert_wipe_done": "All Firestore databases have been reset!",
    "alert_wipe_error": "Error wiping DBs: stopped after {families} families ({docs} documents deleted). {message}",
    "alert_exit_impersonation_first": "Exit Impersonation first before signing out.",
    "prompt_add_subtask": "Add sub-dependent task (breakdown item):",

    /* ---- test notifications ---- */
    "notif_unsupported": "Notifications are not supported in this browser.",
    "notif_permission_denied": "Permission denied.",
    "notif_title": "🔔 Routine Alert",
    "notif_body": "Notifications are active! Test fired at {time}.",
    "notif_delayed_title": "🔔 Routine Alert (delayed test)",
    "notif_delayed_body": "Delayed test fired at {time}. Background notifications work!",
    "notif_delayed_status": "Delayed test scheduled — it will fire at {time} (in 30 seconds). Switch apps or lock your phone now. Keep Routines alive in the background — don't swipe it away, or the timer dies with it.",

    /* ---- version UI (version.js — new copy in the fleet shape) ---- */
    "version_required_aria": "Update required",
    "version_required_title": "Please update Routines & Streaks",
    "version_required_body": "This version is no longer supported. Update the app to keep using it.",
    "version_update_cta": "Update on Google Play",
    "version_available_aria": "Update available",
    "version_available_title": "A newer version is available",
    "version_available_body": "Update Routines & Streaks on Google Play for the latest fixes and improvements.",
    "dismiss": "Dismiss"
  };

  /* L("key") → the base string; L("key", {name: value}) also fills
   * {name} tokens. A missing key returns the key itself — a visible
   * failure, never silent wrong copy. */
  function L(key, vars) {
    var s = STRINGS[key];
    if (s == null) return key;
    if (vars) {
      s = s.replace(/\{(\w+)\}/g, function (m, name) {
        return vars[name] != null ? String(vars[name]) : m;
      });
    }
    return s;
  }
  window.RS_STRINGS = STRINGS;
  window.L = L;

  /* Static HTML binding: data-i18n sets textContent, data-i18n-html
   * sets innerHTML (values carrying sentence-level inline markup),
   * data-i18n-attr="attr:key; attr2:key2" sets attributes. The inline
   * copy in the HTML is the fallback this replaces — identical text,
   * so a shell without this file renders the same words. */
  function applyStatic() {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = L(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      el.innerHTML = L(el.getAttribute("data-i18n-html"));
    });
    document.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
        var i = pair.indexOf(":");
        if (i > 0) el.setAttribute(pair.slice(0, i).trim(), L(pair.slice(i + 1).trim()));
      });
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyStatic);
  } else {
    applyStatic();
  }
})();
