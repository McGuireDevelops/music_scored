import { useState } from "react";

interface InlineQuizFormProps {
  classId: string;
  moduleId: string;
  userId: string;
  onSave: (data: {
    classId: string;
    moduleId: string;
    ownerId: string;
    title: string;
  }, ownerId: string) => Promise<void>;
  onCancel: () => void;
}

export function InlineQuizForm({
  classId,
  moduleId,
  userId,
  onSave,
  onCancel,
}: InlineQuizFormProps) {
  const [title, setTitle] = useState("");
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
        <label htmlFor="inline-quiz-title" className="mb-1 block text-sm font-medium text-gray-700">
          Quiz title *
        </label>
        <input
          id="inline-quiz-title"
          type="text"
          placeholder="e.g. Module 1 Review"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Creating..." : "Create quiz"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
      <p className="text-xs text-gray-500">
        After creating, add questions via the quiz editor.
      </p>
    </form>
  );
}
