/**
 * Cloud Function: create a Zoom meeting and persist a liveLessons doc.
 * Uses the tenant's (teacher's) Server-to-Server OAuth credentials stored
 * in their teacherSettings document.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

interface ZoomTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface ZoomMeetingResponse {
  id: number;
  join_url: string;
  start_url: string;
}

async function assertTeacher(uid: string): Promise<void> {
  const userDoc = await admin.firestore().doc(`users/${uid}`).get();
  const role = userDoc.data()?.role;
  if (role !== "teacher" && role !== "admin") {
    throw new HttpsError("permission-denied", "Only teachers can create live classes");
  }
}

async function getZoomAccessToken(
  accountId: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new HttpsError("failed-precondition", `Zoom auth failed: ${body}`);
  }
  const data = (await res.json()) as ZoomTokenResponse;
  return data.access_token;
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
    duration,
    cohortIds,
    moduleId,
    topics,
  } = request.data as {
    classId: string;
    title: string;
    scheduledAt: number;
    duration?: number;
    cohortIds?: string[];
    moduleId?: string;
    topics?: string[];
  };

  if (!classId || !title || !scheduledAt) {
    throw new HttpsError("invalid-argument", "classId, title, and scheduledAt are required");
  }

  const settingsSnap = await admin.firestore().doc(`teacherSettings/${uid}`).get();
  const settings = settingsSnap.data();
  const zoomAccountId = settings?.zoomAccountId as string | undefined;
  const zoomClientId = settings?.zoomClientId as string | undefined;
  const zoomClientSecret = settings?.zoomClientSecret as string | undefined;

  if (!zoomAccountId || !zoomClientId || !zoomClientSecret) {
    throw new HttpsError(
      "failed-precondition",
      "Zoom credentials not configured. Add them in Settings."
    );
  }

  const accessToken = await getZoomAccessToken(zoomAccountId, zoomClientId, zoomClientSecret);

  const startTime = new Date(scheduledAt).toISOString().replace(/\.\d{3}Z$/, "Z");

  const meetingRes = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic: title,
      type: 2, // scheduled meeting
      start_time: startTime,
      duration: duration ?? 60,
      timezone: "UTC",
      settings: {
        join_before_host: false,
        waiting_room: true,
        mute_upon_entry: true,
      },
    }),
  });

  if (!meetingRes.ok) {
    const body = await meetingRes.text();
    throw new HttpsError("internal", `Zoom meeting creation failed: ${body}`);
  }

  const meeting = (await meetingRes.json()) as ZoomMeetingResponse;

  const liveLessonData: Record<string, unknown> = {
    classId,
    ownerId: uid,
    title,
    scheduledAt,
    duration: duration ?? 60,
    status: "scheduled",
    zoomMeetingId: meeting.id,
    zoomJoinUrl: meeting.join_url,
    zoomStartUrl: meeting.start_url,
    createdAt: Date.now(),
  };
  if (moduleId) liveLessonData.moduleId = moduleId;
  if (cohortIds?.length) liveLessonData.cohortIds = cohortIds;
  if (topics?.length) liveLessonData.topics = topics;

  const ref = await admin.firestore().collection("liveLessons").add(liveLessonData);

  return {
    id: ref.id,
    ...liveLessonData,
  };
});
