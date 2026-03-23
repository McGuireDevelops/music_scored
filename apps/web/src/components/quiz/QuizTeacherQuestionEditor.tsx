import { useState, useRef } from "react";
import { ref, uploadBytes } from "firebase/storage";
import { storage } from "../../firebase";
import type { QuizQuestionWithId } from "../../hooks/useQuizzes";
import type {
  MediaReference,
  QuizQuestion,
  QuizQuestionPayload,
  QuizQuestionType,
} from "@learning-scores/shared";
import { allKeys, spellChord, chordToMidi } from "@learning-scores/shared";
import { createEmptyPayload, payloadLooksValid } from "./questionPayloadDefaults";
import { QuizPromptMedia } from "./QuizPromptMedia";
import { StaffMidiPreview } from "./vexflow/StaffMidiPreview";

const QUESTION_TYPES: { value: QuizQuestionType; label: string }[] = [
  { value: "multipleChoiceSingle", label: "Single choice" },
  { value: "multipleChoiceMulti", label: "Multiple choice" },
  { value: "chordIdentification", label: "Chord identification" },
  { value: "romanNumeral", label: "Roman numeral" },
  { value: "nashville", label: "Nashville numbers" },
  { value: "pitchClassSet", label: "Pitch-class set" },
  { value: "intervalVector", label: "Interval vector" },
  { value: "mixedMeter", label: "Mixed meter" },
  { value: "polymeter", label: "Polymeter" },
  { value: "visualScore", label: "Visual score (bar range)" },
  { value: "mediaTimeCode", label: "Time code (audio/video)" },
  { value: "staffSingleNote", label: "Staff — single note (MIDI)" },
  { value: "staffMelody", label: "Staff — melody (MIDI sequence)" },
  { value: "chordSpelling", label: "Chord spelling" },
];

const ACCEPT_MEDIA =
  "audio/*,video/*,.pdf,.xml,.musicxml,.mxl,image/jpeg,image/png,image/gif,image/webp,application/pdf";

type Props = {
  classId: string;
  question: QuizQuestionWithId | null;
  onSave: (
    data: Omit<QuizQuestion, "id">,
    meta?: { removedMedia?: boolean }
  ) => void;
  onCancel: () => void;
  onDelete?: () => void;
};

