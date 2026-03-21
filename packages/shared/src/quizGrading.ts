/**
 * Pure helpers for auto-grading quiz answers (used by Cloud Functions and optionally the web app).
 */

export function normalizeTheoryToken(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function normInv(s: string | undefined): string {
  return s == null ? "" : normalizeTheoryToken(s);
}

export function parsePitchClassTokens(raw: string): string[] {
  const parts = raw.split(/[\s,;|]+/).map((p) => p.trim()).filter(Boolean);
  return parts;
}

/** Normalize pitch-class set strings for comparison (order-independent). */
export function normalizePitchClassSetString(raw: string): string {
  const tokens = parsePitchClassTokens(raw);
  const nums = tokens
    .map((t) => {
      const n = parseInt(t, 10);
      return Number.isFinite(n) ? String(((n % 12) + 12) % 12) : normalizeTheoryToken(t);
    })
    .sort((a, b) => {
      const na = parseInt(a, 10);
      const nb = parseInt(b, 10);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      return a.localeCompare(b);
    });
  return nums.join(",");
}

/** Normalize interval vector: six digits, no spaces. */
export function normalizeIntervalVectorString(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 6 ? digits : normalizeTheoryToken(raw).replace(/\s/g, "");
}

export interface MeterFrac {
  numerator: number;
  denominator: number;
}

function metersSequencesEqual(
  a: MeterFrac[] | undefined,
  b: MeterFrac[] | undefined
): boolean {
  if (!a || !b || a.length !== b.length) return false;
  return a.every(
    (m, i) =>
      m.numerator === b[i].numerator && m.denominator === b[i].denominator
  );
}

function normalizeBarRegion(v: { barStart: number; barEnd: number }): {
  barStart: number;
  barEnd: number;
} {
  const s = Number(v.barStart);
  const e = Number(v.barEnd);
  if (!Number.isFinite(s) || !Number.isFinite(e)) return v;
  return s <= e ? { barStart: s, barEnd: e } : { barStart: e, barEnd: s };
}

function regionsEqual(
  a: { barStart: number; barEnd: number },
  b: { barStart: number; barEnd: number }
): boolean {
  const A = normalizeBarRegion(a);
  const B = normalizeBarRegion(b);
  return A.barStart === B.barStart && A.barEnd === B.barEnd;
}

export function computeMultipleChoicePoints(
  keyData: Record<string, unknown>,
  selectedKeys: string[],
  points: number
): number {
  const correctKeys = (keyData.correctKeys ?? []) as string[];
  if (keyData.partialCreditMap) {
    const map = keyData.partialCreditMap as Record<string, number>;
    let p = 0;
    for (const k of selectedKeys) p += map[k] ?? 0;
    return Math.min(p, points);
  }
  const correctSet = new Set(correctKeys);
  const selectedSet = new Set(selectedKeys);
  const isCorrect =
    correctSet.size === selectedSet.size &&
    [...correctSet].every((k) => selectedSet.has(k));
  return isCorrect ? points : 0;
}

export function computeQuestionPoints(
  questionType: string,
  keyData: Record<string, unknown>,
  answer: { type: string; value: unknown },
  points: number
): number {
  if (questionType === "multipleChoiceSingle" || questionType === "multipleChoiceMulti") {
    if (answer.type !== "multipleChoice") return 0;
    const selected = (answer.value as string[]) ?? [];
    return computeMultipleChoicePoints(keyData, selected, points);
  }

  if (questionType === "chordIdentification") {
    if (answer.type !== "chordIdentification") return 0;
    const v = answer.value as { key?: string };
    const correctKey = keyData.correctKey as string | undefined;
    if (correctKey == null || v?.key == null) return 0;
    return normalizeTheoryToken(v.key) === normalizeTheoryToken(correctKey) ? points : 0;
  }

  if (questionType === "romanNumeral") {
    if (answer.type !== "romanNumeral") return 0;
    const v = answer.value as {
      numeral?: string;
      key?: string;
      inversion?: string;
    };
    const validAnswers = (keyData.validAnswers ?? []) as Array<{
      numeral: string;
      key: string;
      inversion?: string;
    }>;
    if (!v?.numeral || !v?.key) return 0;
    const sn = normalizeTheoryToken(v.numeral);
    const sk = normalizeTheoryToken(v.key);
    const si = normInv(v.inversion);
    for (const va of validAnswers) {
      if (normalizeTheoryToken(va.numeral) !== sn) continue;
      if (normalizeTheoryToken(va.key) !== sk) continue;
      const expectedInv = va.inversion;
      if (expectedInv != null && expectedInv !== "") {
        if (si !== normInv(expectedInv)) continue;
      }
      return points;
    }
    return 0;
  }

  if (questionType === "nashville") {
    if (answer.type !== "nashville") return 0;
    const v = answer.value as { chord?: string; key?: string };
    const validAnswers = (keyData.validAnswers ?? []) as Array<{
      chord: string;
      key: string;
    }>;
    if (!v?.chord || !v?.key) return 0;
    const sc = normalizeTheoryToken(v.chord);
    const sk = normalizeTheoryToken(v.key);
    for (const va of validAnswers) {
      if (normalizeTheoryToken(va.chord) === sc && normalizeTheoryToken(va.key) === sk) {
        return points;
      }
    }
    return 0;
  }

  if (questionType === "pitchClassSet") {
    if (answer.type !== "pitchClassSet") return 0;
    const v = answer.value as { vector?: string };
    const validVectors = (keyData.validVectors ?? []) as string[];
    if (!v?.vector) return 0;
    const norm = normalizePitchClassSetString(v.vector);
    for (const vv of validVectors) {
      if (normalizePitchClassSetString(vv) === norm) return points;
    }
    return 0;
  }

  if (questionType === "intervalVector") {
    if (answer.type !== "intervalVector") return 0;
    const v = answer.value as { vector?: string };
    const validVectors = (keyData.validVectors ?? []) as string[];
    if (!v?.vector) return 0;
    const norm = normalizeIntervalVectorString(v.vector);
    for (const vv of validVectors) {
      if (normalizeIntervalVectorString(vv) === norm) return points;
    }
    return 0;
  }

  if (questionType === "mixedMeter") {
    if (answer.type !== "mixedMeter") return 0;
    const student = answer.value as MeterFrac[] | undefined;
    const validAnswers = (keyData.validAnswers ?? []) as MeterFrac[][];
    if (!Array.isArray(student) || student.length === 0) return 0;
    for (const seq of validAnswers) {
      if (metersSequencesEqual(seq, student)) return points;
    }
    return 0;
  }

  if (questionType === "polymeter") {
    if (answer.type !== "polymeter") return 0;
    const v = answer.value as { meters?: MeterFrac[] };
    const student = v?.meters;
    const validAnswers = (keyData.validAnswers ?? []) as Array<{
      meters: MeterFrac[];
    }>;
    if (!Array.isArray(student) || student.length === 0) return 0;
    for (const va of validAnswers) {
      if (metersSequencesEqual(va.meters, student)) return points;
    }
    return 0;
  }

  if (questionType === "visualScore") {
    if (answer.type !== "visualScore") return 0;
    const regions = (keyData.correctRegions ?? []) as Array<{
      barStart: number;
      barEnd: number;
    }>;
    if (regions.length === 0) return 0;
    const val = answer.value as
      | { barStart?: number; barEnd?: number }
      | { coordinates?: unknown }
      | undefined;
    if (
      !val ||
      typeof (val as { barStart?: number }).barStart !== "number" ||
      typeof (val as { barEnd?: number }).barEnd !== "number"
    ) {
      return 0;
    }
    const studentRegion = val as { barStart: number; barEnd: number };
    for (const r of regions) {
      if (regionsEqual(studentRegion, r)) return points;
    }
    return 0;
  }

  if (questionType === "mediaTimeCode") {
    if (answer.type !== "mediaTimeCode") return 0;
    const correctSeconds = Number(keyData.correctSeconds);
    const tolerance = Number(keyData.toleranceSeconds ?? 0);
    if (!Number.isFinite(correctSeconds)) return 0;
    const v = answer.value as { seconds?: number } | undefined;
    const submitted = Number(v?.seconds);
    if (!Number.isFinite(submitted)) return 0;
    return Math.abs(submitted - correctSeconds) <= tolerance ? points : 0;
  }

  if (questionType === "staffSingleNote") {
    if (answer.type !== "staffSingleNote") return 0;
    const correctMidi = Number(keyData.correctMidi);
    if (!Number.isFinite(correctMidi)) return 0;
    const v = answer.value as { midi?: number } | undefined;
    const m = Number(v?.midi);
    return Number.isFinite(m) && m === correctMidi ? points : 0;
  }

  if (questionType === "staffMelody") {
    if (answer.type !== "staffMelody") return 0;
    const expected = keyData.expectedMidi as number[] | undefined;
    const v = answer.value as { midi?: number[] } | undefined;
    const got = v?.midi;
    if (!Array.isArray(expected) || !Array.isArray(got)) return 0;
    if (expected.length !== got.length) return 0;
    return expected.every((n, i) => n === got[i]) ? points : 0;
  }

  return 0;
}
