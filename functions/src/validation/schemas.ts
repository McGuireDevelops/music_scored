/**
 * Zod schemas for Cloud Functions input validation.
 */
import { z } from "zod";

const MAX_STRING_LENGTH = 500;
const MAX_PAYLOAD_SIZE = 100 * 1024; // 100KB

export const createCheckoutSessionSchema = z.object({
  classId: z.string().min(1).max(MAX_STRING_LENGTH),
});

export const submitQuizAttemptAnswerSchema = z.object({
  questionId: z.string().min(1).max(MAX_STRING_LENGTH),
  answer: z.object({
    type: z.string().max(50),
    value: z.unknown(),
  }),
});

export const submitQuizAttemptSchema = z.object({
  quizId: z.string().min(1).max(MAX_STRING_LENGTH),
  answers: z.array(submitQuizAttemptAnswerSchema).max(200),
});

export const mediaRefSchema = z
  .object({
    type: z.string().max(50),
    resourceId: z.string().max(MAX_STRING_LENGTH),
    start: z.number().optional(),
    end: z.number().optional(),
  })
  .optional();

export const requestAnalysisSchema = z.object({
  source: z.string().min(1).max(MAX_STRING_LENGTH),
  sourceId: z.string().min(1).max(MAX_STRING_LENGTH),
  mediaRef: mediaRefSchema,
});

export const saveAnalysisSnapshotSchema = z.object({
  source: z.string().min(1).max(MAX_STRING_LENGTH),
  sourceId: z.string().min(1).max(MAX_STRING_LENGTH),
  confidence: z.number().min(0).max(1).optional(),
  payload: z.record(z.string(), z.unknown()),
  editedByTeacher: z.boolean().optional(),
});

export const generateLessonSummarySchema = z.object({
  lessonId: z.string().min(1).max(MAX_STRING_LENGTH).optional(),
  title: z.string().max(MAX_STRING_LENGTH).optional(),
  content: z.string().max(50000).optional(),
});
