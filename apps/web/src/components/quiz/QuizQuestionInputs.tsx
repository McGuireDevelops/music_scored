import { useState } from "react";
import type { QuizQuestionWithId } from "../../hooks/useQuizzes";
import type {
  QuizAnswer,
  ChordIdentificationPayload,
  ChordSpellingPayload,
  MultipleChoicePayload,
  VisualScorePayload,
} from "@learning-scores/shared";
import { QuizPromptMedia } from "./QuizPromptMedia";
import { ScoreViewer } from "../media/ScoreViewer";
import { PitchOctaveStrip } from "./PitchOctaveStrip";
import { StaffMidiPreview } from "./vexflow/StaffMidiPreview";

export function defaultAnswerForQuestion(q: QuizQuestionWithId): QuizAnswer {
  switch (q.type) {
    case "multipleChoiceSingle":
    case "multipleChoiceMulti":
      return { type: "multipleChoice", value: [] };
    case "chordIdentification":
      return { type: "chordIdentification", value: { key: "" } };
    case "romanNumeral":
      return { type: "romanNumeral", value: { numeral: "", key: "" } };
    case "nashville":
      return { type: "nashville", value: { chord: "", key: "" } };
    case "pitchClassSet":
      return { type: "pitchClassSet", value: { vector: "" } };
    case "intervalVector":
      return { type: "intervalVector", value: { vector: "" } };
    case "mixedMeter":
      return { type: "mixedMeter", value: [{ numerator: 4, denominator: 4 }] };
    case "polymeter":
      return { type: "polymeter", value: { meters: [{ numerator: 4, denominator: 4 }] } };
    case "visualScore":
      return { type: "visualScore", value: { barStart: 1, barEnd: 1 } };
    case "mediaTimeCode":
      return { type: "mediaTimeCode", value: { seconds: 0 } };
    case "staffSingleNote":
      return { type: "staffSingleNote", value: { midi: 60 } };
    case "staffMelody":
      return { type: "staffMelody", value: { midi: [60] } };
    case "chordSpelling": {
      const tc = Math.min(
        12,
        Math.max(
          1,
          Number((q.payload as ChordSpellingPayload).toneCount) || 4
        )
      );
      return {
        type: "chordSpelling",
        value: {
          noteNames: Array.from({ length: tc }, () => ""),
          midi: Array.from({ length: tc }, (_, i) => 60 + i * 4),
        },
      };
    }
  }
}

function inputClass() {
  return "mt-1 w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900";
}

type Props = {
  q: QuizQuestionWithId;
  answer: QuizAnswer;
  onChange: (a: QuizAnswer) => void;
};

export function QuizQuestionInputs({ q, answer, onChange }: Props) {
  const payload = q.payload as Record<string, unknown>;
  const visualScoreRef =
    q.type === "visualScore"
      ? (q.payload as VisualScorePayload).scoreRef
      : undefined;
  const topMedia = q.mediaRef;
  const staffClef = payload.clef === "bass" ? "bass" : "treble";

  return (
    <div className="space-y-3">
      {topMedia && <QuizPromptMedia mediaRef={topMedia} />}
      {q.type === "visualScore" && visualScoreRef && (
        <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-2">
          <ScoreViewer mediaRef={visualScoreRef} />
        </div>
      )}

      {(q.type === "multipleChoiceSingle" || q.type === "multipleChoiceMulti") && (
        <MultipleChoiceBlock q={q} answer={answer} onChange={onChange} />
      )}
      {q.type === "chordIdentification" && (
        <ChordBlock
          questionId={q.id}
          payload={q.payload as ChordIdentificationPayload}
          answer={answer}
          onChange={onChange}
        />
      )}
      {q.type === "romanNumeral" && <RomanBlock answer={answer} onChange={onChange} />}
      {q.type === "nashville" && <NashvilleBlock answer={answer} onChange={onChange} />}
      {q.type === "pitchClassSet" && <PitchSetBlock answer={answer} onChange={onChange} />}
      {q.type === "intervalVector" && <IntervalVectorBlock answer={answer} onChange={onChange} />}
      {q.type === "mixedMeter" && <MixedMeterBlock answer={answer} onChange={onChange} />}
      {q.type === "polymeter" && <PolymeterBlock answer={answer} onChange={onChange} />}
      {q.type === "visualScore" && <VisualScoreBlock answer={answer} onChange={onChange} />}
      {q.type === "mediaTimeCode" && <MediaTimeCodeBlock answer={answer} onChange={onChange} />}
      {q.type === "staffSingleNote" && (
        <StaffSingleNoteBlock clef={staffClef} answer={answer} onChange={onChange} />
      )}
      {q.type === "staffMelody" && (
        <StaffMelodyBlock clef={staffClef} q={q} answer={answer} onChange={onChange} />
      )}
      {q.type === "chordSpelling" && (
        <ChordSpellingBlock q={q} answer={answer} onChange={onChange} staffClef={staffClef} />
      )}
    </div>
  );
}

