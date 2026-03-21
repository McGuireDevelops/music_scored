import { useState, useEffect, useMemo } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import type { ClassQuestionStatus } from "@learning-scores/shared";
import { useLiveLessonQuestions } from "../../hooks/useLiveLessonQuestions";

type Filter = "all" | "returnTo" | "open" | "answered";

function sortForTeacher<T extends { status: ClassQuestionStatus; createdAt: number }>(list: T[]): T[] {
  const rank = (s: ClassQuestionStatus) => {
    if (s === "returnTo") return 0;
    if (s === "open") return 1;
    return 2;
  };
  return [...list].sort((a, b) => {
    const r = rank(a.status) - rank(b.status);
    if (r !== 0) return r;
    return a.createdAt - b.createdAt;
  });
}

export function TeacherClassQuestionQueue({ lessonId }: { lessonId: string }) {
  const { questions, loading, setQuestionStatus } = useLiveLessonQuestions(lessonId);
  const [filter, setFilter] = useState<Filter>("all");
  const [names, setNames] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const authorIdsKey = useMemo(
    () => [...new Set(questions.map((q) => q.authorId))].sort().join(","),
    [questions]
  );

  useEffect(() => {
    const uids = [...new Set(questions.map((q) => q.authorId))];
    if (uids.length === 0) return;
    let cancelled = false;
    Promise.all(
      uids.map((uid) =>
        getDoc(doc(db, "users", uid)).then((s) => ({
          uid,
          name: s.exists() ? (s.data()?.displayName || s.data()?.email || uid) : uid,
        }))
      )
    ).then((list) => {
      if (cancelled) return;
      const map: Record<string, string> = {};
      list.forEach(({ uid, name }) => {
        map[uid] = name;
      });
      setNames(map);
    });
    return () => {
      cancelled = true;
    };
  }, [authorIdsKey]);

  const filtered = useMemo(() => {
    const base =
      filter === "all" ? questions : questions.filter((q) => q.status === filter);
    return sortForTeacher(base);
  }, [questions, filter]);

  const counts = useMemo(() => {
    return {
      all: questions.length,
      returnTo: questions.filter((q) => q.status === "returnTo").length,
      open: questions.filter((q) => q.status === "open").length,
      answered: questions.filter((q) => q.status === "answered").length,
    };
  }, [questions]);

  const handleStatus = async (questionId: string, status: ClassQuestionStatus) => {
    setBusyId(questionId);
    try {
      await setQuestionStatus(questionId, status);
    } catch (e) {
      console.error(e);
    } finally {
      setBusyId(null);
    }
  };

  const filterBtn = (key: Filter, label: string) => (
    <button
      key={key}
      type="button"
      onClick={() => setFilter(key)}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        filter === key
          ? "bg-violet-600 text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {label}
      {key !== "all" && counts[key] > 0 && (
        <span className="ml-1 opacity-80">({counts[key]})</span>
      )}
    </button>
  );

  return (
    <div className="mt-4 border-t border-violet-200 pt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white"
            aria-hidden
          >
            ?
          </span>
          <h5 className="text-sm font-semibold text-gray-900">Question queue</h5>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {filterBtn("all", "All")}
          {filterBtn("returnTo", "Return to")}
          {filterBtn("open", "Open")}
          {filterBtn("answered", "Answered")}
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      {!loading && filtered.length === 0 && (
        <p className="text-sm text-gray-500">
          {questions.length === 0 ? "No questions yet." : "Nothing in this filter."}
        </p>
      )}

      {!loading && filtered.length > 0 && (
        <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {filtered.map((q) => (
            <li
              key={q.id}
              className="rounded-lg border-l-4 border-violet-500 bg-violet-50/40 px-3 py-2 ring-1 ring-violet-100"
            >
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-violet-900">
                  {names[q.authorId] ?? q.authorId.slice(0, 8)}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(q.createdAt).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="mb-2 text-sm text-gray-800 whitespace-pre-wrap">{q.text}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busyId === q.id || q.status === "answered"}
                  onClick={() => handleStatus(q.id, "answered")}
                  className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Answered
                </button>
                <button
                  type="button"
                  disabled={busyId === q.id || q.status === "returnTo"}
                  onClick={() => handleStatus(q.id, "returnTo")}
                  className="rounded-md bg-amber-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Return to
                </button>
                <button
                  type="button"
                  disabled={busyId === q.id || q.status === "open"}
                  onClick={() => handleStatus(q.id, "open")}
                  className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Reopen
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
