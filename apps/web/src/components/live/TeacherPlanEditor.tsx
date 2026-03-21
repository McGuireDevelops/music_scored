import { useMemo, useState } from "react";
import { useClassLessons } from "../../hooks/useClassLessons";
import { useTeacherPlanItems } from "../../hooks/useTeacherPlanItems";
import type { LessonWithId } from "../../hooks/useModuleLessons";

interface TeacherPlanEditorProps {
  liveLessonId: string;
  classId: string;
}

export function TeacherPlanEditor({ liveLessonId, classId }: TeacherPlanEditorProps) {
  const { lessons, loading: lessonsLoading } = useClassLessons(classId);
  const {
    items,
    loading,
    error,
    addItem,
    removeItem,
    reorderItems,
    updateItem,
  } = useTeacherPlanItems(liveLessonId);

  const [lessonSearch, setLessonSearch] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [adding, setAdding] = useState(false);

  const filteredLessons = useMemo(() => {
    const q = lessonSearch.trim().toLowerCase();
    if (!q) return lessons;
    return lessons.filter((l) => l.title.toLowerCase().includes(q));
  }, [lessons, lessonSearch]);

  const sortedItems = useMemo(() => [...items].sort((a, b) => a.order - b.order), [items]);

  const moveUp = async (itemId: string) => {
    const ids = sortedItems.map((i) => i.id);
    const idx = ids.indexOf(itemId);
    if (idx <= 0) return;
    const next = [...ids];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    await reorderItems(next);
  };

  const moveDown = async (itemId: string) => {
    const ids = sortedItems.map((i) => i.id);
    const idx = ids.indexOf(itemId);
    if (idx < 0 || idx >= ids.length - 1) return;
    const next = [...ids];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    await reorderItems(next);
  };

  const handleAddLesson = async (lesson: LessonWithId) => {
    setAdding(true);
    try {
      await addItem({ title: lesson.title, lessonId: lesson.id });
    } finally {
      setAdding(false);
    }
  };

  const handleAddCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;
    setAdding(true);
    try {
      await addItem({
        title: customTitle.trim(),
        externalUrl: customUrl.trim() || undefined,
        notes: customNotes.trim() || undefined,
      });
      setCustomTitle("");
      setCustomUrl("");
      setCustomNotes("");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50/80 p-4">
      <h4 className="mb-3 text-sm font-semibold text-gray-900">Teaching plan (running order)</h4>
      {loading && <p className="text-sm text-gray-500">Loading plan…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <>
          <div className="mb-4 space-y-3">
            <p className="text-xs font-medium text-gray-600">Add a course lesson</p>
            <input
              type="search"
              placeholder="Search lessons…"
              value={lessonSearch}
              onChange={(e) => setLessonSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="max-h-36 overflow-y-auto rounded-lg border border-gray-200 bg-white">
              {lessonsLoading && (
                <p className="p-3 text-sm text-gray-500">Loading lessons…</p>
              )}
              {!lessonsLoading && filteredLessons.length === 0 && (
                <p className="p-3 text-sm text-gray-600">No lessons match.</p>
              )}
              {!lessonsLoading &&
                filteredLessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    type="button"
                    disabled={adding}
                    onClick={() => void handleAddLesson(lesson)}
                    className="flex w-full items-center justify-between border-b border-gray-100 px-3 py-2 text-left text-sm text-gray-800 last:border-0 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="truncate">{lesson.title}</span>
                    <span className="shrink-0 text-xs text-primary">Add</span>
                  </button>
                ))}
            </div>
          </div>

          <form onSubmit={handleAddCustom} className="mb-4 space-y-2 rounded-lg border border-gray-200 bg-white p-3">
            <p className="text-xs font-medium text-gray-600">Add link or segment</p>
            <input
              type="text"
              required
              placeholder="Title"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="url"
              placeholder="URL (optional)"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <textarea
              placeholder="Private notes (optional)"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={adding || !customTitle.trim()}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
            >
              Add to plan
            </button>
          </form>

          {sortedItems.length === 0 ? (
            <p className="text-sm text-gray-600">No items yet. Add lessons or segments above.</p>
          ) : (
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              {sortedItems.map((item, index) => (
                <li key={item.id} className="rounded-lg border border-gray-200 bg-white p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">{item.title}</p>
                      {item.lessonId && (
                        <p className="text-xs text-gray-500">Course lesson</p>
                      )}
                      {item.externalUrl && (
                        <a
                          href={item.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          {item.externalUrl}
                        </a>
                      )}
                      <label className="mt-2 block text-xs text-gray-600">
                        Notes
                        <textarea
                          defaultValue={item.notes ?? ""}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v !== (item.notes ?? "")) {
                              void updateItem(item.id, { notes: v || undefined });
                            }
                          }}
                          rows={2}
                          className="mt-1 w-full rounded border border-gray-200 px-2 py-1 text-sm text-gray-800"
                        />
                      </label>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => void moveUp(item.id)}
                          className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-40"
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          disabled={index === sortedItems.length - 1}
                          onClick={() => void moveDown(item.id)}
                          className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-40"
                        >
                          Down
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => void removeItem(item.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}
