import { useParams, Link } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import type {
  ProgramTimelineMilestone,
  ProgramTimelineSegment,
} from "@learning-scores/shared";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { useProgramTimeline } from "../hooks/useProgramTimeline";
import { msToDatetimeLocal, datetimeLocalToMs } from "../components/progressionUi";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const PX_PER_WEEK = 28;
const GANTT_COLORS = [
  "#7c3aed",
  "#f472b6",
  "#fb923c",
  "#38bdf8",
  "#ef4444",
  "#991b1b",
  "#1e40af",
  "#22c55e",
  "#c4b5fd",
];

function segmentColor(seg: ProgramTimelineSegment, index: number): string {
  return seg.color?.trim() || GANTT_COLORS[index % GANTT_COLORS.length];
}

function buildMonthGroups(anchorMs: number, weekCount: number): { label: string; weeks: number }[] {
  const groups: { label: string; weeks: number }[] = [];
  let prevKey = "";
  for (let w = 1; w <= weekCount; w++) {
    const d = new Date(anchorMs + (w - 1) * WEEK_MS);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    const label = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
    if (key !== prevKey) {
      groups.push({ label, weeks: 1 });
      prevKey = key;
    } else {
      groups[groups.length - 1].weeks++;
    }
  }
  return groups;
}

function milestoneLeftPct(
  m: ProgramTimelineMilestone,
  anchorMs: number,
  weekCount: number
): number | null {
  if (m.weekStart != null) {
    const w = Math.max(1, Math.min(weekCount, m.weekStart));
    return ((w - 1) / weekCount) * 100;
  }
  if (m.startAt != null) {
    const floatWeek = (m.startAt - anchorMs) / WEEK_MS + 1;
    const w = Math.max(1, Math.min(weekCount, floatWeek));
    return ((w - 1) / weekCount) * 100;
  }
  return null;
}

