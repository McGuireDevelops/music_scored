import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ProtectedRoute from "../components/ProtectedRoute";
import { StatCard } from "../components/reports";
import { useAuth } from "../contexts/AuthContext";
import { useTenant } from "../contexts/TenantContext";
import { functions, httpsCallable } from "../firebase";
import { formatUtcForDisplay } from "../utils/timezone";

type Preset = "month" | "quarter" | "year";

interface AnalyticsPayload {
  preset: Preset;
  anchor?: number;
  /** Optional: admins can pass another teacher’s uid to load their analytics */
  forTeacherId?: string;
}

interface TeacherAnalyticsResponse {
  period: { preset: Preset; startMs: number; endMs: number; anchorMs: number };
  thresholds: { atRiskInactivityDays: number; atRiskNoSubmissionDays: number };
  summary: {
    revenueByCurrency: Record<string, number>;
    purchaseCount: number;
    newEnrollmentsCount: number;
    repeatLearnerCount: number;
    enrolledStudentCount: number;
  };
  byClass: Array<{
    classId: string;
    className: string;
    newEnrollments: number;
    purchaseCount: number;
    revenueByCurrency: Record<string, number>;
  }>;
  curricula: Array<{
    curriculumId: string;
    name: string;
    courseIds: string[];
    newEnrollments: number;
    purchaseCount: number;
    revenueByCurrency: Record<string, number>;
  }>;
  atRisk: Array<{
    userId: string;
    displayName: string | null;
    email: string | null;
    reasons: string[];
    primaryClassId: string;
  }>;
  atRiskTruncated: boolean;
  liveAttendanceNote: string;
}

const REASON_LABELS: Record<string, string> = {
  inactive_after_enroll: "Little or no activity since enrolling",
  no_recent_submission: "No recent assignment submissions",
  no_recent_quiz: "No recent quiz activity",
};

