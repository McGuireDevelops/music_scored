/**
 * Admin-only: list all users from Firestore. Uses Admin SDK to bypass security rules.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

async function assertAdmin(uid: string): Promise<void> {
  const userDoc = await admin.firestore().doc(`users/${uid}`).get();
  const role = userDoc.data()?.role;
  if (role !== "admin") {
    throw new HttpsError(
      "permission-denied",
      "Only admins can list users"
    );
  }
}

export const listUsers = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }
  await assertAdmin(request.auth.uid);

  const snap = await admin.firestore().collection("users").get();
  const users = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      email: data.email ?? null,
      displayName: data.displayName ?? null,
      role: data.role ?? "student",
    };
  });
  return { users };
});
