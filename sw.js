/* Routines & Streaks service worker — notification-only, deliberately minimal.
 *
 * Why this exists: Android Chrome forbids the page-level Notification
 * constructor (it throws in tabs and in the installed PWA alike); a web app
 * may only post notifications through its service worker via
 * `registration.showNotification()`. This worker exists solely to provide
 * that registration and to handle notification clicks.
 *
 * What it deliberately does NOT do:
 * - No fetch handler: it never intercepts, rewrites, or caches any request,
 *   so deploys are always fresh on next load and Firebase/CDN traffic flows
 *   untouched. There is no cache and no offline mode in this worker.
 * - No push handler: the app has no push server and no scheduled/push
 *   notifications; notifications are only shown while the app is in use,
 *   in direct response to the in-page code calling showNotification().
 * - No data access: it reads no storage, cookies, or user data. A click
 *   carries only the target URL the page itself put in the notification's
 *   `data.url` (default: the app itself).
 */

self.addEventListener("install", (event) => {
  // Activate as soon as installed so the first test notification after a
  // fresh install does not have to wait for a full page lifecycle cycle.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  // Take control of already-open pages so showNotification works without
  // requiring the user to close and reopen the app first.
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(
    (event.notification.data && event.notification.data.url) || "./",
    self.registration.scope
  ).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Focus the app's existing window/tab if one is open.
        for (const client of windowClients) {
          if (client.url.startsWith(self.registration.scope) && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open the app fresh.
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return undefined;
      })
  );
});
