import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { useStudentClasses } from "../hooks/useStudentClasses";
import { useStudentLiveLessons } from "../hooks/useStudentLiveLessons";
import { Link } from "react-router-dom";
import {
  formatUtcForDisplay,
  formatUtcTimeLabel,
  getViewerIanaTimezone,
} from "../utils/timezone";

export default function StudentDashboard() {
  const { user } = useAuth();
  const { classes, loading, error } = useStudentClasses(user?.uid);
  const {
    liveLessons,
    upcomingLessons,
    loading: liveLoading,
  } = useStudentLiveLessons(user?.uid);
  const viewerTz = getViewerIanaTimezone();

  return (
    <ProtectedRoute requiredRole="student">
      <div>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-gray-900">
          Courses
        </h1>
        <p className="mb-8 text-gray-600">
          Your enrolled classes and learning materials
        </p>

        {!liveLoading && liveLessons.length > 0 && (
          <div className="mb-6 space-y-3">
            {liveLessons.map((l) => (
              <div
                key={l.id}
                className="rounded-card border border-red-300 bg-white p-4 shadow-card ring-1 ring-red-200"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                        LIVE NOW
                      </span>
                      <h3 className="font-semibold text-gray-900">{l.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      {l.className} &middot; Started at {formatUtcTimeLabel(l.scheduledAt)}
                    </p>
                  </div>
                  {l.zoomJoinUrl && (
                    <a
                      href={l.zoomJoinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white no-underline hover:bg-red-700"
                    >
                      Join Now
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!liveLoading && upcomingLessons.length > 0 && (
          <div className="mb-6 rounded-card border border-gray-200 bg-white p-5 shadow-card">
            <h3 className="mb-3 font-medium text-gray-900">Upcoming live classes</h3>
            {viewerTz && (
              <p className="mb-3 text-xs text-gray-500">
                Times shown in your timezone ({viewerTz}).
              </p>
            )}
            <ul className="space-y-2">
              {upcomingLessons.slice(0, 5).map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2">
                  <div>
                    <Link
                      to={`/student/class/${l.classId}?tab=live`}
                      className="text-sm text-primary hover:underline"
                    >
                      {l.title}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {l.className} &middot; {formatUtcForDisplay(l.scheduledAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {loading && (
          <p className="text-gray-500">Loading your classes…</p>
        )}
        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {!loading && !error && classes.length === 0 && (
          <div className="rounded-card max-w-md border border-gray-200 bg-white p-8 shadow-card">
            <p className="text-gray-600">
              You don&apos;t have any classes yet. Ask your teacher for an access grant.
            </p>
          </div>
        )}
        {!loading && classes.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((c) => (
              <Link
                key={c.id}
                to={`/student/class/${c.id}`}
                className="group rounded-card border border-gray-200 bg-white p-6 shadow-card transition-all duration-200 hover:border-primary/20 hover:shadow-cardHover"
              >
                <h3 className="mb-2 font-semibold text-gray-900 transition-colors group-hover:text-primary">
                  {c.name}
                </h3>
                {c.description && (
                  <p className="line-clamp-2 text-sm text-gray-600">
                    {c.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
