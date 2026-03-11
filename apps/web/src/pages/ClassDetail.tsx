import { useParams, useLocation, Link, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useEffect } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { useClassCohorts } from "../hooks/useCohorts";
import { useClassEnrollments } from "../hooks/useEnrollments";
import { useIssueCertification } from "../hooks/useCertifications";
import { usePlaylistProgress } from "../hooks/usePlaylistProgress";
import { useClassLiveLessons } from "../hooks/useLiveLessons";
import { ContentPane } from "../components/dashboard/ContentPane";
import { ClassReportsTab } from "../components/reports/ClassReportsTab";
import { PlaylistManager } from "../components/playlists/PlaylistManager";
import { CourseBuilder } from "../components/CourseBuilder";
import type { LiveLessonStatus } from "@learning-scores/shared";

const VALID_TABS = [
  "builder", "quizzes", "live", "roster", "reports", "playlists", "community", "portfolio",
] as const;
type Tab = (typeof VALID_TABS)[number];

export default function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, user } = useAuth();
  const isTeacherRoute = pathname.startsWith("/teacher");
  const tabParam = searchParams.get("tab");
  const activeTab: Tab =
    tabParam && VALID_TABS.includes(tabParam as Tab) ? (tabParam as Tab) : "builder";
  const [className, setClassName] = useState<string | null>(null);
  const [classDescription, setClassDescription] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const {
    cohorts,
    loading: cohortsLoading,
    createCohort,
    deleteCohort,
  } = useClassCohorts(id);
  const {
    enrollments,
    loading: enrollmentsLoading,
    addEnrollment,
    removeEnrollment,
  } = useClassEnrollments(id);
  const { issueCertification } = useIssueCertification(user?.uid);
  const {
    getStatus: getPlaylistStatus,
    addToDoList: addPlaylistToDo,
    setStatus: setPlaylistStatus,
    removeFromDoList: removePlaylistFromDo,
  } = usePlaylistProgress(user?.uid);

  useEffect(() => {
    if (!id) return;
    if (!searchParams.get("tab")) setSearchParams({ tab: "builder" }, { replace: true });
  }, [id, searchParams, setSearchParams]);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, "classes", id))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setClassName(data?.name ?? "Class");
          setClassDescription(data?.description);
        } else {
          setClassName(null);
          setClassDescription(undefined);
        }
      })
      .catch(() => {
        setClassName(null);
        setClassDescription(undefined);
      })
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <ProtectedRoute requiredRole={isTeacherRoute ? "teacher" : "student"}>
      <div>
        <Link
          to={isTeacherRoute ? "/" : "/student"}
          className="mb-4 inline-block text-sm text-gray-600 no-underline transition-colors hover:text-gray-900"
        >
          &larr; Back to dashboard
        </Link>
        {loading && <p className="text-gray-500">Loading&hellip;</p>}
        {!loading && !className && (
          <p className="text-gray-600">Class not found.</p>
        )}
        {!loading && className && (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
                {className}
              </h1>
              {isTeacherRoute && (
                <div className="flex gap-4">
                  <Link
                    to={`/teacher/class/${id}/rubrics`}
                    className="text-sm font-medium text-primary no-underline hover:underline"
                  >
                    Manage rubrics
                  </Link>
                  <Link
                    to={`/teacher/class/${id}/certificate`}
                    className="text-sm font-medium text-primary no-underline hover:underline"
                  >
                    Certificate
                  </Link>
                </div>
              )}
            </div>
            <div className="mt-6">
              {activeTab === "builder" && isTeacherRoute && (
                <CourseBuilder
                  classId={id!}
                  className={className}
                  classDescription={classDescription}
                  userId={user?.uid ?? ""}
                />
              )}
              {activeTab === "builder" && !isTeacherRoute && (
                <StudentCourseView classId={id!} />
              )}
              {activeTab === "live" && isTeacherRoute && (
                <LiveClassesTab classId={id!} userId={user?.uid ?? ""} />
              )}
              {activeTab === "live" && !isTeacherRoute && (
                <StudentLiveClassesView classId={id!} />
              )}
              {activeTab === "quizzes" && isTeacherRoute && (
                <QuizzesTab classId={id!} />
              )}
              {activeTab === "reports" && isTeacherRoute && (
                <ClassReportsTab classId={id!} />
              )}
              {activeTab === "playlists" && (
                <PlaylistManager
                  classId={id!}
                  isTeacher={isTeacherRoute}
                  ownerId={user?.uid ?? ""}
                  progressHandlers={
                    !isTeacherRoute && user?.uid
                      ? {
                          getStatus: getPlaylistStatus,
                          addToDoList: addPlaylistToDo,
                          setStatus: setPlaylistStatus,
                          removeFromDoList: removePlaylistFromDo,
                        }
                      : undefined
                  }
                />
              )}
              {activeTab === "roster" && isTeacherRoute && (
                <RosterTab
                  cohorts={cohorts}
                  enrollments={enrollments}
                  cohortsLoading={cohortsLoading}
                  enrollmentsLoading={enrollmentsLoading}
                  createCohort={createCohort}
                  deleteCohort={deleteCohort}
                  addEnrollment={addEnrollment}
                  removeEnrollment={removeEnrollment}
                  issueCertification={issueCertification}
                  classId={id!}
                />
              )}
              {activeTab === "community" && (
                <div className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
                  <Link
                    to={`/${isTeacherRoute ? "teacher" : "student"}/class/${id}/community`}
                    className="font-medium text-primary no-underline hover:underline"
                  >
                    View discussions &rarr;
                  </Link>
                </div>
              )}
              {activeTab === "portfolio" && !isTeacherRoute && (
                <div className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
                  <Link
                    to="/student/portfolio"
                    className="font-medium text-primary no-underline hover:underline"
                  >
                    Manage portfolio &rarr;
                  </Link>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}

function StudentCourseView({ classId }: { classId: string }) {
  const { lessons, loading: liveLessonsLoading } = useClassLiveLessons(classId);
  const liveNow = lessons.filter((l) => l.status === "live");

  return (
    <ContentPane title="Course">
      {!liveLessonsLoading && liveNow.length > 0 && (
        <div className="mb-6 space-y-3">
          {liveNow.map((l) => (
            <div
              key={l.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-300 bg-red-50 p-4"
            >
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                  LIVE
                </span>
                <span className="font-medium text-gray-900">{l.title}</span>
              </div>
              {l.zoomJoinUrl && (
                <a
                  href={l.zoomJoinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white no-underline hover:bg-red-700"
                >
                  Join Live Class
                </a>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="text-gray-600">
        Browse course content using the sidebar navigation.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          to={`/student/class/${classId}?tab=live`}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-primary no-underline hover:bg-gray-50"
        >
          Live Classes
        </Link>
        <Link
          to={`/student/class/${classId}?tab=playlists`}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-primary no-underline hover:bg-gray-50"
        >
          Playlists
        </Link>
        <Link
          to={`/student/class/${classId}?tab=community`}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-primary no-underline hover:bg-gray-50"
        >
          Community
        </Link>
        <Link
          to={`/student/class/${classId}?tab=portfolio`}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-primary no-underline hover:bg-gray-50"
        >
          Portfolio
        </Link>
      </div>
    </ContentPane>
  );
}

function QuizzesTab({ classId }: { classId: string }) {
  return (
    <ContentPane title="Quizzes">
      <Link
        to={`/teacher/class/${classId}/quizzes`}
        className="inline-block font-medium text-primary no-underline hover:underline"
      >
        Manage quizzes &rarr;
      </Link>
    </ContentPane>
  );
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
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

function StatusBadge({ status }: { status?: LiveLessonStatus }) {
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
  return (
    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
      Scheduled
    </span>
  );
}

function LiveClassesTab({ classId, userId }: { classId: string; userId: string }) {
  const {
    lessons,
    loading,
    createLiveLesson,
    setLessonStatus,
    deleteLiveLesson,
  } = useClassLiveLessons(classId);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState("60");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);

  const sortedLessons = [...lessons].sort((a, b) => b.scheduledAt - a.scheduledAt);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !scheduledAt) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createLiveLesson({
        title: title.trim(),
        scheduledAt: new Date(scheduledAt).getTime(),
        duration: parseInt(duration, 10) || 60,
        ownerId: userId,
      });
      setTitle("");
      setScheduledAt("");
      setDuration("60");
      setShowForm(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create live class");
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (lessonId: string, status: LiveLessonStatus) => {
    setStatusLoading(lessonId);
    try {
      await setLessonStatus(lessonId, status);
    } finally {
      setStatusLoading(null);
    }
  };

  return (
    <ContentPane title="Live Classes">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Schedule and manage live Zoom classes for this course.
        </p>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          {showForm ? "Cancel" : "Schedule class"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 rounded-card border border-gray-200 bg-white p-6 shadow-card"
        >
          <h3 className="mb-4 font-semibold text-gray-900">Schedule a live class</h3>
          <div className="mb-4">
            <label htmlFor="live-title" className="mb-1.5 block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              id="live-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Week 3: Orchestration Review"
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="live-date" className="mb-1.5 block text-sm font-medium text-gray-700">
                Date &amp; Time
              </label>
              <input
                id="live-date"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="live-duration" className="mb-1.5 block text-sm font-medium text-gray-700">
                Duration (minutes)
              </label>
              <input
                id="live-duration"
                type="number"
                min="15"
                max="480"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          {createError && (
            <p className="mb-4 text-sm text-red-600">{createError}</p>
          )}
          <button
            type="submit"
            disabled={creating}
            className="rounded-xl bg-primary px-5 py-2.5 font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? "Creating\u2026" : "Create & generate Zoom link"}
          </button>
        </form>
      )}

      {loading && <p className="text-gray-500">Loading live classes\u2026</p>}

      {!loading && sortedLessons.length === 0 && (
        <div className="rounded-card border border-gray-200 bg-white p-8 shadow-card">
          <p className="text-gray-600">
            No live classes scheduled yet. Click &ldquo;Schedule class&rdquo; to create one.
          </p>
        </div>
      )}

      {!loading && sortedLessons.length > 0 && (
        <div className="space-y-3">
          {sortedLessons.map((lesson) => (
            <div
              key={lesson.id}
              className={`rounded-card border bg-white p-4 shadow-card ${
                lesson.status === "live" ? "border-red-300 ring-1 ring-red-200" : "border-gray-200"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900">{lesson.title}</h4>
                    <StatusBadge status={lesson.status} />
                  </div>
                  <p className="text-sm text-gray-600">
                    {formatDate(lesson.scheduledAt)} at {formatTime(lesson.scheduledAt)}
                    {lesson.duration != null && <span> &middot; {lesson.duration} min</span>}
                  </p>
                  {lesson.zoomJoinUrl && (
                    <p className="mt-1 text-xs text-gray-500">
                      Zoom ID: {lesson.zoomMeetingId}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {lesson.status !== "ended" && lesson.zoomStartUrl && (
                    <a
                      href={lesson.zoomStartUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white no-underline hover:bg-primary-dark"
                    >
                      {lesson.status === "live" ? "Rejoin Zoom" : "Start Zoom"}
                    </a>
                  )}
                  {lesson.status === "scheduled" && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(lesson.id, "live")}
                      disabled={statusLoading === lesson.id}
                      className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
                    >
                      Go Live
                    </button>
                  )}
                  {lesson.status === "live" && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(lesson.id, "ended")}
                      disabled={statusLoading === lesson.id}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                    >
                      End Class
                    </button>
                  )}
                  {lesson.status !== "live" && (
                    <button
                      type="button"
                      onClick={() => deleteLiveLesson(lesson.id)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ContentPane>
  );
}

function StudentLiveClassesView({ classId }: { classId: string }) {
  const { lessons, loading } = useClassLiveLessons(classId);
  const now = Date.now();
  const upcoming = lessons
    .filter((l) => l.status !== "ended" && l.scheduledAt >= now - 2 * 60 * 60 * 1000)
    .sort((a, b) => a.scheduledAt - b.scheduledAt);
  const liveLessons = lessons.filter((l) => l.status === "live");

  return (
    <ContentPane title="Live Classes">
      {loading && <p className="text-gray-500">Loading\u2026</p>}

      {!loading && liveLessons.length > 0 && (
        <div className="mb-6 space-y-3">
          {liveLessons.map((lesson) => (
            <div
              key={lesson.id}
              className="rounded-card border border-red-300 bg-white p-4 shadow-card ring-1 ring-red-200"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900">{lesson.title}</h4>
                    <StatusBadge status="live" />
                  </div>
                  <p className="text-sm text-gray-600">Started at {formatTime(lesson.scheduledAt)}</p>
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

      {!loading && upcoming.length === 0 && liveLessons.length === 0 && (
        <p className="text-gray-600">No upcoming live classes for this course.</p>
      )}

      {!loading && upcoming.filter((l) => l.status !== "live").length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">Upcoming</h3>
          {upcoming
            .filter((l) => l.status !== "live")
            .map((lesson) => (
              <div
                key={lesson.id}
                className="rounded-card border border-gray-200 bg-white p-4 shadow-card"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{lesson.title}</h4>
                    <p className="text-sm text-gray-600">
                      {formatDate(lesson.scheduledAt)} at {formatTime(lesson.scheduledAt)}
                      {lesson.duration != null && <span> &middot; {lesson.duration} min</span>}
                    </p>
                  </div>
                  <StatusBadge status={lesson.status} />
                </div>
              </div>
            ))}
        </div>
      )}
    </ContentPane>
  );
}

function RosterTab({
  cohorts,
  enrollments,
  cohortsLoading,
  enrollmentsLoading,
  createCohort,
  deleteCohort,
  addEnrollment,
  removeEnrollment,
  issueCertification,
  classId,
}: {
  cohorts: import("../hooks/useCohorts").CohortWithId[];
  enrollments: import("../hooks/useEnrollments").EnrollmentWithId[];
  cohortsLoading: boolean;
  enrollmentsLoading: boolean;
  createCohort: (data: { name: string; limit?: number }) => Promise<void>;
  deleteCohort: (id: string) => Promise<void>;
  addEnrollment: (userId: string, cohortId?: string, status?: string) => Promise<void>;
  removeEnrollment: (userId: string) => Promise<void>;
  issueCertification?: ((data: { userId: string; classId: string }) => Promise<void>) | null;
  classId: string;
}) {
  const [newCohortName, setNewCohortName] = useState("");
  const [newCohortCreating, setNewCohortCreating] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addCohortId, setAddCohortId] = useState("");
  const [addingEnrollment, setAddingEnrollment] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);
  const [issuingFor, setIssuingFor] = useState<string | null>(null);

  const handleCreateCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCohortName.trim()) return;
    setNewCohortCreating(true);
    try {
      await createCohort({ name: newCohortName.trim() });
      setNewCohortName("");
    } finally {
      setNewCohortCreating(false);
    }
  };

  const handleAddEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEmail.trim()) return;
    setAddingEnrollment(true);
    setEnrollmentError(null);
    try {
      const snapshot = await getDocs(
        query(
          collection(db, "users"),
          where("email", "==", addEmail.trim().toLowerCase())
        )
      );
      if (snapshot.empty) {
        setEnrollmentError("No user found with that email");
        return;
      }
      const userDoc = snapshot.docs[0];
      await addEnrollment(userDoc.id, addCohortId || undefined);
      setAddEmail("");
      setAddCohortId("");
    } catch (err) {
      setEnrollmentError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setAddingEnrollment(false);
    }
  };

  const handleIssueCert = async (userId: string) => {
    if (!issueCertification) return;
    setIssuingFor(userId);
    try {
      await issueCertification({ userId, classId });
    } finally {
      setIssuingFor(null);
    }
  };

  return (
    <ContentPane title="Roster">
      <section className="mb-8">
        <h3 className="mb-4 text-lg font-medium text-gray-900">Cohorts</h3>
        {cohortsLoading && <p className="text-gray-500">Loading&hellip;</p>}
        {!cohortsLoading && (
          <>
            <form onSubmit={handleCreateCohort} className="mb-4 flex gap-2">
              <input
                type="text"
                placeholder="Cohort name"
                value={newCohortName}
                onChange={(e) => setNewCohortName(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2"
              />
              <button
                type="submit"
                disabled={newCohortCreating}
                className="rounded-lg bg-primary px-4 py-2 text-white"
              >
                {newCohortCreating ? "Creating\u2026" : "Create cohort"}
              </button>
            </form>
            <div className="space-y-2">
              {cohorts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <span>{c.name}</span>
                  <button
                    type="button"
                    onClick={() => deleteCohort(c.id)}
                    className="text-sm text-red-600"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
      <section>
        <h3 className="mb-4 text-lg font-medium text-gray-900">Enrollments</h3>
        {enrollmentsLoading && <p className="text-gray-500">Loading&hellip;</p>}
        <form onSubmit={handleAddEnrollment} className="mb-4 flex flex-wrap gap-2">
          <input
            type="email"
            placeholder="Student email"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
          <select
            value={addCohortId}
            onChange={(e) => setAddCohortId(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="">No cohort</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={addingEnrollment}
            className="rounded-lg bg-primary px-4 py-2 text-white"
          >
            {addingEnrollment ? "Adding\u2026" : "Add student"}
          </button>
        </form>
        {enrollmentError && (
          <p className="mb-2 text-sm text-red-600">{enrollmentError}</p>
        )}
        <div className="space-y-2">
          {enrollments.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <Link
                to={`/teacher/class/${classId}/student/${e.userId}`}
                className="font-medium text-primary no-underline hover:underline"
              >
                {e.userId}
              </Link>
              <div className="flex items-center gap-2">
                {e.cohortId && (
                  <span className="text-sm text-gray-500">
                    {cohorts.find((c) => c.id === e.cohortId)?.name ?? e.cohortId}
                  </span>
                )}
                {issueCertification && (
                  <button
                    type="button"
                    onClick={() => handleIssueCert(e.userId)}
                    disabled={issuingFor === e.userId}
                    className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
                  >
                    {issuingFor === e.userId ? "Issuing\u2026" : "Issue certification"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeEnrollment(e.userId)}
                  className="text-sm text-red-600"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </ContentPane>
  );
}
