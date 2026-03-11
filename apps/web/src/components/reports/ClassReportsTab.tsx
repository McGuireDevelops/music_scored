import { Link } from "react-router-dom";
import { useClassReport } from "../../hooks/useClassReport";
import { StatCard, ProgressBar, StatusBadge } from "./index";
import { ContentPane } from "../dashboard/ContentPane";
import { formatUtcForDisplay } from "../../utils/timezone";

interface ClassReportsTabProps {
  classId: string;
}

function getCompletionVariant(pct: number): "success" | "warning" | "error" {
  if (pct >= 80) return "success";
  if (pct >= 50) return "warning";
  return "error";
}

export function ClassReportsTab({ classId }: ClassReportsTabProps) {
  const { data, loading, error } = useClassReport(classId);

  if (loading) {
    return (
      <ContentPane title="Reports">
        <p className="text-gray-500">Loading report…</p>
      </ContentPane>
    );
  }

  if (error) {
    return (
      <ContentPane title="Reports">
        <p className="rounded-lg bg-report-error/10 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      </ContentPane>
    );
  }

  if (!data) {
    return (
      <ContentPane title="Reports">
        <p className="text-gray-600">No data available.</p>
      </ContentPane>
    );
  }

  const { studentCount, assignmentSummaries, quizSummaries, overallCompletionRate } =
    data;

  const completionVariant = getCompletionVariant(overallCompletionRate);
  const totalAssignments = assignmentSummaries.length;
  const totalOverdue = assignmentSummaries.reduce((s, a) => s + a.overdueCount, 0);

  return (
    <ContentPane title="Class Reports">
      <section className="mb-8">
        <h3 className="mb-4 text-lg font-medium text-gray-900">
          Overview
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Enrolled students"
            value={studentCount}
            variant="default"
          />
          <StatCard
            label="Total assignments"
            value={totalAssignments}
            variant="default"
          />
          <StatCard
            label="Overall completion"
            value={`${Math.round(overallCompletionRate)}%`}
            subtext="Students who submitted across all assignments"
            variant={completionVariant}
          />
          <StatCard
            label="Overdue"
            value={totalOverdue}
            subtext={totalOverdue > 0 ? "Students past deadline" : undefined}
            variant={totalOverdue > 0 ? "error" : "success"}
          />
        </div>
      </section>

      <section className="mb-8">
        <h3 className="mb-4 text-lg font-medium text-gray-900">
          Assignments
        </h3>
        {assignmentSummaries.length === 0 ? (
          <p className="text-gray-600">No assignments yet.</p>
        ) : (
          <div className="space-y-4">
            {assignmentSummaries.map((a) => {
              const completionPct =
                a.totalStudents > 0
                  ? (a.submittedCount / a.totalStudents) * 100
                  : 0;
              const variant = getCompletionVariant(completionPct);

              return (
                <Link
                  key={a.assignmentId}
                  to={`/teacher/class/${classId}/assignment/${a.assignmentId}`}
                  className="block rounded-xl border border-gray-200 bg-white p-4 shadow-card transition-all hover:border-primary/20 hover:shadow-cardHover"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {a.title}
                      </h4>
                      {a.deadline && (
                        <p className="text-sm text-gray-600">
                          Due: {formatUtcForDisplay(a.deadline)}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {a.overdueCount > 0 && (
                        <StatusBadge status="overdue" label={`${a.overdueCount} overdue`} />
                      )}
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          variant === "success"
                            ? "bg-report-success/10 text-green-700"
                            : variant === "warning"
                            ? "bg-report-warning/10 text-amber-700"
                            : "bg-report-error/10 text-red-700"
                        }`}
                      >
                        {a.gradedCount}/{a.submittedCount} graded
                      </span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <ProgressBar
                      value={a.submittedCount}
                      max={a.totalStudents}
                      showCount={true}
                      variant={variant}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-4 text-lg font-medium text-gray-900">
          Quizzes
        </h3>
        {quizSummaries.length === 0 ? (
          <p className="text-gray-600">No quizzes yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quizSummaries.map((q) => {
              const completionPct =
                q.totalStudents > 0 ? (q.attemptedCount / q.totalStudents) * 100 : 0;
              const variant = getCompletionVariant(completionPct);

              return (
                <div
                  key={q.quizId}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-card"
                >
                  <h4 className="font-semibold text-gray-900">{q.title}</h4>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {q.attemptedCount} / {q.totalStudents} attempted
                    </span>
                    {q.maxScore > 0 && (
                      <span
                        className={`font-medium ${
                          variant === "success"
                            ? "text-report-success"
                            : variant === "warning"
                            ? "text-report-warning"
                            : "text-report-error"
                        }`}
                      >
                        Avg: {Math.round(q.averageScore)} / {q.maxScore}
                      </span>
                    )}
                  </div>
                  <ProgressBar
                    value={q.attemptedCount}
                    max={q.totalStudents}
                    variant={variant}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>
    </ContentPane>
  );
}
