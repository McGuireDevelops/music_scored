import { z } from "zod";
import { mediaReferenceSchema } from "./media-reference.js";

export const partialSatisfactionLevelSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
});

export const criterionSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  partialSatisfactionLevels: z.array(partialSatisfactionLevelSchema),
  exampleRef: mediaReferenceSchema.optional(),
});

export const rubricAxisSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  criteria: z.array(criterionSchema),
});

export const rubricEditRecordSchema = z.object({
  timestamp: z.number(),
  changedBy: z.string().min(1),
  changes: z.string(),
});

export const rubricSchema = z.object({
  name: z.string().min(1),
  ownerId: z.string().min(1),
  axes: z.array(rubricAxisSchema),
  version: z.number().int().nonnegative(),
  editHistory: z.array(rubricEditRecordSchema),
});

export const feedbackCriterionResultSchema = z.object({
  criterionId: z.string().min(1),
  axisId: z.string().min(1),
  levelId: z.string().min(1),
});

export const feedbackSchema = z.object({
  userId: z.string().min(1),
  teacherId: z.string().min(1),
  submissionId: z.string().min(1),
  assignmentId: z.string().min(1),
  rubricId: z.string().min(1),
  criterionResults: z.array(feedbackCriterionResultSchema),
  comment: z.string().optional(),
  mediaRefs: z.array(mediaReferenceSchema).optional(),
});