function ChordSpellingBlock({
  q,
  answer,
  onChange,
  staffClef,
}: {
  q: QuizQuestionWithId;
  answer: QuizAnswer;
  onChange: (a: QuizAnswer) => void;
  staffClef: "treble" | "bass";
}) {
  const [eitherKind, setEitherKind] = useState<"text" | "staff">("text");
  if (answer.type !== "chordSpelling") return null;
  const p = q.payload as ChordSpellingPayload;
  const toneCount = Math.min(12, Math.max(1, Number(p.toneCount) || 4));
  const mode = p.answerMode;
  const v = answer.value;
  const noteNames = v.noteNames ?? [];
  const midi = v.midi ?? [];

  const ensureNoteNames = (): string[] => {
    const a = [...noteNames];
    while (a.length < toneCount) a.push("");
    return a.slice(0, toneCount);
  };
  const ensureMidi = (): number[] => {
    const a = [...midi];
    while (a.length < toneCount) a.push(60);
    return a.slice(0, toneCount);
  };

  const updateNames = (next: string[]) => {
    onChange({
      type: "chordSpelling",
      value: { ...v, noteNames: next.slice(0, toneCount) },
    });
  };
  const updateMidi = (next: number[]) => {
    onChange({
      type: "chordSpelling",
      value: { ...v, midi: next.slice(0, toneCount) },
    });
  };

  const names = ensureNoteNames();
  const mids = ensureMidi();

  const textPanel = (
    <div className="space-y-2">
      <p className="text-sm text-gray-600">
        Enter {toneCount} note name{toneCount !== 1 ? "s" : ""} (e.g. G or F#).
      </p>
      <div className="flex flex-wrap gap-2">
        {names.map((n, i) => (
          <label key={i} className="text-sm">
            Note {i + 1}
            <input
              className={`${inputClass()} mt-1 w-20`}
              value={n}
              onChange={(e) => {
                const row = [...names];
                row[i] = e.target.value;
                updateNames(row);
              }}
            />
          </label>
        ))}
      </div>
    </div>
  );

  const staffPanel = (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">Set each pitch on the staff ({toneCount} tones).</p>
      <StaffMidiPreview
        midiNotes={mids}
        clef={staffClef}
        width={Math.min(520, 120 + toneCount * 56)}
      />
      {mids.map((n, idx) => (
        <div key={idx} className="rounded-lg border border-gray-100 p-3">
          <p className="mb-2 text-xs font-medium text-gray-600">Tone {idx + 1}</p>
          <PitchOctaveStrip
            value={n}
            onChange={(mv) => {
              const row = [...mids];
              row[idx] = mv;
              updateMidi(row);
            }}
          />
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-base text-gray-900">
        In the key of <span className="font-semibold">{p.key}</span>, spell a{" "}
        <span className="font-semibold">{p.chordLabel}</span>.
      </p>
      {mode === "text" && textPanel}
      {mode === "staff" && staffPanel}
      {mode === "either" && (
        <div className="space-y-3">
          <div className="flex gap-4 text-sm">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name={`chord-spell-${q.id}`}
                checked={eitherKind === "text"}
                onChange={() => setEitherKind("text")}
              />
              Note names
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name={`chord-spell-${q.id}`}
                checked={eitherKind === "staff"}
                onChange={() => setEitherKind("staff")}
              />
              Staff
            </label>
          </div>
          {eitherKind === "text" ? textPanel : staffPanel}
        </div>
      )}
    </div>
  );
}

function MultipleChoiceBlock({
  q,
  answer,
  onChange,
}: {
  q: QuizQuestionWithId;
  answer: QuizAnswer;
  onChange: (a: QuizAnswer) => void;
}) {
  if (answer.type !== "multipleChoice") return null;
  const p = q.payload as MultipleChoicePayload;
  const isMulti = q.type === "multipleChoiceMulti";
  const selected = answer.value;
  return (
    <div className="space-y-2">
      {p.choices?.map((c) => {
        const isChecked = selected.includes(c.key);
        return (
          <label key={c.key} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type={isMulti ? "checkbox" : "radio"}
              name={isMulti ? undefined : q.id}
              checked={isChecked}
              onChange={() => {
                if (isMulti) {
                  const next = isChecked
                    ? selected.filter((k) => k !== c.key)
                    : [...selected, c.key];
                  onChange({ type: "multipleChoice", value: next });
                } else {
                  onChange({ type: "multipleChoice", value: [c.key] });
                }
              }}
              className="h-4 w-4 border-gray-300"
            />
            <span>{c.label || c.key}</span>
          </label>
        );
      })}
    </div>
  );
}

function ChordBlock({
  questionId,
  payload,
  answer,
  onChange,
}: {
  questionId: string;
  payload: ChordIdentificationPayload;
  answer: QuizAnswer;
  onChange: (a: QuizAnswer) => void;
}) {
  if (answer.type !== "chordIdentification") return null;
  return (
    <div className="space-y-2">
      {payload.choices?.map((c) => (
        <label key={c.key} className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="radio"
            name={`chord-${questionId}`}
            checked={answer.value.key === c.key}
            onChange={() => onChange({ type: "chordIdentification", value: { key: c.key } })}
            className="h-4 w-4 border-gray-300"
          />
          <span>
            {c.chord}
            {c.inversion ? ` (${c.inversion})` : ""}
          </span>
        </label>
      ))}
    </div>
  );
}

function RomanBlock({
  answer,
  onChange,
}: {
  answer: QuizAnswer;
  onChange: (a: QuizAnswer) => void;
}) {
  if (answer.type !== "romanNumeral") return null;
  const v = answer.value;
  return (
    <div className="flex flex-wrap gap-3">
      <label className="block text-sm">
        Roman numeral
        <input
          className={inputClass()}
          value={v.numeral}
          onChange={(e) =>
            onChange({
              type: "romanNumeral",
              value: { ...v, numeral: e.target.value },
            })
          }
        />
      </label>
      <label className="block text-sm">
        Key
        <input
          className={inputClass()}
          value={v.key}
          onChange={(e) =>
            onChange({
              type: "romanNumeral",
              value: { ...v, key: e.target.value },
            })
          }
        />
      </label>
      <label className="block text-sm">
        Inversion (optional)
        <input
          className={inputClass()}
          value={v.inversion ?? ""}
          onChange={(e) =>
            onChange({
              type: "romanNumeral",
              value: { ...v, inversion: e.target.value || undefined },
            })
          }
        />
      </label>
    </div>
  );
}

function NashvilleBlock({
  answer,
  onChange,
}: {
  answer: QuizAnswer;
  onChange: (a: QuizAnswer) => void;
}) {
  if (answer.type !== "nashville") return null;
  const v = answer.value;
  return (
    <div className="flex flex-wrap gap-3">
      <label className="block text-sm">
        Nashville chord
        <input
          className={inputClass()}
          value={v.chord}
          onChange={(e) =>
            onChange({
              type: "nashville",
              value: { ...v, chord: e.target.value },
            })
          }
        />
      </label>
      <label className="block text-sm">
        Key
        <input
          className={inputClass()}
          value={v.key}
          onChange={(e) =>
            onChange({
              type: "nashville",
              value: { ...v, key: e.target.value },
            })
          }
        />
      </label>
    </div>
  );
}

function PitchSetBlock({
  answer,
  onChange,
}: {
  answer: QuizAnswer;
  onChange: (a: QuizAnswer) => void;
}) {
  if (answer.type !== "pitchClassSet") return null;
  return (
    <label className="block text-sm">
      Pitch-class set (e.g. 0, 4, 7)
      <input
        className={inputClass()}
        value={answer.value.vector}
        onChange={(e) =>
          onChange({
            type: "pitchClassSet",
            value: { vector: e.target.value },
          })
        }
      />
    </label>
  );
}

function IntervalVectorBlock({
  answer,
  onChange,
}: {
  answer: QuizAnswer;
  onChange: (a: QuizAnswer) => void;
}) {
  if (answer.type !== "intervalVector") return null;
  return (
    <label className="block text-sm">
      Interval vector (six digits)
      <input
        className={inputClass()}
        value={answer.value.vector}
        onChange={(e) =>
          onChange({
            type: "intervalVector",
            value: { vector: e.target.value },
          })
        }
      />
    </label>
  );
}

function MixedMeterBlock({
  answer,
  onChange,
}: {
  answer: QuizAnswer;
  onChange: (a: QuizAnswer) => void;
}) {
  if (answer.type !== "mixedMeter") return null;
  const seq = answer.value;
  const update = (idx: number, field: "numerator" | "denominator", n: number) => {
    const next = seq.map((m, i) => (i === idx ? { ...m, [field]: n } : m));
    onChange({ type: "mixedMeter", value: next });
  };
  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600">Each row is one measure in order.</p>
      {seq.map((m, idx) => (
        <div key={idx} className="flex flex-wrap items-end gap-2">
          <label className="text-sm">
            Num.
            <input
              type="number"
              min={1}
              className={`${inputClass()} w-20`}
              value={m.numerator}
              onChange={(e) => update(idx, "numerator", Number(e.target.value) || 1)}
            />
          </label>
          <span className="pb-2">/</span>
          <label className="text-sm">
            Den.
            <input
              type="number"
              min={1}
              className={`${inputClass()} w-20`}
              value={m.denominator}
              onChange={(e) => update(idx, "denominator", Number(e.target.value) || 4)}
            />
          </label>
          {seq.length > 1 && (
            <button
              type="button"
              className="text-sm text-red-600 hover:underline"
              onClick={() =>
                onChange({
                  type: "mixedMeter",
                  value: seq.filter((_, i) => i !== idx),
                })
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
          onChange({
            type: "mixedMeter",
            value: [...seq, { numerator: 4, denominator: 4 }],
          })
        }
      >
        + Add measure
      </button>
    </div>
  );
}

function PolymeterBlock({
  answer,
  onChange,
}: {
  answer: QuizAnswer;
  onChange: (a: QuizAnswer) => void;
}) {
  if (answer.type !== "polymeter") return null;
  const meters = answer.value.meters;
  const update = (idx: number, field: "numerator" | "denominator", n: number) => {
    const next = meters.map((m, i) => (i === idx ? { ...m, [field]: n } : m));
    onChange({ type: "polymeter", value: { meters: next } });
  };
  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600">Concurrent meters (e.g. 4/4 against 6/8).</p>
      <div className="flex flex-wrap gap-3">
        {meters.map((m, idx) => (
          <div key={idx} className="flex items-end gap-2 rounded border border-gray-200 p-2">
            <label className="text-sm">
              Num.
              <input
                type="number"
                min={1}
                className={`${inputClass()} w-20`}
                value={m.numerator}
                onChange={(e) => update(idx, "numerator", Number(e.target.value) || 1)}
              />
            </label>
            <span className="pb-2">/</span>
            <label className="text-sm">
              Den.
              <input
                type="number"
                min={1}
                className={`${inputClass()} w-20`}
                value={m.denominator}
                onChange={(e) => update(idx, "denominator", Number(e.target.value) || 4)}
              />
            </label>
            {meters.length > 1 && (
              <button
                type="button"
                className="text-sm text-red-600 hover:underline"
                onClick={() =>
                  onChange({
                    type: "polymeter",
                    value: { meters: meters.filter((_, i) => i !== idx) },
                  })
                }
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        className="text-sm font-medium text-primary hover:underline"
        onClick={() =>
          onChange({
            type: "polymeter",
            value: { meters: [...meters, { numerator: 4, denominator: 4 }] },
          })
        }
      >
        + Add concurrent meter
      </button>
    </div>
  );
}

function VisualScoreBlock({
  answer,
  onChange,
}: {
  answer: QuizAnswer;
  onChange: (a: QuizAnswer) => void;
}) {
  if (answer.type !== "visualScore") return null;
  const v = answer.value as { barStart: number; barEnd: number };
  return (
    <div className="flex flex-wrap gap-3">
      <label className="block text-sm">
        Bar start
        <input
          type="number"
          min={1}
          className={`${inputClass()} w-24`}
          value={v.barStart}
          onChange={(e) =>
            onChange({
              type: "visualScore",
              value: {
                barStart: Number(e.target.value) || 1,
                barEnd: v.barEnd,
              },
            })
          }
        />
      </label>
      <label className="block text-sm">
        Bar end
        <input
          type="number"
          min={1}
          className={`${inputClass()} w-24`}
          value={v.barEnd}
          onChange={(e) =>
            onChange({
              type: "visualScore",
              value: {
                barStart: v.barStart,
                barEnd: Number(e.target.value) || 1,
              },
            })
          }
        />
      </label>
    </div>
  );
}

function MediaTimeCodeBlock({
  answer,
  onChange,
}: {
  answer: QuizAnswer;
  onChange: (a: QuizAnswer) => void;
}) {
  if (answer.type !== "mediaTimeCode") return null;
  return (
    <div className="space-y-2">
      <label className="block text-sm">
        Time (seconds)
        <input
          type="number"
          step="0.01"
          min={0}
          className={inputClass()}
          value={answer.value.seconds}
          onChange={(e) =>
            onChange({
              type: "mediaTimeCode",
              value: { seconds: Number(e.target.value) || 0 },
            })
          }
        />
      </label>
      <p className="text-xs text-gray-500">Or use mm:ss below.</p>
      <label className="block text-sm">
        mm:ss
        <input
          className={inputClass()}
          placeholder="1:30"
          onChange={(e) => {
            const raw = e.target.value.trim();
            const m = raw.match(/^(\d+):(\d+(?:\.\d+)?)$/);
            if (m) {
              const mm = parseInt(m[1], 10);
              const ss = parseFloat(m[2]);
              if (Number.isFinite(mm) && Number.isFinite(ss)) {
                onChange({
                  type: "mediaTimeCode",
                  value: { seconds: mm * 60 + ss },
                });
              }
            }
          }}
        />
      </label>
    </div>
  );
}

function StaffSingleNoteBlock({
  clef,
  answer,
  onChange,
}: {
  clef: "treble" | "bass";
  answer: QuizAnswer;
  onChange: (a: QuizAnswer) => void;
}) {
  if (answer.type !== "staffSingleNote") return null;
  const m = answer.value.midi;
  return (
    <div className="space-y-3">
      <StaffMidiPreview midiNotes={[m]} clef={clef} />
      <PitchOctaveStrip
        value={m}
        onChange={(midi) =>
          onChange({
            type: "staffSingleNote",
            value: { midi },
          })
        }
      />
      <label className="block text-sm text-gray-700">
        MIDI (0–127)
        <input
          type="number"
          min={0}
          max={127}
          className={inputClass()}
          value={m}
          onChange={(e) =>
            onChange({
              type: "staffSingleNote",
              value: { midi: Math.min(127, Math.max(0, Number(e.target.value) || 0)) },
            })
          }
        />
      </label>
    </div>
  );
}

function StaffMelodyBlock({
  clef,
  q,
  answer,
  onChange,
}: {
  clef: "treble" | "bass";
  q: QuizQuestionWithId;
  answer: QuizAnswer;
  onChange: (a: QuizAnswer) => void;
}) {
  if (answer.type !== "staffMelody") return null;
  const midi = answer.value.midi;
  const maxNotes =
    (q.payload as { maxNotes?: number }).maxNotes != null
      ? Math.min(32, Math.max(1, Number((q.payload as { maxNotes?: number }).maxNotes)))
      : 32;
  const updateAt = (i: number, v: number) => {
    const next = midi.map((n, j) => (j === i ? v : n));
    onChange({ type: "staffMelody", value: { midi: next } });
  };
  return (
    <div className="space-y-3">
      <StaffMidiPreview midiNotes={midi} clef={clef} width={Math.min(520, 120 + midi.length * 56)} />
      <p className="text-sm text-gray-600">
        Set each pitch below (up to {maxNotes} notes).
      </p>
      {midi.map((n, idx) => (
        <div key={idx} className="rounded-lg border border-gray-100 p-3">
          <p className="mb-2 text-xs font-medium text-gray-600">Note {idx + 1}</p>
          <PitchOctaveStrip value={n} onChange={(v) => updateAt(idx, v)} />
          <label className="mt-2 block text-sm text-gray-700">
            MIDI
            <input
              type="number"
              min={0}
              max={127}
              className={`${inputClass()} mt-1 w-28`}
              value={n}
              onChange={(e) =>
                updateAt(idx, Math.min(127, Math.max(0, Number(e.target.value) || 0)))
              }
            />
          </label>
          {midi.length > 1 && (
            <button
              type="button"
              className="mt-2 text-sm text-red-600 hover:underline"
              onClick={() =>
                onChange({
                  type: "staffMelody",
                  value: { midi: midi.filter((_, j) => j !== idx) },
                })
              }
            >
              Remove note
            </button>
          )}
        </div>
      ))}
      {midi.length < maxNotes && (
        <button
          type="button"
          className="text-sm font-medium text-primary hover:underline"
          onClick={() => onChange({ type: "staffMelody", value: { midi: [...midi, 60] } })}
        >
          + Add note
        </button>
      )}
    </div>
  );
}
