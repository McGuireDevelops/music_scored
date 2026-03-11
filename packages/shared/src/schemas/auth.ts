import { z } from "zod";

export const userRoleSchema = z.enum(["student", "teacher", "admin"]);

export const accessGrantTypeSchema = z.enum([
  "individual",
  "cohort",
  "institution",
  "tenant",
]);

export const accessGrantSchema = z.object({
  type: accessGrantTypeSchema,
  scope: z.string().min(1),
  validFrom: z.number(),
  validTo: z.number(),
  paymentRef: z.string().optional(),
  userId: z.string().optional(),
});
