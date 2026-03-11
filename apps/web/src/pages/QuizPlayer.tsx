import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { useQuizQuestions, useQuizAttempt } from "../hooks/useQuizzes";

export default function QuizPlayer() {
  const { classId, quizId } = useParams<{ classId: string; quizId: string }>();
  const { user } = useAuth();
  const { questions, loading } = useQuizQuestions(quizId);
  const { attempt, loading: attemptLoading } = useQuizAttempt(quizId, user?.uid);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizId || !user) return;
    setSubmitting(true);
    try {
      const attemptAnswers = Object.entries(answers).map(([questionId, value]) => ({
        questionId,
        answer: { type: "multipleChoice", value: value ? [value] : [] },
      }));
      await addDoc(collection(db, "quizzes", quizId, "attempts"), {
        quizId,
        userId: user.uid,
        answers: attemptAnswers,
        completedAt: Date.now(),
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (attempt || submitted)
    return (
      <ProtectedRoute requiredRole="student">
        <div>
          <p>Quiz submitted. You have already completed this quiz.</p>
          <Link to={`/student/class/${classId}`}>Back to class</Link>
        </div>
      </ProtectedRoute>
    );

  return (
    <ProtectedRoute requiredRole="student">
      <div>
        <Link
          to={`/student/class/${classId}`}
          style={{ color: "#666", marginBottom: "1rem", display: "inline-block" }}
        >
          ← Back to class
        </Link>
        <h2>Quiz</h2>
        {loading && <p>Loading…</p>}
        {!loading && questions.length === 0 && <p>No questions.</p>}
        {!loading && questions.length > 0 && (
          <form onSubmit={handleSubmit}>
            {questions.map((q, i) => (
              <div key={q.id} style={{ marginBottom: "1.5rem" }}>
                <p>
                  <strong>{i + 1}. {q.type}</strong>
                </p>
                {q.type === "multipleChoiceSingle" || q.type === "multipleChoiceMulti" ? (
                  <div>
                    {(q.payload as { choices?: Array<{ key: string; label: string }> }).choices?.map(
                      (c) => (
                        <label key={c.key} style={{ display: "block" }}>
                          <input
                            type="radio"
                            name={q.id}
                            value={c.key}
                            checked={answers[q.id] === c.key}
                            onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: c.key }))}
                          />
                          {c.label}
                        </label>
                      )
                    )}
                  </div>
                ) : (
                  <input
                    placeholder="Answer"
                    value={answers[q.id] ?? ""}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                    }
                  />
                )}
              </div>
            ))}
            <button type="submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit quiz"}
            </button>
          </form>
        )}
      </div>
    </ProtectedRoute>
  );
}
