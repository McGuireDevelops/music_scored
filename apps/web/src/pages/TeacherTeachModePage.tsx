import { useParams, Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import ProtectedRoute from "../components/ProtectedRoute";
import { useTeacherPlanItems } from "../hooks/useTeacherPlanItems";
import { LessonViewer } from "../components/LessonViewer";
import type { LessonWithId } from "../hooks/useModuleLessons";
import type { LiveLessonWithId } from "../hooks/useLiveLessons";

function storageKeyFor(liveLessonId: string) {
  return `teachPlanSelectedItem:${liveLessonId}`;
}

function TeachModeInner() {
  const { classId, liveLessonId } = useParams<{ classId: string; liveLessonId: string }>();
  const [liveLesson, setLiveLesson] = useState<LiveLessonWithId | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const { items, loading: planLoading, error: planError } = useTeacherPlanItems(
    liveLessonId
  );

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.order - b.order),
    [items]
  );

  const sortedItemIdsKey = useMemo(
    () => sortedItems.map((i) => i.id).join("|"),
    [sortedItems]
  );

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  useEffect(() => {
    if (!liveLessonId || !classId) return;
    let cancelled = false;
    setSessionError(null);
    getDoc(doc(db, "liveLessons", liveLessonId))
      .then((snap) => {
        if (cancelled) return;
        if (!snap.exists()) {
          setSessionError("This session was not found.");
          setLiveLesson(null);
          return;
        }
        const data = { id: snap.id, ...snap.data() } as LiveLessonWithId;
        if (data.classId !== classId) {
          setSessionError("This session does not belong to this course.");
          setLiveLesson(null);
          return;
        }
        setLiveLesson(data);
      })
      .catch(() => {
        if (!cancelled) setSessionError("Could not load session.");
      });
    return () => {
      cancelled = true;
    };
  }, [liveLessonId, classId]);

  useEffect(() => {
    if (!liveLessonId || planLoading) return;
    if (sortedItemIdsKey === "") {
      setSelectedItemId(null);
      return;
    }
    const ids = sortedItemIdsKey.split("|");
    const raw = sessionStorage.getItem(storageKeyFor(liveLessonId));
    if (raw && ids.includes(raw)) {
      setSelectedItemId(raw);
      return;
    }
    setSelectedItemId(ids[0] ?? null);
  }, [liveLessonId, planLoading, sortedItemIdsKey]);

  const selectItem = useCallback(
    (id: string) => {
      setSelectedItemId(id);
      if (liveLessonId) {
        sessionStorage.setItem(storageKeyFor(liveLessonId), id);
      }
    },
    [liveLessonId]
  );

  const selectedItem = useMemo(
    () => sortedItems.find((i) => i.id === selectedItemId) ?? null,
    [sortedItems, selectedItemId]
  );

  const [lessonDoc, setLessonDoc] = useState<LessonWithId | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);

  useEffect(() => {
    const lessonId = selectedItem?.lessonId;
    if (!lessonId || !classId) {
      setLessonDoc(null);
      return;
    }
    let cancelled = false;
    setLessonLoading(true);
    getDoc(doc(db, "lessons", lessonId))
      .then((snap) => {
        if (cancelled) return;
        if (!snap.exists()) {
          setLessonDoc(null);
          return;
        }
        const data = { id: snap.id, ...snap.data() } as LessonWithId;
        if (data.classId !== classId) {
          setLessonDoc(null);
          return;
        }
        setLessonDoc(data);
      })
      .catch(() => {
        if (!cancelled) setLessonDoc(null);
      })
      .finally(() => {
        if (!cancelled) setLessonLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedItem?.lessonId, classId]);

  const selectedIndex = sortedItems.findIndex((i) => i.id === selectedItemId);
  const goPrev = () => {
    if (selectedIndex > 0) selectItem(sortedItems[selectedIndex - 1].id);
  };
  const goNext = () => {
    if (selectedIndex >= 0 && selectedIndex < sortedItems.length - 1) {
      selectItem(sortedItems[selectedIndex + 1].id);
    }
  };

  if (!classId || !liveLessonId) {
    return (
      <div className="p-8">
        <p className="text-gray-600">Invalid URL.</p>
        <Link to="/" className="text-primary hover:underline">
          Home
        </Link>
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="p-8">
        <p className="text-red-600">{sessionError}</p>
        <Link
          to={`/teacher/class/${classId}?tab=live`}
          className="mt-4 inline-block text-primary hover:underline"
        >
          Back to live classes
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <Link
              to={`/teacher/class/${classId}?tab=live`}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Back to course
            </Link>
            <h1 className="mt-1 truncate text-lg font-semibold text-gray-900">
              {liveLesson?.title ?? "Teach mode"}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {liveLesson?.zoomStartUrl && (
              <a
                href={liveLesson.zoomStartUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white no-underline hover:bg-primary-dark"
              >
                Open Zoom
              </a>
            )}
            <button
              type="button"
              onClick={goPrev}
              disabled={selectedIndex <= 0}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={selectedIndex < 0 || selectedIndex >= sortedItems.length - 1}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-0 lg:flex-row">
        <aside className="w-full shrink-0 border-b border-gray-200 bg-white lg:w-72 lg:border-b-0 lg:border-r">
          <div className="p-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Running order
            </h2>
            {planLoading && <p className="mt-2 text-sm text-gray-500">Loading…</p>}
            {planError && <p className="mt-2 text-sm text-red-600">{planError}</p>}
            {!planLoading && !planError && sortedItems.length === 0 && (
              <p className="mt-2 text-sm text-gray-600">
                No items in this plan yet. Use{" "}
                <strong>Teaching plan</strong> on the Live tab to add lessons and links.
              </p>
            )}
            <ol className="mt-2 space-y-1">
              {sortedItems.map((item, index) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => selectItem(item.id)}
                    className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                      item.id === selectedItemId
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-gray-800 hover:bg-gray-100"
                    }`}
                  >
                    <span className="text-gray-500">{index + 1}. </span>
                    {item.title}
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </aside>

        <main className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-8">
          {!selectedItem && !planLoading && (
            <p className="text-gray-600">Select an item from the list.</p>
          )}
          {selectedItem && (
            <div className="mx-auto max-w-3xl rounded-card border border-gray-200 bg-white p-6 shadow-card">
              <h2 className="mb-2 text-xl font-semibold text-gray-900">{selectedItem.title}</h2>
              {selectedItem.notes && (
                <p className="mb-4 whitespace-pre-wrap text-sm text-gray-600">{selectedItem.notes}</p>
              )}
              {selectedItem.lessonId && (
                <>
                  {lessonLoading && <p className="text-gray-500">Loading lesson…</p>}
                  {!lessonLoading && lessonDoc && <LessonViewer lesson={lessonDoc} />}
                  {!lessonLoading && !lessonDoc && (
                    <p className="text-red-600">Could not load this lesson.</p>
                  )}
                </>
              )}
              {!selectedItem.lessonId && selectedItem.externalUrl && (
                <a
                  href={selectedItem.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white no-underline hover:bg-primary-dark"
                >
                  Open link
                </a>
              )}
              {!selectedItem.lessonId && !selectedItem.externalUrl && (
                <p className="text-sm text-gray-600">
                  No linked lesson or URL. Add details in the teaching plan editor.
                </p>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function TeacherTeachModePage() {
  return (
    <ProtectedRoute requiredRole="teacher">
      <TeachModeInner />
    </ProtectedRoute>
  );
}
