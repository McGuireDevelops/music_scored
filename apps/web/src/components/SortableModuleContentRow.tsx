import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Link } from "react-router-dom";

interface SortableModuleContentRowProps {
  sortableId: string;
  titleContent: React.ReactNode;
  presentHref?: string;
  presentLabel?: string;
  onDelete?: () => void;
  deleteAriaLabel?: string;
  disabled?: boolean;
}

export function SortableModuleContentRow({
  sortableId,
  titleContent,
  presentHref,
  presentLabel = "Present",
  onDelete,
  deleteAriaLabel = "Delete",
  disabled = false,
}: SortableModuleContentRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sortableId,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1 rounded-lg transition-colors ${
        isDragging ? "opacity-50" : "text-gray-700 hover:bg-gray-50"
      }`}
    >
      {!disabled && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none p-2 text-gray-400 hover:text-gray-600 active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8h16M4 16h16"
            />
          </svg>
        </button>
      )}
      <div className="min-w-0 flex-1">{titleContent}</div>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 rounded p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
          aria-label={deleteAriaLabel}
        >
          &times;
        </button>
      )}
      {presentHref && (
        <Link
          to={presentHref}
          className="shrink-0 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-primary no-underline hover:bg-gray-50"
        >
          {presentLabel}
        </Link>
      )}
    </div>
  );
}
