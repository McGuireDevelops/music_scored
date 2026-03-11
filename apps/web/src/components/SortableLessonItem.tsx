import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { LessonWithId } from "../hooks/useModuleLessons";

interface SortableLessonItemProps {
  lesson: LessonWithId;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

export function SortableLessonItem({
  lesson,
  isSelected,
  onSelect,
  disabled = false,
}: SortableLessonItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lesson.id,
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
      className={`flex items-center gap-2 rounded-lg transition-colors ${
        isDragging ? "opacity-50" : ""
      } ${isSelected ? "bg-gray-100 font-medium text-gray-900" : "text-gray-700 hover:bg-gray-50"}`}
    >
      {!disabled && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none p-2 text-gray-400 hover:text-gray-600 active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8h16M4 16h16"
            />
          </svg>
        </button>
      )}
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 px-2 py-3 text-left text-sm"
      >
        {lesson.title}
      </button>
    </div>
  );
}
