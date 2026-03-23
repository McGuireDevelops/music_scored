import { z } from "zod";

export const programTimelineScopeSchema = z.enum(["class", "curriculum"]);

export const programTimelineSegmentSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    weekStart: z.number().int().min(1),
    weekEnd: z.number().int().min(1),
    color: z.string().optional(),
    moduleId: z.string().optional(),
  })
  .refine((s) => s.weekStart <= s.weekEnd, {
    message: "weekStart must be <= weekEnd",
    path: ["weekEnd"],
  });

export const programTimelineMilestoneSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  weekStart: z.number().int().min(1).optional(),
  weekEnd: z.number().int().min(1).optional(),
  startAt: z.number().optional(),
  endAt: z.number().optional(),
  notes: z.string().optional(),
});

export const programTimelineSchema = z
  .object({
    teacherId: z.string().min(1),
    scope: programTimelineScopeSchema,
    scopeId: z.string().min(1),
    title: z.string().nullable().optional(),
    weekCount: z.number().int().min(1).max(520),
    anchorDate: z.number(),
    segments: z.array(programTimelineSegmentSchema),
    milestones: z.array(programTimelineMilestoneSchema),
    createdAt: z.number(),
    updatedAt: z.number(),
  })
  .superRefine((data, ctx) => {
    for (let i = 0; i < data.segments.length; i++) {
      const s = data.segments[i];
      if (s.weekEnd > data.weekCount || s.weekStart > data.weekCount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "segment weeks must be within weekCount",
          path: ["segments", i],
        });
      }
    }
    for (let i = 0; i < data.milestones.length; i++) {
      const m = data.milestones[i];
      if (m.weekStart != null && m.weekStart > data.weekCount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "milestone weekStart must be within weekCount",
          path: ["milestones", i, "weekStart"],
        });
      }
      if (m.weekEnd != null && m.weekEnd > data.weekCount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "milestone weekEnd must be within weekCount",
          path: ["milestones", i, "weekEnd"],
        });
      }
    }
  });

export type ProgramTimelineInput = z.infer<typeof programTimelineSchema>;
