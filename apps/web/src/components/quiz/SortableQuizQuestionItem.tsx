import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { QuizQuestionWithId } from "../../hooks/useQuizzes";

type Props = {
  question: QuizQuestionWithId;
  index: number;
  disabled?: boolean;
  typeLabel: string;
  summary: string;
  onEdit: () => void;
  onDelete: () => void;
};

export function SortableQuizQuestionItem({
  question: q,
  index,
  disabled = false,
  typeLabel,
  summary,
  onEdit,
  onDelete,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: q.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 ${
        isDragging ? "opacity-60 shadow-md" : ""
      }`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2">
        {!disabled && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="mt-0.5 shrink-0 cursor-grab touch-none rounded p-1 text-gray-400 hover:text-gray-600 active:cursor-grabbing"
            aria-label="Drag to reorder question"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8h16M4 16h16"
              />
            </svg>
          </button>
        )}
        <div className="min-w-0">
          <span className="font-medium text-gray-900">
            {index + 1}. {typeLabel}
          </span>
          <p className="mt-1 text-sm text-gray-600">{summary}</p>
          {q.mediaRef && (
            <p className="mt-0.5 text-xs text-gray-500">
              Media: {q.mediaRef.type} — {q.mediaRef.resourceId.split("/").pop()}
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="text-sm font-medium text-primary hover:underline"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="text-sm text-red-600 hover:underline"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