function formatMinorUnits(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency}`;
  }
}

function formatRevenueMap(rev: Record<string, number>): string {
  const entries = Object.entries(rev).filter(([, v]) => v > 0);
  if (entries.length === 0) return "—";
  return entries
    .map(([cur, amt]) => formatMinorUnits(amt, cur))
    .join(" · ");
}

function truncateName(name: string, max = 18): string {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

export default function TeacherAnalyticsPage() {
  const { user } = useAuth();
  const { branding } = useTenant();
  const [preset, setPreset] = useState<Preset>("month");
  const [data, setData] = useState<TeacherAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const primaryChartColor = branding.primaryColor ?? "#7c3aed";

  const fetchAnalytics = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const call = httpsCallable<AnalyticsPayload, TeacherAnalyticsResponse>(
        functions,
        "getTeacherAnalytics"
      );
      const res = await call({
        preset,
        anchor: Date.now(),
      });
      setData(res.data);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [user, preset]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const revenueSummaryText = useMemo(() => {
    if (!data) return "—";
    return formatRevenueMap(data.summary.revenueByCurrency);
  }, [data]);

  const singleCurrency = useMemo(() => {
    if (!data) return null;
    const keys = Object.keys(data.summary.revenueByCurrency).filter(
      (k) => (data.summary.revenueByCurrency[k] ?? 0) > 0
    );
    return keys.length === 1 ? keys[0] : null;
  }, [data]);

  const revenueChartData = useMemo(() => {
    if (!data || !singleCurrency) return [];
    return data.byClass.map((c) => ({
      name: truncateName(c.className),
      fullName: c.className,
      revenue: (c.revenueByCurrency[singleCurrency] ?? 0) / 100,
    }));
  }, [data, singleCurrency]);

  const enrollmentChartData = useMemo(() => {
    if (!data) return [];
    return data.byClass.map((c) => ({
      name: truncateName(c.className),
      fullName: c.className,
      enrollments: c.newEnrollments,
    }));
  }, [data]);

  return (
    <ProtectedRoute requiredRole="teacher">
      <div>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="mb-2 text-2xl font-semibold tracking-tight text-gray-900">
              Analytics
            </h1>
            <p className="text-gray-600">
              Revenue, enrollments, repeat learners, and at-risk students
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["month", "quarter", "year"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPreset(p)}
                className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  preset === p
                    ? "bg-primary text-white"
                    : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {p === "month"
                  ? "Month"
                  : p === "quarter"
                    ? "Quarter"
                    : "Year"}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className="text-gray-500">Loading…</p>}
        {error && (
          <p className="rounded-lg bg-report-error/10 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {!loading && !error && data && (
          <>
            <p className="mb-6 text-sm text-gray-600">
              Period (UTC): {formatUtcForDisplay(data.period.startMs)} —{" "}
              {formatUtcForDisplay(data.period.endMs)}
            </p>

            <section className="mb-8">
              <h2 className="mb-4 text-lg font-medium text-gray-900">Overview</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Revenue (period)" value={revenueSummaryText} />
                <StatCard
                  label="Purchases"
                  value={data.summary.purchaseCount}
                  subtext="Completed checkouts in period"
                />
                <StatCard
                  label="New roster enrollments"
                  value={data.summary.newEnrollmentsCount}
                  subtext="Enrollments with first seen date in period"
                />
                <StatCard
                  label="Repeat learners"
                  value={data.summary.repeatLearnerCount}
                  subtext={`Of ${data.summary.enrolledStudentCount} enrolled students`}
                  variant={
                    data.summary.repeatLearnerCount > 0 ? "success" : "default"
                  }
                />
              </div>
            </section>

            <section className="mb-8 grid gap-8 lg:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-card">
                <h3 className="mb-4 text-base font-medium text-gray-900">
                  New enrollments by course
                </h3>
                {enrollmentChartData.length === 0 ? (
                  <p className="text-sm text-gray-500">No courses or no data.</p>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={enrollmentChartData} margin={{ bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(v: number) => [v, "Enrollments"]}
                          labelFormatter={(_, payload) =>
                            (payload[0]?.payload as { fullName?: string })
                              ?.fullName ?? ""
                          }
                        />
                        <Bar dataKey="enrollments" fill={primaryChartColor} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-card">
                <h3 className="mb-4 text-base font-medium text-gray-900">
                  Revenue by course
                </h3>
                {!singleCurrency ? (
                  <p className="text-sm text-gray-500">
                    Revenue chart is available when all payments in this period use a
                    single currency. Use the table below for mixed currencies.
                  </p>
                ) : revenueChartData.length === 0 ? (
                  <p className="text-sm text-gray-500">No paid purchases in period.</p>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueChartData} margin={{ bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(v: number) => [
                            formatMinorUnits(v * 100, singleCurrency),
                            "Revenue",
                          ]}
                          labelFormatter={(_, payload) =>
                            (payload[0]?.payload as { fullName?: string })
                              ?.fullName ?? ""
                          }
                        />
                        <Bar dataKey="revenue" fill={primaryChartColor} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-lg font-medium text-gray-900">By course</h2>
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-card">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 font-medium text-gray-700">Course</th>
                      <th className="px-4 py-3 font-medium text-gray-700">New enrollments</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Purchases</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byClass.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-gray-500">
                          No courses yet.
                        </td>
                      </tr>
                    ) : (
                      data.byClass.map((row) => (
                        <tr key={row.classId} className="border-b border-gray-100">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            <Link
                              to={`/teacher/class/${row.classId}?tab=roster`}
                              className="text-primary hover:underline"
                            >
                              {row.className}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{row.newEnrollments}</td>
                          <td className="px-4 py-3 text-gray-700">{row.purchaseCount}</td>
                          <td className="px-4 py-3 text-gray-700">
                            {formatRevenueMap(row.revenueByCurrency)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-lg font-medium text-gray-900">By curriculum</h2>
              {data.curricula.length === 0 ? (
                <p className="text-gray-600">
                  No curricula linked to your courses. Build curricula in the Curriculum
                  Builder.
                </p>
              ) : (
                <ul className="space-y-3">
                  {data.curricula.map((cur) => (
                    <li
                      key={cur.curriculumId}
                      className="rounded-xl border border-gray-200 bg-white p-4 shadow-card"
                    >
                      <div className="font-medium text-gray-900">{cur.name}</div>
                      <p className="mt-1 text-sm text-gray-600">
                        {cur.courseIds.length} course
                        {cur.courseIds.length === 1 ? "" : "s"} linked · New enrollments:{" "}
                        {cur.newEnrollments} · Purchases: {cur.purchaseCount} · Revenue:{" "}
                        {formatRevenueMap(cur.revenueByCurrency)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-lg font-medium text-gray-900">
                At-risk students
              </h2>
              <p className="mb-2 text-sm text-gray-600">
                Based on login activity (throttled), assignments, and quizzes. Thresholds:
                inactive after enroll {data.thresholds.atRiskInactivityDays}d; engagement{" "}
                {data.thresholds.atRiskNoSubmissionDays}d.
              </p>
              <p className="mb-4 text-sm text-amber-800">{data.liveAttendanceNote}</p>
              {data.atRiskTruncated && (
                <p className="mb-4 text-sm text-amber-700">
                  List capped for performance; refine criteria in Firestore{" "}
                  <code className="rounded bg-gray-100 px-1">teacherSettings</code> (
                  <code className="rounded bg-gray-100 px-1">atRiskInactivityDays</code>,{" "}
                  <code className="rounded bg-gray-100 px-1">atRiskNoSubmissionDays</code>
                  ).
                </p>
              )}
              {data.atRisk.length === 0 ? (
                <p className="text-gray-600">No students match the current at-risk rules.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-card">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-gray-200 bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 font-medium text-gray-700">Student</th>
                        <th className="px-4 py-3 font-medium text-gray-700">Signals</th>
                        <th className="px-4 py-3 font-medium text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.atRisk.map((row) => (
                        <tr key={row.userId} className="border-b border-gray-100">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">
                              {row.displayName || row.email || row.userId}
                            </div>
                            {row.email && row.displayName && (
                              <div className="text-gray-500">{row.email}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            <ul className="list-inside list-disc">
                              {row.reasons.map((r) => (
                                <li key={r}>{REASON_LABELS[r] ?? r}</li>
                              ))}
                            </ul>
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              to={`/teacher/class/${row.primaryClassId}/student/${row.userId}`}
                              className="font-medium text-primary hover:underline"
                            >
                              View profile
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
