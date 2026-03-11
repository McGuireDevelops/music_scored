import { Link } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { useTeacherLiveLessons } from "../hooks/useTeacherLiveLessons";
import { useStudentLiveLessons } from "../hooks/useStudentLiveLessons";
import { useTeacherSettings } from "../hooks/useTeacherSettings";
import type { LiveLessonStatus } from "@learning-scores/shared";

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

function CalendarStatusBadge({ status }: { status?: LiveLessonStatus }) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
        <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
        LIVE
      </span>
    );
  }
  if (status === "ended") {
    return (
      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
        Ended
      </span>
    );
  }
  return null;
}

export default function CalendarPage() {
  const { user, profile } = useAuth();
  const isTeacherOrAdmin = profile?.role === "teacher" || profile?.role === "admin";
  const isStudent = profile?.role === "student";
  const { features } = useTeacherSettings(isTeacherOrAdmin ? user?.uid : undefined);

  const {
    upcomingLessons: teacherUpcoming,
    loading: teacherLoading,
    error: teacherError,
  } = useTeacherLiveLessons(isTeacherOrAdmin ? user?.uid : undefined);

  const {
    liveLessons: studentLive,
    upcomingLessons: studentUpcoming,
    loading: studentLoading,
    error: studentError,
  } = useStudentLiveLessons(isStudent ? user?.uid : undefined);

  const showLive = features.liveLessons !== false;
  const loading = isTeacherOrAdmin ? teacherLoading : studentLoading;
  const error = isTeacherOrAdmin ? teacherError : studentError;

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

        {/* Teacher/Admin view */}
        {!loading && isTeacherOrAdmin && showLive && (
          <>
            {teacherUpcoming.length === 0 ? (
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
            ) : (
              <ul className="space-y-4">
                {teacherUpcoming.map((lesson) => (
                  <li
                    key={lesson.id}
                    className={`rounded-card border bg-white p-4 shadow-card ${
                      lesson.status === "live"
                        ? "border-red-300 ring-1 ring-red-200"
                        : "border-gray-200"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="mb-1 flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{lesson.title}</h3>
                          <CalendarStatusBadge status={lesson.status} />
                        </div>
                        {lesson.className && (
                          <p className="text-sm text-gray-500">{lesson.className}</p>
                        )}
                        <p className="mt-1 text-sm text-gray-600">
                          {formatDate(lesson.scheduledAt)} at {formatTime(lesson.scheduledAt)}
                          {lesson.duration != null && (
                            <span> &middot; {lesson.duration} min</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {lesson.zoomStartUrl && lesson.status !== "ended" && (
                          <a
                            href={lesson.zoomStartUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white no-underline hover:bg-primary-dark"
                          >
                            {lesson.status === "live" ? "Rejoin Zoom" : "Start Zoom"}
                          </a>
                        )}
                        <Link
                          to={`/teacher/class/${lesson.classId}?tab=live`}
                          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 no-underline hover:bg-gray-50"
                        >
                          Manage
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {!loading && isTeacherOrAdmin && !showLive && (
          <div className="rounded-card max-w-md border border-gray-200 bg-white p-8 shadow-card">
            <p className="text-gray-600">
              Live lessons are disabled. Enable them in Settings.
            </p>
          </div>
        )}

        {/* Student view */}
        {!loading && isStudent && (
          <>
            {studentLive.length > 0 && (
              <div className="mb-6 space-y-3">
                {studentLive.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="rounded-card border border-red-300 bg-white p-4 shadow-card ring-1 ring-red-200"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="mb-1 flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{lesson.title}</h3>
                          <CalendarStatusBadge status="live" />
                        </div>
                        {lesson.className && (
                          <p className="text-sm text-gray-500">{lesson.className}</p>
                        )}
                        <p className="mt-1 text-sm text-gray-600">
                          Started at {formatTime(lesson.scheduledAt)}
                        </p>
                      </div>
                      {lesson.zoomJoinUrl && (
                        <a
                          href={lesson.zoomJoinUrl}
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

            {studentUpcoming.length === 0 && studentLive.length === 0 && (
              <div className="rounded-card max-w-md border border-gray-200 bg-white p-8 shadow-card">
                <p className="text-gray-600">
                  No upcoming live classes. Check back later or browse your courses.
                </p>
                <Link
                  to="/student"
                  className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
                >
                  Back to Courses
                </Link>
              </div>
            )}

            {studentUpcoming.length > 0 && (
              <ul className="space-y-4">
                {studentUpcoming.map((lesson) => (
                  <li
                    key={lesson.id}
                    className="rounded-card border border-gray-200 bg-white p-4 shadow-card"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{lesson.title}</h3>
                        {lesson.className && (
                          <p className="text-sm text-gray-500">{lesson.className}</p>
                        )}
                        <p className="mt-1 text-sm text-gray-600">
                          {formatDate(lesson.scheduledAt)} at {formatTime(lesson.scheduledAt)}
                          {lesson.duration != null && (
                            <span> &middot; {lesson.duration} min</span>
                          )}
                        </p>
                      </div>
                      <Link
                        to={`/student/class/${lesson.classId}?tab=live`}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 no-underline hover:bg-gray-50"
                      >
                        View course
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {/* Guest / no role */}
        {!loading && !isTeacherOrAdmin && !isStudent && (
          <div className="rounded-card max-w-md border border-gray-200 bg-white p-8 shadow-card">
            <p className="text-gray-600">
              Sign in to see your calendar.
            </p>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
