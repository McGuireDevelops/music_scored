/**
 * Cloud Function: create a Zoom meeting and persist a liveLessons doc.
 * Uses the tenant's (teacher's) Server-to-Server OAuth credentials stored
 * in their teacherSettings document.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getTeacherZoomCredentials, createZoomMeetingForSlot } from "./zoomUtils";

async function assertTeacher(uid: string): Promise<void> {
  const userDoc = await admin.firestore().doc(`users/${uid}`).get();
  const role = userDoc.data()?.role;
  if (role !== "teacher" && role !== "admin") {
    throw new HttpsError("permission-denied", "Only teachers can create live classes");
  }
}

export const createZoomMeeting = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }
  const uid = request.auth.uid;
  await assertTeacher(uid);

  const {
    classId,
    title,
    scheduledAt,
    scheduledTimezone,
    duration,
    cohortIds,
    moduleId,
    topics,
  } = request.data as {
    classId: string;
    title: string;
    scheduledAt: number;
    scheduledTimezone?: string;
    duration?: number;
    cohortIds?: string[];
    moduleId?: string;
    topics?: string[];
  };

  if (!classId || !title || !scheduledAt) {
    throw new HttpsError("invalid-argument", "classId, title, and scheduledAt are required");
  }

  const creds = await getTeacherZoomCredentials(uid);
  if (!creds) {
    throw new HttpsError(
      "failed-precondition",
      "Zoom credentials not configured. Add them in Settings."
    );
  }

  const meeting = await createZoomMeetingForSlot(creds, title, scheduledAt, duration ?? 60);

  const liveLessonData: Record<string, unknown> = {
    classId,
    ownerId: uid,
    title,
    scheduledAt,
    duration: duration ?? 60,
    status: "scheduled",
    zoomMeetingId: meeting.zoomMeetingId,
    zoomJoinUrl: meeting.zoomJoinUrl,
    zoomStartUrl: meeting.zoomStartUrl,
    createdAt: Date.now(),
  };
  if (moduleId) liveLessonData.moduleId = moduleId;
  if (cohortIds?.length) liveLessonData.cohortIds = cohortIds;
  if (topics?.length) liveLessonData.topics = topics;
  if (typeof scheduledTimezone === "string" && scheduledTimezone.trim().length > 0) {
    liveLessonData.scheduledTimezone = scheduledTimezone.trim();
  }

  const ref = await admin.firestore().collection("liveLessons").add(liveLessonData);

  return {
    id: ref.id,
    ...liveLessonData,
  };
});
