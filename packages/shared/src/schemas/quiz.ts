import { z } from "zod";
import { mediaReferenceSchema } from "./media-reference.js";

export const quizQuestionTypeSchema = z.enum([
  "multipleChoiceSingle",
  "multipleChoiceMulti",
  "chordIdentification",
  "romanNumeral",
  "nashville",
  "pitchClassSet",
  "intervalVector",
  "mixedMeter",
  "polymeter",
  "visualScore",
  "mediaTimeCode",
  "staffSingleNote",
  "staffMelody",
]);

// Individual payload schemas for type-specific validation (optional)
export const multipleChoicePayloadSchema = z.object({
  choices: z.array(
    z.object({
      key: z.string().min(1),
      label: z.string(),
    })
  ),
  correctKeys: z.array(z.string()),
  partialCreditMap: z.record(z.number()).optional(),
});

const chordIdentificationPayloadSchema = z.object({
  choices: z.array(
    z.object({
      key: z.string().min(1),
      chord: z.string(),
      inversion: z.string().optional(),
    })
  ),
  correctKey: z.string(),
});

const romanNumeralPayloadSchema = z.object({
  validAnswers: z.array(
    z.object({
      numeral: z.string(),
      key: z.string(),
      inversion: z.string().optional(),
      alterations: z.array(z.string()).optional(),
    })
  ),
});

const nashvillePayloadSchema = z.object({
  validAnswers: z.array(
    z.object({
      chord: z.string(),
      key: z.string(),
    })
  ),
});

const pitchClassSetPayloadSchema = z.object({
  validVectors: z.array(z.string()),
  format: z.enum(["forte", "prime"]).optional(),
});

const intervalVectorPayloadSchema = z.object({
  validVectors: z.array(z.string()),
});

const mixedMeterPayloadSchema = z.object({
  validAnswers: z.array(
    z.array(
      z.object({
        numerator: z.number(),
        denominator: z.number(),
      })
    )
  ),
});

const polymeterPayloadSchema = z.object({
  validAnswers: z.array(
    z.object({
      meters: z.array(
        z.object({
          numerator: z.number(),
          denominator: z.number(),
        })
      ),
    })
  ),
});

const visualScorePayloadSchema = z.object({
  scoreRef: mediaReferenceSchema,
  correctRegions: z
    .array(
      z.object({
        barStart: z.number(),
        barEnd: z.number(),
      })
    )
    .optional(),
});

// Payload schemas are type-specific; allow record for flexibility
export const quizQuestionPayloadSchema = z.record(z.unknown());

export const quizQuestionSchema = z.object({
  id: z.string().min(1),
  type: quizQuestionTypeSchema,
  payload: z.record(z.unknown()), // relaxed for type-specific payloads
  mediaRef: mediaReferenceSchema.optional(),
  points: z.number().optional(),
});

export const quizAttemptAnswerSchema = z.object({
  questionId: z.string().min(1),
  answer: z.object({
    type: z.string(),
    value: z.unknown(),
  }),
});

export const quizCorrectionModeSchema = z.enum(["auto", "manual"]);
export const quizGradedBySchema = z.enum(["auto", "manual", "printed_ai"]);

export const quizAttemptSchema = z.object({
  quizId: z.string().min(1),
  userId: z.string().min(1),
  answers: z.array(quizAttemptAnswerSchema),
  score: z.number().optional(),
  maxScore: z.number().optional(),
  gradedBy: quizGradedBySchema.optional(),
  sharedWithStudentAt: z.number().optional(),
  teacherFeedback: z.string().optional(),
});

export const quizSchema = z.object({
  classId: z.string().min(1),
  moduleId: z.string().optional(),
  lessonId: z.string().optional(),
  ownerId: z.string().min(1),
  title: z.string().min(1),
  correctionMode: quizCorrectionModeSchema.optional(),
  printIdentifier: z.string().optional(),
});

export const liveQuizSessionStatusSchema = z.enum(["active", "ended"]);

export const liveQuizSessionSchema = z.object({
  classId: z.string().min(1),
  quizId: z.string().min(1),
  createdBy: z.string().min(1),
  createdAt: z.number(),
  status: liveQuizSessionStatusSchema,
  endedAt: z.number().optional(),
  liveLessonId: z.string().optional(),
});

export const liveQuizParticipantStateSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().optional(),
  updatedAt: z.number(),
  answers: z.array(quizAttemptAnswerSchema),
  answeredCount: z.number().optional(),
  submittedAt: z.number().optional(),
});
