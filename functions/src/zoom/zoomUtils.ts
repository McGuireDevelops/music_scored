/**
 * Shared Zoom Server-to-Server OAuth helpers.
 * Used by both live-lesson creation and 1-on-1 booking creation.
 */
import { HttpsError } from "firebase-functions/v2/https";
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

export interface ZoomCredentials {
  accountId: string;
  clientId: string;
  clientSecret: string;
}

export interface ZoomMeetingResult {
  zoomMeetingId: number;
  zoomJoinUrl: string;
  zoomStartUrl: string;
}

export async function getZoomAccessToken(creds: ZoomCredentials): Promise<string> {
  const basic = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64");
  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${creds.accountId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
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

export async function createZoomMeetingForSlot(
  creds: ZoomCredentials,
  topic: string,
  startAtMs: number,
  durationMinutes: number
): Promise<ZoomMeetingResult> {
  const accessToken = await getZoomAccessToken(creds);
  const startTime = new Date(startAtMs).toISOString().replace(/\.\d{3}Z$/, "Z");

  const res = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic,
      type: 2,
      start_time: startTime,
      duration: durationMinutes,
      timezone: "UTC",
      settings: {
        join_before_host: false,
        waiting_room: true,
        mute_upon_entry: true,
        auto_recording: "cloud",
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new HttpsError("internal", `Zoom meeting creation failed: ${body}`);
  }

  const meeting = (await res.json()) as ZoomMeetingResponse;
  return {
    zoomMeetingId: meeting.id,
    zoomJoinUrl: meeting.join_url,
    zoomStartUrl: meeting.start_url,
  };
}

/**
 * Read Zoom OAuth credentials from a teacher's settings doc.
 * Returns null if credentials are not configured.
 */
export async function getTeacherZoomCredentials(
  teacherId: string
): Promise<ZoomCredentials | null> {
  const snap = await admin.firestore().doc(`teacherSettings/${teacherId}`).get();
  const data = snap.data();
  const accountId = data?.zoomAccountId as string | undefined;
  const clientId = data?.zoomClientId as string | undefined;
  const clientSecret = data?.zoomClientSecret as string | undefined;

  if (!accountId || !clientId || !clientSecret) return null;
  return { accountId, clientId, clientSecret };
}
