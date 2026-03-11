import { z } from "zod";

export const certificateTemplateLayoutSchema = z.object({
  headerText: z.string().optional(),
  bodyText: z.string().optional(),
  footerText: z.string().optional(),
  logoRef: z.string().optional(),
  primaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().optional(),
});

export const certificateTemplateSchema = z.object({
  classId: z.string().min(1),
  ownerId: z.string().min(1),
  name: z.string().min(1),
  layout: certificateTemplateLayoutSchema,
  placeholders: z.array(z.string()),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const completionCriteriaTypeSchema = z.enum([
  "modules",
  "assignments",
  "quizzes",
  "manual",
]);

export const completionCriteriaSchema = z.object({
  type: completionCriteriaTypeSchema,
  config: z.object({
    modulesComplete: z.boolean().optional(),
    mandatoryAssignmentsSubmitted: z.boolean().optional(),
    quizzesPassingThreshold: z.number().optional(),
    manualApprovalRequired: z.boolean().optional(),
  }),
});
