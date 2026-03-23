import type { QuizQuestionPayload, QuizQuestionType } from "@learning-scores/shared";
import type { QuizQuestionWithId } from "../../hooks/useQuizzes";

export function createEmptyPayload(type: QuizQuestionType): QuizQuestionPayload {
  switch (type) {
    case "multipleChoiceSingle":
    case "multipleChoiceMulti":
      return {
        choices: [
          { key: "a", label: "" },
          { key: "b", label: "" },
        ],
        correctKeys: [],
      };
    case "chordIdentification":
      return {
        choices: [
          { key: "a", chord: "", inversion: undefined },
          { key: "b", chord: "", inversion: undefined },
        ],
        correctKey: "",
      };
    case "romanNumeral":
      return {
        validAnswers: [{ numeral: "", key: "" }],
      };
    case "nashville":
      return {
        validAnswers: [{ chord: "", key: "" }],
      };
    case "pitchClassSet":
      return { validVectors: [""] };
    case "intervalVector":
      return { validVectors: [""] };
    case "mixedMeter":
      return {
        validAnswers: [[{ numerator: 4, denominator: 4 }]],
      };
    case "polymeter":
      return {
        validAnswers: [
          {
            meters: [
              { numerator: 4, denominator: 4 },
              { numerator: 6, denominator: 8 },
            ],
          },
        ],
      };
    case "visualScore":
      return {
        scoreRef: { type: "score", resourceId: "" },
        correctRegions: [{ barStart: 1, barEnd: 1 }],
      };
    case "mediaTimeCode":
      return {
        prompt: "",
        correctSeconds: 0,
        toleranceSeconds: 0.5,
      };
    case "staffSingleNote":
      return { clef: "treble", correctMidi: 60 };
    case "staffMelody":
      return { maxNotes: 8, expectedMidi: [60, 62], clef: "treble" };
    case "chordSpelling":
      return {
        key: "C Major",
        chordLabel: "V7",
        answerMode: "either",
        toneCount: 4,
        validSpellings: [["G", "B", "D", "F"]],
        clef: "treble",
        expectedMidi: [67, 71, 74, 77],
      };
  }
}

