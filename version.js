/* Routines & Streaks — fleet minimum-version check (pattern 30, web-TWA
 * expression). Added Nov 17, 2026 (fleet spec fix plan R1).
 *
 * The version being gated is the TWA WRAPPER's versionCode — that is
 * what Google Play can update. The wrapper (1.0.1+) appends it to the
 * launch URL as `rs_twa_vc=<versionCode>`. The page has no other honest
 * way to learn it: the user agent carries no app version, and Digital
 * Asset Links expose none.
 *
 * Version resolution: URL param -> remembered for this session ->
 * remembered from a previous launch (localStorage, trusted ONLY when
 * the launch actually came from the wrapper — a referrer starting with
 * "android-app://"). A plain browser / PWA open has no wrapper version,
 * so the check stays INERT there: there is no Play-managed wrapper to
 * update, and a browser-open can never be below a wrapper minimum.
 *
 * Policy chain (fail open at every step, never blocks boot):
 *   1. fleet Worker, GET /app-version-policy?app=routines
 *      (PRIMARY — the fleet channel; unauthenticated, two integers and
 *      an optional operator notice)
 *   2. Firebase Remote Config in THIS app's own Firebase project
 *      (family-routines-app) — params routines_min_version_code /
 *      routines_latest_version_code (FALLBACK only). Unlike Homework
 *      Clarity — whose Firebase home is a different project from the
 *      fleet mirror's — this app's home IS family-routines-app, so the
 *      fleet Worker's Remote Config mirror writes this app's params
 *      into the right template and the fallback leg is real.
 *   3. last-known-good policy cached in localStorage
 *   4. fail open silently (no banner, no block, no error shown)
 *
 * Behavior:
 *   - wrapper version BELOW the minimum: the interactive UI is replaced
 *     by a blocking update screen (background legs never read version
 *     state). Its only action opens the Play listing.
 *   - wrapper version AT or ABOVE the minimum but BELOW the latest: a
 *     dismissible update prompt — the web expression of FLEXIBLE.
 *     Dismissal is remembered for this session only (keyed by the
 *     latest version), so the prompt re-offers on the next launch.
 *   - no wrapper version, or any fetch error: nothing shows.
 *
 * The user-facing strings in this module live in the base string file
 * (strings.js) per the fleet label model (pattern 29) — the label
 * foundation landed in the same R1 release, so this module carries no
 * label debt.
 *
 * Recorded limitation: wrapper vc1 (1.0.0) cannot report a version, so
 * enforcement binds only wrappers >= vc2; vc1 and browser opens fail
 * open by design. Nothing fakes parity with the native apps.
 */

