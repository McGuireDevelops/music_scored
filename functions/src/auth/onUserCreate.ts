/**
 * Auth trigger: create users doc on signup
 */
import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  const db = admin.firestore();
  await db.doc(`users/${user.uid}`).set(
    {
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      role: "student",
      createdAt: Date.now(),
    },
    { merge: true }
  );
});
