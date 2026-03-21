import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { useClassLessons } from "../hooks/useClassLessons";
import { useClassModules } from "../hooks/useClassModules";
import { useTeacherSettings } from "../hooks/useTeacherSettings";
import { VideoPlayer, ScoreViewer } from "../components/media";
import type { LessonWithId } from "../hooks/useModuleLessons";
import type {
  MediaReference,
  PresentationLayoutMode,
  PresentationPreset,
  PresentationPresetSlot,
} from "@learning-scores/shared";

const MAX_PRESETS = 12;

function emptySlots(): PresentationPresetSlot[] {
  return [{ mediaIndex: -1 }, { mediaIndex: -1 }];
}

function normalizeSlots(raw: PresentationPresetSlot[] | undefined): PresentationPresetSlot[] {
  const s = raw?.length ? raw.map((x) => ({ ...x })) : emptySlots();
  while (s.length < 2) s.push({ mediaIndex: -1 });
  return s.slice(0, 2);
}

function firstMediaIndex(refs: MediaReference[] | undefined, type: MediaReference["type"]): number {
  if (!refs?.length) return -1;
  const i = refs.findIndex((r) => r.type === type);
  return i >= 0 ? i : -1;
}

function twoScoreIndices(refs: MediaReference[] | undefined): [number, number] {
  if (!refs?.length) return [-1, -1];
  const idx: number[] = [];
  refs.forEach((r, i) => {
    if (r.type === "score") idx.push(i);
  });
  return [idx[0] ?? -1, idx[1] ?? -1];
}

function clampSlotToLesson(
  slot: PresentationPresetSlot,
  refs: MediaReference[] | undefined
): PresentationPresetSlot {
  const n = refs?.length ?? 0;
  if (slot.mediaIndex < 0 || slot.mediaIndex >= n) {
    return { mediaIndex: -1 };
  }
  return { mediaIndex: slot.mediaIndex, pdfPage: slot.pdfPage };
}

function SlotMedia({
  mediaRef,
  slot,
  layout,
  slotIndex,
}: {
  mediaRef: MediaReference;
  slot: PresentationPresetSlot;
  layout: PresentationLayoutMode;
  slotIndex: 0 | 1;
}) {
  if (layout === "dual_score") {
    if (mediaRef.type === "score") {
      return <ScoreViewer mediaRef={mediaRef} fill pdfPage={slot.pdfPage} />;
    }
    return (
      <p className="p-4 text-sm text-amber-800">
        Use score-type media for both panes, or pick another file.
      </p>
    );
  }

  if (slotIndex === 0) {
    if (mediaRef.type === "video") {
      return <VideoPlayer mediaRef={mediaRef} fill />;
    }
    return (
      <p className="p-4 text-sm text-amber-800">
        This pane is for video. Choose a video from this lesson&rsquo;s media.
      </p>
    );
  }

  if (mediaRef.type === "score") {
    return <ScoreViewer mediaRef={mediaRef} fill pdfPage={slot.pdfPage} />;
  }
  return (
    <p className="p-4 text-sm text-amber-800">
      This pane is for a score. Choose score-type media (e.g. PDF).
    </p>
  );
}

