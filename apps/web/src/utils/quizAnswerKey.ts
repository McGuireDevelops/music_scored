/**
 * Utilities for separating correct answers from question payloads.
 * Correct answers live in answerKey subcollection; student-facing questions are sanitized.
 */

import type { QuizQuestionType, QuizQuestionPayload } from "@learning-scores/shared";

/** Keys that must be stripped from payload when serving to students */
const ANSWER_KEYS = [
  "correctKeys",
  "correctKey",
  "validAnswers",
  "validVectors",
  "correctRegions",
  "correctSeconds",
  "toleranceSeconds",
  "correctMidi",
  "expectedMidi",
] as const;

/** Create a student-safe payload (no correct answer data) */
export function sanitizePayloadForStudent(
  payload: Record<string, unknown>,
  _type: QuizQuestionType
): Record<string, unknown> {
  const sanitized = { ...payload };
  for (const key of ANSWER_KEYS) {
    delete sanitized[key];
  }
  return sanitized;
}

/** Extract answer key data for storage in answerKey subcollection */
export function extractAnswerKey(
  payload: Record<string, unknown>,
  type: string
): Record<string, unknown> | null {
  const key: Record<string, unknown> = {};
  if (payload.correctKeys !== undefined) {
    key.correctKeys = payload.correctKeys;
  }
  if (payload.correctKey !== undefined) {
    key.correctKey = payload.correctKey;
  }
  if (payload.validAnswers !== undefined) {
    key.validAnswers = payload.validAnswers;
  }
  if (payload.validVectors !== undefined) {
    key.validVectors = payload.validVectors;
  }
  if (payload.correctRegions !== undefined) {
    key.correctRegions = payload.correctRegions;
  }
  if (payload.partialCreditMap !== undefined) {
    key.partialCreditMap = payload.partialCreditMap;
  }
  if (payload.correctSeconds !== undefined) {
    key.correctSeconds = payload.correctSeconds;
  }
  if (payload.toleranceSeconds !== undefined) {
    key.toleranceSeconds = payload.toleranceSeconds;
  }
  if (payload.correctMidi !== undefined) {
    key.correctMidi = payload.correctMidi;
  }
  if (payload.expectedMidi !== undefined) {
    key.expectedMidi = payload.expectedMidi;
  }
  return Object.keys(key).length > 0 ? key : null;
}

/** Merge answer key back into payload (for teacher editing) */
export function mergeAnswerKeyIntoPayload(
  payload: Record<string, unknown>,
  answerKey: Record<string, unknown> | null
): Record<string, unknown> {
  if (!answerKey) return payload;
  return { ...payload, ...answerKey };
}
