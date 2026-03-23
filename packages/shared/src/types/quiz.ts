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
  | "visualScore"
  | "mediaTimeCode"
  | "staffSingleNote"
  | "staffMelody"
  | "chordSpelling";

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

/** Student sees `prompt` and optional `mediaRef`; grading fields are stripped into answerKey. */
export interface MediaTimeCodePayload {
  prompt?: string;
  correctSeconds?: number;
  toleranceSeconds?: number;
}

export interface StaffSingleNotePayload {
  clef?: "treble" | "bass";
  correctMidi?: number;
}

export interface StaffMelodyPayload {
  maxNotes?: number;
  expectedMidi?: number[];
  clef?: "treble" | "bass";
}

export interface ChordSpellingPayload {
  key: string;
  chordLabel: string;
  answerMode: "text" | "staff" | "either";
  /** Shown to students (expectedMidi is hidden). */
  toneCount: number;
  validSpellings: string[][];
  clef?: "treble" | "bass";
  expectedMidi?: number[];
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
  | VisualScorePayload
  | MediaTimeCodePayload
  | StaffSingleNotePayload
  | StaffMelodyPayload
  | ChordSpellingPayload;

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  payload: QuizQuestionPayload;
  mediaRef?: MediaReference;
  points?: number;
  /** Display order within the quiz (0-based). Omitted on legacy documents until reordered. */
  order?: number;
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

export interface QuizAnswerMediaTimeCode {
  type: "mediaTimeCode";
  value: { seconds: number };
}

export interface QuizAnswerStaffSingleNote {
  type: "staffSingleNote";
  value: { midi: number };
}

export interface QuizAnswerStaffMelody {
  type: "staffMelody";
  value: { midi: number[] };
}

export interface QuizAnswerChordSpelling {
  type: "chordSpelling";
  value: {
    noteNames?: string[];
    midi?: number[];
  };
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
  | QuizAnswerVisualScore
  | QuizAnswerMediaTimeCode
  | QuizAnswerStaffSingleNote
  | QuizAnswerStaffMelody
  | QuizAnswerChordSpelling;

export interface QuizAttemptAnswer {
  questionId: string;
  answer: QuizAnswer;
}

export type QuizCorrectionMode = "auto" | "manual";
export type QuizGradedBy = "auto" | "manual" | "printed_ai";

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  answers: QuizAttemptAnswer[];
  score?: number;
  maxScore?: number;
  completedAt: number;
  gradedBy?: QuizGradedBy;
  sharedWithStudentAt?: number;
  teacherFeedback?: string;
}

export interface Quiz {
  id: string;
  classId: string;
  moduleId?: string;
  lessonId?: string;
  ownerId: string;
  title: string;
  correctionMode?: QuizCorrectionMode;
  printIdentifier?: string;
  createdAt: number;
  updatedAt: number;
}

export type LiveQuizSessionStatus = "active" | "ended";

/** Stored at liveQuizSessions/{sessionId} */
export interface LiveQuizSession {
  classId: string;
  quizId: string;
  createdBy: string;
  createdAt: number;
  status: LiveQuizSessionStatus;
  endedAt?: number;
  liveLessonId?: string;
}

/** Stored at liveQuizSessions/{sessionId}/participants/{userId} */
export interface LiveQuizParticipantState {
  userId: string;
  displayName?: string;
  updatedAt: number;
  /** Draft answers in the same shape as quiz submission */
  answers: QuizAttemptAnswer[];
  answeredCount?: number;
  submittedAt?: number;
}