export function payloadLooksValid(
  type: QuizQuestionType,
  payload: Record<string, unknown>
): boolean {
  switch (type) {
    case "multipleChoiceSingle":
    case "multipleChoiceMulti": {
      const choices = payload.choices as Array<{ label?: string }> | undefined;
      const correctKeys = payload.correctKeys as string[] | undefined;
      if (!choices?.length || choices.some((c) => !String(c.label ?? "").trim())) return false;
      if (type === "multipleChoiceSingle")
        return correctKeys != null && correctKeys.length === 1;
      return (correctKeys?.length ?? 0) >= 1;
    }
    case "chordIdentification": {
      const choices = payload.choices as Array<{ chord?: string; key: string }> | undefined;
      const correctKey = payload.correctKey as string | undefined;
      if (!choices?.length || choices.some((c) => !String(c.chord ?? "").trim())) return false;
      return !!correctKey && choices.some((c) => c.key === correctKey);
    }
    case "romanNumeral": {
      const rows = payload.validAnswers as Array<{ numeral?: string; key?: string }> | undefined;
      return !!rows?.length && rows.every((r) => r.numeral?.trim() && r.key?.trim());
    }
    case "nashville": {
      const rows = payload.validAnswers as Array<{ chord?: string; key?: string }> | undefined;
      return !!rows?.length && rows.every((r) => r.chord?.trim() && r.key?.trim());
    }
    case "pitchClassSet":
    case "intervalVector": {
      const v = payload.validVectors as string[] | undefined;
      return !!v?.length && v.every((s) => String(s).trim().length > 0);
    }
    case "mixedMeter": {
      const va = payload.validAnswers as Array<Array<{ numerator: number; denominator: number }>>;
      return (
        Array.isArray(va) &&
        va.length > 0 &&
        va.every(
          (seq) =>
            seq.length > 0 &&
            seq.every((m) => m.numerator > 0 && m.denominator > 0)
        )
      );
    }
    case "polymeter": {
      const va = payload.validAnswers as Array<{
        meters: Array<{ numerator: number; denominator: number }>;
      }>;
      return (
        Array.isArray(va) &&
        va.length > 0 &&
        va.every(
          (p) =>
            p.meters?.length > 0 &&
            p.meters.every((m) => m.numerator > 0 && m.denominator > 0)
        )
      );
    }
    case "visualScore": {
      const scoreRef = payload.scoreRef as { resourceId?: string } | undefined;
      return !!scoreRef?.resourceId?.trim();
    }
    case "mediaTimeCode": {
      const cs = Number(payload.correctSeconds);
      return Number.isFinite(cs) && cs >= 0;
    }
    case "staffSingleNote": {
      const m = Number(payload.correctMidi);
      return Number.isFinite(m) && m >= 0 && m <= 127;
    }
    case "staffMelody": {
      const arr = payload.expectedMidi as number[] | undefined;
      return Array.isArray(arr) && arr.length > 0 && arr.every((n) => n >= 0 && n <= 127);
    }
    case "chordSpelling": {
      const key = String(payload.key ?? "").trim();
      const chordLabel = String(payload.chordLabel ?? "").trim();
      const mode = payload.answerMode as string;
      const rows = payload.validSpellings as string[][] | undefined;
      const midi = payload.expectedMidi as number[] | undefined;
      const toneCount = Number(payload.toneCount);
      if (!key || !chordLabel) return false;
      if (!Number.isFinite(toneCount) || toneCount < 1 || toneCount > 12) return false;
      if (mode !== "text" && mode !== "staff" && mode !== "either") return false;
      const textOk =
        Array.isArray(rows) &&
        rows.length > 0 &&
        rows.every(
          (r) =>
            Array.isArray(r) &&
            r.length === toneCount &&
            r.every((n) => String(n ?? "").trim().length > 0)
        );
      const staffOk =
        Array.isArray(midi) &&
        midi.length > 0 &&
        midi.length === toneCount &&
        midi.every((n) => n >= 0 && n <= 127);
      if (mode === "text") return textOk;
      if (mode === "staff") return staffOk;
      return textOk && staffOk;
    }
    default:
      return false;
  }
}

export function summarizeQuestion(q: QuizQuestionWithId): string {
  const p = q.payload as Record<string, unknown>;
  switch (q.type) {
    case "multipleChoiceSingle":
    case "multipleChoiceMulti": {
      const choices = p.choices as Array<{ label?: string; key: string }> | undefined;
      return (
        choices
          ?.map((c) => c.label?.trim() || c.key)
          .filter(Boolean)
          .join(" · ") || "…"
      );
    }
    case "chordIdentification": {
      const choices = p.choices as Array<{ chord?: string }> | undefined;
      return choices?.map((c) => c.chord).filter(Boolean).join(" · ") || "…";
    }
    case "romanNumeral":
    case "nashville": {
      const rows = p.validAnswers as Array<Record<string, string>> | undefined;
      return rows?.length ? `${rows.length} accepted answer(s)` : "…";
    }
    case "pitchClassSet":
    case "intervalVector": {
      const v = p.validVectors as string[] | undefined;
      return v?.filter((x) => x.trim()).join(" · ") || "…";
    }
    case "mixedMeter":
      return `${(p.validAnswers as unknown[])?.length ?? 0} meter sequence(s)`;
    case "polymeter":
      return `${(p.validAnswers as unknown[])?.length ?? 0} polymeter answer(s)`;
    case "visualScore": {
      const ref = p.scoreRef as { resourceId?: string } | undefined;
      return ref?.resourceId ? ref.resourceId.split("/").pop() ?? "Score" : "…";
    }
    case "mediaTimeCode":
      return (p.prompt as string)?.trim() || `t = ${p.correctSeconds ?? "?"}s`;
    case "staffSingleNote":
      return `MIDI ${p.correctMidi ?? "?"}`;
    case "staffMelody":
      return `${(p.expectedMidi as number[])?.length ?? 0} notes`;
    case "chordSpelling": {
      const k = (p.key as string)?.trim() ?? "";
      const cl = (p.chordLabel as string)?.trim() ?? "";
      return k && cl ? `${k} — ${cl}` : "…";
    }
    default:
      return q.type;
  }
}
