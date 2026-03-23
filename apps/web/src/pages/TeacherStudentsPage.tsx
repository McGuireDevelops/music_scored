import { useState, useMemo, useEffect, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase";
import { useTeacherStudents, type TeacherStudent } from "../hooks/useTeacherStudents";
import { useTeacherClasses } from "../hooks/useTeacherClasses";
import { useClassEnrollments } from "../hooks/useEnrollments";
import { useClassCohorts } from "../hooks/useCohorts";

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
  const { students, loading, error, refetch } = useTeacherStudents(user?.uid);
  const { classes: teacherClasses, loading: classesLoading } = useTeacherClasses(user?.uid);
  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"add" | "invite">("add");
  const [modalClassId, setModalClassId] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addCohortId, setAddCohortId] = useState("");
  const [addingStudent, setAddingStudent] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  const { addEnrollment } = useClassEnrollments(modalClassId || undefined);
  const { cohorts } = useClassCohorts(modalClassId || undefined);

  useEffect(() => {
    if (!studentModalOpen) return;
    setInviteCopied(false);
  }, [modalClassId, studentModalOpen]);

  useEffect(() => {
    if (!studentModalOpen || classesLoading || teacherClasses.length === 0) return;
    if (!modalClassId || !teacherClasses.some((c) => c.id === modalClassId)) {
      setModalClassId(teacherClasses[0].id);
    }
  }, [studentModalOpen, classesLoading, teacherClasses, modalClassId]);

  const openStudentModal = () => {
    setModalError(null);
    setAddEmail("");
    setAddCohortId("");
    setModalTab("add");
    setModalClassId(teacherClasses[0]?.id ?? "");
    setStudentModalOpen(true);
  };

  const closeStudentModal = () => {
    setStudentModalOpen(false);
    setModalError(null);
    setInviteCopied(false);
  };

  const inviteUrl =
    typeof window !== "undefined" && modalClassId
      ? `${window.location.origin}/purchase/${modalClassId}`
      : "";

  const handleCopyInvite = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setInviteCopied(true);
      window.setTimeout(() => setInviteCopied(false), 2000);
    } catch {
      setModalError("Could not copy to clipboard");
    }
  };

  const handleAddStudentByEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (!modalClassId || !addEmail.trim()) return;
    setAddingStudent(true);
    setModalError(null);
    try {
      const snapshot = await getDocs(
        query(collection(db, "users"), where("email", "==", addEmail.trim().toLowerCase()))
      );
      if (snapshot.empty) {
        setModalError(
          "No account found with that email. Ask them to sign up first, or share the invite link."
        );
        return;
      }
      const userDoc = snapshot.docs[0];
      await addEnrollment(userDoc.id, addCohortId || undefined);
      setAddEmail("");
      setAddCohortId("");
      await refetch();
      closeStudentModal();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Failed to add student");
    } finally {
      setAddingStudent(false);
    }
  };

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

        <button
          type="button"
          onClick={openStudentModal}
          className="fixed bottom-8 right-8 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl font-light leading-none text-white shadow-lg transition-colors hover:bg-primary-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label="Add or invite student"
        >
          +
        </button>

        {studentModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-modal-title"
            onClick={closeStudentModal}
          >
            <div
              className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-card border border-gray-200 bg-white p-6 shadow-card"
              onClick={(ev) => ev.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 id="student-modal-title" className="text-lg font-semibold text-gray-900">
                  Add or invite student
                </h2>
                <button
                  type="button"
                  onClick={closeStudentModal}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              {classesLoading ? (
                <p className="text-gray-500">Loading your courses…</p>
              ) : teacherClasses.length === 0 ? (
                <p className="text-gray-600">
                  Create a course first, then you can add students.{" "}
                  <Link to="/" className="font-medium text-primary no-underline hover:underline">
                    Go to dashboard
                  </Link>
                </p>
              ) : (
                <>
                  <div className="mb-4">
                    <label htmlFor="modal-class" className="mb-1.5 block text-sm font-medium text-gray-700">
                      Course
                    </label>
                    <select
                      id="modal-class"
                      value={modalClassId}
                      onChange={(e) => setModalClassId(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {teacherClasses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-4 flex rounded-lg border border-gray-200 p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setModalTab("add");
                        setModalError(null);
                      }}
                      className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        modalTab === "add"
                          ? "bg-primary text-white"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      Add by email
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalTab("invite");
                        setModalError(null);
                      }}
                      className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        modalTab === "invite"
                          ? "bg-primary text-white"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      Invite link
                    </button>
                  </div>

                  {modalTab === "add" ? (
                    <form onSubmit={handleAddStudentByEmail}>
                      <p className="mb-3 text-sm text-gray-600">
                        Enrolls a learner who already has an account (matched by email).
                      </p>
                      <div className="mb-3">
                        <label htmlFor="modal-email" className="mb-1.5 block text-sm font-medium text-gray-700">
                          Student email
                        </label>
                        <input
                          id="modal-email"
                          type="email"
                          autoComplete="email"
                          placeholder="name@example.com"
                          value={addEmail}
                          onChange={(e) => setAddEmail(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      {cohorts.length > 0 && (
                        <div className="mb-4">
                          <label htmlFor="modal-cohort" className="mb-1.5 block text-sm font-medium text-gray-700">
                            Cohort (optional)
                          </label>
                          <select
                            id="modal-cohort"
                            value={addCohortId}
                            onChange={(e) => setAddCohortId(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="">No cohort</option>
                            {cohorts.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {modalError && (
                        <p className="mb-3 text-sm text-red-600">{modalError}</p>
                      )}
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="submit"
                          disabled={addingStudent || !modalClassId}
                          className="rounded-xl bg-primary px-5 py-2.5 font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {addingStudent ? "Adding…" : "Add to course"}
                        </button>
                        <button
                          type="button"
                          disabled={addingStudent}
                          onClick={closeStudentModal}
                          className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div>
                      <p className="mb-3 text-sm text-gray-600">
                        Share this link so they can sign in and open your class checkout page (for paid
                        access). For roster and cohorts, you can also use the{" "}
                        <Link
                          to={modalClassId ? `/teacher/class/${modalClassId}?tab=roster` : "/"}
                          className="font-medium text-primary no-underline hover:underline"
                        >
                          course roster
                        </Link>
                        .
                      </p>
                      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <code className="block flex-1 break-all rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-800">
                          {inviteUrl}
                        </code>
                        <button
                          type="button"
                          onClick={handleCopyInvite}
                          disabled={!modalClassId}
                          className="shrink-0 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 disabled:opacity-50"
                        >
                          {inviteCopied ? "Copied" : "Copy link"}
                        </button>
                      </div>
                      {modalError && (
                        <p className="mb-3 text-sm text-red-600">{modalError}</p>
                      )}
                      <button
                        type="button"
                        onClick={closeStudentModal}
                        className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
