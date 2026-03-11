import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { useTeacherStudents, type TeacherStudent } from "../hooks/useTeacherStudents";

function filterStudents(
  students: TeacherStudent[],
  searchTerm: string,
  courseFilter: string
): TeacherStudent[] {
  return students.filter((s) => {
    const matchesSearch =
      !searchTerm ||
      (s.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ??
        false) ||
      (s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      s.userId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCourse =
      !courseFilter ||
      s.courses.some((c) => c.classId === courseFilter);

    return matchesSearch && matchesCourse;
  });
}

export default function TeacherStudentsPage() {
  const { user } = useAuth();
  const { students, loading, error } = useTeacherStudents(user?.uid);
  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState("");

  const filteredStudents = useMemo(
    () => filterStudents(students, searchTerm, courseFilter),
    [students, searchTerm, courseFilter]
  );

  const allCourseIds = useMemo(() => {
    const ids = new Map<string, string>();
    for (const s of students) {
      for (const c of s.courses) {
        ids.set(c.classId, c.className);
      }
    }
    return Array.from(ids.entries());
  }, [students]);

  return (
    <ProtectedRoute requiredRole="teacher">
      <div>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="mb-2 text-2xl font-semibold tracking-tight text-gray-900">
              Students
            </h1>
            <p className="text-gray-600">
              Searchable database of students across your courses
            </p>
          </div>
        </div>

        {loading && <p className="text-gray-500">Loading students…</p>}
        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {!loading && !error && (
          <>
            <div className="mb-6 flex flex-wrap gap-4">
              <input
                type="search"
                placeholder="Search by name, email…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All courses</option>
                {allCourseIds.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="rounded-card border border-gray-200 bg-white p-8 shadow-card">
                <p className="text-gray-600">
                  {students.length === 0
                    ? "No students enrolled in your courses yet."
                    : "No students match your search or filter."}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-card border border-gray-200 bg-white shadow-card">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-sm font-medium text-gray-900"
                      >
                        Name
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-sm font-medium text-gray-900"
                      >
                        Email
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-sm font-medium text-gray-900"
                      >
                        Courses
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-sm font-medium text-gray-900"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-sm font-medium text-gray-900"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredStudents.map((s) => (
                      <tr key={s.userId} className="transition-colors hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {s.displayName ?? s.userId}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {s.email ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {s.courses.map((c) => c.className).join(", ")}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {s.status}
                        </td>
                        <td className="px-4 py-3">
                          {s.courses.length > 0 && (
                            <Link
                              to={`/teacher/class/${s.courses[0].classId}/student/${s.userId}`}
                              className="font-medium text-primary no-underline hover:underline"
                            >
                              View profile
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
