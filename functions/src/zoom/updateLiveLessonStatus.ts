/**
 * Cloud Function: update a live lesson's status (scheduled -> live -> ended).
 * Only the owning teacher may change the status.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const VALID_STATUSES = ["scheduled", "live", "ended"] as const;
type LiveLessonStatus = (typeof VALID_STATUSES)[number];

export const updateLiveLessonStatus = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }
  const uid = request.auth.uid;
  const { lessonId, status } = request.data as {
    lessonId: string;
    status: LiveLessonStatus;
  };

  if (!lessonId || !status) {
    throw new HttpsError("invalid-argument", "lessonId and status are required");
  }
  if (!VALID_STATUSES.includes(status)) {
    throw new HttpsError("invalid-argument", `status must be one of: ${VALID_STATUSES.join(", ")}`);
  }

  const docRef = admin.firestore().doc(`liveLessons/${lessonId}`);
  const snap = await docRef.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Live lesson not found");
  }
  const data = snap.data()!;
  if (data.ownerId !== uid) {
    throw new HttpsError("permission-denied", "Only the lesson owner can update status");
  }

  const updates: Record<string, unknown> = { status, updatedAt: Date.now() };
  if (status === "live") {
    updates.startedAt = Date.now();
  } else if (status === "ended") {
    updates.endedAt = Date.now();
  }

  await docRef.update(updates);
  return { success: true, status };
});
