/**
 * Admin-only: update a user's role. Uses Admin SDK to bypass security rules.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

async function assertAdmin(uid: string): Promise<void> {
  const userDoc = await admin.firestore().doc(`users/${uid}`).get();
  const role = userDoc.data()?.role;
  if (role !== "admin") {
    throw new HttpsError(
      "permission-denied",
      "Only admins can update user roles"
    );
  }
}

export const updateUserRole = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }
  await assertAdmin(request.auth.uid);

  const { userId, role } = request.data as { userId?: string; role?: string };
  if (!userId || !role) {
    throw new HttpsError("invalid-argument", "userId and role are required");
  }
  const validRoles = ["student", "teacher", "admin"];
  if (!validRoles.includes(role)) {
    throw new HttpsError("invalid-argument", "role must be student, teacher, or admin");
  }

  await admin.firestore().doc(`users/${userId}`).update({ role });
  return { success: true };
});
