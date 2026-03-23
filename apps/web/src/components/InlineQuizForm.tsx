import { useState } from "react";

type QuizFormMode = "create" | "existing";

interface InlineQuizFormProps {
  classId: string;
  moduleId: string;
  userId: string;
  assignableQuizOptions: { id: string; label: string }[];
  onSave: (
    data: {
      classId: string;
      moduleId: string;
      ownerId: string;
      title: string;
    },
    ownerId: string
  ) => Promise<void>;
  onAssignExisting: (quizId: string) => Promise<void>;
  onCancel: () => void;
}

export function InlineQuizForm({
  classId,
  moduleId,
  userId,
  assignableQuizOptions,
  onSave,
  onAssignExisting,
  onCancel,
}: InlineQuizFormProps) {
  const [mode, setMode] = useState<QuizFormMode>("create");
  const [title, setTitle] = useState("");
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreateSubmit = async (e: React.FormEvent) => {
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

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuizId) return;
    setSaving(true);
    try {
      await onAssignExisting(selectedQuizId);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode("create")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "create"
              ? "bg-primary text-white"
              : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          Create new
        </button>
        <button
          type="button"
          onClick={() => setMode("existing")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "existing"
              ? "bg-primary text-white"
              : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          Add existing
        </button>
      </div>

      {mode === "create" ? (
        <form onSubmit={handleCreateSubmit} className="space-y-3">
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
      ) : (
        <form onSubmit={handleAssignSubmit} className="space-y-3">
          <div>
            <label htmlFor="inline-quiz-pick" className="mb-1 block text-sm font-medium text-gray-700">
              Quiz in this course *
            </label>
            {assignableQuizOptions.length === 0 ? (
              <p className="text-sm text-gray-600">
                No quizzes available to add. Create a{" "}
                <span className="font-medium">course-level</span> quiz from the Quizzes page for this
                class, then return here to place it in this module.
              </p>
            ) : (
              <select
                id="inline-quiz-pick"
                value={selectedQuizId}
                onChange={(e) => setSelectedQuizId(e.target.value)}
                required
                autoFocus
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select a quiz…</option>
                {assignableQuizOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving || assignableQuizOptions.length === 0 || !selectedQuizId}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Adding…" : "Add to module"}
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
            Quizzes already in this module are not listed. Adding here sets the quiz as a module quiz
            and clears a lesson-only attachment if one was set.
          </p>
        </form>
      )}
    </div>
  );
}
