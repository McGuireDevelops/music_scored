import { Link } from "react-router-dom";
import { useAssignmentReport } from "../../hooks/useAssignmentReport";
import { StatCard, ProgressBar, StatusBadge } from "./index";
import { formatUtcForDisplay } from "../../utils/timezone";

interface AssignmentReportSectionProps {
  classId: string;
  assignmentId: string;
}

function getVariant(pct: number): "success" | "warning" | "error" {
  if (pct >= 80) return "success";
  if (pct >= 50) return "warning";
  return "error";
}

export function AssignmentReportSection({
  classId,
  assignmentId,
}: AssignmentReportSectionProps) {
  const { data, loading, error } = useAssignmentReport(classId, assignmentId);

  if (loading) {
    return (
      <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-6">
        <h4 className="mb-4 font-medium text-gray-900">Class report</h4>
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6 rounded-xl border border-report-error/20 bg-report-error/5 p-6">
        <h4 className="mb-4 font-medium text-gray-900">Class report</h4>
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const completionPct =
    data.totalStudents > 0
      ? (data.submittedCount / data.totalStudents) * 100
      : 0;
  const gradedPct =
    data.submittedCount > 0 ? (data.gradedCount / data.submittedCount) * 100 : 0;

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-card">
      <h4 className="mb-4 font-medium text-gray-900">Class report</h4>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Submitted"
          value={`${data.submittedCount} / ${data.totalStudents}`}
          variant={getVariant(completionPct)}
        />
        <StatCard
          label="Graded"
          value={`${data.gradedCount} / ${data.submittedCount}`}
          variant={data.gradedCount === data.submittedCount ? "success" : "warning"}
        />
        <StatCard
          label="Overdue"
          value={data.overdueCount}
          variant={data.overdueCount > 0 ? "error" : "success"}
        />
      </div>

      <ProgressBar
        value={data.submittedCount}
        max={data.totalStudents}
        label="Completion"
        variant={getVariant(completionPct)}
      />

      <div className="mt-6">
        <h5 className="mb-3 text-sm font-medium text-gray-700">
          Students
        </h5>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left font-medium text-gray-700">
                  Student
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">
                  Status
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">
                  Submitted
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data.rows.map((row) => (
                <tr key={row.userId} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link
                      to={`/teacher/class/${classId}/student/${row.userId}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {row.userId}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge
                      status={
                        row.graded
                          ? "graded"
                          : row.submitted
                          ? "submitted"
                          : "not_started"
                      }
                    />
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {row.submittedAt
                      ? formatUtcForDisplay(row.submittedAt)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
