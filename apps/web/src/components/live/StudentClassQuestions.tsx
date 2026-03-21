import { useState } from "react";
import type { ClassQuestionStatus } from "@learning-scores/shared";
import { CLASS_QUESTION_TEXT_MAX_LENGTH } from "@learning-scores/shared";
import { useLiveLessonQuestions } from "../../hooks/useLiveLessonQuestions";

function statusLabel(status: ClassQuestionStatus): string {
  switch (status) {
    case "answered":
      return "Answered";
    case "returnTo":
      return "We will return to this";
    default:
      return "In queue";
  }
}

function statusBadgeClass(status: ClassQuestionStatus): string {
  switch (status) {
    case "answered":
      return "bg-emerald-100 text-emerald-800";
    case "returnTo":
      return "bg-amber-100 text-amber-900";
    default:
      return "bg-violet-100 text-violet-800";
  }
}

export function StudentClassQuestions({
  lessonId,
  userId,
}: {
  lessonId: string;
  userId: string | undefined;
}) {
  const { questions, loading, submitQuestion } = useLiveLessonQuestions(lessonId);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !text.trim()) return;
    setSending(true);
    setError(null);
    try {
      await submitQuestion(userId, text);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send question");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-4 border-t border-violet-200/80 pt-4">
      <div className="mb-3 flex items-center gap-2">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white"
          aria-hidden
        >
          ?
        </span>
        <div>
          <h5 className="text-sm font-semibold text-violet-950">Class questions</h5>
          <p className="text-xs text-gray-600">
            Questions go to your teacher’s queue—not the course discussion board.
          </p>
        </div>
      </div>

      {userId ? (
        <form onSubmit={handleSubmit} className="mb-4">
          <label htmlFor={`cq-${lessonId}`} className="sr-only">
            Your question
          </label>
          <textarea
            id={`cq-${lessonId}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            maxLength={CLASS_QUESTION_TEXT_MAX_LENGTH}
            placeholder="Ask the teacher a question about this session…"
            className="mb-2 w-full rounded-lg border border-violet-200 bg-violet-50/50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? "Sending…" : "Submit question"}
            </button>
            <span className="text-xs text-gray-500">
              {text.length}/{CLASS_QUESTION_TEXT_MAX_LENGTH}
            </span>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </form>
      ) : (
        <p className="mb-4 text-sm text-gray-500">Sign in to ask a question.</p>
      )}

      {loading && <p className="text-sm text-gray-500">Loading questions…</p>}

      {!loading && questions.length === 0 && (
        <p className="text-sm text-gray-500">No questions yet for this session.</p>
      )}

      {!loading && questions.length > 0 && (
        <ul className="space-y-2">
          {questions.map((q) => (
            <li
              key={q.id}
              className="rounded-lg border-l-4 border-violet-500 bg-white pl-3 pr-3 py-2 shadow-sm ring-1 ring-violet-100"
            >
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                  Question
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(q.status)}`}
                >
                  {statusLabel(q.status)}
                </span>
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{q.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
