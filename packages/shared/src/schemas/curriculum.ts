import { z } from "zod";
import { mediaReferenceSchema } from "./media-reference.js";

export const moduleReleaseModeSchema = z.enum(["time-released", "mastery-based"]);

export const classSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  teacherId: z.string().min(1),
  isPublic: z.boolean().optional(),
  isPaid: z.boolean().optional(),
});

export const cohortSchema = z.object({
  classId: z.string().min(1),
  name: z.string().min(1),
  limit: z.number().int().positive().optional(),
});

export const moduleSchema = z.object({
  classId: z.string().min(1),
  curriculumId: z.string().optional(),
  name: z.string().min(1),
  releaseMode: moduleReleaseModeSchema,
  releasedAt: z.number().optional(),
  order: z.number().optional(),
});

export const lessonSchema = z.object({
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
});

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
});
