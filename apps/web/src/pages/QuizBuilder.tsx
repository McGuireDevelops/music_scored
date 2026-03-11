import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { useClassQuizzes, useQuizQuestions } from "../hooks/useQuizzes";

export default function QuizBuilder() {
  const { classId } = useParams<{ classId: string }>();
  const { user } = useAuth();
  const { quizzes, loading, createQuiz } = useClassQuizzes(classId);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classId || !user || !newTitle.trim()) return;
    setCreating(true);
    try {
      await createQuiz(
        { classId, ownerId: user.uid, title: newTitle.trim() },
        user.uid
      );
      setNewTitle("");
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
                  </Link>
                </li>
              ))}
            </ul>
            <form onSubmit={handleCreate} style={{ marginTop: "1rem" }}>
              <input
                placeholder="Quiz title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                style={{ marginRight: "0.5rem", padding: "0.35rem" }}
              />
              <button type="submit" disabled={creating}>
                {creating ? "Creating…" : "Create quiz"}
              </button>
            </form>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
