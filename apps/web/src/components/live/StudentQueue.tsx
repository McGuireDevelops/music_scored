import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ReviewStudent } from "../../hooks/useReviewTimer";

interface StudentQueueProps {
  students: ReviewStudent[];
  onReorder: (reordered: ReviewStudent[]) => void;
  onSkip: (studentId: string) => void;
  onSelect?: (studentId: string) => void;
}

function StatusIndicator({ status }: { status: ReviewStudent["status"] }) {
  switch (status) {
    case "active":
      return (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
        </span>
      );
    case "completed":
      return (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      );
    case "skipped":
      return (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-300 text-white text-xs font-bold">
          &mdash;
        </span>
      );
    default:
      return (
        <span className="h-5 w-5 rounded-full border-2 border-gray-300" />
      );
  }
}

function SortableStudent({
  student,
  index,
  onSkip,
  onSelect,
}: {
  student: ReviewStudent;
  index: number;
  onSkip: (id: string) => void;
  onSelect?: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: student.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isDone = student.status === "completed" || student.status === "skipped";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
        isDragging ? "z-10 shadow-lg" : ""
      } ${
        student.status === "active"
          ? "border-primary/30 bg-primary/5 ring-1 ring-primary/20"
          : isDone
          ? "border-gray-100 bg-gray-50 opacity-60"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-gray-400 hover:text-gray-600 active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="9" cy="5" r="1.5" />
          <circle cx="15" cy="5" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="19" r="1.5" />
          <circle cx="15" cy="19" r="1.5" />
        </svg>
      </button>

      <span className="text-xs font-medium text-gray-400 w-5 text-right">
        {index + 1}
      </span>

      <StatusIndicator status={student.status} />

      <button
        type="button"
        onClick={() => onSelect?.(student.id)}
        className={`flex-1 text-left text-sm font-medium ${
          isDone ? "text-gray-400 line-through" : "text-gray-900"
        } ${onSelect && !isDone ? "hover:text-primary cursor-pointer" : ""}`}
        disabled={isDone || !onSelect}
      >
        {student.displayName}
      </button>

      {student.status === "waiting" && (
        <button
          type="button"
          onClick={() => onSkip(student.id)}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          title="Skip student"
        >
          Skip
        </button>
      )}
    </div>
  );
}

export function StudentQueue({
  students,
  onReorder,
  onSkip,
  onSelect,
}: StudentQueueProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = students.findIndex((s) => s.id === active.id);
    const newIndex = students.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(students, oldIndex, newIndex));
  };

  const waiting = students.filter((s) => s.status === "waiting").length;
  const completed = students.filter(
    (s) => s.status === "completed" || s.status === "skipped"
  ).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Student Queue
        </h3>
        <span className="text-xs text-gray-500">
          {completed}/{students.length} done &middot; {waiting} waiting
        </span>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={students.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1.5">
            {students.map((student, index) => (
              <SortableStudent
                key={student.id}
                student={student}
                index={index}
                onSkip={onSkip}
                onSelect={onSelect}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
