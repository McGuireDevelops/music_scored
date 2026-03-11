import { Link } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { useTeacherLiveLessons } from "../hooks/useTeacherLiveLessons";
import { useTeacherSettings } from "../hooks/useTeacherSettings";

function formatDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CalendarPage() {
  const { user, profile } = useAuth();
  const isTeacherOrAdmin = profile?.role === "teacher" || profile?.role === "admin";
  const { features } = useTeacherSettings(isTeacherOrAdmin ? user?.uid : undefined);
  const { upcomingLessons, loading, error } = useTeacherLiveLessons(
    isTeacherOrAdmin ? user?.uid : undefined
  );

  const showLive = features.liveLessons !== false;
  const upcoming = (upcomingLessons ?? []).filter((l) => l.scheduledAt >= Date.now());

  return (
    <ProtectedRoute>
      <div>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-gray-900">
          Calendar
        </h1>
        <p className="mb-8 text-gray-600">
          Upcoming live lessons and events
        </p>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <p className="text-gray-500">Loading calendar…</p>
        )}

        {!loading && isTeacherOrAdmin && showLive && upcoming.length === 0 && (
          <div className="rounded-card max-w-md border border-gray-200 bg-white p-8 shadow-card">
            <p className="text-gray-600">
              No upcoming live lessons. Schedule a live lesson from a course&apos;s Live tab.
            </p>
            <Link
              to="/"
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              Back to Dashboard
            </Link>
          </div>
        )}

        {!loading && (!isTeacherOrAdmin || !showLive) && (
          <div className="rounded-card max-w-md border border-gray-200 bg-white p-8 shadow-card">
            <p className="text-gray-600">
              Your calendar events will appear here. Check your courses for assignments and live sessions.
            </p>
          </div>
        )}

        {!loading && isTeacherOrAdmin && showLive && upcoming.length > 0 && (
          <ul className="space-y-4">
            {upcoming.map((lesson) => (
              <li
                key={lesson.id}
                className="rounded-card border border-gray-200 bg-white p-4 shadow-card"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{lesson.title}</h3>
                    {lesson.className && (
                      <p className="text-sm text-gray-500">{lesson.className}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-600">
                      {formatDate(lesson.scheduledAt)} at {formatTime(lesson.scheduledAt)}
                      {lesson.duration != null && (
                        <span> · {lesson.duration} min</span>
                      )}
                    </p>
                  </div>
                  <Link
                    to={`/teacher/class/${lesson.classId}?tab=live`}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
                  >
                    Open course
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ProtectedRoute>
  );
}
