import { useState, useMemo, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { useTenant } from "../contexts/TenantContext";
import { useTeacherClasses } from "../hooks/useTeacherClasses";
import { useTeacherSettings } from "../hooks/useTeacherSettings";
import { useTeacherStudents } from "../hooks/useTeacherStudents";
import { useTeacherAssignments } from "../hooks/useTeacherAssignments";
import { useTeacherLiveLessons } from "../hooks/useTeacherLiveLessons";
import { StatCard } from "../components/reports";
import { formatUtcForDisplay } from "../utils/timezone";
import { lightenHex } from "../utils/color";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Link, useLocation } from "react-router-dom";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const UPCOMING_LIST_SIZE = 5;

function getChartColors(primaryColor: string | undefined, accentColor: string | undefined): string[] {
  const base = primaryColor ?? "#6366F1";
  const accent = accentColor ?? base;
  return [
    base,
    accent,
    lightenHex(base, 0.25),
    lightenHex(base, 0.5),
  ];
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const { branding } = useTenant();
  const { features } = useTeacherSettings(user?.uid);
  const { classes, loading, error, setClasses } = useTeacherClasses(user?.uid);
  const { students, loading: studentsLoading } = useTeacherStudents(user?.uid);
  const { assignments, loading: assignmentsLoading } = useTeacherAssignments(user?.uid);
  const { upcomingLessons, loading: liveLessonsLoading } = useTeacherLiveLessons(user?.uid);

  useEffect(() => {
    if (location.hash === "#courses") {
      document.getElementById("courses")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [location.hash]);

  const { upcomingAssignments, upcomingDeadlinesCount } = useMemo(() => {
    const now = Date.now();
    const threshold = now + SEVEN_DAYS_MS;
    const filtered = assignments
      .filter((a) => a.deadline != null && a.deadline >= now && a.deadline <= threshold)
      .sort((a, b) => (a.deadline ?? 0) - (b.deadline ?? 0));
    return {
      upcomingAssignments: filtered.slice(0, UPCOMING_LIST_SIZE),
      upcomingDeadlinesCount: filtered.length,
    };
  }, [assignments]);

  const showAssignments = features.assignments !== false;
  const showLiveLessons = features.liveLessons !== false;
  const metricsLoading = loading || studentsLoading || (showAssignments && assignmentsLoading) || (showLiveLessons && liveLessonsLoading);

  const chartColors = useMemo(
    () => getChartColors(branding.primaryColor, branding.accentColor),
    [branding.primaryColor, branding.accentColor]
  );
  const primaryChartColor = branding.primaryColor ?? "#7c3aed";

  const studentsPerCourseData = useMemo(() => {
    return classes.map((c) => ({
      name: c.name.length > 20 ? `${c.name.slice(0, 17)}…` : c.name,
      fullName: c.name,
      students: students.filter((s) =>
        s.courses.some((co) => co.classId === c.id)
      ).length,
    }));
  }, [classes, students]);

  const assignmentsDueByWeekData = useMemo(() => {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const weeks: { name: string; count: number }[] = [];

    for (let i = 0; i < 4; i++) {
      const start = now + i * weekMs;
      const end = now + (i + 1) * weekMs;
      const count = assignments.filter(
        (a) =>
          a.deadline != null && a.deadline >= start && a.deadline < end
      ).length;
      const weekStart = new Date(start);
      weeks.push({
        name: `Week ${i + 1}\n${weekStart.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })}`,
        count,
      });
    }
    return weeks;
  }, [assignments]);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [stripePriceId, setStripePriceId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setCreateError("");
    setCreating(true);
    try {
      const classData: Record<string, unknown> = {
        name: name.trim() || "New class",
        description: description.trim() || null,
        teacherId: user.uid,
        createdAt: Date.now(),
      };
      if (isPaid && stripePriceId.trim()) {
        classData.isPaid = true;
        classData.stripePriceId = stripePriceId.trim();
      }
      const ref = await addDoc(collection(db, "classes"), classData);
      await addDoc(collection(db, "communities"), {
        classId: ref.id,
        ownerId: user.uid,
        name: "General",
        createdAt: Date.now(),
      });
      setClasses((prev) => [
        ...prev,
        {
          id: ref.id,
          name: name.trim() || "New class",
          description: description.trim() || undefined,
          teacherId: user.uid,
        },
      ]);
      setName("");
      setDescription("");
      setIsPaid(false);
      setStripePriceId("");
      setShowForm(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create class");
    } finally {
      setCreating(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="teacher">
      <div>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="mb-2 text-2xl font-semibold tracking-tight text-gray-900">
              {branding.tenantName ? `${branding.tenantName} Dashboard` : "Dashboard"}
            </h1>
            <p className="text-gray-600">
              Manage your classes and course content
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            {showForm ? "Cancel" : "Create class"}
          </button>
        </div>

        <section className="mb-8">
          <h2 className="mb-4 text-lg font-medium text-gray-900">Overview</h2>
          {metricsLoading ? (
            <p className="text-gray-500">Loading metrics…</p>
          ) : (
            <>
              <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Total students"
                  value={students.length}
                  variant="default"
                  to="/teacher/students"
                />
                <StatCard
                  label="Active courses"
                  value={classes.length}
                  variant="default"
                  to="/"
                />
                {showAssignments && (
                  <StatCard
                    label="Upcoming deadlines"
                    value={upcomingDeadlinesCount}
                    subtext="Assignments due in next 7 days"
                    variant={upcomingDeadlinesCount > 0 ? "warning" : "default"}
                    to="/teacher/assignments"
                  />
                )}
                {showLiveLessons && (
                  <StatCard
                    label="Upcoming classes"
                    value={upcomingLessons.length}
                    subtext="Live lessons in next 7 days"
                    variant={upcomingLessons.length > 0 ? "warning" : "default"}
                    to="/teacher/lessons"
                  />
                )}
              </div>
              {(showAssignments || showLiveLessons) && (
              <div className="grid gap-6 sm:grid-cols-2">
                {showAssignments && (
                  <div className="rounded-card border border-gray-200 bg-white p-5 shadow-card">
                    <h3 className="mb-3 font-medium text-gray-900">Next deadlines</h3>
                    {upcomingAssignments.length === 0 ? (
                      <p className="text-sm text-gray-500">No assignments due in the next 7 days</p>
                    ) : (
                      <ul className="space-y-2">
                        {upcomingAssignments.map((a) => (
                          <li key={a.id}>
                            <Link
                              to={`/teacher/class/${a.classId}/assignment/${a.id}`}
                              className="block text-sm text-primary hover:underline"
                            >
                              {a.title}
                            </Link>
                            <p className="text-xs text-gray-500">
                              {a.className} · Due {formatUtcForDisplay(a.deadline!)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {showLiveLessons && (
                  <div className="rounded-card border border-gray-200 bg-white p-5 shadow-card">
                    <h3 className="mb-3 font-medium text-gray-900">Next live lessons</h3>
                    {upcomingLessons.length === 0 ? (
                      <p className="text-sm text-gray-500">No live lessons in the next 7 days</p>
                    ) : (
                      <ul className="space-y-2">
                        {upcomingLessons.slice(0, UPCOMING_LIST_SIZE).map((l) => (
                          <li key={l.id}>
                            <Link
                              to={`/teacher/class/${l.classId}`}
                              className="block text-sm text-primary hover:underline"
                            >
                              {l.title}
                            </Link>
                            <p className="text-xs text-gray-500">
                              {l.className} · {formatUtcForDisplay(l.scheduledAt)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
              )}

              <div className={`mt-6 grid gap-6 ${showAssignments ? "lg:grid-cols-2" : "lg:grid-cols-1"}`}>
                <div className="rounded-card border border-gray-200 bg-white p-5 shadow-card">
                  <h3 className="mb-4 font-medium text-gray-900">
                    Students per course
                  </h3>
                  {studentsPerCourseData.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No courses with enrolled students yet
                    </p>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={studentsPerCourseData}
                          layout="vertical"
                          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis type="number" tick={{ fontSize: 12 }} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={80}
                            tick={{ fontSize: 11 }}
                          />
                          <Tooltip
                            formatter={(value: number, _name: string, item: { payload: { fullName: string } }) => [
                              value,
                              item.payload.fullName,
                            ]}
                          />
                          <Bar dataKey="students" name="Students" radius={[0, 4, 4, 0]}>
                            {studentsPerCourseData.map((_, index) => (
                              <Cell
                                key={index}
                                fill={chartColors[index % chartColors.length]}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
                {showAssignments && (
                  <div className="rounded-card border border-gray-200 bg-white p-5 shadow-card">
                    <h3 className="mb-4 font-medium text-gray-900">
                      Assignments due by week
                    </h3>
                    {assignmentsDueByWeekData.every((w) => w.count === 0) ? (
                      <p className="text-sm text-gray-500">
                        No assignments due in the next 4 weeks
                      </p>
                    ) : (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={assignmentsDueByWeekData}
                            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 11 }}
                              interval={0}
                            />
                            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="count" name="Assignments" fill={primaryChartColor} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="mb-8 max-w-md rounded-card border border-gray-200 bg-white p-6 shadow-card"
          >
            <h3 className="mb-4 font-semibold text-gray-900">New class</h3>
            <div className="mb-4">
              <label htmlFor="class-name" className="mb-1.5 block text-sm font-medium text-gray-700">
                Class name
              </label>
              <input
                id="class-name"
                type="text"
                placeholder="e.g. Film Scoring 101"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 transition-colors placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="mb-4">
              <label className="mb-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isPaid}
                  onChange={(e) => setIsPaid(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">Paid class</span>
              </label>
              {isPaid && (
                <input
                  type="text"
                  placeholder="Stripe Price ID (e.g. price_...)"
                  value={stripePriceId}
                  onChange={(e) => setStripePriceId(e.target.value)}
                  className="mb-2 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              )}
            </div>
            <div className="mb-4">
              <label htmlFor="class-desc" className="mb-1.5 block text-sm font-medium text-gray-700">
                Description (optional)
              </label>
              <input
                id="class-desc"
                type="text"
                placeholder="Brief description of the course"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 transition-colors placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            {createError && (
              <p className="mb-4 text-sm text-red-600">{createError}</p>
            )}
            <button
              type="submit"
              disabled={creating}
              className="rounded-xl bg-primary px-5 py-2.5 font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? "Creating…" : "Create"}
            </button>
          </form>
        )}
        {loading && (
          <p className="text-gray-500">Loading your classes…</p>
        )}
        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {!loading && !error && classes.length === 0 && !showForm && (
          <div className="rounded-card max-w-md border border-gray-200 bg-white p-8 shadow-card">
            <p className="text-gray-600">
              You don&apos;t have any classes yet. Create one to get started.
            </p>
          </div>
        )}
        {!loading && classes.length > 0 && (
          <div id="courses" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((c) => (
              <Link
                key={c.id}
                to={`/teacher/class/${c.id}`}
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
