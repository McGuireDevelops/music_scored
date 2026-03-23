/**
 * Music-theory helpers for chord spelling quizzes and grading.
 * Major keys use diatonic spelling; minor keys use harmonic minor for scale degrees.
 */

const LETTER_PC: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/** All keys offered in UI (tonic + quality label). */
export function allKeys(): string[] {
  const majors = [
    "C",
    "G",
    "D",
    "A",
    "E",
    "B",
    "F#",
    "C#",
    "F",
    "Bb",
    "Eb",
    "Ab",
    "Db",
    "Gb",
  ];
  const keys: string[] = [];
  for (const t of majors) {
    keys.push(`${t} Major`);
    keys.push(`${t} Minor`);
  }
  return keys;
}

/** Common Roman labels for template / quick generate. */
export function commonChordTypes(): string[] {
  return [
    "I",
    "ii",
    "iii",
    "IV",
    "V",
    "vi",
    "vii°",
    "I7",
    "ii7",
    "iii7",
    "IV7",
    "V7",
    "vi7",
    "ii6",
    "IV6",
    "iv",
    "iv6",
    "VI",
    "VI6",
    "III",
    "III7",
    "iiø7",
    "viiø7",
  ];
}

function parseAccidentals(s: string, start: number): { end: number; delta: number } {
  let i = start;
  let delta = 0;
  while (i < s.length) {
    if (s[i] === "#" || s[i] === "♯") {
      delta += 1;
      i += 1;
    } else if (s[i] === "b" || s[i] === "♭") {
      delta -= 1;
      i += 1;
    } else break;
  }
  return { end: i, delta };
}

/** Parse a note name like "G", "F#", "Bb", "Ebb" to pitch class 0–11. */
export function noteNameToPitchClass(raw: string): number | null {
  const s = raw.trim();
  if (!s.length) return null;
  const letter = s[0].toUpperCase();
  const base = LETTER_PC[letter];
  if (base === undefined) return null;
  const { delta } = parseAccidentals(s, 1);
  return ((base + delta) % 12 + 12) % 12;
}

/** Preferred display names for each pitch class in sharp and flat keys. */
const PC_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const PC_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

function tonicPrefersFlats(tonicName: string): boolean {
  const t = tonicName.trim();
  return t.includes("b") || t === "F" || t === "C";
}

export function pitchClassToNoteName(pc: number, preferFlats: boolean): string {
  const n = ((pc % 12) + 12) % 12;
  return preferFlats ? PC_FLAT[n] : PC_SHARP[n];
}

function parseKeyString(key: string): { tonic: string; mode: "major" | "minor" } | null {
  const k = key.trim();
  const majorM = k.match(/^(.+?)\s+Major$/i);
  if (majorM) return { tonic: majorM[1].trim(), mode: "major" };
  const minorM = k.match(/^(.+?)\s+Minor$/i);
  if (minorM) return { tonic: minorM[1].trim(), mode: "minor" };
  return null;
}

function majorScalePitchClasses(tonicPc: number): number[] {
  const pat = [0, 2, 4, 5, 7, 9, 11];
  return pat.map((i) => (tonicPc + i) % 12);
}

/** Harmonic minor: natural minor with raised 7th. */
function harmonicMinorScalePitchClasses(tonicPc: number): number[] {
  const natural = [0, 2, 3, 5, 7, 8, 10];
  const pcs = natural.map((i) => (tonicPc + i) % 12);
  pcs[6] = (tonicPc + 11) % 12;
  return pcs;
}

function scalePitchClasses(tonicPc: number, mode: "major" | "minor"): number[] {
  return mode === "major"
    ? majorScalePitchClasses(tonicPc)
    : harmonicMinorScalePitchClasses(tonicPc);
}

function spellScale(
  tonicName: string,
  mode: "major" | "minor"
): { pcs: number[]; names: string[] } | null {
  const tpc = noteNameToPitchClass(tonicName);
  if (tpc === null) return null;
  const pcs = scalePitchClasses(tpc, mode);
  const preferFlats = tonicPrefersFlats(tonicName);
  const names = pcs.map((pc) => pitchClassToNoteName(pc, preferFlats));
  return { pcs, names };
}

