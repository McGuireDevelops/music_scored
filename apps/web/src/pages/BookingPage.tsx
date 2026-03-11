import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { useStudentClasses } from "../hooks/useStudentClasses";
import { useTeacherAvailability } from "../hooks/useTeacherAvailability";
import { useBookings } from "../hooks/useBookings";
import type { WeeklySlot, TeacherAvailability, Booking } from "@learning-scores/shared";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

interface ConcreteSlot {
  startAt: number;
  endAt: number;
}

function generateSlots(
  avail: TeacherAvailability,
  existingBookings: Booking[],
  weeksAhead: number = 3
): ConcreteSlot[] {
  const now = Date.now();
  const slots: ConcreteSlot[] = [];
  const confirmedBookings = existingBookings.filter((b) => b.status === "confirmed");

  for (let weekOffset = 0; weekOffset < weeksAhead; weekOffset++) {
    for (const ws of avail.weeklySlots) {
      const daySlots = getSlotsForDay(ws, avail, now, weekOffset);
      slots.push(...daySlots);
    }
  }

  // Filter out slots that overlap with existing bookings
  return slots.filter((slot) => {
    if (slot.startAt <= now) return false;
    return !confirmedBookings.some(
      (b) => b.startAt < slot.endAt && b.endAt > slot.startAt
    );
  });
}

