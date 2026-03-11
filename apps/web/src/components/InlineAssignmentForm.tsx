import { useState } from "react";
import type { LessonWithId } from "../hooks/useModuleLessons";

interface InlineAssignmentFormProps {
  classId: string;
  moduleId: string;
  userId: string;
  lessons: LessonWithId[];
  onSave: (data: {
    classId: string;
    moduleId: string;
    ownerId: string;
    title: string;
    brief: string;
    lessonId?: string;
  }, ownerId: string) => Promise<void>;
  onCancel: () => void;
}

export function InlineAssignmentForm({
  classId,
  moduleId,
  userId,
  lessons,
  onSave,
  onCancel,
}: InlineAssignmentFormProps) {
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave(
        {
          classId,
          moduleId,
          ownerId: userId,
          title: title.trim(),
          brief: brief.trim() || "No brief provided.",
          lessonId: lessonId || undefined,
        },
        userId
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div>
        <label htmlFor="inline-assign-title" className="mb-1 block text-sm font-medium text-gray-700">
          Assignment title *
        </label>
        <input
          id="inline-assign-title"
          type="text"
          placeholder="e.g. Film Score Analysis"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <div>
        <label htmlFor="inline-assign-brief" className="mb-1 block text-sm font-medium text-gray-700">
          Brief
        </label>
        <textarea
          id="inline-assign-brief"
          placeholder="Assignment instructions..."
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      {lessons.length > 0 && (
        <div>
          <label htmlFor="inline-assign-lesson" className="mb-1 block text-sm font-medium text-gray-700">
            Based on lesson (optional)
          </label>
          <select
            id="inline-assign-lesson"
            value={lessonId}
            onChange={(e) => setLessonId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">None (module-level)</option>
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>{l.title}</option>
            ))}
          </select>
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Creating..." : "Create assignment"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
