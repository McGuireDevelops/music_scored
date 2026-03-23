import { useEffect, useState } from "react";
import { deleteField } from "firebase/firestore";
import type {
  ProgressAutoAnchor,
  ProgressAutoInterval,
  ProgressionMode,
} from "@learning-scores/shared";
import { normalizeProgression } from "@learning-scores/shared";
import type { LessonWithId } from "../hooks/useModuleLessons";
import { msToDatetimeLocal, datetimeLocalToMs, MODE_OPTIONS, INTERVAL_OPTIONS } from "./progressionUi";

interface LessonProgressionPanelProps {
  lesson: LessonWithId;
  lessonOrderIndex: number;
  enrollmentUserIds: string[];
  onUpdateLesson: (lessonId: string, data: Record<string, unknown>) => Promise<void>;
  listLessonManualReleasedStudents: (lessonId: string) => Promise<string[]>;
  setLessonManualStudentRelease: (
    lessonId: string,
    studentId: string,
    released: boolean
  ) => Promise<void>;
}

export function LessonProgressionPanel({
  lesson,
  lessonOrderIndex,
  enrollmentUserIds,
  onUpdateLesson,
  listLessonManualReleasedStudents,
  setLessonManualStudentRelease,
}: LessonProgressionPanelProps) {
  const normalized = normalizeProgression(lesson);
  const [scheduledLocal, setScheduledLocal] = useState(() =>
    msToDatetimeLocal(normalized.availableFrom ?? Date.now())
  );
  const [autoStartLocal, setAutoStartLocal] = useState(() =>
    msToDatetimeLocal(lesson.autoStartAt ?? Date.now())
  );
  const [manualStudentIds, setManualStudentIds] = useState<string[]>([]);
  const [loadingManual, setLoadingManual] = useState(false);

  useEffect(() => {
    setScheduledLocal(msToDatetimeLocal(normalized.availableFrom ?? Date.now()));
  }, [lesson.id, normalized.availableFrom]);

  useEffect(() => {
    setAutoStartLocal(msToDatetimeLocal(lesson.autoStartAt ?? Date.now()));
  }, [lesson.id, lesson.autoStartAt]);

  useEffect(() => {
    if (normalized.mode !== "manual") {
      setManualStudentIds([]);
      return;
    }
    setLoadingManual(true);
    void listLessonManualReleasedStudents(lesson.id)
      .then(setManualStudentIds)
      .finally(() => setLoadingManual(false));
  }, [lesson.id, normalized.mode, listLessonManualReleasedStudents]);

  const applyOpen = async () => {
    await onUpdateLesson(lesson.id, {
      progressionMode: "open",
      availableFrom: deleteField(),
      autoInterval: deleteField(),
      autoAnchor: deleteField(),
      autoStartAt: deleteField(),
      manualReleasedToClass: deleteField(),
    });
  };

  const applyScheduled = async (ms: number) => {
    await onUpdateLesson(lesson.id, {
      progressionMode: "scheduled",
      availableFrom: ms,
      autoInterval: deleteField(),
      autoAnchor: deleteField(),
      autoStartAt: deleteField(),
    });
  };

  const applyAutomatic = async (
    interval: ProgressAutoInterval,
    anchor: ProgressAutoAnchor,
    startMs?: number
  ) => {
    const patch: Record<string, unknown> = {
      progressionMode: "automatic",
      autoInterval: interval,
      autoAnchor: anchor,
      availableFrom: deleteField(),
      manualReleasedToClass: deleteField(),
    };
    if (anchor === "course_start" && startMs != null) {
      patch.autoStartAt = startMs;
    } else {
      patch.autoStartAt = deleteField();
    }
    await onUpdateLesson(lesson.id, patch);
  };

  const applyManual = async (toClass: boolean) => {
    await onUpdateLesson(lesson.id, {
      progressionMode: "manual",
      manualReleasedToClass: toClass,
      availableFrom: deleteField(),
      autoInterval: deleteField(),
      autoAnchor: deleteField(),
      autoStartAt: deleteField(),
    });
  };

  return (
    <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
      <h5 className="mb-2 text-xs font-semibold text-blue-900">
        Lesson progression (order #{lessonOrderIndex + 1} in module for drip)
      </h5>
      <div className="space-y-2">
        <select
          className="w-full max-w-md rounded border border-gray-300 bg-white px-2 py-1.5 text-xs"
          value={normalized.mode}
          onChange={(e) => {
            const mode = e.target.value as ProgressionMode;
            if (mode === "open") void applyOpen();
            else if (mode === "scheduled")
              void applyScheduled(datetimeLocalToMs(scheduledLocal));
            else if (mode === "automatic") {
              void applyAutomatic(
                (lesson.autoInterval ?? "weekly") as ProgressAutoInterval,
                (lesson.autoAnchor ?? "enrollment") as ProgressAutoAnchor,
                datetimeLocalToMs(autoStartLocal)
              );
            } else if (mode === "manual") void applyManual(lesson.manualReleasedToClass ?? false);
          }}
        >
          {MODE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {normalized.mode === "scheduled" && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="datetime-local"
              className="rounded border border-gray-300 px-2 py-1 text-xs"
              value={scheduledLocal}
              onChange={(e) => setScheduledLocal(e.target.value)}
            />
            <button
              type="button"
              className="rounded bg-primary px-2 py-1 text-xs text-white"
              onClick={() => void applyScheduled(datetimeLocalToMs(scheduledLocal))}
            >
              Save
            </button>
          </div>
        )}

        {normalized.mode === "automatic" && (
          <div className="flex flex-wrap gap-2">
            <select
              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs"
              value={lesson.autoInterval ?? "weekly"}
              onChange={(e) =>
                void applyAutomatic(
                  e.target.value as ProgressAutoInterval,
                  (lesson.autoAnchor ?? "enrollment") as ProgressAutoAnchor,
                  (lesson.autoAnchor ?? "enrollment") === "course_start"
                    ? datetimeLocalToMs(autoStartLocal)
                    : undefined
                )
              }
            >
              {INTERVAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs"
              value={lesson.autoAnchor ?? "enrollment"}
              onChange={(e) => {
                const anchor = e.target.value as ProgressAutoAnchor;
                void applyAutomatic(
                  (lesson.autoInterval ?? "weekly") as ProgressAutoInterval,
                  anchor,
                  anchor === "course_start" ? datetimeLocalToMs(autoStartLocal) : undefined
                );
              }}
            >
              <option value="enrollment">From enrollment</option>
              <option value="course_start">Course start</option>
            </select>
            {(lesson.autoAnchor ?? "enrollment") === "course_start" && (
              <>
                <input
                  type="datetime-local"
                  className="rounded border border-gray-300 px-2 py-1 text-xs"
                  value={autoStartLocal}
                  onChange={(e) => setAutoStartLocal(e.target.value)}
                />
                <button
                  type="button"
                  className="rounded bg-primary px-2 py-1 text-xs text-white"
                  onClick={() =>
                    void applyAutomatic(
                      (lesson.autoInterval ?? "weekly") as ProgressAutoInterval,
                      "course_start",
                      datetimeLocalToMs(autoStartLocal)
                    )
                  }
                >
                  Save start
                </button>
              </>
            )}
          </div>
        )}

        {normalized.mode === "manual" && (
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={lesson.manualReleasedToClass === true}
                onChange={(e) => void applyManual(e.target.checked)}
              />
              Released to entire class
            </label>
            {loadingManual ? (
              <p className="text-xs text-gray-400">Loading…</p>
            ) : enrollmentUserIds.length === 0 ? (
              <p className="text-xs text-gray-400">No enrollments.</p>
            ) : (
              <ul className="max-h-28 space-y-0.5 overflow-y-auto text-xs">
                {enrollmentUserIds.map((uid) => (
                  <li key={uid} className="flex items-center gap-2">
                    <input
                      id={`l-${lesson.id}-st-${uid}`}
                      type="checkbox"
                      checked={manualStudentIds.includes(uid)}
                      onChange={(e) => {
                        const on = e.target.checked;
                        void setLessonManualStudentRelease(lesson.id, uid, on).then(() => {
                          setManualStudentIds((prev) =>
                            on ? [...prev, uid] : prev.filter((x) => x !== uid)
                          );
                        });
                      }}
                    />
                    <label htmlFor={`l-${lesson.id}-st-${uid}`} className="font-mono">
                      {uid.slice(0, 8)}…
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
