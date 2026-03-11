import { useParams, Link } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import { useStudentReport } from "../hooks/useStudentReport";
import { ProgressBar, StatusBadge } from "../components/reports";
import { formatUtcForDisplay } from "../utils/timezone";

export default function StudentProfile() {
  const { classId, studentId } = useParams<{ classId: string; studentId: string }>();

  const { data, loading, error } = useStudentReport(classId, studentId);

  return (
    <ProtectedRoute requiredRole="teacher">
      <div>
        <Link
          to={`/teacher/class/${classId}`}
          className="mb-4 inline-block text-sm text-gray-600 no-underline transition-colors hover:text-gray-900"
        >
          ← Back to class
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Student profile
          </h1>
          <p className="mt-1 text-gray-600">Student ID: {studentId}</p>
        </div>

        {loading && <p className="text-gray-500">Loading…</p>}
        {error && (
          <p className="rounded-lg bg-report-error/10 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {!loading && !error && data && (
          <>
            <section className="mb-8">
              <h3 className="mb-4 text-lg font-medium text-gray-900">
                Summary
              </h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-card">
                  <p className="text-sm font-medium text-gray-500">
                    Assignments
                  </p>
                  <p className="mt-1 text-xl font-bold text-gray-900">
                    {data.submittedCount} / {data.totalAssignments} submitted
                  </p>
                  <ProgressBar
                    value={data.submittedCount}
                    max={data.totalAssignments}
                    showCount={false}
                  />
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-card">
                  <p className="text-sm font-medium text-gray-500">Graded</p>
                  <p className="mt-1 text-xl font-bold text-gray-900">
                    {data.gradedCount} / {data.submittedCount} graded
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-card">
                  <p className="text-sm font-medium text-gray-500">Quizzes</p>
                  <p className="mt-1 text-xl font-bold text-gray-900">
                    {data.quizStatuses.filter((q) => q.score != null).length} /{" "}
                    {data.totalQuizzes} completed
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h3 className="mb-4 text-lg font-medium text-gray-900">
                Assignments
              </h3>
              {data.assignmentStatuses.length === 0 ? (
                <p className="text-gray-600">No assignments in this class.</p>
              ) : (
                <div className="space-y-3">
                  {data.assignmentStatuses.map((a) => (
                    <Link
                      key={a.assignmentId}
                      to={`/teacher/class/${classId}/assignment/${a.assignmentId}`}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-primary/20"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {a.assignmentTitle}
                        </p>
                        {a.submittedAt && (
                          <p className="text-sm text-gray-600">
                            Submitted: {formatUtcForDisplay(a.submittedAt)}
                          </p>
                        )}
                      </div>
                      <StatusBadge
                        status={
                          a.status === "graded"
                            ? "graded"
                            : a.status === "submitted"
                            ? "submitted"
                            : "not_started"
                        }
                      />
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h3 className="mb-4 text-lg font-medium text-gray-900">
                Quizzes
              </h3>
              {data.quizStatuses.length === 0 ? (
                <p className="text-gray-600">No quizzes in this class.</p>
              ) : (
                <div className="space-y-3">
                  {data.quizStatuses.map((q) => (
                    <div
                      key={q.quizId}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {q.quizTitle}
                        </p>
                        {q.completedAt && (
                          <p className="text-sm text-gray-600">
                            Completed: {formatUtcForDisplay(q.completedAt)}
                          </p>
                        )}
                      </div>
                      {q.score != null && q.maxScore != null ? (
                        <span className="rounded-full bg-report-success/10 px-2.5 py-0.5 text-sm font-medium text-green-700">
                          {q.score} / {q.maxScore}
                        </span>
                      ) : (
                        <StatusBadge status="not_started" label="Not attempted" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