const ROMAN_ROWS: Array<{
  pattern: string;
  degree: number;
  triad: "maj" | "min" | "dim";
  caseSensitive?: boolean;
}> = [
  { pattern: "vii°", degree: 6, triad: "dim" },
  { pattern: "vii", degree: 6, triad: "dim" },
  { pattern: "iii", degree: 2, triad: "min" },
  { pattern: "III", degree: 2, triad: "maj", caseSensitive: true },
  { pattern: "IV", degree: 3, triad: "maj", caseSensitive: true },
  { pattern: "VI", degree: 5, triad: "maj", caseSensitive: true },
  { pattern: "ii", degree: 1, triad: "min" },
  { pattern: "iv", degree: 3, triad: "min" },
  { pattern: "vi", degree: 5, triad: "min" },
  { pattern: "V", degree: 4, triad: "maj", caseSensitive: true },
  { pattern: "I", degree: 0, triad: "maj", caseSensitive: true },
];

export interface ParsedChordLabel {
  degreeIndex: number;
  triad: "maj" | "min" | "dim";
  seventh?: "dom7" | "min7" | "maj7" | "halfdim7" | "dim7";
  /** First inversion of triad (figured 6); ignored if seventh present */
  firstInversion?: boolean;
}

function matchRoman(romanPart: string): {
  degree: number;
  triad: "maj" | "min" | "dim";
  rest: string;
  pattern: string;
} | null {
  const rp = romanPart.replace(/º/g, "°");
  for (const row of ROMAN_ROWS) {
    const p = row.caseSensitive ? row.pattern : row.pattern.toLowerCase();
    const head = row.caseSensitive ? rp : rp.toLowerCase();
    const pl = p.length;
    if (head.length < pl) continue;
    const slice = row.caseSensitive ? rp.slice(0, pl) : head.slice(0, pl);
    const cmp = row.caseSensitive ? slice === p : slice === p;
    if (!cmp) continue;
    let triad = row.triad;
    const tail = rp.slice(pl);
    if (tail.startsWith("°") || tail.toLowerCase().startsWith("o")) {
      triad = "dim";
    }
    return {
      degree: row.degree,
      triad,
      rest: tail.replace(/^°|^o/i, ""),
      pattern: row.pattern,
    };
  }
  return null;
}

export function parseChordLabel(label: string): ParsedChordLabel | null {
  let s = label.trim().replace(/\s+/g, "");
  s = s.replace(/º/g, "°");

  let firstInversion = false;
  if (s.includes("64")) {
    s = s.replace(/64/g, "");
  } else if (/6/.test(s)) {
    firstInversion = true;
    s = s.replace(/6/g, "");
  }

  let seventh: ParsedChordLabel["seventh"];
  if (/ø/i.test(s) || /halfdim/i.test(s)) {
    seventh = "halfdim7";
    s = s.replace(/ø/gi, "").replace(/halfdim/gi, "");
  }

  let hadTrailing7 = false;
  if (/7$/.test(s)) {
    hadTrailing7 = true;
    s = s.replace(/7$/, "");
  }

  const matched = matchRoman(s);
  if (!matched) return null;

  let triad = matched.triad;
  if (matched.rest.startsWith("°") || matched.rest.toLowerCase().startsWith("o")) {
    triad = "dim";
  }

  if (hadTrailing7 && !seventh) {
    if (triad === "min") seventh = "min7";
    else if (triad === "dim") seventh = "dim7";
    else if (triad === "maj") {
      seventh = matched.pattern === "V" ? "dom7" : "maj7";
    }
  }

  if (seventh === "halfdim7") triad = "dim";

  return {
    degreeIndex: matched.degree,
    triad,
    seventh,
    firstInversion: seventh ? false : firstInversion,
  };
}

function triadPitchClasses(rootPc: number, triad: "maj" | "min" | "dim"): number[] {
  if (triad === "maj") return [rootPc, (rootPc + 4) % 12, (rootPc + 7) % 12];
  if (triad === "min") return [rootPc, (rootPc + 3) % 12, (rootPc + 7) % 12];
  return [rootPc, (rootPc + 3) % 12, (rootPc + 6) % 12];
}

