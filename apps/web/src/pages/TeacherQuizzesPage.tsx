import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { useTeacherQuizzes } from "../hooks/useTeacherQuizzes";
import { useTeacherClasses } from "../hooks/useTeacherClasses";

export default function TeacherQuizzesPage() {
  const { user } = useAuth();
  const { quizzes, loading, error, createQuiz } =
    useTeacherQuizzes(user?.uid);
  const { classes } = useTeacherClasses(user?.uid);

  const [showCreate, setShowCreate] = useState(false);
  const [createClassId, setCreateClassId] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [classFilter, setClassFilter] = useState("");

  const filteredQuizzes = useMemo(() => {
    if (!classFilter) return quizzes;
    return quizzes.filter((q) => q.classId === classFilter);
  }, [quizzes, classFilter]);

  const allClassIds = useMemo(() => {
    const map = new Map<string, string>();
    for (const q of quizzes) {
      if (q.classId && q.className) map.set(q.classId, q.className);
    }
    return Array.from(map.entries());
  }, [quizzes]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !createClassId || !createTitle.trim()) return;
    setCreating(true);
    try {
      await createQuiz(
        {
          classId: createClassId,
          ownerId: user.uid,
          title: createTitle.trim(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        user.uid
      );
      setCreateClassId("");
      setCreateTitle("");
      setShowCreate(false);
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
              Quizzes
            </h1>
            <p className="text-gray-600">
              Create and manage quizzes for your courses
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(!showCreate)}
            className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            {showCreate ? "Cancel" : "Create quiz"}
          </button>
        </div>

        {showCreate && (
          <form
            onSubmit={handleCreate}
            className="mb-8 max-w-md rounded-card border border-gray-200 bg-white p-6 shadow-card"
          >
            <h3 className="mb-4 font-semibold text-gray-900">New quiz</h3>
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Course
              </label>
              <select
                value={createClassId}
                onChange={(e) => setCreateClassId(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select course</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Quiz title
              </label>
              <input
                type="text"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="e.g. Module 1 Quiz"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="rounded-xl bg-primary px-5 py-2.5 font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? "Creating…" : "Create"}
            </button>
          </form>
        )}

        {loading && <p className="text-gray-500">Loading quizzes…</p>}
        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {!loading && !error && (
          <>
            <div className="mb-6 flex flex-wrap gap-4">
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All courses</option>
                {allClassIds.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {filteredQuizzes.length === 0 ? (
              <div className="rounded-card border border-gray-200 bg-white p-8 shadow-card">
                <p className="text-gray-600">
                  {quizzes.length === 0
                    ? "No quizzes yet. Create one to get started."
                    : "No quizzes match your filter."}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-card border border-gray-200 bg-white shadow-card">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                        Title
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                        Course
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredQuizzes.map((q) => (
                      <tr key={q.id} className="transition-colors hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {q.title}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {q.className ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/teacher/class/${q.classId}/quiz/${q.id}/edit`}
                            className="font-medium text-primary no-underline hover:underline"
                          >
                            Edit
                          </Link>
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
