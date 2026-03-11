import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { useClassQuizzes } from "../hooks/useQuizzes";
import { useClassModules } from "../hooks/useClassModules";
import { useModuleLessons } from "../hooks/useModuleLessons";

type QuizAttachLevel = "course" | "module" | "lesson";

export default function QuizBuilder() {
  const { classId } = useParams<{ classId: string }>();
  const { user } = useAuth();
  const { quizzes, loading, createQuiz } = useClassQuizzes(classId);
  const { modules } = useClassModules(classId);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [attachLevel, setAttachLevel] = useState<QuizAttachLevel>("course");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const { lessons: moduleLessons } = useModuleLessons(
    classId,
    attachLevel !== "course" ? selectedModuleId || undefined : undefined
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classId || !user || !newTitle.trim()) return;
    setCreating(true);
    try {
      const moduleId =
        attachLevel === "module" || attachLevel === "lesson" ? selectedModuleId || undefined : undefined;
      const lessonId = attachLevel === "lesson" ? selectedLessonId || undefined : undefined;
      await createQuiz(
        {
          classId,
          ownerId: user.uid,
          title: newTitle.trim(),
          moduleId,
          lessonId,
        },
        user.uid
      );
      setNewTitle("");
      setSelectedModuleId("");
      setSelectedLessonId("");
    } finally {
      setCreating(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="teacher">
      <div>
        <Link
          to={`/teacher/class/${classId}`}
          style={{ color: "#666", marginBottom: "1rem", display: "inline-block" }}
        >
          ← Back to class
        </Link>
        <h2>Quizzes</h2>
        {loading && <p>Loading…</p>}
        {!loading && (
          <>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {quizzes.map((q) => (
                <li
                  key={q.id}
                  style={{
                    padding: "1rem",
                    marginBottom: "0.5rem",
                    background: "#f5f5f5",
                    borderRadius: 8,
                  }}
                >
                  <Link to={`/teacher/class/${classId}/quiz/${q.id}/edit`}>
                    {q.title}
                    {q.lessonId && " (lesson)"}
                    {q.moduleId && !q.lessonId && " (module)"}
                    {!q.moduleId && !q.lessonId && " (course)"}
                  </Link>
                </li>
              ))}
            </ul>
            <form onSubmit={handleCreate} style={{ marginTop: "1rem" }}>
              <div style={{ marginBottom: "0.75rem" }}>
                <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500 }}>
                  Attach to
                </label>
                <select
                  value={attachLevel}
                  onChange={(e) => {
                    setAttachLevel(e.target.value as QuizAttachLevel);
                    setSelectedModuleId("");
                    setSelectedLessonId("");
                  }}
                  style={{ marginRight: "0.5rem", padding: "0.35rem" }}
                >
                  <option value="course">Course (final quiz)</option>
                  <option value="module">Module (end-of-module quiz)</option>
                  <option value="lesson">Lesson (lesson quiz)</option>
                </select>
              </div>
              {(attachLevel === "module" || attachLevel === "lesson") && (
                <div style={{ marginBottom: "0.75rem" }}>
                  <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500 }}>
                    Module
                  </label>
                  <select
                    value={selectedModuleId}
                    onChange={(e) => {
                      setSelectedModuleId(e.target.value);
                      setSelectedLessonId("");
                    }}
                    style={{ marginRight: "0.5rem", padding: "0.35rem", minWidth: 200 }}
                  >
                    <option value="">Select module</option>
                    {modules.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {attachLevel === "lesson" && selectedModuleId && (
                <div style={{ marginBottom: "0.75rem" }}>
                  <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500 }}>
                    Lesson
                  </label>
                  <select
                    value={selectedLessonId}
                    onChange={(e) => setSelectedLessonId(e.target.value)}
                    style={{ marginRight: "0.5rem", padding: "0.35rem", minWidth: 200 }}
                  >
                    <option value="">Select lesson</option>
                    {moduleLessons.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div style={{ marginBottom: "0.75rem" }}>
                <input
                  placeholder="Quiz title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{ marginRight: "0.5rem", padding: "0.35rem" }}
                />
                <button type="submit" disabled={creating}>
                  {creating ? "Creating…" : "Create quiz"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
