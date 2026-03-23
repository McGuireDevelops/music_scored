import { useEffect, useState } from "react";
import { deleteField } from "firebase/firestore";
import type {
  ProgressAutoAnchor,
  ProgressAutoInterval,
  ProgressionMode,
} from "@learning-scores/shared";
import { normalizeProgression } from "@learning-scores/shared";
import type { ModuleWithId } from "../hooks/useClassModules";
import {
  datetimeLocalToMs,
  msToDatetimeLocal,
  MODE_OPTIONS,
  INTERVAL_OPTIONS,
} from "./progressionUi";

interface ModuleProgressionPanelProps {
  module: ModuleWithId;
  enrollmentUserIds: string[];
  onUpdateModule: (
    moduleId: string,
    data: Record<string, unknown>
  ) => Promise<void>;
  listModuleManualReleasedStudents: (moduleId: string) => Promise<string[]>;
  setModuleManualStudentRelease: (
    moduleId: string,
    studentId: string,
    released: boolean
  ) => Promise<void>;
}

export function ModuleProgressionPanel({
  module: mod,
  enrollmentUserIds,
  onUpdateModule,
  listModuleManualReleasedStudents,
  setModuleManualStudentRelease,
}: ModuleProgressionPanelProps) {
  const normalized = normalizeProgression(mod);
  const [scheduledLocal, setScheduledLocal] = useState(() =>
    msToDatetimeLocal(normalized.availableFrom ?? mod.releasedAt ?? Date.now())
  );
  const [autoStartLocal, setAutoStartLocal] = useState(() =>
    msToDatetimeLocal(mod.autoStartAt ?? Date.now())
  );
  const [manualStudentIds, setManualStudentIds] = useState<string[]>([]);
  const [loadingManual, setLoadingManual] = useState(false);

  useEffect(() => {
    setScheduledLocal(
      msToDatetimeLocal(normalized.availableFrom ?? mod.releasedAt ?? Date.now())
    );
  }, [mod.releasedAt, normalized.availableFrom]);

  useEffect(() => {
    setAutoStartLocal(msToDatetimeLocal(mod.autoStartAt ?? Date.now()));
  }, [mod.autoStartAt]);

  useEffect(() => {
    if (normalized.mode !== "manual") {
      setManualStudentIds([]);
      return;
    }
    setLoadingManual(true);
    void listModuleManualReleasedStudents(mod.id)
      .then(setManualStudentIds)
      .finally(() => setLoadingManual(false));
  }, [mod.id, normalized.mode, listModuleManualReleasedStudents]);

  const applyOpen = async () => {
    await onUpdateModule(mod.id, {
      progressionMode: "open",
      availableFrom: deleteField(),
      releasedAt: deleteField(),
      releaseMode: deleteField(),
      autoInterval: deleteField(),
      autoAnchor: deleteField(),
      autoStartAt: deleteField(),
      manualReleasedToClass: deleteField(),
    });
  };

  const applyScheduled = async (ms: number) => {
    await onUpdateModule(mod.id, {
      progressionMode: "scheduled",
      availableFrom: ms,
      releasedAt: deleteField(),
      releaseMode: deleteField(),
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
      releasedAt: deleteField(),
      releaseMode: deleteField(),
      manualReleasedToClass: deleteField(),
    };
    if (anchor === "course_start" && startMs != null) {
      patch.autoStartAt = startMs;
    } else {
      patch.autoStartAt = deleteField();
    }
    await onUpdateModule(mod.id, patch);
  };

  const applyManual = async (toClass: boolean) => {
    await onUpdateModule(mod.id, {
      progressionMode: "manual",
      manualReleasedToClass: toClass,
      availableFrom: deleteField(),
      releasedAt: deleteField(),
      releaseMode: deleteField(),
      autoInterval: deleteField(),
      autoAnchor: deleteField(),
      autoStartAt: deleteField(),
    });
  };

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50/80 p-4">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Module progression
      </h4>
      <div className="space-y-3">
        <div>
          <label htmlFor={`mod-prog-mode-${mod.id}`} className="mb-1 block text-xs font-medium text-gray-600">
            Mode
          </label>
          <select
            id={`mod-prog-mode-${mod.id}`}
            className="w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            value={normalized.mode}
            onChange={(e) => {
              const mode = e.target.value as ProgressionMode;
              if (mode === "open") void applyOpen();
              else if (mode === "scheduled")
                void applyScheduled(datetimeLocalToMs(scheduledLocal));
              else if (mode === "automatic") {
                void applyAutomatic(
                  (mod.autoInterval ?? "weekly") as ProgressAutoInterval,
                  (mod.autoAnchor ?? "enrollment") as ProgressAutoAnchor,
                  datetimeLocalToMs(autoStartLocal)
                );
              } else if (mode === "manual") void applyManual(mod.manualReleasedToClass ?? false);
            }}
          >
            {MODE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {normalized.mode === "scheduled" && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Available from (local time)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="datetime-local"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={scheduledLocal}
                onChange={(e) => setScheduledLocal(e.target.value)}
              />
              <button
                type="button"
                className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-primary-dark"
                onClick={() => void applyScheduled(datetimeLocalToMs(scheduledLocal))}
              >
                Save schedule
              </button>
            </div>
          </div>
        )}

        {normalized.mode === "automatic" && (
          <div className="space-y-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Interval</label>
              <select
                className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                value={mod.autoInterval ?? "weekly"}
                onChange={(e) =>
                  void applyAutomatic(
                    e.target.value as ProgressAutoInterval,
                    (mod.autoAnchor ?? "enrollment") as ProgressAutoAnchor,
                    datetimeLocalToMs(autoStartLocal)
                  )
                }
              >
                {INTERVAL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Start from</label>
              <select
                className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                value={mod.autoAnchor ?? "enrollment"}
                onChange={(e) => {
                  const anchor = e.target.value as ProgressAutoAnchor;
                  void applyAutomatic(
                    (mod.autoInterval ?? "weekly") as ProgressAutoInterval,
                    anchor,
                    anchor === "course_start" ? datetimeLocalToMs(autoStartLocal) : undefined
                  );
                }}
              >
                <option value="enrollment">Each student&apos;s enrollment date</option>
                <option value="course_start">Fixed course start (same for everyone)</option>
              </select>
            </div>
            {(mod.autoAnchor ?? "enrollment") === "course_start" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Course start (local time)
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="datetime-local"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    value={autoStartLocal}
                    onChange={(e) => setAutoStartLocal(e.target.value)}
                  />
                  <button
                    type="button"
                    className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-primary-dark"
                    onClick={() =>
                      void applyAutomatic(
                        (mod.autoInterval ?? "weekly") as ProgressAutoInterval,
                        "course_start",
                        datetimeLocalToMs(autoStartLocal)
                      )
                    }
                  >
                    Save start
                  </button>
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500">
              Module order in this course is the drip index (first module = 0, then 1, …).
            </p>
          </div>
        )}

        {normalized.mode === "manual" && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={mod.manualReleasedToClass === true}
                onChange={(e) => void applyManual(e.target.checked)}
              />
              Released to entire class
            </label>
            <p className="text-xs text-gray-500">
              Or release individually (students must be enrolled in this course):
            </p>
            {loadingManual ? (
              <p className="text-xs text-gray-400">Loading…</p>
            ) : enrollmentUserIds.length === 0 ? (
              <p className="text-xs text-gray-400">No enrollments yet.</p>
            ) : (
              <ul className="max-h-36 space-y-1 overflow-y-auto rounded border border-gray-200 bg-white p-2 text-sm">
                {enrollmentUserIds.map((uid) => (
                  <li key={uid} className="flex items-center gap-2">
                    <input
                      id={`m-${mod.id}-st-${uid}`}
                      type="checkbox"
                      checked={manualStudentIds.includes(uid)}
                      onChange={(e) => {
                        const on = e.target.checked;
                        void setModuleManualStudentRelease(mod.id, uid, on).then(() => {
                          setManualStudentIds((prev) =>
                            on ? [...prev, uid] : prev.filter((x) => x !== uid)
                          );
                        });
                      }}
                    />
                    <label htmlFor={`m-${mod.id}-st-${uid}`} className="font-mono text-xs text-gray-700">
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
