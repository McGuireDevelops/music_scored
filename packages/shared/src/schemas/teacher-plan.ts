import { z } from "zod";

export const teacherPlanItemSchema = z.object({
  order: z.number(),
  title: z.string().min(1),
  lessonId: z.string().min(1).optional(),
  externalUrl: z.string().url().optional(),
  notes: z.string().optional(),
});
