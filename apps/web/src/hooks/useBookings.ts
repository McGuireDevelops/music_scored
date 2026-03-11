import { useState, useEffect, useCallback } from "react";
import { collection, query, where, getDocs, getDoc, doc } from "firebase/firestore";
import { db, functions, httpsCallable } from "../firebase";
import type { Booking } from "@learning-scores/shared";

export interface BookingEnriched extends Booking {
  teacherName?: string;
  studentName?: string;
}

export function useBookings(
  uid: string | undefined,
  role: "student" | "teacher" | "admin" | undefined
) {
  const [bookings, setBookings] = useState<BookingEnriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    if (!uid || !role) {
      setBookings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const field = role === "teacher" ? "teacherId" : "studentId";
      const q = query(collection(db, "bookings"), where(field, "==", uid));
      const snap = await getDocs(q);

      const raw = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Booking[];
      raw.sort((a, b) => a.startAt - b.startAt);

      const userIds = new Set<string>();
      raw.forEach((b) => {
        if (role === "student") userIds.add(b.teacherId);
        else userIds.add(b.studentId);
      });

      const nameMap = new Map<string, string>();
      for (const id of userIds) {
        const userSnap = await getDoc(doc(db, "users", id));
        if (userSnap.exists()) {
          nameMap.set(id, userSnap.data().displayName ?? "User");
        }
      }

      const enriched: BookingEnriched[] = raw.map((b) => ({
        ...b,
        teacherName: role === "student" ? nameMap.get(b.teacherId) : undefined,
        studentName: role === "teacher" ? nameMap.get(b.studentId) : undefined,
      }));

      setBookings(enriched);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, [uid, role]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const createBookingFn = httpsCallable<
    { teacherId: string; startAt: number },
    Booking & { id: string }
  >(functions, "createBooking");

  const bookSlot = useCallback(
    async (teacherId: string, startAt: number) => {
      const res = await createBookingFn({ teacherId, startAt });
      await fetchBookings();
      return res.data;
    },
    [fetchBookings]
  );

  const cancelBookingFn = httpsCallable<
    { bookingId: string },
    { success: boolean; status: string }
  >(functions, "cancelBooking");

  const cancelBooking = useCallback(
    async (bookingId: string) => {
      await cancelBookingFn({ bookingId });
      await fetchBookings();
    },
    [fetchBookings]
  );

  const upcoming = bookings.filter(
    (b) => b.status === "confirmed" && b.startAt >= Date.now()
  );

  const past = bookings.filter(
    (b) => b.status !== "confirmed" || b.startAt < Date.now()
  );

  return { bookings, upcoming, past, loading, error, bookSlot, cancelBooking, refetch: fetchBookings };
}
