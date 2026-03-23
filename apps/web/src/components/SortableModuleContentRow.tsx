import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Link } from "react-router-dom";

export type ModuleContentKind = "lesson" | "assignment" | "quiz";

const KIND_LABEL: Record<ModuleContentKind, string> = {
  lesson: "Lesson",
  assignment: "Assignment",
  quiz: "Quiz",
};

const KIND_STYLES: Record<
  ModuleContentKind,
  { pill: string; index: string }
> = {
  lesson: {
    pill: "text-blue-600 bg-blue-50",
    index: "bg-blue-100/80 text-blue-800",
  },
  assignment: {
    pill: "text-amber-700 bg-amber-50",
    index: "bg-amber-100/80 text-amber-900",
  },
  quiz: {
    pill: "text-purple-700 bg-purple-50",
    index: "bg-purple-100/80 text-purple-900",
  },
};

interface SortableModuleContentRowProps {
  sortableId: string;
  contentKind: ModuleContentKind;
  orderLabel: number;
  titleContent: React.ReactNode;
  presentHref?: string;
  presentLabel?: string;
  onDelete?: () => void;
  deleteAriaLabel?: string;
  disabled?: boolean;
}

export function SortableModuleContentRow({
  sortableId,
  contentKind,
  orderLabel,
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

  const kind = KIND_STYLES[contentKind];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl border border-gray-200/80 bg-white px-4 py-3 shadow-card transition-[box-shadow,opacity,transform] duration-200 ease-out ${
        isDragging
          ? "z-10 opacity-95 shadow-cardHover ring-1 ring-black/[0.04]"
          : "hover:shadow-cardHover"
      }`}
    >
      <div className="grid grid-cols-[5.75rem_2.25rem_minmax(0,1fr)_auto] items-center gap-x-3">
        <span
          className={`inline-flex w-full items-center justify-center rounded-md px-1.5 py-0.5 text-center text-[10px] font-medium uppercase tracking-wider ${kind.pill}`}
        >
          {KIND_LABEL[contentKind]}
        </span>
        <span
          className={`flex h-7 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold tabular-nums ${kind.index}`}
          title="Order in this module"
        >
          {orderLabel}
        </span>
        <div className="flex min-w-0 items-center gap-0.5">
          {!disabled && (
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="cursor-grab touch-none shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 active:cursor-grabbing"
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
          <div className="min-w-0 flex-1 text-gray-800">{titleContent}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2 justify-self-end">
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-full p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
              aria-label={deleteAriaLabel}
            >
              <span className="text-lg leading-none">&times;</span>
            </button>
          )}
          {presentHref && (
            <Link
              to={presentHref}
              className="shrink-0 rounded-full border border-gray-200/90 bg-white px-3 py-1.5 text-xs font-medium text-primary no-underline shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              {presentLabel}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