export function QuizTeacherQuestionEditor({
  classId,
  question,
  onSave,
  onCancel,
  onDelete,
}: Props) {
  const [type, setType] = useState<QuizQuestionType>(
    question?.type ?? "multipleChoiceSingle"
  );
  const [payload, setPayload] = useState<Record<string, unknown>>(() => {
    if (!question) return createEmptyPayload("multipleChoiceSingle") as unknown as Record<string, unknown>;
    return { ...(question.payload as Record<string, unknown>) };
  });
  const [mediaRef, setMediaRef] = useState<MediaReference | undefined>(question?.mediaRef);
  const [points, setPoints] = useState(question?.points ?? 1);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadToClassMedia = async (file: File): Promise<string> => {
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const path = `classes/${classId}/media/quiz-${Date.now()}-${safeName}`;
    await uploadBytes(ref(storage, path), file);
    return path;
  };

  const guessMediaType = (file: File): MediaReference["type"] => {
    if (file.type.startsWith("audio/")) return "audio";
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("image/")) return "image";
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".pdf")) return "document";
    if (
      lower.endsWith(".xml") ||
      lower.endsWith(".musicxml") ||
      lower.endsWith(".mxl")
    )
      return "score";
    return "document";
  };

  const handleMediaFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const resourceId = await uploadToClassMedia(file);
      const t = guessMediaType(file);
      setMediaRef({ type: t, resourceId, label: file.name });
    } catch {
      setError("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payloadLooksValid(type, payload)) {
      setError("Please complete all required fields for this question type.");
      return;
    }
    setError(null);
    onSave(
      {
        type,
        payload: payload as QuizQuestionPayload,
        ...(mediaRef ? { mediaRef } : {}),
        points: points > 0 ? points : 1,
      },
      {
        removedMedia: !!question?.mediaRef && !mediaRef,
      }
    );
  };

  const setTypeAndResetPayload = (next: QuizQuestionType) => {
    setType(next);
    setPayload(createEmptyPayload(next) as unknown as Record<string, unknown>);
  };

  const inputCls =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-card max-w-2xl border border-gray-200 bg-white p-6 shadow-card"
    >
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        {question ? "Edit question" : "Add question"}
      </h3>

      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium text-gray-700">Question type</label>
        <select
          value={type}
          onChange={(e) => setTypeAndResetPayload(e.target.value as QuizQuestionType)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {QUESTION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
        <p className="mb-2 text-sm font-medium text-gray-700">Prompt media (optional)</p>
        {mediaRef && (
          <div className="mb-3">
            <QuizPromptMedia mediaRef={mediaRef} />
            <p className="mt-1 text-xs text-gray-500">
              {mediaRef.type} · {mediaRef.resourceId}
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <label className="text-xs text-gray-600">
                Start (s)
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  className={`${inputCls} ml-1 w-24`}
                  value={mediaRef.start ?? ""}
                  onChange={(e) =>
                    setMediaRef({
                      ...mediaRef,
                      start: e.target.value === "" ? undefined : Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="text-xs text-gray-600">
                End (s)
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  className={`${inputCls} ml-1 w-24`}
                  value={mediaRef.end ?? ""}
                  onChange={(e) =>
                    setMediaRef({
                      ...mediaRef,
                      end: e.target.value === "" ? undefined : Number(e.target.value),
                    })
                  }
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() => setMediaRef(undefined)}
              className="mt-2 text-sm text-red-600 hover:underline"
            >
              Remove media
            </button>
          </div>
        )}
        <input ref={fileRef} type="file" accept={ACCEPT_MEDIA} className="hidden" onChange={handleMediaFile} />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {uploading ? "Uploading…" : mediaRef ? "Replace file" : "Upload audio / video / score / image"}
        </button>
      </div>

      <PayloadFields
        type={type}
        payload={payload}
        setPayload={setPayload}
        inputCls={inputCls}
        uploadClassMedia={uploadToClassMedia}
      />

      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium text-gray-700">Points</label>
        <input
          type="number"
          min={1}
          value={points}
          onChange={(e) => setPoints(Number(e.target.value) || 1)}
          className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className="rounded-xl bg-primary px-4 py-2 font-medium text-white transition-colors hover:bg-primary-dark"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        {question && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 font-medium text-red-700 hover:bg-red-100"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}

function PayloadFields({
  type,
  payload,
  setPayload,
  inputCls,
  uploadClassMedia,
}: {
  type: QuizQuestionType;
  payload: Record<string, unknown>;
  setPayload: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  inputCls: string;
  uploadClassMedia: (file: File) => Promise<string>;
}) {
  if (type === "multipleChoiceSingle" || type === "multipleChoiceMulti") {
    const choices = (payload.choices as Array<{ key: string; label: string }>) ?? [];
    const correctKeys = (payload.correctKeys as string[]) ?? [];
    const toggleCorrect = (key: string) => {
      if (type === "multipleChoiceSingle") {
        setPayload((p) => ({
          ...p,
          correctKeys: correctKeys.includes(key) ? [] : [key],
        }));
      } else {
        setPayload((p) => ({
          ...p,
          correctKeys: correctKeys.includes(key)
            ? correctKeys.filter((k) => k !== key)
            : [...correctKeys, key],
        }));
      }
    };
    const addChoice = () => {
      const keys = choices.map((c) => c.key);
      let nextKey = "a";
      while (keys.includes(nextKey)) {
        nextKey = String.fromCharCode(nextKey.charCodeAt(0) + 1);
      }
      setPayload((p) => ({
        ...p,
        choices: [...choices, { key: nextKey, label: "" }],
      }));
    };
    return (
      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium text-gray-700">Choices</label>
        <div className="space-y-2">
          {choices.map((c, idx) => (
            <div key={c.key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={correctKeys.includes(c.key)}
                onChange={() => toggleCorrect(c.key)}
                title="Correct"
                className="h-4 w-4 rounded border-gray-300"
              />
              <input
                type="text"
                value={c.label}
                onChange={(e) =>
                  setPayload((p) => ({
                    ...p,
                    choices: choices.map((x, i) =>
                      i === idx ? { ...x, label: e.target.value } : x
                    ),
                  }))
                }
                placeholder={`Option ${c.key}`}
                className={`${inputCls} flex-1`}
              />
              {choices.length > 2 && (
                <button
                  type="button"
                  onClick={() =>
                    setPayload((p) => ({
                      ...p,
                      choices: choices.filter((_, i) => i !== idx),
                      correctKeys: correctKeys.filter((k) => k !== c.key),
                    }))
                  }
                  className="text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addChoice}
          className="mt-2 text-sm font-medium text-primary hover:underline"
        >
          + Add choice
        </button>
      </div>
    );
  }

  if (type === "chordIdentification") {
    const choices =
      (payload.choices as Array<{ key: string; chord: string; inversion?: string }>) ?? [];
    const correctKey = (payload.correctKey as string) ?? "";
    return (
      <div className="mb-4 space-y-3">
        <label className="mb-2 block text-sm font-medium text-gray-700">Chord choices</label>
        {choices.map((c, idx) => (
          <div key={c.key} className="flex flex-wrap items-center gap-2">
            <input
              type="radio"
              name="correctChord"
              checked={correctKey === c.key}
              onChange={() => setPayload((p) => ({ ...p, correctKey: c.key }))}
              className="h-4 w-4"
            />
            <input
              type="text"
              value={c.chord}
              placeholder="Chord symbol"
              className={`${inputCls} w-40`}
              onChange={(e) =>
                setPayload((p) => ({
                  ...p,
                  choices: choices.map((x, i) =>
                    i === idx ? { ...x, chord: e.target.value } : x
                  ),
                }))
              }
            />
            <input
              type="text"
              value={c.inversion ?? ""}
              placeholder="Inversion (optional)"
              className={`${inputCls} w-36`}
              onChange={(e) =>
                setPayload((p) => ({
                  ...p,
                  choices: choices.map((x, i) =>
                    i === idx ? { ...x, inversion: e.target.value || undefined } : x
                  ),
                }))
              }
            />
            {choices.length > 2 && (
              <button
                type="button"
                className="text-sm text-red-600 hover:underline"
                onClick={() =>
                  setPayload((p) => ({
                    ...p,
                    choices: choices.filter((_, i) => i !== idx),
                    correctKey: correctKey === c.key ? "" : correctKey,
                  }))
                }
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="text-sm font-medium text-primary hover:underline"
          onClick={() => {
            const keys = choices.map((c) => c.key);
            let nextKey = "a";
            while (keys.includes(nextKey)) {
              nextKey = String.fromCharCode(nextKey.charCodeAt(0) + 1);
            }
            setPayload((p) => ({
              ...p,
              choices: [...choices, { key: nextKey, chord: "" }],
            }));
          }}
        >
          + Add chord
        </button>
      </div>
    );
  }

  if (type === "chordSpelling") {
    const key = (payload.key as string) ?? "C Major";
    const chordLabel = (payload.chordLabel as string) ?? "";
    const answerMode = (payload.answerMode as "text" | "staff" | "either") ?? "either";
    const toneCount = Math.min(12, Math.max(1, Number(payload.toneCount) || 4));
    const validSpellings = (payload.validSpellings as string[][]) ?? [["", "", "", ""]];
    const clef = (payload.clef as "treble" | "bass") ?? "treble";
    const expectedMidi = (payload.expectedMidi as number[]) ?? [];

    const applyTheory = () => {
      const spelled = spellChord(key, chordLabel);
      const midi = chordToMidi(key, chordLabel, 4);
      if (!spelled?.length) return;
      const tc = spelled.length;
      setPayload((p) => ({
        ...p,
        toneCount: tc,
        validSpellings: [spelled],
        ...(midi?.length ? { expectedMidi: midi } : {}),
      }));
    };

    const setRowNotes = (rowIdx: number, notes: string[]) => {
      setPayload((p) => {
        const rows = [...((p.validSpellings as string[][]) ?? [])];
        rows[rowIdx] = notes;
        return { ...p, validSpellings: rows };
      });
    };

    return (
      <div className="mb-4 space-y-4">
        <div className="flex flex-wrap gap-3">
          <label className="block text-sm">
            Key
            <select
              className={`${inputCls} mt-1 min-w-[10rem]`}
              value={key}
              onChange={(e) => setPayload((p) => ({ ...p, key: e.target.value }))}
            >
              {allKeys().map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Chord (Roman numeral)
            <input
              className={`${inputCls} mt-1 w-40`}
              value={chordLabel}
              onChange={(e) => setPayload((p) => ({ ...p, chordLabel: e.target.value }))}
              placeholder="e.g. V7"
            />
          </label>
          <label className="block text-sm">
            Answer mode
            <select
              className={`${inputCls} mt-1`}
              value={answerMode}
              onChange={(e) =>
                setPayload((p) => ({
                  ...p,
                  answerMode: e.target.value as "text" | "staff" | "either",
                }))
              }
            >
              <option value="text">Note names only</option>
              <option value="staff">Staff / MIDI only</option>
              <option value="either">Student chooses names or staff</option>
            </select>
          </label>
          <label className="block text-sm">
            Number of chord tones
            <input
              type="number"
              min={1}
              max={12}
              className={`${inputCls} mt-1 w-24`}
              value={toneCount}
              onChange={(e) => {
                const n = Math.min(12, Math.max(1, Number(e.target.value) || 1));
                setPayload((p) => {
                  const rows = ((p.validSpellings as string[][]) ?? [[]]).map((row) => {
                    const next = [...row];
                    while (next.length < n) next.push("");
                    return next.slice(0, n);
                  });
                  const midi = ((p.expectedMidi as number[]) ?? []).slice(0, n);
                  while (midi.length < n) midi.push(60);
                  return { ...p, toneCount: n, validSpellings: rows, expectedMidi: midi };
                });
              }}
            />
          </label>
        </div>
        <button
          type="button"
          className="text-sm font-medium text-primary hover:underline"
          onClick={applyTheory}
        >
          Auto-fill spelling & MIDI from key + chord
        </button>
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">
            Accepted spellings (each row is one enharmonic / ordering option)
          </p>
          {validSpellings.map((row, ri) => (
            <div key={ri} className="mb-3 flex flex-wrap items-end gap-2">
              {Array.from({ length: toneCount }, (_, i) => (
                <label key={i} className="text-sm">
                  Note {i + 1}
                  <input
                    className={`${inputCls} mt-1 w-16`}
                    value={row[i] ?? ""}
                    onChange={(e) => {
                      const next = Array.from({ length: toneCount }, (_, j) =>
                        j === i ? e.target.value : row[j] ?? ""
                      );
                      setRowNotes(ri, next);
                    }}
                  />
                </label>
              ))}
              {validSpellings.length > 1 && (
                <button
                  type="button"
                  className="text-sm text-red-600 hover:underline"
                  onClick={() =>
                    setPayload((p) => ({
                      ...p,
                      validSpellings: validSpellings.filter((_, j) => j !== ri),
                    }))
                  }
                >
                  Remove row
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="text-sm font-medium text-primary hover:underline"
            onClick={() =>
              setPayload((p) => ({
                ...p,
                validSpellings: [
                  ...validSpellings,
                  Array.from({ length: toneCount }, () => ""),
                ],
              }))
            }
          >
            + Add alternate spelling
          </button>
        </div>
        {(answerMode === "staff" || answerMode === "either") && (
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="mb-2 text-sm font-medium text-gray-700">Correct MIDI (staff grading)</p>
            <label className="mb-2 block text-sm">
              Clef
              <select
                className={`${inputCls} mt-1`}
                value={clef}
                onChange={(e) =>
                  setPayload((p) => ({ ...p, clef: e.target.value as "treble" | "bass" }))
                }
              >
                <option value="treble">Treble</option>
                <option value="bass">Bass</option>
              </select>
            </label>
            <StaffMidiPreview
              midiNotes={expectedMidi.slice(0, toneCount)}
              clef={clef}
              width={Math.min(520, 120 + toneCount * 56)}
            />
            <div className="mt-2 space-y-2">
              {Array.from({ length: toneCount }, (_, i) => (
                <label key={i} className="flex items-center gap-2 text-sm">
                  MIDI {i + 1}
                  <input
                    type="number"
                    min={0}
                    max={127}
                    className={`${inputCls} w-24`}
                    value={expectedMidi[i] ?? 60}
                    onChange={(e) => {
                      const v = Math.min(127, Math.max(0, Number(e.target.value) || 0));
                      setPayload((p) => {
                        const m = [...((p.expectedMidi as number[]) ?? [])];
                        while (m.length < toneCount) m.push(60);
                        m[i] = v;
                        return { ...p, expectedMidi: m.slice(0, toneCount) };
                      });
                    }}
                  />
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (type === "romanNumeral" || type === "nashville") {
    const key = type === "romanNumeral" ? "validAnswers" : "validAnswers";
    const rows =
      (payload[key] as Array<Record<string, string>>) ??
      (type === "romanNumeral" ? [{ numeral: "", key: "" }] : [{ chord: "", key: "" }]);
    const updateRow = (i: number, field: string, v: string) => {
      setPayload((p) => ({
        ...p,
        [key]: rows.map((r, j) => (j === i ? { ...r, [field]: v } : r)),
      }));
    };
    return (
      <div className="mb-4 space-y-3">
        <p className="text-sm font-medium text-gray-700">Accepted answers (any row matches)</p>
        {rows.map((row, i) => (
          <div key={i} className="flex flex-wrap gap-2">
            {type === "romanNumeral" ? (
              <>
                <input
                  className={`${inputCls} w-32`}
                  placeholder="Numeral"
                  value={(row as { numeral?: string }).numeral ?? ""}
                  onChange={(e) => updateRow(i, "numeral", e.target.value)}
                />
                <input
                  className={`${inputCls} w-32`}
                  placeholder="Key"
                  value={row.key ?? ""}
                  onChange={(e) => updateRow(i, "key", e.target.value)}
                />
                <input
                  className={`${inputCls} w-28`}
                  placeholder="Inversion"
                  value={(row as { inversion?: string }).inversion ?? ""}
                  onChange={(e) => updateRow(i, "inversion", e.target.value)}
                />
              </>
            ) : (
              <>
                <input
                  className={`${inputCls} w-36`}
                  placeholder="Chord"
                  value={(row as { chord?: string }).chord ?? ""}
                  onChange={(e) => updateRow(i, "chord", e.target.value)}
                />
                <input
                  className={`${inputCls} w-32`}
                  placeholder="Key"
                  value={row.key ?? ""}
                  onChange={(e) => updateRow(i, "key", e.target.value)}
                />
              </>
            )}
            {rows.length > 1 && (
              <button
                type="button"
                className="text-sm text-red-600 hover:underline"
                onClick={() =>
                  setPayload((p) => ({
                    ...p,
                    [key]: rows.filter((_, j) => j !== i),
                  }))
                }
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="text-sm font-medium text-primary hover:underline"
          onClick={() =>
            setPayload((p) => ({
              ...p,
              [key]:
                type === "romanNumeral"
                  ? [...rows, { numeral: "", key: "" }]
                  : [...rows, { chord: "", key: "" }],
            }))
          }
        >
          + Add accepted answer
        </button>
      </div>
    );
  }

  if (type === "pitchClassSet" || type === "intervalVector") {
    const vecs = (payload.validVectors as string[]) ?? [""];
    return (
      <div className="mb-4 space-y-2">
        <p className="text-sm font-medium text-gray-700">Valid vectors (any matches)</p>
        {vecs.map((v, i) => (
          <div key={i} className="flex gap-2">
            <input
              className={inputCls}
              value={v}
              onChange={(e) =>
                setPayload((p) => ({
                  ...p,
                  validVectors: vecs.map((x, j) => (j === i ? e.target.value : x)),
                }))
              }
            />
            {vecs.length > 1 && (
              <button
                type="button"
                className="text-sm text-red-600 hover:underline"
                onClick={() =>
                  setPayload((p) => ({
                    ...p,
                    validVectors: vecs.filter((_, j) => j !== i),
                  }))
                }
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="text-sm font-medium text-primary hover:underline"
          onClick={() => setPayload((p) => ({ ...p, validVectors: [...vecs, ""] }))}
        >
          + Add vector
        </button>
        {type === "pitchClassSet" && (
          <label className="mt-2 flex items-center gap-2 text-sm text-gray-700">
            Format
            <select
              value={(payload.format as string) ?? "prime"}
              onChange={(e) =>
                setPayload((p) => ({ ...p, format: e.target.value as "forte" | "prime" }))
              }
              className="rounded border border-gray-300 px-2 py-1"
            >
              <option value="prime">Prime</option>
              <option value="forte">Forte</option>
            </select>
          </label>
        )}
      </div>
    );
  }

  if (type === "mixedMeter") {
    const validAnswers =
      (payload.validAnswers as Array<Array<{ numerator: number; denominator: number }>>) ?? [];
    return (
      <div className="mb-4 space-y-4">
        <p className="text-sm font-medium text-gray-700">Valid meter sequences (each row is one answer)</p>
        {validAnswers.map((seq, si) => (
          <div key={si} className="rounded border border-gray-200 p-3">
            <p className="mb-2 text-xs text-gray-500">Sequence {si + 1}</p>
            {seq.map((m, mi) => (
              <div key={mi} className="mb-2 flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min={1}
                  className={`${inputCls} w-20`}
                  value={m.numerator}
                  onChange={(e) => {
                    const n = Number(e.target.value) || 1;
                    setPayload((p) => ({
                      ...p,
                      validAnswers: validAnswers.map((s, i) =>
                        i === si
                          ? s.map((x, j) => (j === mi ? { ...x, numerator: n } : x))
                          : s
                      ),
                    }));
                  }}
                />
                <span>/</span>
                <input
                  type="number"
                  min={1}
                  className={`${inputCls} w-20`}
                  value={m.denominator}
                  onChange={(e) => {
                    const n = Number(e.target.value) || 4;
                    setPayload((p) => ({
                      ...p,
                      validAnswers: validAnswers.map((s, i) =>
                        i === si
                          ? s.map((x, j) => (j === mi ? { ...x, denominator: n } : x))
                          : s
                      ),
                    }));
                  }}
                />
                {seq.length > 1 && (
                  <button
                    type="button"
                    className="text-sm text-red-600 hover:underline"
                    onClick={() =>
                      setPayload((p) => ({
                        ...p,
                        validAnswers: validAnswers.map((s, i) =>
                          i === si ? s.filter((_, j) => j !== mi) : s
                        ),
                      }))
                    }
                  >
                    Remove measure
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={() =>
                setPayload((p) => ({
                  ...p,
                  validAnswers: validAnswers.map((s, i) =>
                    i === si ? [...s, { numerator: 4, denominator: 4 }] : s
                  ),
                }))
              }
            >
              + Measure in this sequence
            </button>
            {validAnswers.length > 1 && (
              <button
                type="button"
                className="ml-3 text-sm text-red-600 hover:underline"
                onClick={() =>
                  setPayload((p) => ({
                    ...p,
                    validAnswers: validAnswers.filter((_, i) => i !== si),
                  }))
                }
              >
                Remove whole sequence
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="text-sm font-medium text-primary hover:underline"
          onClick={() =>
            setPayload((p) => ({
              ...p,
              validAnswers: [...validAnswers, [{ numerator: 4, denominator: 4 }]],
            }))
          }
        >
          + Add answer sequence
        </button>
      </div>
    );
  }

  if (type === "polymeter") {
    const validAnswers =
      (payload.validAnswers as Array<{
        meters: Array<{ numerator: number; denominator: number }>;
      }>) ?? [];
    return (
      <div className="mb-4 space-y-4">
        <p className="text-sm font-medium text-gray-700">Valid polymeters (concurrent meters per answer)</p>
        {validAnswers.map((row, ri) => (
          <div key={ri} className="rounded border border-gray-200 p-3">
            {row.meters.map((m, mi) => (
              <div key={mi} className="mb-2 flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min={1}
                  className={`${inputCls} w-20`}
                  value={m.numerator}
                  onChange={(e) => {
                    const n = Number(e.target.value) || 1;
                    setPayload((p) => ({
                      ...p,
                      validAnswers: validAnswers.map((r, i) =>
                        i === ri
                          ? {
                              meters: r.meters.map((x, j) =>
                                j === mi ? { ...x, numerator: n } : x
                              ),
                            }
                          : r
                      ),
                    }));
                  }}
                />
                <span>/</span>
                <input
                  type="number"
                  min={1}
                  className={`${inputCls} w-20`}
                  value={m.denominator}
                  onChange={(e) => {
                    const n = Number(e.target.value) || 4;
                    setPayload((p) => ({
                      ...p,
                      validAnswers: validAnswers.map((r, i) =>
                        i === ri
                          ? {
                              meters: r.meters.map((x, j) =>
                                j === mi ? { ...x, denominator: n } : x
                              ),
                            }
                          : r
                      ),
                    }));
                  }}
                />
                {row.meters.length > 1 && (
                  <button
                    type="button"
                    className="text-sm text-red-600 hover:underline"
                    onClick={() =>
                      setPayload((p) => ({
                        ...p,
                        validAnswers: validAnswers.map((r, i) =>
                          i === ri
                            ? { meters: r.meters.filter((_, j) => j !== mi) }
                            : r
                        ),
                      }))
                    }
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={() =>
                setPayload((p) => ({
                  ...p,
                  validAnswers: validAnswers.map((r, i) =>
                    i === ri
                      ? {
                          meters: [...r.meters, { numerator: 4, denominator: 4 }],
                        }
                      : r
                  ),
                }))
              }
            >
              + Concurrent meter
            </button>
            {validAnswers.length > 1 && (
              <button
                type="button"
                className="ml-3 text-sm text-red-600 hover:underline"
                onClick={() =>
                  setPayload((p) => ({
                    ...p,
                    validAnswers: validAnswers.filter((_, i) => i !== ri),
                  }))
                }
              >
                Remove answer
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="text-sm font-medium text-primary hover:underline"
          onClick={() =>
            setPayload((p) => ({
              ...p,
              validAnswers: [
                ...validAnswers,
                { meters: [{ numerator: 4, denominator: 4 }] },
              ],
            }))
          }
        >
          + Add polymeter answer
        </button>
      </div>
    );
  }

  if (type === "visualScore") {
    const scoreRef = (payload.scoreRef as MediaReference) ?? { type: "score" as const, resourceId: "" };
    const regions =
      (payload.correctRegions as Array<{ barStart: number; barEnd: number }>) ?? [];
    return (
      <div className="mb-4 space-y-3">
        <p className="text-sm font-medium text-gray-700">Score file</p>
        <input
          type="file"
          accept=".pdf,.xml,.musicxml,.mxl,application/pdf"
          className="mb-2 block text-sm text-gray-700"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            try {
              const path = await uploadClassMedia(file);
              setPayload((p) => ({
                ...p,
                scoreRef: {
                  type: "score" as const,
                  resourceId: path,
                  label: file.name,
                },
              }));
            } catch {
              /* ignore */
            }
          }}
        />
        <input
          className={inputCls}
          value={scoreRef.resourceId}
          placeholder="classes/…/file.pdf"
          onChange={(e) =>
            setPayload((p) => ({
              ...p,
              scoreRef: { ...scoreRef, resourceId: e.target.value },
            }))
          }
        />
        {scoreRef.resourceId ? (
          <div className="mt-2 rounded border border-gray-100 p-2">
            <QuizPromptMedia mediaRef={scoreRef} />
          </div>
        ) : null}
        <p className="text-sm font-medium text-gray-700">Correct bar regions (any matches)</p>
        {regions.map((r, i) => (
          <div key={i} className="flex flex-wrap gap-2">
            <input
              type="number"
              min={1}
              className={`${inputCls} w-24`}
              value={r.barStart}
              onChange={(e) =>
                setPayload((p) => ({
                  ...p,
                  correctRegions: regions.map((x, j) =>
                    j === i ? { ...x, barStart: Number(e.target.value) || 1 } : x
                  ),
                }))
              }
            />
            <span className="self-center">–</span>
            <input
              type="number"
              min={1}
              className={`${inputCls} w-24`}
              value={r.barEnd}
              onChange={(e) =>
                setPayload((p) => ({
                  ...p,
                  correctRegions: regions.map((x, j) =>
                    j === i ? { ...x, barEnd: Number(e.target.value) || 1 } : x
                  ),
                }))
              }
            />
            {regions.length > 1 && (
              <button
                type="button"
                className="text-sm text-red-600 hover:underline"
                onClick={() =>
                  setPayload((p) => ({
                    ...p,
                    correctRegions: regions.filter((_, j) => j !== i),
                  }))
                }
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="text-sm font-medium text-primary hover:underline"
          onClick={() =>
            setPayload((p) => ({
              ...p,
              correctRegions: [...regions, { barStart: 1, barEnd: 1 }],
            }))
          }
        >
          + Region
        </button>
      </div>
    );
  }

  if (type === "mediaTimeCode") {
    return (
      <div className="mb-4 space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Prompt (optional)
          <textarea
            className={inputCls}
            rows={2}
            value={(payload.prompt as string) ?? ""}
            onChange={(e) => setPayload((p) => ({ ...p, prompt: e.target.value }))}
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Correct time (seconds)
          <input
            type="number"
            step="0.01"
            min={0}
            className={inputCls}
            value={(payload.correctSeconds as number) ?? 0}
            onChange={(e) =>
              setPayload((p) => ({ ...p, correctSeconds: Number(e.target.value) || 0 }))
            }
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Tolerance (seconds)
          <input
            type="number"
            step="0.01"
            min={0}
            className={inputCls}
            value={(payload.toleranceSeconds as number) ?? 0}
            onChange={(e) =>
              setPayload((p) => ({ ...p, toleranceSeconds: Number(e.target.value) || 0 }))
            }
          />
        </label>
      </div>
    );
  }

  if (type === "staffSingleNote") {
    const clef = payload.clef === "bass" ? "bass" : "treble";
    const cm = (payload.correctMidi as number) ?? 60;
    return (
      <div className="mb-4 space-y-3">
        <StaffMidiPreview midiNotes={[cm]} clef={clef} />
        <label className="block text-sm font-medium text-gray-700">
          Correct MIDI note (0–127)
          <input
            type="number"
            min={0}
            max={127}
            className={inputCls}
            value={cm}
            onChange={(e) =>
              setPayload((p) => ({
                ...p,
                correctMidi: Math.min(127, Math.max(0, Number(e.target.value) || 0)),
              }))
            }
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Clef
          <select
            className={inputCls}
            value={(payload.clef as string) ?? "treble"}
            onChange={(e) =>
              setPayload((p) => ({
                ...p,
                clef: e.target.value as "treble" | "bass",
              }))
            }
          >
            <option value="treble">Treble</option>
            <option value="bass">Bass</option>
          </select>
        </label>
      </div>
    );
  }

  if (type === "staffMelody") {
    const midi = (payload.expectedMidi as number[]) ?? [60];
    const clef = payload.clef === "bass" ? "bass" : "treble";
    return (
      <div className="mb-4 space-y-3">
        <StaffMidiPreview
          midiNotes={midi}
          clef={clef}
          width={Math.min(520, 120 + midi.length * 56)}
        />
        <label className="block text-sm font-medium text-gray-700">
          Max notes (hint for student UI)
          <input
            type="number"
            min={1}
            max={32}
            className={inputCls}
            value={(payload.maxNotes as number) ?? 8}
            onChange={(e) =>
              setPayload((p) => ({ ...p, maxNotes: Number(e.target.value) || 8 }))
            }
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Clef (preview)
          <select
            className={inputCls}
            value={(payload.clef as string) ?? "treble"}
            onChange={(e) =>
              setPayload((p) => ({
                ...p,
                clef: e.target.value as "treble" | "bass",
              }))
            }
          >
            <option value="treble">Treble</option>
            <option value="bass">Bass</option>
          </select>
        </label>
        <p className="text-sm font-medium text-gray-700">Expected MIDI sequence</p>
        {midi.map((n, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="number"
              min={0}
              max={127}
              className={`${inputCls} w-28`}
              value={n}
              onChange={(e) =>
                setPayload((p) => ({
                  ...p,
                  expectedMidi: midi.map((x, j) =>
                    j === i ? Math.min(127, Math.max(0, Number(e.target.value) || 0)) : x
                  ),
                }))
              }
            />
            {midi.length > 1 && (
              <button
                type="button"
                className="text-sm text-red-600 hover:underline"
                onClick={() =>
                  setPayload((p) => ({
                    ...p,
                    expectedMidi: midi.filter((_, j) => j !== i),
                  }))
                }
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="text-sm font-medium text-primary hover:underline"
          onClick={() => setPayload((p) => ({ ...p, expectedMidi: [...midi, 60] }))}
        >
          + MIDI note
        </button>
      </div>
    );
  }

  return null;
}

export { QUESTION_TYPES };
