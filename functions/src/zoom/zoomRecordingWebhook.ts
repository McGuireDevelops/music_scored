/**
 * Zoom webhook handler for recording.completed events.
 * Updates the corresponding liveLessons or bookings document with
 * recording metadata (video URLs, transcript URL, etc.).
 *
 * Zoom webhook verification: supports both the URL validation challenge
 * and the secret-token HMAC signature verification.
 */
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

interface ZoomRecordingFile {
  id: string;
  meeting_id: string;
  recording_start: string;
  recording_end: string;
  file_type: string;
  file_size: number;
  play_url?: string;
  download_url?: string;
  status: string;
  recording_type?: string;
}

interface ZoomRecordingPayload {
  object: {
    id: number;
    uuid: string;
    host_id: string;
    topic: string;
    start_time: string;
    duration: number;
    share_url?: string;
    recording_files?: ZoomRecordingFile[];
  };
  download_token?: string;
}

function verifyWebhookSignature(
  rawBody: Buffer,
  signature: string | undefined,
  timestamp: string | undefined,
  secret: string
): boolean {
  if (!signature || !timestamp) return false;
  const message = `v0:${timestamp}:${rawBody.toString("utf8")}`;
  const hash = crypto.createHmac("sha256", secret).update(message).digest("hex");
  const expected = `v0=${hash}`;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export const zoomRecordingWebhook = onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  const secret = process.env.ZOOM_WEBHOOK_SECRET;
  if (!secret) {
    console.error("ZOOM_WEBHOOK_SECRET not configured");
    res.status(500).send("Webhook secret not configured");
    return;
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

  // Handle Zoom URL validation challenge (webhook endpoint verification)
  if (body.event === "endpoint.url_validation") {
    const plainToken = body.payload?.plainToken as string | undefined;
    if (!plainToken) {
      res.status(400).send("Missing plainToken");
      return;
    }
    const hash = crypto
      .createHmac("sha256", secret)
      .update(plainToken)
      .digest("hex");
    res.status(200).json({ plainToken, encryptedToken: hash });
    return;
  }

  // Verify webhook signature
  if (req.rawBody) {
    const sig = req.headers["x-zm-signature"] as string | undefined;
    const ts = req.headers["x-zm-request-timestamp"] as string | undefined;
    if (!verifyWebhookSignature(req.rawBody, sig, ts, secret)) {
      res.status(401).send("Invalid signature");
      return;
    }
  }

  if (body.event !== "recording.completed") {
    res.status(200).send("Ignored");
    return;
  }

  const payload = body.payload as ZoomRecordingPayload;
  if (!payload?.object) {
    res.status(400).send("Invalid payload");
    return;
  }

  const { id: zoomMeetingId, recording_files, share_url, duration } = payload.object;

  const files = (recording_files ?? []).filter((f) => f.status === "completed");
  const recordingFiles = files.map((f) => ({
    fileType: f.file_type,
    downloadUrl: f.download_url ?? "",
    playUrl: f.play_url,
    shareUrl: share_url,
    fileSize: f.file_size,
  }));

  const transcriptFile = files.find(
    (f) => f.file_type === "TRANSCRIPT" || f.recording_type === "audio_transcript"
  );

  const recording = {
    recordingId: payload.object.uuid,
    meetingId: zoomMeetingId,
    recordingFiles,
    transcriptUrl: transcriptFile?.download_url ?? transcriptFile?.play_url,
    duration,
    recordingStart: files[0]
      ? new Date(files[0].recording_start).getTime()
      : undefined,
    recordingEnd: files[0]
      ? new Date(files[0].recording_end).getTime()
      : undefined,
  };

  const db = admin.firestore();

  // Try liveLessons first
  const liveLessonSnap = await db
    .collection("liveLessons")
    .where("zoomMeetingId", "==", zoomMeetingId)
    .limit(1)
    .get();

  if (!liveLessonSnap.empty) {
    const docRef = liveLessonSnap.docs[0].ref;
    await docRef.update({ recording, updatedAt: Date.now() });
    console.log(`Updated liveLesson ${docRef.id} with recording`);
    res.status(200).send("OK");
    return;
  }

  // Try bookings
  const bookingSnap = await db
    .collection("bookings")
    .where("zoomMeetingId", "==", zoomMeetingId)
    .limit(1)
    .get();

  if (!bookingSnap.empty) {
    const docRef = bookingSnap.docs[0].ref;
    await docRef.update({ recording, updatedAt: Date.now() });
    console.log(`Updated booking ${docRef.id} with recording`);
    res.status(200).send("OK");
    return;
  }

  console.warn(`No liveLesson or booking found for Zoom meeting ${zoomMeetingId}`);
  res.status(200).send("No matching document");
});
