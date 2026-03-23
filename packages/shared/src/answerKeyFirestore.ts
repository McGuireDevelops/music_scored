/**
 * Firestore does not allow arrays whose elements are arrays.
 * Chord-spelling answer keys use validSpellings: string[][]; we store a map instead.
 */

const ROWS_FIELD = "validSpellingsRows" as const;

export function encodeQuizAnswerKeyForFirestore(
  key: Record<string, unknown>
): Record<string, unknown> {
  const vs = key.validSpellings;
  if (!Array.isArray(vs) || vs.length === 0) {
    return { ...key };
  }
  if (!vs.every((row) => Array.isArray(row))) {
    return { ...key };
  }
  const validSpellingsRows: Record<string, string[]> = {};
  for (let i = 0; i < vs.length; i++) {
    validSpellingsRows[String(i)] = (vs[i] as unknown[]).map((x) => String(x));
  }
  const { validSpellings, ...rest } = key;
  return { ...rest, [ROWS_FIELD]: validSpellingsRows };
}

export function decodeQuizAnswerKeyFromFirestore(
  key: Record<string, unknown>
): Record<string, unknown> {
  const rows = key[ROWS_FIELD];
  if (!rows || typeof rows !== "object" || Array.isArray(rows)) {
    return { ...key };
  }
  const obj = rows as Record<string, unknown>;
  const indices = Object.keys(obj).sort((a, b) => Number(a) - Number(b));
  const validSpellings = indices.map((k) => {
    const row = obj[k];
    return Array.isArray(row) ? row.map((x) => String(x)) : [];
  });
  const { [ROWS_FIELD]: _drop, ...rest } = key;
  return { ...rest, validSpellings };
}
