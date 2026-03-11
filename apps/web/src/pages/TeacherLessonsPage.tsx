import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import {
  useTeacherLessons,
  type TeacherLessonEnriched,
} from "../hooks/useTeacherLessons";
import { useTeacherClasses } from "../hooks/useTeacherClasses";
import { useClassModules } from "../hooks/useClassModules";

export default function TeacherLessonsPage() {
  const { user } = useAuth();
  const { lessons, loading, error, createLesson, deleteLesson } =
    useTeacherLessons(user?.uid);
  const { classes } = useTeacherClasses(user?.uid);

  const [showCreate, setShowCreate] = useState(false);
  const [createClassId, setCreateClassId] = useState("");
  const [createModuleId, setCreateModuleId] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createType, setCreateType] = useState<"video" | "audio" | "score" | "text">("text");
  const [creating, setCreating] = useState(false);
  const [classFilter, setClassFilter] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");

  const { modules } = useClassModules(showCreate ? createClassId || undefined : undefined);

  const filteredLessons = useMemo(() => {
    return lessons.filter((l) => {
      if (classFilter && l.classId !== classFilter) return false;
      if (moduleFilter && l.moduleId !== moduleFilter) return false;
      return true;
    });
  }, [lessons, classFilter, moduleFilter]);

  const allClassIds = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of lessons) {
      if (l.classId && l.className) map.set(l.classId, l.className);
    }
    return Array.from(map.entries());
  }, [lessons]);

  const allModuleIds = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of lessons) {
      if (l.moduleId && l.moduleName) map.set(l.moduleId, l.moduleName);
    }
    return Array.from(map.entries());
  }, [lessons]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !createClassId || !createModuleId || !createTitle.trim())
      return;
    setCreating(true);
    try {
      await createLesson(
        {
          classId: createClassId,
          moduleId: createModuleId,
          ownerId: user.uid,
          title: createTitle.trim(),
          type: createType,
        },
        user.uid
      );
      setCreateClassId("");
      setCreateModuleId("");
      setCreateTitle("");
      setCreateType("text");
      setShowCreate(false);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (lesson: TeacherLessonEnriched) => {
    if (!confirm(`Delete lesson "${lesson.title}"?`)) return;
    await deleteLesson(lesson.id);
  };

  return (
    <ProtectedRoute requiredRole="teacher">
      <div>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="mb-2 text-2xl font-semibold tracking-tight text-gray-900">
              Lessons
            </h1>
            <p className="text-gray-600">
              Create and update lessons assigned to your courses
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(!showCreate)}
            className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            {showCreate ? "Cancel" : "Create lesson"}
          </button>
        </div>

        {showCreate && (
          <form
            onSubmit={handleCreate}
            className="mb-8 max-w-md rounded-card border border-gray-200 bg-white p-6 shadow-card"
          >
            <h3 className="mb-4 font-semibold text-gray-900">New lesson</h3>
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Course
              </label>
              <select
                value={createClassId}
                onChange={(e) => {
                  setCreateClassId(e.target.value);
                  setCreateModuleId("");
                }}
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
                Module
              </label>
              <select
                value={createModuleId}
                onChange={(e) => setCreateModuleId(e.target.value)}
                required
                disabled={!createClassId}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
              >
                <option value="">Select module</option>
                {modules.map((m, index) => (
                  <option key={m.id} value={m.id}>
                    Module {index + 1}: {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Lesson title
              </label>
              <input
                type="text"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="e.g. Introduction to Film Scoring"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Type
              </label>
              <select
                value={createType}
                onChange={(e) =>
                  setCreateType(e.target.value as typeof createType)
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="text">Text</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
                <option value="score">Score</option>
              </select>
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

        {loading && <p className="text-gray-500">Loading lessons…</p>}
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
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All modules</option>
                {allModuleIds.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {filteredLessons.length === 0 ? (
              <div className="rounded-card border border-gray-200 bg-white p-8 shadow-card">
                <p className="text-gray-600">
                  {lessons.length === 0
                    ? "No lessons yet. Create one to get started."
                    : "No lessons match your filter."}
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
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                        Module
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                        Course
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                        Order
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredLessons.map((l) => (
                      <tr key={l.id} className="transition-colors hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {l.title}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {l.type}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {l.moduleName ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {l.className ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {l.order ?? 0}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-4">
                            <Link
                              to={`/teacher/class/${l.classId}`}
                              className="font-medium text-primary no-underline hover:underline"
                            >
                              Edit
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDelete(l)}
                              className="text-sm text-red-600 hover:underline"
                            >
                              Delete
                            </button>
                          </div>
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
