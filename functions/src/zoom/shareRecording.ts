/**
 * Cloud Function: share a recording with classes, cohorts, or individual students.
 * Only the teacher who owns the source lesson/booking can share.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

interface ShareTarget {
  type: "class" | "cohort" | "student";
  classId?: string;
  cohortId?: string;
  studentId?: string;
}

export const shareRecording = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }
  const uid = request.auth.uid;

  const { sourceType, sourceId, sharedWith } = request.data as {
    sourceType: "liveLesson" | "booking";
    sourceId: string;
    sharedWith: ShareTarget[];
  };

  if (!sourceType || !sourceId || !sharedWith?.length) {
    throw new HttpsError(
      "invalid-argument",
      "sourceType, sourceId, and sharedWith are required"
    );
  }

  const db = admin.firestore();

  const collectionName = sourceType === "liveLesson" ? "liveLessons" : "bookings";
  const sourceDoc = await db.doc(`${collectionName}/${sourceId}`).get();

  if (!sourceDoc.exists) {
    throw new HttpsError("not-found", "Source document not found");
  }

  const sourceData = sourceDoc.data()!;
  const ownerField = sourceType === "liveLesson" ? "ownerId" : "teacherId";
  const callerDoc = await db.doc(`users/${uid}`).get();
  const callerRole = callerDoc.data()?.role;
  if (sourceData[ownerField] !== uid && callerRole !== "admin") {
    throw new HttpsError("permission-denied", "Only the owner can share recordings");
  }

  if (!sourceData.recording) {
    throw new HttpsError("failed-precondition", "No recording available to share");
  }

  const validTargets = sharedWith.filter((t) => {
    if (t.type === "class" && t.classId) return true;
    if (t.type === "cohort" && t.cohortId && t.classId) return true;
    if (t.type === "student" && t.studentId) return true;
    return false;
  });

  if (validTargets.length === 0) {
    throw new HttpsError("invalid-argument", "No valid share targets provided");
  }

  const now = Date.now();

  // Check if a share already exists for this source
  const existingSnap = await db
    .collection("recordingShares")
    .where("sourceType", "==", sourceType)
    .where("sourceId", "==", sourceId)
    .where("ownerId", "==", uid)
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    const existingRef = existingSnap.docs[0].ref;
    await existingRef.update({
      sharedWith: validTargets,
      recording: sourceData.recording,
      updatedAt: now,
    });
    return { id: existingRef.id, updated: true };
  }

  const shareData = {
    sourceType,
    sourceId,
    classId: sourceData.classId ?? null,
    ownerId: uid,
    recording: sourceData.recording,
    sharedWith: validTargets,
    sharedAt: now,
    updatedAt: now,
  };

  const ref = await db.collection("recordingShares").add(shareData);
  return { id: ref.id, updated: false };
});
