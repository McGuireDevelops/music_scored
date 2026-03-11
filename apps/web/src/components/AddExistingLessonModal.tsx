import { useState } from "react";
import type { TeacherLessonEnriched } from "../hooks/useTeacherLessons";
import type { LessonWithId } from "../hooks/useModuleLessons";

interface AddExistingLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherLessons: TeacherLessonEnriched[];
  currentModuleLessonIds: string[];
  onAttach: (sourceLessonId: string, sourceClassId: string) => Promise<void>;
  onClone: (lesson: LessonWithId) => Promise<void>;
}

export function AddExistingLessonModal({
  isOpen,
  onClose,
  teacherLessons,
  currentModuleLessonIds,
  onAttach,
  onClone,
}: AddExistingLessonModalProps) {
  const [selected, setSelected] = useState<TeacherLessonEnriched | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [cloning, setCloning] = useState(false);

  const availableLessons = teacherLessons.filter(
    (l) => !currentModuleLessonIds.includes(l.id)
  );

  const handleAttach = async () => {
    if (!selected?.id || !selected?.classId) return;
    setAttaching(true);
    try {
      await onAttach(selected.id, selected.classId);
      onClose();
    } finally {
      setAttaching(false);
    }
  };

  const handleClone = async () => {
    if (!selected) return;
    setCloning(true);
    try {
      await onClone(selected as LessonWithId);
      onClose();
    } finally {
      setCloning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-card border border-gray-200 bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Add existing lesson
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        <p className="mb-4 text-sm text-gray-600">
          Select a lesson to attach (updates propagate) or clone (independent
          copy).
        </p>

        <div className="mb-4 max-h-64 space-y-2 overflow-y-auto">
          {availableLessons.length === 0 ? (
            <p className="text-gray-500">No other lessons to add.</p>
          ) : (
            availableLessons.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setSelected(l)}
                className={`block w-full rounded-lg px-4 py-3 text-left text-sm transition-colors ${
                  selected?.id === l.id
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="font-medium">{l.title}</span>
                {l.className && (
                  <span className="ml-2 text-xs text-gray-500">
                    ({l.className})
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        {selected && (
          <div className="flex gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={handleAttach}
              disabled={attaching}
              className="rounded-xl border border-primary bg-white px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 disabled:opacity-60"
            >
              {attaching ? "Attaching…" : "Attach (linked)"}
            </button>
            <button
              type="button"
              onClick={handleClone}
              disabled={cloning}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
            >
              {cloning ? "Cloning…" : "Clone (copy)"}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-4 text-sm text-gray-600 hover:text-gray-900"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