function seventhPitchClasses(
  rootPc: number,
  seventh: NonNullable<ParsedChordLabel["seventh"]>
): number[] {
  if (seventh === "halfdim7") {
    return [
      rootPc,
      (rootPc + 3) % 12,
      (rootPc + 6) % 12,
      (rootPc + 10) % 12,
    ];
  }
  if (seventh === "dim7") {
    return [
      rootPc,
      (rootPc + 3) % 12,
      (rootPc + 6) % 12,
      (rootPc + 9) % 12,
    ];
  }
  const tri = triadPitchClasses(
    rootPc,
    seventh === "min7" ? "min" : "maj"
  );
  if (seventh === "dom7") return [...tri, (rootPc + 10) % 12];
  if (seventh === "min7") return [...tri, (rootPc + 10) % 12];
  if (seventh === "maj7") return [...tri, (rootPc + 11) % 12];
  return [...tri, (rootPc + 10) % 12];
}

/**
 * Spell chord in close position (root position unless first inversion triad).
 * Returns note names using key-appropriate sharps/flats when possible.
 */
export function spellChord(key: string, chordLabel: string): string[] | null {
  const parsedKey = parseKeyString(key);
  if (!parsedKey) return null;
  const scale = spellScale(parsedKey.tonic, parsedKey.mode);
  if (!scale) return null;

  const parsed = parseChordLabel(chordLabel);
  if (!parsed) return null;

  const rootPc = scale.pcs[parsed.degreeIndex]!;
  let pcs: number[];
  if (parsed.seventh) {
    pcs = seventhPitchClasses(rootPc, parsed.seventh);
  } else {
    pcs = triadPitchClasses(rootPc, parsed.triad);
    if (parsed.firstInversion && pcs.length === 3) {
      const [r, t, f] = pcs;
      pcs = [t, f, r];
    }
  }

  const preferFlats = tonicPrefersFlats(parsedKey.tonic);
  return pcs.map((pc) => pitchClassToNoteName(pc, preferFlats));
}

/** MIDI numbers for chord tones starting near `rootOctave` (default 4). */
export function chordToMidi(
  key: string,
  chordLabel: string,
  rootOctave: number = 4
): number[] | null {
  const names = spellChord(key, chordLabel);
  if (!names) return null;
  const parsedKey = parseKeyString(key);
  if (!parsedKey) return null;
  const tonicPc = noteNameToPitchClass(parsedKey.tonic);
  if (tonicPc === null) return null;
  const scale = scalePitchClasses(tonicPc, parsedKey.mode);
  const parsed = parseChordLabel(chordLabel);
  if (!parsed) return null;
  const rootPc = scale[parsed.degreeIndex]!;
  let pcs: number[];
  if (parsed.seventh) {
    pcs = seventhPitchClasses(rootPc, parsed.seventh);
  } else {
    pcs = triadPitchClasses(rootPc, parsed.triad);
    if (parsed.firstInversion && pcs.length === 3) {
      const [r, t, f] = pcs;
      pcs = [t, f, r];
    }
  }

  const base = rootOctave * 12 + 12;
  let last = -1;
  const midi: number[] = [];
  for (const pc of pcs) {
    let m = base + pc;
    while (m <= last) m += 12;
    while (m > 127) m -= 12;
    last = m;
    midi.push(m);
  }
  return midi;
}

/** Sorted pitch-class multiset for a list of note names. */
export function noteNamesToSortedPitchClasses(names: string[]): number[] | null {
  const pcs: number[] = [];
  for (const n of names) {
    const pc = noteNameToPitchClass(n);
    if (pc === null) return null;
    pcs.push(pc);
  }
  return [...pcs].sort((a, b) => a - b);
}

/** True if student spelling matches any accepted row (order-independent, enharmonic by PC). */
export function chordSpellingMatches(
  studentNames: string[],
  validSpellings: string[][]
): boolean {
  const studentPcs = noteNamesToSortedPitchClasses(studentNames);
  if (!studentPcs) return false;
  for (const row of validSpellings) {
    const rowPcs = noteNamesToSortedPitchClasses(row);
    if (!rowPcs) continue;
    if (
      studentPcs.length === rowPcs.length &&
      studentPcs.every((v, i) => v === rowPcs[i])
    ) {
      return true;
    }
  }
  return false;
}

export function sortedMidiPitchClassesEqual(a: number[], b: number[]): boolean {
  const norm = (arr: number[]) =>
    [...arr].map((m) => ((Number(m) % 12) + 12) % 12).sort((x, y) => x - y);
  const A = norm(a);
  const B = norm(b);
  if (A.length !== B.length) return false;
  return A.every((v, i) => v === B[i]);
}
