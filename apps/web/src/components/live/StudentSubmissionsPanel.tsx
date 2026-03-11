import { useStudentSubmissions } from "../../hooks/useStudentSubmissions";

interface StudentSubmissionsPanelProps {
  studentId: string | undefined;
  classId: string;
  studentName?: string;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function mediaTypeIcon(type?: string) {
  switch (type) {
    case "audio":
      return (
        <svg className="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
        </svg>
      );
    case "video":
      return (
        <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    case "score":
      return (
        <svg className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case "document":
      return (
        <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    default:
      return (
        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
      );
  }
}

export function StudentSubmissionsPanel({
  studentId,
  classId,
  studentName,
}: StudentSubmissionsPanelProps) {
  const { submissions, loading, permissionError } = useStudentSubmissions(studentId);
  const classSubmissions = submissions.filter((s) => s.classId === classId);

  if (!studentId) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-sm text-gray-500">
          Select a student to view their submissions.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-3">
        <h4 className="text-sm font-semibold text-gray-700">
          {studentName ? `${studentName}'s Submissions` : "Submissions"}
        </h4>
      </div>

      {loading && (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-gray-500">Loading submissions&hellip;</p>
        </div>
      )}

      {permissionError && (
        <div className="px-4 py-3">
          <p className="text-sm text-red-600">{permissionError}</p>
        </div>
      )}

      {!loading && !permissionError && classSubmissions.length === 0 && (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-gray-500">No submissions yet for this class.</p>
        </div>
      )}

      {!loading && classSubmissions.length > 0 && (
        <ul className="divide-y divide-gray-100">
          {classSubmissions.map((sub) => (
            <li key={sub.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {sub.assignmentTitle ?? "Assignment"}
                  </p>
                  {sub.submittedAt && (
                    <p className="mt-0.5 text-xs text-gray-500">
                      Submitted {formatDate(sub.submittedAt)}
                    </p>
                  )}
                  {sub.mediaRefs && sub.mediaRefs.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {sub.mediaRefs.map((ref, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                        >
                          {mediaTypeIcon(ref.type)}
                          {ref.label || ref.type}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <a
                  href={`/teacher/class/${classId}/assignment/${sub.assignmentId}`}
                  className="shrink-0 text-xs font-medium text-primary hover:underline"
                >
                  View
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
