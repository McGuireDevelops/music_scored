/**
 * Cloud Function: cancel a 1-on-1 booking.
 * Either the student or the teacher involved can cancel.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

export const cancelBooking = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }
  const uid = request.auth.uid;

  const { bookingId } = request.data as { bookingId: string };
  if (!bookingId) {
    throw new HttpsError("invalid-argument", "bookingId is required");
  }

  const docRef = admin.firestore().doc(`bookings/${bookingId}`);
  const snap = await docRef.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Booking not found");
  }

  const data = snap.data()!;
  if (data.status !== "confirmed") {
    throw new HttpsError("failed-precondition", "Booking is already cancelled");
  }

  const isStudent = data.studentId === uid;
  const isTeacher = data.teacherId === uid;
  const userDoc = await admin.firestore().doc(`users/${uid}`).get();
  const isAdmin = userDoc.data()?.role === "admin";

  if (!isStudent && !isTeacher && !isAdmin) {
    throw new HttpsError("permission-denied", "You are not part of this booking");
  }

  const status = isStudent ? "cancelled_by_student" : "cancelled_by_teacher";

  await docRef.update({
    status,
    cancelledAt: Date.now(),
  });

  return { success: true, status };
});
