#!/usr/bin/env node
/**
 * seed-admin.mjs — grant or revoke a Super Admin seat in the system_admins registry.
 *
 * The registry is the top-level Firestore collection `system_admins`: one document
 * per admin, document ID = Firebase Auth UID, single field `enabled: true`. The app
 * client can read only its own entry and can never write the registry (the security
 * rules deny it), so seats are managed here or in the Firebase Console — by design.
 *
 * Prerequisites (owner's machine):
 *   1. Node 18+.
 *   2. `npm install firebase-admin` (run from a scratch folder or the repo root;
 *      the package is a local tool dependency, never part of the app build).
 *   3. Authenticate as the project owner: `gcloud auth application-default login`
 *      (Application Default Credentials — no service-account key file needed).
 *
 * Usage:
 *   node scripts/seed-admin.mjs <uid> [<uid> ...]     seat admin(s): enabled = true
 *   node scripts/seed-admin.mjs --revoke <uid>        revoke: enabled = false
 *
 * Environment:
 *   FIREBASE_PROJECT_ID   target project (default: family-routines-app)
 *
 * Get a user's UID from Firebase Console -> Authentication -> Users (copy icon).
 * Registry changes are read by the rules immediately and by the app at sign-in.
 */
import admin from 'firebase-admin';

const args = process.argv.slice(2);
const revoke = args.includes('--revoke');
const uids = args.filter((a) => !a.startsWith('--'));

if (uids.length === 0) {
  console.error('Usage: node scripts/seed-admin.mjs [--revoke] <uid> [<uid> ...]');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID || 'family-routines-app',
});

const db = admin.firestore();

for (const uid of uids) {
  await db.doc(`system_admins/${uid}`).set({ enabled: !revoke }, { merge: true });
  console.log(`${revoke ? 'revoked' : 'seated'}: system_admins/${uid} -> enabled=${!revoke}`);
}

console.log('Done. Seated admins get the Global Portal at their next sign-in.');
process.exit(0);