(function () {
  "use strict";

  /* Designed copy comes from the base string file (strings.js, fleet
   * label model) via window.L. If that file somehow failed to load,
   * fall back to the key itself — this module must never break boot. */
  function T(key, vars) {
    try { if (window.L) return window.L(key, vars); } catch (e) { /* fall through */ }
    return key;
  }

  var APP = "routines";
  var POLICY_URL = "https://hooks.andrewdhorowitz.com/app-version-policy?app=" + APP;
  var PLAY_URL = "https://play.google.com/store/apps/details?id=com.andrewdhorowitz.routinesandstreaks";
  var RC_PARAMS = {
    min: "routines_min_version_code",
    latest: "routines_latest_version_code"
  };
  var FETCH_TIMEOUT_MS = 4000;
  var RC_FETCH_TIMEOUT_MS = 4000;
  var CACHE_KEY = "rs-version-policy-cache";
  var VC_SESSION_KEY = "rs_twa_vc";
  var VC_LOCAL_KEY = "rs_twa_vc_last";
  var DISMISS_KEY = "rs-update-dismissed-latest";

  function readWrapperVersion() {
    var params;
    try {
      params = new URLSearchParams(window.location.search || "");
    } catch (_) {
      return null;
    }
    var raw = params.get("rs_twa_vc");
    if (raw != null) {
      var vc = parseInt(raw, 10);
      if (Number.isSafeInteger(vc) && vc > 0) {
        try {
          sessionStorage.setItem(VC_SESSION_KEY, String(vc));
          localStorage.setItem(VC_LOCAL_KEY, String(vc));
        } catch (_) {}
        return vc;
      }
    }
    try {
      var remembered = sessionStorage.getItem(VC_SESSION_KEY);
      if (remembered) return parseInt(remembered, 10) || null;
    } catch (_) {}
    // A stored version is trusted only when this launch really came
    // from the wrapper (TWA launches carry an android-app:// referrer).
    // A plain-browser open must never inherit a wrapper version.
    try {
      if ((document.referrer || "").indexOf("android-app://") === 0) {
        var last = localStorage.getItem(VC_LOCAL_KEY);
        if (last) return parseInt(last, 10) || null;
      }
    } catch (_) {}
    return null;
  }

  function fetchWithTimeout(url, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var ctrl;
      try {
        ctrl = new AbortController();
      } catch (_) {
        ctrl = null;
      }
      var timer = setTimeout(function () {
        if (ctrl) ctrl.abort();
        reject(new Error("timeout"));
      }, timeoutMs);
      var opts = ctrl ? { signal: ctrl.signal } : {};
      fetch(url, opts)
        .then(function (resp) {
          clearTimeout(timer);
          resolve(resp);
        })
        .catch(function (err) {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  function readCachedPolicy() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var p = JSON.parse(raw);
      return p ? sanePolicy(p.min, p.latest) : null;
    } catch (_) {}
    return null;
  }

  function writeCachedPolicy(policy) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(policy));
    } catch (_) {}
  }

  // A usable policy names real builds: both codes are safe integers,
  // latest >= min, and latest >= 1 (a latest of 0 names no shipped
  // build and would silently suppress every prompt). Anything else is
  // treated as "this source has no policy" and the chain moves on —
  // in particular an ABSENT Remote Config parameter reads back as an
  // empty string, whose Number() is 0, and must never be mistaken for
  // a real {0, 0} policy or cached as one.
  function sanePolicy(min, latest) {
    if (!Number.isSafeInteger(min) || !Number.isSafeInteger(latest)) return null;
    if (min < 0 || latest < 1 || latest < min) return null;
    return { min: min, latest: latest };
  }

  function fetchWorkerPolicy() {
    return fetchWithTimeout(POLICY_URL, FETCH_TIMEOUT_MS)
      .then(function (resp) {
        if (!resp.ok) throw new Error("http " + resp.status);
        return resp.json();
      })
      .then(function (data) {
        if (!data || !data.ok) throw new Error("bad payload");
        var policy = sanePolicy(Number(data.min_version_code), Number(data.latest_version_code));
        if (!policy) throw new Error("bad version codes");
        return policy;
      });
  }

  function fetchRemoteConfigPolicy() {
    // Modular SDK at the same pin the app already uses (index.html:
    // 10.8.0 compat from gstatic). A NAMED secondary app ("rs-version")
    // leaves the app's default Firebase app untouched.
    var V = "10.8.0";
    var BASE = "https://www.gstatic.com/firebasejs/" + V + "/";
    return Promise.race([
      Promise.all([
        import(BASE + "firebase-app.js"),
        import(BASE + "firebase-remote-config.js")
      ]).then(function (mods) {
        var appMod = mods[0];
        var rcMod = mods[1];
        var cfg = window.RS_FIREBASE;
        if (!cfg || !cfg.projectId) throw new Error("no firebase config");
        var app = appMod.getApps().find(function (a) { return a.name === "rs-version"; });
        if (!app) app = appMod.initializeApp(cfg, "rs-version");
        var rc = rcMod.getRemoteConfig(app);
        rc.settings = { minimumFetchIntervalMillis: 0, fetchTimeoutMillis: RC_FETCH_TIMEOUT_MS };
        rc.defaultConfig = {};
        return rcMod.fetchAndActivate(rc).then(function () {
          var minRaw = rcMod.getValue(rc, RC_PARAMS.min).asString();
          var latestRaw = rcMod.getValue(rc, RC_PARAMS.latest).asString();
          if (!minRaw || !latestRaw) throw new Error("params absent");
          var policy = sanePolicy(Number(minRaw), Number(latestRaw));
          if (!policy) throw new Error("params invalid");
          return policy;
        });
      }),
      new Promise(function (_, reject) {
        setTimeout(function () { reject(new Error("rc timeout")); }, RC_FETCH_TIMEOUT_MS + 1500);
      })
    ]);
  }

  function resolvePolicy() {
    return fetchWorkerPolicy()
      .catch(function () { return fetchRemoteConfigPolicy(); })
      .then(function (policy) {
        writeCachedPolicy(policy);
        return policy;
      })
      .catch(function () { return readCachedPolicy(); });
  }

  /* --- UI: a blocking update screen and a dismissible prompt -------- */
  function ensureStyle() {
    if (document.getElementById("rs-version-style")) return;
    var style = document.createElement("style");
    style.id = "rs-version-style";
    style.textContent =
      ".rs-update-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:#f8fafc;padding:24px;box-sizing:border-box;}" +
      ".rs-update-card{max-width:420px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:28px 24px;text-align:center;font-family:inherit;}" +
      ".rs-update-card h2{margin:0 0 8px;font-size:20px;}" +
      ".rs-update-card p{margin:0 0 16px;color:#444;line-height:1.5;}" +
      ".rs-update-actions{display:flex;flex-direction:column;gap:10px;}" +
      ".rs-update-actions a,.rs-update-actions button{font:inherit;font-size:16px;padding:12px 16px;border-radius:8px;cursor:pointer;text-decoration:none;display:block;}" +
      ".rs-update-actions a{background:#2563eb;color:#fff;}" +
      ".rs-update-actions button{background:none;border:1px solid #999;color:#333;}";
    document.head.appendChild(style);
  }

  function showBlockingUpdate() {
    ensureStyle();
    var overlay = document.createElement("div");
    overlay.className = "rs-update-overlay";
    overlay.setAttribute("role", "alertdialog");
    overlay.setAttribute("aria-label", T("version_required_aria"));
    var card = document.createElement("div");
    card.className = "rs-update-card";
    var h = document.createElement("h2");
    h.textContent = T("version_required_title");
    var p = document.createElement("p");
    p.textContent = T("version_required_body");
    var actions = document.createElement("div");
    actions.className = "rs-update-actions";
    var link = document.createElement("a");
    link.href = PLAY_URL;
    link.textContent = T("version_update_cta");
    actions.appendChild(link);
    card.appendChild(h);
    card.appendChild(p);
    card.appendChild(actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    // The interactive UI is replaced: hide the app chrome underneath
    // (background legs are unaffected — this overlay is DOM only, and
    // no fetch is blocked).
    try {
      ["header", "main", "footer"].forEach(function (tag) {
        var els = document.getElementsByTagName(tag);
        for (var i = 0; i < els.length; i++) els[i].style.display = "none";
      });
    } catch (_) {}
  }

  function showUpdatePrompt(latest) {
    ensureStyle();
    var dismissed;
    try {
      dismissed = sessionStorage.getItem(DISMISS_KEY);
    } catch (_) {
      dismissed = null;
    }
    if (dismissed === String(latest)) return;
    var overlay = document.createElement("div");
    overlay.className = "rs-update-overlay";
    overlay.setAttribute("role", "alertdialog");
    overlay.setAttribute("aria-label", T("version_available_aria"));
    var card = document.createElement("div");
    card.className = "rs-update-card";
    var h = document.createElement("h2");
    h.textContent = T("version_available_title");
    var p = document.createElement("p");
    p.textContent = T("version_available_body");
    var actions = document.createElement("div");
    actions.className = "rs-update-actions";
    var link = document.createElement("a");
    link.href = PLAY_URL;
    link.textContent = T("version_update_cta");
    var dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.textContent = T("dismiss");
    dismiss.addEventListener("click", function () {
      try {
        sessionStorage.setItem(DISMISS_KEY, String(latest));
      } catch (_) {}
      overlay.remove();
    });
    actions.appendChild(link);
    actions.appendChild(dismiss);
    card.appendChild(h);
    card.appendChild(p);
    card.appendChild(actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  function check() {
    var vc = readWrapperVersion();
    if (vc == null) return; // browser/PWA open: inert by design
    resolvePolicy()
      .then(function (policy) {
        if (!policy) return;
        if (vc < policy.min) showBlockingUpdate();
        else if (vc < policy.latest) showUpdatePrompt(policy.latest);
      })
      .catch(function () { /* fail open — never block boot */ });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", check);
  } else {
    check();
  }

  window.RS_VERSION_CHECK = { check: check, readWrapperVersion: readWrapperVersion };
})();
