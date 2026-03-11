import { z } from "zod";
import { mediaReferenceSchema } from "./media-reference.js";

export const assignmentSchema = z.object({
  classId: z.string().min(1),
  moduleId: z.string().min(1),
  ownerId: z.string().min(1),
  title: z.string().min(1),
  brief: z.string().min(1),
  styleConstraints: z.string().optional(),
  techConstraints: z.string().optional(),
  deadline: z.number().optional(),
  mediaRefs: z.array(mediaReferenceSchema).optional(),
  rubricId: z.string().optional(),
});

export const submissionSchema = z.object({
  assignmentId: z.string().min(1),
  userId: z.string().min(1),
  classId: z.string().min(1),
  mediaRefs: z.array(mediaReferenceSchema).optional(),
  decisionLog: z.record(z.unknown()).optional(),
});
