import type { QuizQuestionWithId } from "../hooks/useQuizzes";

export function formatAttemptAnswerDisplay(
  q: QuizQuestionWithId,
  answer: { type: string; value: unknown } | undefined
): { student: string; correct: string } {
  const p = q.payload as Record<string, unknown>;
  if (!answer) {
    return { student: "—", correct: formatCorrectOnly(q) };
  }

  switch (answer.type) {
    case "multipleChoice": {
      const keys = (answer.value as string[]) ?? [];
      const choices = (p.choices as Array<{ key: string; label: string }>) ?? [];
      const labelFor = (k: string) => choices.find((c) => c.key === k)?.label ?? k;
      const student = keys.map(labelFor).join(", ") || "—";
      const correctKeys = (p.correctKeys as string[]) ?? [];
      const correct = correctKeys.map(labelFor).join(", ") || "—";
      return { student, correct };
    }
    case "chordIdentification": {
      const sel = (answer.value as { key: string }).key;
      const choices = (p.choices as Array<{ key: string; chord: string }>) ?? [];
      const student = choices.find((c) => c.key === sel)?.chord ?? sel ?? "—";
      const ck = p.correctKey as string;
      const correct = choices.find((c) => c.key === ck)?.chord ?? ck ?? "—";
      return { student, correct };
    }
    case "romanNumeral": {
      const v = answer.value as { numeral: string; key: string; inversion?: string };
      const student = `${v.numeral} in ${v.key}${v.inversion ? ` (${v.inversion})` : ""}`;
      const rows = (p.validAnswers as Array<Record<string, string>>) ?? [];
      const correct =
        rows.map((r) => `${r.numeral} in ${r.key}${r.inversion ? ` (${r.inversion})` : ""}`).join(" · ") ||
        "—";
      return { student, correct };
    }
    case "nashville": {
      const v = answer.value as { chord: string; key: string };
      const student = `${v.chord} in ${v.key}`;
      const rows = (p.validAnswers as Array<{ chord: string; key: string }>) ?? [];
      const correct = rows.map((r) => `${r.chord} in ${r.key}`).join(" · ") || "—";
      return { student, correct };
    }
    case "pitchClassSet": {
      const v = answer.value as { vector: string };
      const student = v.vector || "—";
      const vv = (p.validVectors as string[]) ?? [];
      const correct = vv.join(" · ") || "—";
      return { student, correct };
    }
    case "intervalVector": {
      const v = answer.value as { vector: string };
      const student = v.vector || "—";
      const vv = (p.validVectors as string[]) ?? [];
      const correct = vv.join(" · ") || "—";
      return { student, correct };
    }
    case "mixedMeter": {
      const seq = answer.value as Array<{ numerator: number; denominator: number }>;
      const student = seq.map((m) => `${m.numerator}/${m.denominator}`).join(" → ") || "—";
      const va = (p.validAnswers as typeof seq[]) ?? [];
      const correct = va
        .map((s) => s.map((m) => `${m.numerator}/${m.denominator}`).join(" → "))
        .join(" | ") || "—";
      return { student, correct };
    }
    case "polymeter": {
      const meters = (answer.value as { meters: Array<{ numerator: number; denominator: number }> })
        .meters;
      const student = meters.map((m) => `${m.numerator}/${m.denominator}`).join(" + ") || "—";
      const va = (p.validAnswers as Array<{ meters: typeof meters }>) ?? [];
      const correct = va
        .map((r) => r.meters.map((m) => `${m.numerator}/${m.denominator}`).join(" + "))
        .join(" | ") || "—";
      return { student, correct };
    }
    case "visualScore": {
      const v = answer.value as { barStart: number; barEnd: number };
      const student =
        typeof v.barStart === "number" && typeof v.barEnd === "number"
          ? `Bars ${v.barStart}–${v.barEnd}`
          : "—";
      const regions = (p.correctRegions as Array<{ barStart: number; barEnd: number }>) ?? [];
      const correct =
        regions.map((r) => `Bars ${r.barStart}–${r.barEnd}`).join(" · ") || "—";
      return { student, correct };
    }
    case "mediaTimeCode": {
      const sec = (answer.value as { seconds: number }).seconds;
      const student = Number.isFinite(sec) ? `${sec}s` : "—";
      const cs = p.correctSeconds;
      const tol = p.toleranceSeconds;
      const correct =
        Number.isFinite(Number(cs)) ? `${cs}s (±${tol ?? 0}s)` : "—";
      return { student, correct };
    }
    case "staffSingleNote": {
      const m = (answer.value as { midi: number }).midi;
      const student = Number.isFinite(m) ? `MIDI ${m}` : "—";
      const cm = p.correctMidi;
      const correct = Number.isFinite(Number(cm)) ? `MIDI ${cm}` : "—";
      return { student, correct };
    }
    case "staffMelody": {
      const midi = (answer.value as { midi: number[] }).midi;
      const student = Array.isArray(midi) ? midi.join(", ") : "—";
      const exp = p.expectedMidi as number[] | undefined;
      const correct = Array.isArray(exp) ? exp.join(", ") : "—";
      return { student, correct };
    }
    default:
      return {
        student: JSON.stringify(answer.value ?? null),
        correct: formatCorrectOnly(q),
      };
  }
}

