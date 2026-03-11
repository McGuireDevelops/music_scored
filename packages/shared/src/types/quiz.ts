/**
 * Quiz engine types - structured answers only, no plain strings
 */

import type { MediaReference } from "../media-reference.js";

export type QuizQuestionType =
  | "multipleChoiceSingle"
  | "multipleChoiceMulti"
  | "chordIdentification"
  | "romanNumeral"
  | "nashville"
  | "pitchClassSet"
  | "intervalVector"
  | "mixedMeter"
  | "polymeter"
  | "visualScore";

export interface MultipleChoicePayload {
  choices: Array<{ key: string; label: string }>;
  correctKeys: string[];
  partialCreditMap?: Record<string, number>;
}

export interface ChordIdentificationPayload {
  choices: Array<{ key: string; chord: string; inversion?: string }>;
  correctKey: string;
}

export interface RomanNumeralPayload {
  validAnswers: Array<{
    numeral: string;
    key: string;
    inversion?: string;
    alterations?: string[];
  }>;
}

export interface NashvillePayload {
  validAnswers: Array<{
    chord: string;
    key: string;
  }>;
}

export interface PitchClassSetPayload {
  validVectors: string[];
  format?: "forte" | "prime";
}

export interface IntervalVectorPayload {
  validVectors: string[];
}

export interface MixedMeterPayload {
  validAnswers: Array<{ numerator: number; denominator: number }[]>;
}

export interface PolymeterPayload {
  validAnswers: Array<{ meters: Array<{ numerator: number; denominator: number }> }>;
}

export interface VisualScorePayload {
  scoreRef: MediaReference;
  correctRegions?: Array<{ barStart: number; barEnd: number }>;
}

export type QuizQuestionPayload =
  | MultipleChoicePayload
  | ChordIdentificationPayload
  | RomanNumeralPayload
  | NashvillePayload
  | PitchClassSetPayload
  | IntervalVectorPayload
  | MixedMeterPayload
  | PolymeterPayload
  | VisualScorePayload;

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  payload: QuizQuestionPayload;
  mediaRef?: MediaReference;
  points?: number;
}

export interface QuizAnswerRomanNumeral {
  type: "romanNumeral";
  value: { numeral: string; key: string; inversion?: string };
}

export interface QuizAnswerNashville {
  type: "nashville";
  value: { chord: string; key: string };
}

export interface QuizAnswerMultipleChoice {
  type: "multipleChoice";
  value: string[]; // selected keys
}

export interface QuizAnswerChordId {
  type: "chordIdentification";
  value: { key: string };
}

export interface QuizAnswerPitchClassSet {
  type: "pitchClassSet";
  value: { vector: string };
}

export interface QuizAnswerIntervalVector {
  type: "intervalVector";
  value: { vector: string };
}

export interface QuizAnswerMixedMeter {
  type: "mixedMeter";
  value: Array<{ numerator: number; denominator: number }>;
}

export interface QuizAnswerPolymeter {
  type: "polymeter";
  value: { meters: Array<{ numerator: number; denominator: number }> };
}

export interface QuizAnswerVisualScore {
  type: "visualScore";
  value: { barStart: number; barEnd: number } | { coordinates?: unknown };
}

export type QuizAnswer =
  | QuizAnswerRomanNumeral
  | QuizAnswerNashville
  | QuizAnswerMultipleChoice
  | QuizAnswerChordId
  | QuizAnswerPitchClassSet
  | QuizAnswerIntervalVector
  | QuizAnswerMixedMeter
  | QuizAnswerPolymeter
  | QuizAnswerVisualScore;

export interface QuizAttemptAnswer {
  questionId: string;
  answer: QuizAnswer;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  answers: QuizAttemptAnswer[];
  score?: number;
  maxScore?: number;
  completedAt: number;
}

export interface Quiz {
  id: string;
  classId: string;
  moduleId?: string;
  ownerId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}
