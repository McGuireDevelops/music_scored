/**
 * Teacher/Admin-only: get and update teacher settings. Uses Admin SDK to bypass security rules.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const DEFAULT_FEATURES = {
  quizzes: true,
  community: true,
  liveLessons: true,
  assignments: true,
  certificates: true,
  playlists: true,
  paidClasses: true,
};

async function assertTeacherOrAdmin(uid: string): Promise<void> {
  const userDoc = await admin.firestore().doc(`users/${uid}`).get();
  const role = userDoc.data()?.role;
  if (role !== "teacher" && role !== "admin") {
    throw new HttpsError(
      "permission-denied",
      "Only teachers and admins can access teacher settings"
    );
  }
}

export const getTeacherSettings = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }
  const uid = request.auth.uid;
  await assertTeacherOrAdmin(uid);

  const snap = await admin.firestore().doc(`teacherSettings/${uid}`).get();
  if (snap.exists) {
    const d = snap.data()!;
    return {
      userId: d.userId ?? uid,
      features: { ...DEFAULT_FEATURES, ...d.features },
      stripeConnectAccountId: d.stripeConnectAccountId,
      stripeOnboardingComplete: d.stripeOnboardingComplete ?? false,
      zoomAccountId: d.zoomAccountId,
      zoomClientId: d.zoomClientId,
      zoomClientSecret: d.zoomClientSecret ? "••••••••" : undefined,
      updatedAt: d.updatedAt ?? Date.now(),
    };
  }
  return {
    userId: uid,
    features: { ...DEFAULT_FEATURES },
    stripeConnectAccountId: undefined,
    stripeOnboardingComplete: false,
    zoomAccountId: undefined,
    zoomClientId: undefined,
    zoomClientSecret: undefined,
    updatedAt: Date.now(),
  };
});

/** Teacher/Admin-only: update teacher settings. */
export const updateTeacherSettings = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }
  const uid = request.auth.uid;
  await assertTeacherOrAdmin(uid);

  const payload = request.data as Record<string, unknown>;
  const updates: Record<string, unknown> = {
    userId: uid,
    ...payload,
    updatedAt: Date.now(),
  };

  await admin.firestore().doc(`teacherSettings/${uid}`).set(updates, { merge: true });
  return { success: true };
});