export default function ProgramTimelinePage() {
  const { classId, curriculumId } = useParams<{ classId?: string; curriculumId?: string }>();
  const { user } = useAuth();
  const scope = classId
    ? ("class" as const)
    : curriculumId
      ? ("curriculum" as const)
      : undefined;
  const scopeId = classId ?? curriculumId ?? "";
  const { timeline, loading, error, createTimeline, saveFields } = useProgramTimeline(
    scope,
    scopeId || undefined,
    user?.uid
  );

  const [title, setTitle] = useState("");
  const [weekCount, setWeekCount] = useState(12);
  const [anchorLocal, setAnchorLocal] = useState("");
  const [segments, setSegments] = useState<ProgramTimelineSegment[]>([]);
  const [milestones, setMilestones] = useState<ProgramTimelineMilestone[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [creating, setCreating] = useState(false);

  const [segLabel, setSegLabel] = useState("");
  const [segStart, setSegStart] = useState(1);
  const [segEnd, setSegEnd] = useState(1);
  const [msLabel, setMsLabel] = useState("");
  const [msNotes, setMsNotes] = useState("");
  const [msWeekStart, setMsWeekStart] = useState<number | "">("");
  const [msStartLocal, setMsStartLocal] = useState("");

  useEffect(() => {
    if (!timeline) {
      setSegments([]);
      setMilestones([]);
      setTitle("");
      setWeekCount(scope === "curriculum" ? 35 : 12);
      setAnchorLocal(msToDatetimeLocal(Date.now()));
      return;
    }
    setTitle(timeline.title ?? "");
    setWeekCount(timeline.weekCount);
    setAnchorLocal(msToDatetimeLocal(timeline.anchorDate));
    setSegments(timeline.segments);
    setMilestones(timeline.milestones);
  }, [scopeId, scope, timeline?.updatedAt]);

  const anchorMs = useMemo(() => {
    if (anchorLocal) {
      try {
        return datetimeLocalToMs(anchorLocal);
      } catch {
        return timeline?.anchorDate ?? Date.now();
      }
    }
    return timeline?.anchorDate ?? Date.now();
  }, [anchorLocal, timeline?.anchorDate]);

  const monthGroups = useMemo(
    () => buildMonthGroups(anchorMs, Math.max(1, weekCount)),
    [anchorMs, weekCount]
  );

  const totalWidth = Math.max(1, weekCount) * PX_PER_WEEK;

  const backHref =
    scope === "class" ? `/teacher/class/${scopeId}?tab=builder` : "/teacher/curricula";

  const handleCreate = async () => {
    setCreating(true);
    setSaveError("");
    try {
      await createTimeline(title.trim() || undefined);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to create timeline");
    } finally {
      setCreating(false);
    }
  };

  const handleSaveAll = async () => {
    if (!timeline) return;
    setSaving(true);
    setSaveError("");
    try {
      let anchor = datetimeLocalToMs(anchorLocal);
      if (Number.isNaN(anchor)) anchor = timeline.anchorDate;
      await saveFields({
        title: title.trim() || null,
        weekCount: Math.max(1, Math.min(520, Math.floor(weekCount))),
        anchorDate: anchor,
        segments,
        milestones,
      });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const addSegment = () => {
    if (!segLabel.trim()) return;
    const w = Math.max(1, Math.min(weekCount, segStart));
    const w2 = Math.max(w, Math.min(weekCount, segEnd));
    setSegments((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: segLabel.trim(),
        weekStart: w,
        weekEnd: w2,
      },
    ]);
    setSegLabel("");
    setSegStart(1);
    setSegEnd(1);
  };

  const removeSegment = (id: string) => {
    setSegments((prev) => prev.filter((s) => s.id !== id));
  };

  const addMilestone = () => {
    if (!msLabel.trim()) return;
    const m: ProgramTimelineMilestone = {
      id: crypto.randomUUID(),
      label: msLabel.trim(),
      notes: msNotes.trim() || undefined,
    };
    if (msWeekStart !== "") {
      const w = Math.max(1, Math.min(weekCount, Number(msWeekStart)));
      m.weekStart = w;
    }
    if (msStartLocal) {
      try {
        m.startAt = datetimeLocalToMs(msStartLocal);
      } catch {
        /* skip invalid */
      }
    }
    setMilestones((prev) => [...prev, m]);
    setMsLabel("");
    setMsNotes("");
    setMsWeekStart("");
    setMsStartLocal("");
  };

  const removeMilestone = (id: string) => {
    setMilestones((prev) => prev.filter((x) => x.id !== id));
  };

  if (!scope || !scopeId) {
    return (
      <ProtectedRoute requiredRole="teacher">
        <div className="mx-auto max-w-6xl">
          <p className="text-gray-600">This program timeline link is invalid.</p>
          <Link to="/" className="mt-4 inline-block text-sm text-primary no-underline hover:underline">
            Back to dashboard
          </Link>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="teacher">
      <div className="mx-auto max-w-6xl">
        <Link
          to={backHref}
          className="mb-4 inline-block text-sm text-gray-600 no-underline transition-colors hover:text-gray-900"
        >
          &larr; Back
        </Link>

        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-gray-900">
          Program timeline
        </h1>
        <p className="mb-6 text-sm text-gray-600">
          Map modules across weeks and add dated milestones (e.g. recording sessions). Week 1 starts at the
          anchor date/time you set below; each program week is seven days. Month labels on the chart use UTC.
        </p>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        {saveError && <p className="mb-4 text-sm text-red-600">{saveError}</p>}

        {loading && <p className="text-gray-500">Loading&hellip;</p>}

        {!loading && !timeline && scopeId && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="mb-4 text-sm text-gray-600">
              No program timeline exists yet for this {scope === "class" ? "course" : "curriculum"}.
            </p>
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={creating}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
            >
              {creating ? "Creating…" : "Create program timeline"}
            </button>
          </div>
        )}

        {!loading && timeline && (
          <>
            <div className="mb-6 space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900">Settings</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Week count</label>
                  <input
                    type="number"
                    min={1}
                    max={520}
                    value={weekCount}
                    onChange={(e) => setWeekCount(Number(e.target.value) || 1)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Week 1 anchor (local)
                  </label>
                  <input
                    type="datetime-local"
                    value={anchorLocal}
                    onChange={(e) => setAnchorLocal(e.target.value)}
                    className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleSaveAll()}
                disabled={saving}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save settings & chart"}
              </button>
            </div>

            <div className="mb-8 overflow-x-auto rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Chart</h2>
              <div style={{ minWidth: totalWidth }}>
                <div className="flex border-b border-gray-200 text-xs font-semibold text-gray-500">
                  {monthGroups.map((g, i) => (
                    <div
                      key={i}
                      style={{ width: g.weeks * PX_PER_WEEK }}
                      className="shrink-0 border-l border-gray-200 px-1 py-1 first:border-l-0"
                    >
                      {g.label}
                    </div>
                  ))}
                </div>
                <div className="flex border-b border-gray-200 bg-gray-50 text-[10px] text-gray-500">
                  {Array.from({ length: weekCount }, (_, i) => (
                    <div
                      key={i}
                      style={{ width: PX_PER_WEEK }}
                      className="shrink-0 border-l border-gray-100 py-1 text-center"
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
                <div className="space-y-1 py-2">
                  {segments.length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-500">No segments yet — add below.</p>
                  ) : (
                    segments.map((seg, idx) => (
                      <div
                        key={seg.id}
                        className="relative h-9 border-b border-gray-100"
                        style={{ width: totalWidth }}
                      >
                        <div
                          className="absolute top-1 flex h-7 items-center overflow-hidden rounded px-2 text-xs font-medium text-white shadow-sm"
                          style={{
                            left: `${((seg.weekStart - 1) / weekCount) * 100}%`,
                            width: `${((seg.weekEnd - seg.weekStart + 1) / weekCount) * 100}%`,
                            backgroundColor: segmentColor(seg, idx),
                          }}
                          title={seg.label}
                        >
                          <span className="truncate">{seg.label}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-4 border-t border-gray-200 pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Milestones
                  </p>
                  <div className="relative h-14" style={{ width: totalWidth }}>
                    {milestones.map((m) => {
                      const left = milestoneLeftPct(m, anchorMs, weekCount);
                      if (left == null) return null;
                      return (
                        <div
                          key={m.id}
                          className="absolute bottom-0 top-0 w-px bg-amber-500"
                          style={{ left: `${left}%` }}
                          title={m.label}
                        />
                      );
                    })}
                  </div>
                  <ul className="mt-2 space-y-2 text-sm text-gray-700">
                    {milestones.map((m) => (
                      <li key={m.id} className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-100 pb-2">
                        <div>
                          <span className="font-medium text-gray-900">{m.label}</span>
                          {m.weekStart != null && (
                            <span className="ml-2 text-xs text-gray-500">Week {m.weekStart}</span>
                          )}
                          {m.startAt != null && (
                            <span className="ml-2 text-xs text-gray-500">
                              {new Date(m.startAt).toLocaleString()}
                            </span>
                          )}
                          {m.notes && <p className="mt-0.5 text-xs text-gray-600">{m.notes}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMilestone(m.id)}
                          className="shrink-0 text-xs text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Add segment (module bar)</h3>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Label"
                    value={segLabel}
                    onChange={(e) => setSegLabel(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <label className="flex flex-1 flex-col text-xs text-gray-600">
                      Start week
                      <input
                        type="number"
                        min={1}
                        max={weekCount}
                        value={segStart}
                        onChange={(e) => setSegStart(Number(e.target.value) || 1)}
                        className="mt-0.5 rounded-lg border border-gray-300 px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="flex flex-1 flex-col text-xs text-gray-600">
                      End week
                      <input
                        type="number"
                        min={1}
                        max={weekCount}
                        value={segEnd}
                        onChange={(e) => setSegEnd(Number(e.target.value) || 1)}
                        className="mt-0.5 rounded-lg border border-gray-300 px-2 py-1 text-sm"
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={addSegment}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
                  >
                    Add segment
                  </button>
                </div>
                <ul className="mt-4 space-y-2 text-sm">
                  {segments.map((s, idx) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2"
                    >
                      <span className="min-w-0 truncate">
                        <span
                          className="mr-2 inline-block h-2 w-2 shrink-0 rounded-full align-middle"
                          style={{ backgroundColor: segmentColor(s, idx) }}
                        />
                        {s.label}{" "}
                        <span className="text-xs text-gray-500">
                          (W{s.weekStart}–{s.weekEnd})
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeSegment(s.id)}
                        className="shrink-0 text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Add milestone</h3>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Label (e.g. Rec. session #1)"
                    value={msLabel}
                    onChange={(e) => setMsLabel(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <textarea
                    placeholder="Notes (optional)"
                    value={msNotes}
                    onChange={(e) => setMsNotes(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <label className="flex flex-col text-xs text-gray-600">
                    Week number (optional if you set a date)
                    <input
                      type="number"
                      min={1}
                      max={weekCount}
                      value={msWeekStart}
                      onChange={(e) =>
                        setMsWeekStart(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      className="mt-0.5 rounded-lg border border-gray-300 px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="flex flex-col text-xs text-gray-600">
                    Start date/time (local, optional)
                    <input
                      type="datetime-local"
                      value={msStartLocal}
                      onChange={(e) => setMsStartLocal(e.target.value)}
                      className="mt-0.5 rounded-lg border border-gray-300 px-2 py-1 text-sm"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={addMilestone}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
                  >
                    Add milestone
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => void handleSaveAll()}
                disabled={saving}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save all changes"}
              </button>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
