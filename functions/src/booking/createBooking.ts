/**
 * Cloud Function: create a 1-on-1 booking.
 * Validates the requested slot against the teacher's availability,
 * enforces booking limits, prevents double-booking, and optionally
 * auto-creates a Zoom meeting if the teacher has Zoom credentials.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {
  getTeacherZoomCredentials,
  createZoomMeetingForSlot,
} from "../zoom/zoomUtils";

interface WeeklySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface BookingLimit {
  maxPerStudent: number;
  periodDays: number;
}

interface AvailabilityDoc {
  teacherId: string;
  slotDurationMinutes: number;
  timezone: string;
  weeklySlots: WeeklySlot[];
  bookingLimit: BookingLimit;
  bufferMinutes?: number;
  fallbackMeetingLink?: string;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Check whether a given UTC timestamp falls within one of the teacher's
 * weekly availability windows, respecting the teacher's timezone.
 */
function isSlotWithinAvailability(
  startAtMs: number,
  durationMinutes: number,
  weeklySlots: WeeklySlot[],
  timezone: string
): boolean {
  const startDate = new Date(startAtMs);
  const endDate = new Date(startAtMs + durationMinutes * 60_000);

  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const startParts = fmt.formatToParts(startDate);
  const endParts = fmt.formatToParts(endDate);

  const dayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };

  const startWeekday = dayMap[startParts.find((p) => p.type === "weekday")!.value];
  const startHour = parseInt(startParts.find((p) => p.type === "hour")!.value, 10);
  const startMinute = parseInt(startParts.find((p) => p.type === "minute")!.value, 10);
  const startMins = startHour * 60 + startMinute;

  const endWeekday = dayMap[endParts.find((p) => p.type === "weekday")!.value];
  const endHour = parseInt(endParts.find((p) => p.type === "hour")!.value, 10);
  const endMinute = parseInt(endParts.find((p) => p.type === "minute")!.value, 10);
  const endMins = endHour * 60 + endMinute;

  // Slot must start and end on the same day within a single availability window
  if (startWeekday !== endWeekday) return false;

  return weeklySlots.some((slot) => {
    if (slot.dayOfWeek !== startWeekday) return false;
    const windowStart = timeToMinutes(slot.startTime);
    const windowEnd = timeToMinutes(slot.endTime);
    return startMins >= windowStart && endMins <= windowEnd;
  });
}

export const createBooking = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }
  const studentId = request.auth.uid;

  const { teacherId, startAt } = request.data as {
    teacherId: string;
    startAt: number;
  };

  if (!teacherId || !startAt) {
    throw new HttpsError("invalid-argument", "teacherId and startAt are required");
  }

  if (teacherId === studentId) {
    throw new HttpsError("invalid-argument", "You cannot book a session with yourself");
  }

  if (startAt <= Date.now()) {
    throw new HttpsError("invalid-argument", "Cannot book a slot in the past");
  }

  // 1. Load teacher availability
  const availSnap = await admin.firestore().doc(`teacherAvailability/${teacherId}`).get();
  if (!availSnap.exists) {
    throw new HttpsError("not-found", "This teacher has not set up availability");
  }
  const avail = availSnap.data() as AvailabilityDoc;
  const duration = avail.slotDurationMinutes;
  const endAt = startAt + duration * 60_000;

  // 2. Validate slot is within a weekly window
  if (!isSlotWithinAvailability(startAt, duration, avail.weeklySlots, avail.timezone)) {
    throw new HttpsError(
      "failed-precondition",
      "The requested time is not within the teacher's available hours"
    );
  }

  // 3. Enforce booking limits
  const { maxPerStudent, periodDays } = avail.bookingLimit;
  const periodStart = Date.now() - periodDays * 86_400_000;

  const limitQuery = await admin
    .firestore()
    .collection("bookings")
    .where("teacherId", "==", teacherId)
    .where("studentId", "==", studentId)
    .where("status", "==", "confirmed")
    .where("startAt", ">=", periodStart)
    .get();

  if (limitQuery.size >= maxPerStudent) {
    const periodLabel = periodDays === 7 ? "week" : periodDays === 30 ? "month" : `${periodDays} days`;
    throw new HttpsError(
      "resource-exhausted",
      `You can only book ${maxPerStudent} session${maxPerStudent > 1 ? "s" : ""} per ${periodLabel} with this teacher`
    );
  }

  // 4. Check for overlapping bookings (prevent double-booking the slot)
  const overlapQuery = await admin
    .firestore()
    .collection("bookings")
    .where("teacherId", "==", teacherId)
    .where("status", "==", "confirmed")
    .where("startAt", "<", endAt)
    .get();

  const hasOverlap = overlapQuery.docs.some((doc) => {
    const existing = doc.data();
    return existing.endAt > startAt;
  });

  if (hasOverlap) {
    throw new HttpsError("already-exists", "This time slot is already booked");
  }

  // 5. Build booking doc
  const bookingData: Record<string, unknown> = {
    teacherId,
    studentId,
    startAt,
    endAt,
    status: "confirmed",
    createdAt: Date.now(),
  };

  // 6. Try to auto-create Zoom meeting
  const creds = await getTeacherZoomCredentials(teacherId);
  if (creds) {
    try {
      const studentDoc = await admin.firestore().doc(`users/${studentId}`).get();
      const studentName = studentDoc.data()?.displayName ?? "Student";
      const teacherDoc = await admin.firestore().doc(`users/${teacherId}`).get();
      const teacherName = teacherDoc.data()?.displayName ?? "Teacher";

      const meeting = await createZoomMeetingForSlot(
        creds,
        `1-on-1: ${studentName} & ${teacherName}`,
        startAt,
        duration
      );
      bookingData.zoomMeetingId = meeting.zoomMeetingId;
      bookingData.zoomJoinUrl = meeting.zoomJoinUrl;
      bookingData.zoomStartUrl = meeting.zoomStartUrl;
    } catch {
      // Zoom creation failed — fall back to fallback link
      if (avail.fallbackMeetingLink) {
        bookingData.fallbackMeetingLink = avail.fallbackMeetingLink;
      }
    }
  } else if (avail.fallbackMeetingLink) {
    bookingData.fallbackMeetingLink = avail.fallbackMeetingLink;
  }

  const ref = await admin.firestore().collection("bookings").add(bookingData);

  return { id: ref.id, ...bookingData };
});
