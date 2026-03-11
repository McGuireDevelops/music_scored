import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { useTeacherAvailability } from "../hooks/useTeacherAvailability";
import { useTeacherSettings } from "../hooks/useTeacherSettings";
import type { WeeklySlot, BookingLimit } from "@learning-scores/shared";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DURATION_OPTIONS = [15, 30, 45, 60];

const PERIOD_PRESETS: { label: string; days: number }[] = [
  { label: "Per week", days: 7 },
  { label: "Per 2 weeks", days: 14 },
  { label: "Per month", days: 30 },
];

function emptySlot(): WeeklySlot {
  return { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" };
}

export default function TeacherAvailabilityPage() {
  const { user } = useAuth();
  const uid = user?.uid;
  const { availability, loading, error, saveAvailability } = useTeacherAvailability(uid);
  const { settings } = useTeacherSettings(uid);

  const hasZoom = !!(settings?.zoomAccountId && settings?.zoomClientId && settings?.zoomClientSecret);

  const [slots, setSlots] = useState<WeeklySlot[]>([emptySlot()]);
  const [duration, setDuration] = useState(30);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [buffer, setBuffer] = useState(0);
  const [limit, setLimit] = useState<BookingLimit>({ maxPerStudent: 1, periodDays: 7 });
  const [fallbackLink, setFallbackLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (availability) {
      setSlots(availability.weeklySlots.length > 0 ? availability.weeklySlots : [emptySlot()]);
      setDuration(availability.slotDurationMinutes);
      setTimezone(availability.timezone);
      setBuffer(availability.bufferMinutes ?? 0);
      setLimit(availability.bookingLimit);
      setFallbackLink(availability.fallbackMeetingLink ?? "");
    }
  }, [availability]);

  const updateSlot = (index: number, field: keyof WeeklySlot, value: string | number) => {
    setSlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const addSlot = () => setSlots((prev) => [...prev, emptySlot()]);

  const removeSlot = (index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      await saveAvailability({
        slotDurationMinutes: duration,
        timezone,
        weeklySlots: slots,
        bookingLimit: limit,
        bufferMinutes: buffer,
        fallbackMeetingLink: fallbackLink || undefined,
      });
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-500">Loading…</p>;

  return (
    <ProtectedRoute requiredRole="teacher">
      <div>
        <Link
          to="/"
          className="mb-4 inline-block text-sm text-gray-600 no-underline transition-colors hover:text-gray-900"
        >
          ← Back to dashboard
        </Link>
        <h2 className="mb-2 text-2xl font-semibold tracking-tight text-gray-900">
          Office Hours
        </h2>
        <p className="mb-8 text-gray-600">
          Set your availability for 1-on-1 student sessions.
        </p>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Zoom status */}
          <section className="max-w-2xl rounded-card border border-gray-200 bg-white p-6 shadow-card">
            <h3 className="mb-3 text-lg font-medium text-gray-900">
              Meeting Links
            </h3>
            {hasZoom ? (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
                <span>Zoom connected — a unique Zoom meeting link will be auto-generated for each booking.</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <span>
                    No Zoom credentials configured.{" "}
                    <Link to="/teacher/settings" className="font-medium underline">
                      Connect Zoom in Settings
                    </Link>{" "}
                    for auto-generated links, or provide a fallback link below.
                  </span>
                </div>
                <div>
                  <label htmlFor="fallback-link" className="mb-1.5 block text-sm font-medium text-gray-700">
                    Fallback meeting link
                  </label>
                  <input
                    id="fallback-link"
                    type="url"
                    value={fallbackLink}
                    onChange={(e) => setFallbackLink(e.target.value)}
                    placeholder="https://zoom.us/j/your-personal-room"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 transition-colors placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            )}
          </section>

          {/* Slot duration & buffer */}
          <section className="max-w-2xl rounded-card border border-gray-200 bg-white p-6 shadow-card">
            <h3 className="mb-4 text-lg font-medium text-gray-900">Session Settings</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="duration" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Session length
                </label>
                <select
                  id="duration"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {DURATION_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} minutes
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="buffer" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Buffer between sessions
                </label>
                <select
                  id="buffer"
                  value={buffer}
                  onChange={(e) => setBuffer(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value={0}>No buffer</option>
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                </select>
              </div>
              <div>
                <label htmlFor="timezone" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Timezone
                </label>
                <input
                  id="timezone"
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </section>

          {/* Weekly availability */}
          <section className="max-w-2xl rounded-card border border-gray-200 bg-white p-6 shadow-card">
            <h3 className="mb-4 text-lg font-medium text-gray-900">
              Weekly Availability
            </h3>
            <p className="mb-4 text-sm text-gray-600">
              Add your available time windows for each day. Students will be able to book {duration}-minute sessions within these windows.
            </p>
            <div className="space-y-3">
              {slots.map((slot, i) => (
                <div
                  key={i}
                  className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-3"
                >
                  <div className="min-w-[140px]">
                    <label className="mb-1 block text-xs font-medium text-gray-500">
                      Day
                    </label>
                    <select
                      value={slot.dayOfWeek}
                      onChange={(e) => updateSlot(i, "dayOfWeek", Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {DAY_LABELS.map((label, day) => (
                        <option key={day} value={day}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">
                      From
                    </label>
                    <input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => updateSlot(i, "startTime", e.target.value)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">
                      To
                    </label>
                    <input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => updateSlot(i, "endTime", e.target.value)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  {slots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSlot(i)}
                      className="rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addSlot}
              className="mt-3 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900"
            >
              + Add time window
            </button>
          </section>

          {/* Booking limits */}
          <section className="max-w-2xl rounded-card border border-gray-200 bg-white p-6 shadow-card">
            <h3 className="mb-4 text-lg font-medium text-gray-900">
              Booking Limits
            </h3>
            <p className="mb-4 text-sm text-gray-600">
              Limit how often each student can book a session with you.
            </p>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label htmlFor="max-per-student" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Max bookings per student
                </label>
                <input
                  id="max-per-student"
                  type="number"
                  min={1}
                  max={10}
                  value={limit.maxPerStudent}
                  onChange={(e) =>
                    setLimit((prev) => ({ ...prev, maxPerStudent: Math.max(1, Number(e.target.value)) }))
                  }
                  className="w-24 rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="period" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Period
                </label>
                <select
                  id="period"
                  value={limit.periodDays}
                  onChange={(e) =>
                    setLimit((prev) => ({ ...prev, periodDays: Number(e.target.value) }))
                  }
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {PERIOD_PRESETS.map((p) => (
                    <option key={p.days} value={p.days}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Save */}
          <div className="max-w-2xl">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || slots.length === 0}
              className="rounded-xl bg-primary px-6 py-2.5 font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Availability"}
            </button>
            {saved && (
              <p className="mt-3 text-sm text-green-600">Availability saved.</p>
            )}
            {saveError && (
              <p className="mt-3 text-sm text-red-600">{saveError}</p>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
