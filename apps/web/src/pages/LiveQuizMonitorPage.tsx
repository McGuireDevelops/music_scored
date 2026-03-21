import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import ProtectedRoute from "../components/ProtectedRoute";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useQuiz } from "../hooks/useQuizzes";
import { useQuizQuestions } from "../hooks/useQuizzes";
import {
  useLiveQuizParticipants,
  useLiveQuizSessionRef,
  endLiveQuizSession,
} from "../hooks/useLiveQuiz";

export default function LiveQuizMonitorPage() {
  const { classId, quizId, sessionId } = useParams<{
    classId: string;
    quizId: string;
    sessionId: string;
  }>();
  const navigate = useNavigate();
  const { quiz } = useQuiz(quizId);
  const { questions } = useQuizQuestions(quizId, { forTeacher: true });
  const { session, loading: sessionLoading } = useLiveQuizSessionRef(sessionId);
  const { participants, loading: participantsLoading } = useLiveQuizParticipants(sessionId);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [ending, setEnding] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalQuestions = questions.length;

  const uidsKey = useMemo(
    () => participants.map((p) => p.userId).sort().join(","),
    [participants]
  );

  useEffect(() => {
    const uids = participants.map((p) => p.userId);
    if (uids.length === 0) return;
    Promise.all(
      uids.map((uid) =>
        getDoc(doc(db, "users", uid)).then((s) => ({
          uid,
          name: s.exists() ? (s.data()?.displayName || s.data()?.email || uid) : uid,
        }))
      )
    ).then((list) => {
      const map: Record<string, string> = {};
      list.forEach(({ uid, name }) => {
        map[uid] = name;
      });
      setUserNames(map);
    });
  }, [uidsKey, participants]);

  const handleEndSession = async () => {
    if (!sessionId || ending) return;
    if (!window.confirm("End this live quiz? Student draft progress in the monitor will be cleared.")) return;
    setEnding(true);
    try {
      await endLiveQuizSession(sessionId);
      navigate(`/teacher/class/${classId}/quiz/${quizId}/edit`);
    } catch (e) {
      console.error(e);
    } finally {
      setEnding(false);
    }
  };

  const loading = sessionLoading || participantsLoading;

  return (
    <ProtectedRoute requiredRole="teacher">
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <Link
            to={`/teacher/class/${classId}/quiz/${quizId}/edit`}
            className="text-sm text-gray-600 no-underline transition-colors hover:text-gray-900"
          >
            ← Back to quiz
          </Link>
          <Link
            to={`/teacher/class/${classId}/quiz/${quizId}/attempts`}
            className="text-sm font-medium text-primary no-underline transition-colors hover:underline"
          >
            View attempts
          </Link>
        </div>

        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Live quiz monitor</h1>
            <p className="mt-1 text-gray-600">
              {quiz?.title ?? "Quiz"} · {totalQuestions} question{totalQuestions === 1 ? "" : "s"}
            </p>
            {session?.status === "ended" && (
              <p className="mt-2 text-sm font-medium text-amber-800">This session has ended.</p>
            )}
          </div>
          {session?.status === "active" && (
            <button
              type="button"
              onClick={handleEndSession}
              disabled={ending}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {ending ? "Ending…" : "End live session"}
            </button>
          )}
        </div>

        {loading && <p className="text-gray-500">Loading…</p>}

        {!loading && participants.length === 0 && (
          <p className="text-gray-600">
            No students have joined yet. They will appear here when they open the quiz while this session is
            active.
          </p>
        )}

        {!loading && participants.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-700">Student</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Progress</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Last update</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-700"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {participants.map((p) => {
                  const answered =
                    p.answeredCount ??
                    (Array.isArray(p.answers) ? p.answers.length : 0);
                  const progressLabel =
                    totalQuestions > 0 ? `${answered} / ${totalQuestions}` : `${answered} answered`;
                  const stale =
                    p.updatedAt && Date.now() - p.updatedAt > 120_000 && !p.submittedAt;
                  return (
                    <tr key={p.id} className={stale ? "bg-amber-50/50" : ""}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {userNames[p.userId] ?? p.displayName ?? p.userId}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{progressLabel}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {p.updatedAt
                          ? new Date(p.updatedAt).toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })
                          : "—"}
                        {stale && (
                          <span className="ml-2 text-xs text-amber-700">(idle)</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {p.submittedAt ? (
                          <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            Submitted
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                            In progress
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId((id) => (id === p.id ? null : p.id))
                          }
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {expandedId === p.id ? "Hide" : "Show"} answers
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {expandedId && (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-900">Draft answers</h3>
            {participants
              .filter((p) => p.id === expandedId)
              .map((p) => (
                <ul key={p.id} className="space-y-2 text-sm text-gray-800">
                  {(p.answers ?? []).map((a) => (
                    <li key={a.questionId}>
                      <span className="font-mono text-xs text-gray-500">{a.questionId}</span>:{" "}
                      {a.answer.type === "multipleChoice" &&
                      Array.isArray((a.answer as { value?: unknown }).value)
                        ? (a.answer as { value: string[] }).value.join(", ")
                        : JSON.stringify(a.answer)}
                    </li>
                  ))}
                  {(!p.answers || p.answers.length === 0) && (
                    <li className="text-gray-500">No answers yet.</li>
                  )}
                </ul>
              ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
