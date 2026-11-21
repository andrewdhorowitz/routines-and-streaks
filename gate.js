/* gate.js — Routines & Streaks' PUBLIC gate: the auth cache and
 * re-auth discipline (gate-redesign spec 2026-11-16.md §13;
 * Andrew's rulings Nov 21, 2026; fleet pattern 9b as amended).
 *
 * Routines & Streaks carries the PUBLIC flavor of the shared Gate.
 * Its sign-in is Firebase Authentication with Google (the compat
 * SDK, in index.html); admission — any Google account may sign in
 * and is provisioned on first sign-in — is unchanged by this file.
 * What this file governs is the §13 prompt/caching discipline
 * around that sign-in:
 *
 *  - CACHE (rule 1): when a session's standing is confirmed at a
 *    page load, the app keeps a small record on the device — the
 *    signed-in account's email and the time sign-in was last
 *    confirmed — in localStorage. Sign-out clears it (index.html's
 *    sign-out handler calls clear()).
 *  - RE-AUTH AT (RE)START ONLY (rules 2–3): staleness is weighed
 *    once per page load, never during a session. Stale = first
 *    open of a new calendar day since the cached confirmation, or
 *    elapsed past the PUBLIC security timeout (6 hours max —
 *    Andrew, Nov 21, 2026: behind a public gate it is still the
 *    user's private data), whichever comes first. A stale cache
 *    asks for a tap-to-start re-auth (the app's existing Google
 *    sign-in flow; the account picker is Google's and is raised
 *    only by that tap — rule 6, and the sign-in flow itself is
 *    already single-flight with its popup watchdog — rule 5). A
 *    fresh cache passes silently. Staleness is not revocation and
 *    never signs anyone out.
 *  - THE CHECKPOINT (rule 9): re-auth is the trust checkpoint.
 *    The re-auth sign-in re-runs the app's own standing checks —
 *    the system_admins registry read and the member-profile load
 *    (index.html handleAuthStateChanged). A completed profile load
 *    is standing; a first-time account takes the app's existing
 *    provisioning path (admission is open, so provisioning IS its
 *    standing). Firebase itself re-validates the account at every
 *    token refresh: an account Google has disabled or deleted
 *    fails the refresh and the SDK signs the session out — the
 *    definitive answer, which lands on the welcome/sign-in screen
 *    with the cache cleared. Proportionality (Andrew, Nov 21,
 *    2026 — "this isn't the CIA"): anything short of that explicit
 *    answer — offline, timeout, a failed profile load — is a
 *    pass; the app's existing profile-load error banner already
 *    says so and keeps the session. No penalty, no retry loop.
 *  - ENROLLED KEYS: this app enrolls no device keys, so the
 *    checkpoint has no key standing to check.
 *  - BIOMETRIC (rule 8): N/A for this flavor — a web/TWA shell
 *    holds no native biometric surface, and this app's settings
 *    surface is declared "No settings page", so there is no
 *    Settings toggle to host either. Nothing here simulates one.
 *
 * The pure decisions (isFresh, checkpointVerdict) are free of
 * browser state so tests can pin every leg. Loads in the browser
 * as window.RSGate and in Node for tests, same UMD shape as the
 * fleet's other web gate modules.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.RSGate = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* The PUBLIC flavor's security timeout cap: 6 hours (Andrew,
   * Nov 21, 2026). May be set shorter, never longer. */
  const SECURITY_TIMEOUT_MS = 6 * 60 * 60 * 1000;

  const CACHE_KEY = "rs-gate-cache";

  /* ---- pure decisions (unit-tested) ---- */

  /* Is the cached confirmation still fresh at nowMs? Fresh
   * requires all of: an account is cached, a confirmation time
   * exists, the elapsed time has not passed the timeout, and
   * nowMs falls on the same local calendar day as the
   * confirmation. A cleared cache (sign-out) is never fresh. */
  function isFresh(account, authedAtMs, nowMs, timeoutMs) {
    const cap = typeof timeoutMs === "number" ? timeoutMs : SECURITY_TIMEOUT_MS;
    if (!account || !(authedAtMs > 0)) return false;
    if (nowMs - authedAtMs > cap) return false;
    const a = new Date(authedAtMs), n = new Date(nowMs);
    return a.getFullYear() === n.getFullYear()
      && a.getMonth() === n.getMonth()
      && a.getDate() === n.getDate();
  }

  /* The rule-9 checkpoint verdict for one standing check:
   *   "standing"      — the check completed and standing holds
   *                     (profile loaded, or first-time account
   *                     provisioned);
   *   "revoked"       — a DEFINITIVE answer: Firebase reports the
   *                     account disabled/deleted (the SDK signs
   *                     the session out);
   *   "indeterminate" — anything else (offline, timeout, failed
   *                     profile load): a pass, never an action. */
  function checkpointVerdict(outcome) {
    if (outcome === "standing") return "standing";
    if (outcome === "account-revoked") return "revoked";
    return "indeterminate";
  }

  /* ---- storage (browser only; inert under Node) ---- */

  function store() {
    try { return typeof localStorage !== "undefined" ? localStorage : null; }
    catch (e) { return null; }
  }

  function read() {
    const s = store();
    if (!s) return null;
    try {
      const raw = s.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.authedAt !== "number") return null;
      return { account: parsed.account || "", authedAt: parsed.authedAt };
    } catch (e) { return null; }
  }

  /* Record a confirmed sign-in: the account and the moment the
   * confirmation completed. On-device only; never transmitted. */
  function recordAuth(account, nowMs) {
    const s = store();
    if (!s) return;
    try {
      s.setItem(CACHE_KEY, JSON.stringify({
        account: account || "",
        authedAt: typeof nowMs === "number" ? nowMs : Date.now()
      }));
    } catch (e) { /* a failed write costs a re-auth ask, never access */ }
  }

  /* Clear the cache (sign-out; the definitive-revocation path). */
  function clear() {
    const s = store();
    if (!s) return;
    try { s.removeItem(CACHE_KEY); } catch (e) {}
  }

  /* Fresh right now, per the stored cache. */
  function isFreshNow(nowMs) {
    const c = read();
    if (!c) return false;
    return isFresh(c.account, c.authedAt,
      typeof nowMs === "number" ? nowMs : Date.now());
  }

  return { SECURITY_TIMEOUT_MS, CACHE_KEY, isFresh, checkpointVerdict, read, recordAuth, clear, isFreshNow };
});