function formatCorrectOnly(q: QuizQuestionWithId): string {
  const p = q.payload as Record<string, unknown>;
  switch (q.type) {
    case "multipleChoiceSingle":
    case "multipleChoiceMulti": {
      const choices = (p.choices as Array<{ key: string; label: string }>) ?? [];
      const correctKeys = (p.correctKeys as string[]) ?? [];
      return correctKeys.map((k) => choices.find((c) => c.key === k)?.label ?? k).join(", ") || "—";
    }
    case "chordIdentification": {
      const ck = p.correctKey as string;
      const choices = (p.choices as Array<{ key: string; chord: string }>) ?? [];
      return choices.find((c) => c.key === ck)?.chord ?? ck ?? "—";
    }
    case "romanNumeral": {
      const rows = (p.validAnswers as Array<Record<string, string>>) ?? [];
      return rows
        .map((r) => `${r.numeral} in ${r.key}${r.inversion ? ` (${r.inversion})` : ""}`)
        .join(" · ") || "—";
    }
    case "nashville": {
      const rows = (p.validAnswers as Array<{ chord: string; key: string }>) ?? [];
      return rows.map((r) => `${r.chord} in ${r.key}`).join(" · ") || "—";
    }
    case "pitchClassSet":
    case "intervalVector":
      return ((p.validVectors as string[]) ?? []).join(" · ") || "—";
    case "mixedMeter": {
      const va = (p.validAnswers as Array<Array<{ numerator: number; denominator: number }>>) ?? [];
      return va
        .map((s) => s.map((m) => `${m.numerator}/${m.denominator}`).join(" → "))
        .join(" | ") || "—";
    }
    case "polymeter": {
      const va = (p.validAnswers as Array<{ meters: Array<{ numerator: number; denominator: number }> }>) ?? [];
      return va
        .map((r) => r.meters.map((m) => `${m.numerator}/${m.denominator}`).join(" + "))
        .join(" | ") || "—";
    }
    case "visualScore": {
      const regions = (p.correctRegions as Array<{ barStart: number; barEnd: number }>) ?? [];
      return regions.map((r) => `Bars ${r.barStart}–${r.barEnd}`).join(" · ") || "—";
    }
    case "mediaTimeCode": {
      const cs = p.correctSeconds;
      const tol = p.toleranceSeconds;
      return Number.isFinite(Number(cs)) ? `${cs}s (±${tol ?? 0}s)` : "—";
    }
    case "staffSingleNote": {
      const cm = p.correctMidi;
      return Number.isFinite(Number(cm)) ? `MIDI ${cm}` : "—";
    }
    case "staffMelody": {
      const exp = p.expectedMidi as number[] | undefined;
      return Array.isArray(exp) ? exp.join(", ") : "—";
    }
    default:
      return "—";
  }
}
