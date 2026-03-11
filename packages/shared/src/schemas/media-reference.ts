import { z } from "zod";

export const mediaReferenceSchema = z.object({
  type: z.enum(["audio", "video", "score"]),
  resourceId: z.string().min(1),
  start: z.number().optional(),
  end: z.number().optional(),
  barRange: z
    .object({
      start: z.number(),
      end: z.number(),
    })
    .optional(),
  label: z.string().optional(),
});

export const mediaReferenceSetSchema = z.object({
  refs: z.array(mediaReferenceSchema),
});

export type MediaReferenceInput = z.infer<typeof mediaReferenceSchema>;
export type MediaReferenceSetInput = z.infer<typeof mediaReferenceSetSchema>;