export default function PresentationPage() {
  const { classId } = useParams<{ classId: string }>();
  const [searchParams] = useSearchParams();
  const initialLessonId = searchParams.get("lessonId");
  const { user } = useAuth();
  const { lessons, loading: lessonsLoading } = useClassLessons(classId);
  const { modules, loading: modulesLoading } = useClassModules(classId);
  const { settings, loading: settingsLoading, updateSettings } = useTeacherSettings(user?.uid);

  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [layout, setLayout] = useState<PresentationLayoutMode>("video_score_lr");
  const [slots, setSlots] = useState<PresentationPresetSlot[]>(emptySlots);
  const [chromeOpen, setChromeOpen] = useState(true);
  const [pickerSlot, setPickerSlot] = useState<0 | 1 | null>(null);
  const [presetNameDraft, setPresetNameDraft] = useState("");
  const [savingPreset, setSavingPreset] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!initialLessonId || !lessons.length) return;
    const exists = lessons.some((l) => l.id === initialLessonId);
    if (exists) setSelectedLessonId(initialLessonId);
  }, [initialLessonId, lessons]);

  const moduleNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const mod of modules) {
      m.set(mod.id, mod.name);
    }
    return m;
  }, [modules]);

  const groupedLessonOptions = useMemo(() => {
    const byModule = new Map<string, LessonWithId[]>();
    for (const l of lessons) {
      const mid = l.moduleId || "_";
      if (!byModule.has(mid)) byModule.set(mid, []);
      byModule.get(mid)!.push(l);
    }
    for (const arr of byModule.values()) {
      arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    const orderedModuleIds = modules.map((mo) => mo.id);
    const rows: { moduleLabel: string; lessons: LessonWithId[] }[] = [];
    for (const mid of orderedModuleIds) {
      const list = byModule.get(mid);
      if (list?.length) {
        rows.push({
          moduleLabel: moduleNameById.get(mid) ?? "Module",
          lessons: list,
        });
      }
    }
    const orphan = byModule.get("_");
    if (orphan?.length) {
      rows.push({ moduleLabel: "Other", lessons: orphan });
    }
    const seen = new Set(orderedModuleIds);
    for (const mid of byModule.keys()) {
      if (mid === "_" || seen.has(mid)) continue;
      const list = byModule.get(mid);
      if (list?.length) {
        rows.push({
          moduleLabel: moduleNameById.get(mid) ?? "Module",
          lessons: list,
        });
      }
    }
    return rows;
  }, [lessons, modules, moduleNameById]);

  const selectedLesson = useMemo(
    () => lessons.find((l) => l.id === selectedLessonId) ?? null,
    [lessons, selectedLessonId]
  );

  const refs = selectedLesson?.mediaRefs;

  const applyVideoScore = useCallback(
    (tb: boolean) => {
      setLayout(tb ? "video_score_tb" : "video_score_lr");
      const vi = firstMediaIndex(refs, "video");
      const si = firstMediaIndex(refs, "score");
      setSlots([{ mediaIndex: vi }, { mediaIndex: si }]);
    },
    [refs]
  );

  const applyDualScore = useCallback(() => {
    setLayout("dual_score");
    const [a, b] = twoScoreIndices(refs);
    setSlots([{ mediaIndex: a }, { mediaIndex: b }]);
  }, [refs]);

  const applyPreset = useCallback(
    (p: PresentationPreset) => {
      setLayout(p.layout);
      const next = normalizeSlots(p.slots).map((s) => clampSlotToLesson(s, refs));
      setSlots(next);
    },
    [refs]
  );

  const savePreset = useCallback(async () => {
    const name = presetNameDraft.trim();
    if (!name || !user?.uid) return;
    setSavingPreset(true);
    try {
      const preset: PresentationPreset = {
        id: crypto.randomUUID(),
        name,
        layout,
        slots: normalizeSlots(slots),
      };
      const existing = settings?.presentationPresets ?? [];
      const merged = [...existing, preset].slice(-MAX_PRESETS);
      await updateSettings({ presentationPresets: merged });
      setPresetNameDraft("");
    } finally {
      setSavingPreset(false);
    }
  }, [presetNameDraft, user?.uid, layout, slots, settings?.presentationPresets, updateSettings]);

  const deletePreset = useCallback(
    async (id: string) => {
      const existing = settings?.presentationPresets ?? [];
      await updateSettings({ presentationPresets: existing.filter((p) => p.id !== id) });
    },
    [settings?.presentationPresets, updateSettings]
  );

  const toggleFullscreen = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      void el.requestFullscreen();
    } else {
      void document.exitFullscreen();
    }
  }, []);

  const setSlotMedia = (slotIndex: 0 | 1, mediaIndex: number) => {
    setSlots((prev) => {
      const next = normalizeSlots(prev);
      next[slotIndex] = { mediaIndex, pdfPage: next[slotIndex]?.pdfPage };
      return next;
    });
    setPickerSlot(null);
  };

  const setSlotPdfPage = (slotIndex: 0 | 1, page: number | undefined) => {
    setSlots((prev) => {
      const next = normalizeSlots(prev);
      next[slotIndex] = { ...next[slotIndex], pdfPage: page };
      return next;
    });
  };

  const pickerFilter = (slotIndex: 0 | 1): MediaReference["type"] | "score" | "video" => {
    if (layout === "dual_score") return "score";
    return slotIndex === 0 ? "video" : "score";
  };

  const gridClass =
    layout === "video_score_tb"
      ? "grid grid-cols-1 grid-rows-2"
      : "grid grid-cols-1 grid-rows-2 lg:grid-cols-2 lg:grid-rows-1";

  const loading = lessonsLoading || modulesLoading || settingsLoading;

  return (
    <ProtectedRoute requiredRole="teacher">
      <div className="relative flex min-h-[calc(100vh-3.5rem)] flex-col bg-gray-100">
        {chromeOpen && (
          <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div className="mx-auto flex max-w-7xl flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    to={classId ? `/teacher/class/${classId}?tab=live` : "/"}
                    className="text-sm font-medium text-primary no-underline hover:underline"
                  >
                    &larr; Back to class
                  </Link>
                  <h1 className="text-base font-semibold text-gray-900">Presenter</h1>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setChromeOpen(false)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Hide controls
                  </button>
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-dark"
                  >
                    Fullscreen stage
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-500 lg:hidden">
                For screen sharing, use a wide window or fullscreen so video and score sit side by side.
              </p>

              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label htmlFor="present-lesson" className="mb-1 block text-xs font-medium text-gray-600">
                    Lesson
                  </label>
                  <select
                    id="present-lesson"
                    value={selectedLessonId ?? ""}
                    onChange={(e) => setSelectedLessonId(e.target.value || null)}
                    disabled={loading || !lessons.length}
                    className="min-w-[200px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                  >
                    <option value="">Select a lesson&hellip;</option>
                    {groupedLessonOptions.map((g) => (
                      <optgroup key={g.moduleLabel} label={g.moduleLabel}>
                        {g.lessons.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.title}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyVideoScore(false)}
                    disabled={!selectedLesson}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Video + score (side by side)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyVideoScore(true)}
                    disabled={!selectedLesson}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Video + score (stacked)
                  </button>
                  <button
                    type="button"
                    onClick={applyDualScore}
                    disabled={!selectedLesson}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Two scores
                  </button>
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs font-medium text-gray-600">Saved presets</p>
                <div className="flex flex-wrap items-center gap-2">
                  {(settings?.presentationPresets ?? []).map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 pl-3 text-sm"
                    >
                      <button
                        type="button"
                        onClick={() => applyPreset(p)}
                        disabled={!selectedLesson}
                        className="py-1 font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {p.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => void deletePreset(p.id)}
                        className="rounded-r-full px-2 py-1 text-gray-500 hover:bg-gray-200 hover:text-red-600"
                        aria-label={`Delete preset ${p.name}`}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  {(!settings?.presentationPresets || settings.presentationPresets.length === 0) && (
                    <span className="text-xs text-gray-500">None yet — set a layout and save below.</span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 pt-3">
                <div>
                  <label htmlFor="preset-name" className="mb-1 block text-xs font-medium text-gray-600">
                    New preset name
                  </label>
                  <input
                    id="preset-name"
                    type="text"
                    value={presetNameDraft}
                    onChange={(e) => setPresetNameDraft(e.target.value)}
                    placeholder="e.g. Analysis + full score"
                    className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="button"
                  disabled={savingPreset || !presetNameDraft.trim()}
                  onClick={() => void savePreset()}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingPreset ? "Saving\u2026" : "Save preset"}
                </button>
                <span className="text-xs text-gray-500">
                  Up to {MAX_PRESETS} presets; saving adds one and drops the oldest if needed.
                </span>
              </div>
            </div>
          </div>
        )}

        {!chromeOpen && (
          <button
            type="button"
            onClick={() => setChromeOpen(true)}
            className="absolute left-2 top-2 z-10 rounded-lg border border-gray-300 bg-white/90 px-3 py-1.5 text-sm shadow-sm hover:bg-white"
          >
            Show controls
          </button>
        )}

        <div
          ref={stageRef}
          className="flex min-h-0 min-w-0 flex-1 flex-col bg-gray-900/5 p-2 lg:p-3"
        >
          {!selectedLesson && (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">
              {loading ? "Loading lessons\u2026" : "Choose a lesson to start presenting."}
            </div>
          )}

          {selectedLesson && (
            <div className={`min-h-0 min-w-0 flex-1 gap-2 ${gridClass}`}>
              {([0, 1] as const).map((slotIndex) => {
                const slot = normalizeSlots(slots)[slotIndex];
                const mediaIndex = slot.mediaIndex;
                const mediaRef =
                  mediaIndex >= 0 && refs && mediaIndex < refs.length ? refs[mediaIndex] : null;
                const isPdfScore =
                  mediaRef?.type === "score" &&
                  mediaRef.resourceId.toLowerCase().endsWith(".pdf");

                return (
                  <div
                    key={slotIndex}
                    className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                  >
                    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2">
                      <span className="text-xs font-medium text-gray-600">
                        {layout === "dual_score"
                          ? `Score ${slotIndex + 1}`
                          : slotIndex === 0
                            ? "Video"
                            : "Score"}
                        {mediaRef?.label ? ` — ${mediaRef.label}` : ""}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {isPdfScore && (
                          <label className="flex items-center gap-1 text-xs text-gray-600">
                            PDF page
                            <input
                              type="number"
                              min={1}
                              placeholder="1"
                              value={slot.pdfPage ?? ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                setSlotPdfPage(
                                  slotIndex,
                                  v === "" ? undefined : Math.max(1, parseInt(v, 10) || 1)
                                );
                              }}
                              className="w-14 rounded border border-gray-300 px-1 py-0.5 text-gray-900"
                            />
                          </label>
                        )}
                        <button
                          type="button"
                          onClick={() => setPickerSlot(slotIndex)}
                          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                        >
                          Choose media
                        </button>
                      </div>
                    </div>
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-2">
                      {!mediaRef && (
                        <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
                          Empty — choose media for this pane.
                        </div>
                      )}
                      {mediaRef && (
                        <SlotMedia
                          mediaRef={mediaRef}
                          slot={slot}
                          layout={layout}
                          slotIndex={slotIndex}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {pickerSlot != null && selectedLesson && refs && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Choose media"
          >
            <div className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-gray-900">Choose media</h2>
                <button
                  type="button"
                  onClick={() => setPickerSlot(null)}
                  className="text-gray-500 hover:text-gray-800"
                >
                  Close
                </button>
              </div>
              <ul className="max-h-[60vh] overflow-y-auto p-2">
                {refs.map((r, i) => {
                  const want = pickerFilter(pickerSlot);
                  if (r.type !== want) return null;
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => setSlotMedia(pickerSlot, i)}
                        className="mb-1 w-full rounded-lg border border-gray-100 px-3 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        <span className="font-medium text-gray-900">{r.label || r.resourceId.split("/").pop()}</span>
                        <span className="ml-2 text-xs text-gray-500">{r.type}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {!refs.some((r) => r.type === pickerFilter(pickerSlot)) && (
                <p className="p-4 text-sm text-gray-600">
                  No matching media in this lesson. Add a {pickerFilter(pickerSlot)} file in the lesson editor.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
