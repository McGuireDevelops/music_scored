import { z } from "zod";
import { mediaReferenceSchema } from "./media-reference.js";

export const moduleReleaseModeSchema = z.enum(["time-released", "mastery-based"]);

export const progressionModeSchema = z.enum(["open", "scheduled", "automatic", "manual"]);

export const progressAutoIntervalSchema = z.enum([
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
]);

export const progressAutoAnchorSchema = z.enum(["course_start", "enrollment"]);

export const classSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  teacherId: z.string().min(1),
  isPublic: z.boolean().optional(),
  isPaid: z.boolean().optional(),
});

export const curriculumSchema = z.object({
  teacherId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  courseIds: z.array(z.string()),
});

export const cohortSchema = z.object({
  classId: z.string().min(1),
  name: z.string().min(1),
  limit: z.number().int().positive().optional(),
});

export const moduleSchema = z
  .object({
    classId: z.string().min(1),
    curriculumId: z.string().optional(),
    name: z.string().min(1),
    releaseMode: moduleReleaseModeSchema.optional(),
    releasedAt: z.number().optional(),
    progressionMode: progressionModeSchema.optional(),
    availableFrom: z.number().optional(),
    autoInterval: progressAutoIntervalSchema.optional(),
    autoAnchor: progressAutoAnchorSchema.optional(),
    autoStartAt: z.number().optional(),
    manualReleasedToClass: z.boolean().optional(),
    order: z.number().optional(),
    documentRefs: z.array(mediaReferenceSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.progressionMode === "scheduled") {
      if (data.availableFrom == null && data.releasedAt == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "scheduled mode requires availableFrom or releasedAt",
          path: ["availableFrom"],
        });
      }
    }
    if (data.progressionMode === "automatic") {
      if (data.autoInterval == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "automatic mode requires autoInterval",
          path: ["autoInterval"],
        });
      }
      if (data.autoAnchor == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "automatic mode requires autoAnchor",
          path: ["autoAnchor"],
        });
      }
      if (data.autoAnchor === "course_start" && data.autoStartAt == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "course_start anchor requires autoStartAt",
          path: ["autoStartAt"],
        });
      }
    }
  });

export const lessonSchema = z
  .object({
    classId: z.string().min(1),
    moduleId: z.string().min(1),
    ownerId: z.string().min(1),
    title: z.string().min(1),
    type: z.enum(["video", "audio", "score", "text"]),
    content: z.string().optional(),
    summary: z.string().optional(),
    mediaRefs: z.array(mediaReferenceSchema).optional(),
    order: z.number().optional(),
    version: z.number().optional(),
    progressionMode: progressionModeSchema.optional(),
    availableFrom: z.number().optional(),
    autoInterval: progressAutoIntervalSchema.optional(),
    autoAnchor: progressAutoAnchorSchema.optional(),
    autoStartAt: z.number().optional(),
    manualReleasedToClass: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.progressionMode === "scheduled") {
      if (data.availableFrom == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "scheduled mode requires availableFrom",
          path: ["availableFrom"],
        });
      }
    }
    if (data.progressionMode === "automatic") {
      if (data.autoInterval == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "automatic mode requires autoInterval",
          path: ["autoInterval"],
        });
      }
      if (data.autoAnchor == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "automatic mode requires autoAnchor",
          path: ["autoAnchor"],
        });
      }
      if (data.autoAnchor === "course_start" && data.autoStartAt == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "course_start anchor requires autoStartAt",
          path: ["autoStartAt"],
        });
      }
    }
  });

export const liveLessonStatusSchema = z.enum(["scheduled", "live", "ended"]);

export const liveLessonSchema = z.object({
  classId: z.string().min(1),
  moduleId: z.string().optional(),
  ownerId: z.string().min(1),
  title: z.string().min(1),
  scheduledAt: z.number(),
  duration: z.number().optional(),
  cohortIds: z.array(z.string()).optional(),
  topics: z.array(z.string()).optional(),
  chapterMarkers: z
    .array(
      z.object({
        timecode: z.number(),
        label: z.string(),
      })
    )
    .optional(),
  zoomMeetingId: z.number().optional(),
  zoomJoinUrl: z.string().url().optional(),
  zoomStartUrl: z.string().url().optional(),
  status: liveLessonStatusSchema.optional(),
  isTimeManaged: z.boolean().optional(),
});