function getSlotsForDay(
  ws: WeeklySlot,
  avail: TeacherAvailability,
  now: number,
  weekOffset: number
): ConcreteSlot[] {
  const result: ConcreteSlot[] = [];
  const tz = avail.timezone;
  const duration = avail.slotDurationMinutes;
  const buffer = avail.bufferMinutes ?? 0;

  // Find the next occurrence of this weekday
  const today = new Date(now);
  const todayInTz = new Date(
    today.toLocaleString("en-US", { timeZone: tz })
  );
  const currentDay = todayInTz.getDay();
  let daysUntil = ws.dayOfWeek - currentDay;
  if (daysUntil < 0) daysUntil += 7;
  daysUntil += weekOffset * 7;

  const targetDate = new Date(todayInTz);
  targetDate.setDate(targetDate.getDate() + daysUntil);

  const [startH, startM] = ws.startTime.split(":").map(Number);
  const [endH, endM] = ws.endTime.split(":").map(Number);
  const windowStartMins = startH * 60 + startM;
  const windowEndMins = endH * 60 + endM;

  // Build a date string in the teacher's tz and convert to UTC
  const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}`;

  let currentMins = windowStartMins;
  while (currentMins + duration <= windowEndMins) {
    const h = String(Math.floor(currentMins / 60)).padStart(2, "0");
    const m = String(currentMins % 60).padStart(2, "0");
    const slotStart = new Date(`${dateStr}T${h}:${m}:00`);

    // Approximate conversion from teacher tz to UTC
    const utcStart = tzToUtc(dateStr, `${h}:${m}`, tz);
    if (utcStart) {
      result.push({
        startAt: utcStart,
        endAt: utcStart + duration * 60_000,
      });
    }

    currentMins += duration + buffer;
  }

  return result;
}

function tzToUtc(dateStr: string, timeStr: string, tz: string): number | null {
  try {
    // Create a date in UTC and then figure out the offset
    const naive = new Date(`${dateStr}T${timeStr}:00Z`);
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const utcInTz = formatter.format(naive);
    // Parse the formatted date back
    const parts = utcInTz.match(/(\d+)/g);
    if (!parts || parts.length < 6) return null;
    const [mo, da, yr, hr, mi] = parts.map(Number);
    const tzDate = new Date(yr, mo - 1, da, hr, mi, 0);
    const offset = tzDate.getTime() - naive.getTime();

    // The actual UTC time is the local time minus the offset
    const localDate = new Date(`${dateStr}T${timeStr}:00`);
    return localDate.getTime() - offset;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Teacher card sub-component (loads its own availability)
// ---------------------------------------------------------------------------

interface TeacherInfo {
  teacherId: string;
  teacherName: string;
}

function TeacherSlotPicker({
  teacher,
  studentBookings,
  onBook,
  booking,
}: {
  teacher: TeacherInfo;
  studentBookings: Booking[];
  onBook: (teacherId: string, startAt: number) => Promise<void>;
  booking: boolean;
}) {
  const { availability, loading } = useTeacherAvailability(teacher.teacherId);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [localBooking, setLocalBooking] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);

  const teacherBookings = studentBookings.filter(
    (b) => b.teacherId === teacher.teacherId
  );

  const slots = useMemo(() => {
    if (!availability) return [];
    return generateSlots(availability, teacherBookings);
  }, [availability, teacherBookings]);

  if (loading) {
    return (
      <div className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
        <p className="text-gray-500">Loading {teacher.teacherName}&apos;s availability…</p>
      </div>
    );
  }

  if (!availability) return null;

  // Group slots by date
  const slotsByDate = new Map<string, ConcreteSlot[]>();
  slots.forEach((slot) => {
    const key = formatDate(slot.startAt);
    const existing = slotsByDate.get(key) ?? [];
    existing.push(slot);
    slotsByDate.set(key, existing);
  });

  const handleBook = async () => {
    if (selectedSlot === null) return;
    setLocalBooking(true);
    setBookError(null);
    try {
      await onBook(teacher.teacherId, selectedSlot);
      setSelectedSlot(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Booking failed";
      setBookError(msg);
    } finally {
      setLocalBooking(false);
    }
  };

  return (
    <div className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
      <h3 className="mb-1 text-lg font-semibold text-gray-900">
        {teacher.teacherName}
      </h3>
      <p className="mb-4 text-sm text-gray-500">
        {availability.slotDurationMinutes}-minute sessions
      </p>

      {slots.length === 0 ? (
        <p className="text-sm text-gray-500">No available slots in the next 3 weeks.</p>
      ) : (
        <div className="space-y-4">
          {Array.from(slotsByDate.entries()).map(([dateLabel, daySlots]) => (
            <div key={dateLabel}>
              <p className="mb-2 text-sm font-medium text-gray-700">{dateLabel}</p>
              <div className="flex flex-wrap gap-2">
                {daySlots.map((slot) => {
                  const isSelected = selectedSlot === slot.startAt;
                  return (
                    <button
                      key={slot.startAt}
                      type="button"
                      onClick={() => setSelectedSlot(isSelected ? null : slot.startAt)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                        isSelected
                          ? "border-primary bg-primary text-white"
                          : "border-gray-300 bg-white text-gray-700 hover:border-primary hover:text-primary"
                      }`}
                    >
                      {formatTime(slot.startAt)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedSlot !== null && (
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleBook}
            disabled={localBooking || booking}
            className="rounded-xl bg-primary px-5 py-2.5 font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {localBooking ? "Booking…" : "Confirm Booking"}
          </button>
          <span className="text-sm text-gray-600">
            {formatDate(selectedSlot)} at {formatTime(selectedSlot)}
          </span>
        </div>
      )}

      {bookError && (
        <p className="mt-2 text-sm text-red-600">{bookError}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function BookingPage() {
  const { user, profile } = useAuth();
  const uid = user?.uid;
  const { classes, loading: classesLoading } = useStudentClasses(uid);
  const { bookings, upcoming, past, loading: bookingsLoading, bookSlot, cancelBooking } =
    useBookings(uid, profile?.role as "student" | "teacher" | "admin" | undefined);
  const [teachers, setTeachers] = useState<TeacherInfo[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [bookingInProgress, setBookingInProgress] = useState(false);

  // Derive unique teachers from enrolled classes
  useEffect(() => {
    if (classesLoading || !classes.length) {
      setTeachersLoading(false);
      return;
    }

    const teacherIds = [...new Set(classes.map((c) => c.teacherId).filter(Boolean))];

    async function loadTeachers() {
      const infos: TeacherInfo[] = [];
      for (const tid of teacherIds) {
        const snap = await getDoc(doc(db, "users", tid));
        infos.push({
          teacherId: tid,
          teacherName: snap.exists() ? (snap.data().displayName ?? "Teacher") : "Teacher",
        });
      }
      setTeachers(infos);
      setTeachersLoading(false);
    }

    loadTeachers();
  }, [classes, classesLoading]);

  const handleBook = async (teacherId: string, startAt: number) => {
    setBookingInProgress(true);
    try {
      await bookSlot(teacherId, startAt);
    } finally {
      setBookingInProgress(false);
    }
  };

  const handleCancel = async (bookingId: string) => {
    setCancelling(bookingId);
    try {
      await cancelBooking(bookingId);
    } finally {
      setCancelling(null);
    }
  };

  const loading = classesLoading || bookingsLoading || teachersLoading;

  return (
    <ProtectedRoute requiredRole="student">
      <div>
        <Link
          to="/student"
          className="mb-4 inline-block text-sm text-gray-600 no-underline transition-colors hover:text-gray-900"
        >
          ← Back to dashboard
        </Link>
        <h2 className="mb-2 text-2xl font-semibold tracking-tight text-gray-900">
          Book a Session
        </h2>
        <p className="mb-8 text-gray-600">
          Schedule a 1-on-1 session with your teacher.
        </p>

        {loading && <p className="text-gray-500">Loading…</p>}

        {!loading && teachers.length === 0 && (
          <div className="max-w-md rounded-card border border-gray-200 bg-white p-8 shadow-card">
            <p className="text-gray-600">
              You are not enrolled in any classes yet. Enroll in a class to book sessions with your teacher.
            </p>
          </div>
        )}

        {/* Upcoming bookings */}
        {!loading && upcoming.length > 0 && (
          <section className="mb-8">
            <h3 className="mb-4 text-lg font-medium text-gray-900">
              Your Upcoming Sessions
            </h3>
            <div className="space-y-3">
              {upcoming.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-gray-200 bg-white p-4 shadow-card"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {b.teacherName ?? "Teacher"}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatDate(b.startAt)} at {formatTime(b.startAt)}–{formatTime(b.endAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(b.zoomJoinUrl || b.fallbackMeetingLink) && (
                      <a
                        href={b.zoomJoinUrl ?? b.fallbackMeetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white no-underline hover:bg-primary-dark"
                      >
                        Join Meeting
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleCancel(b.id)}
                      disabled={cancelling === b.id}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
                    >
                      {cancelling === b.id ? "Cancelling…" : "Cancel"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Available teachers */}
        {!loading && teachers.length > 0 && (
          <section>
            <h3 className="mb-4 text-lg font-medium text-gray-900">
              Available Teachers
            </h3>
            <div className="space-y-6">
              {teachers.map((t) => (
                <TeacherSlotPicker
                  key={t.teacherId}
                  teacher={t}
                  studentBookings={bookings}
                  onBook={handleBook}
                  booking={bookingInProgress}
                />
              ))}
            </div>
          </section>
        )}

        {/* Past bookings */}
        {!loading && past.length > 0 && (
          <section className="mt-8">
            <h3 className="mb-4 text-lg font-medium text-gray-900">
              Past Sessions
            </h3>
            <div className="space-y-2">
              {past.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {b.teacherName ?? "Teacher"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(b.startAt)} at {formatTime(b.startAt)}
                      {b.status !== "confirmed" && (
                        <span className="ml-2 text-amber-600">
                          ({b.status.replace(/_/g, " ")})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </ProtectedRoute>
  );
}
