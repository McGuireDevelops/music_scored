import { z } from "zod";

export const playlistTypeSchema = z.enum(["reading", "watch", "game", "music"]);
export const playlistItemRequirementSchema = z.enum(["mandatory", "recommended"]);
export const playlistProgressStatusSchema = z.enum(["todo", "in_progress", "done"]);

export const playlistSchema = z.object({
  classId: z.string().min(1),
  moduleId: z.string().optional(),
  ownerId: z.string().min(1),
  type: playlistTypeSchema,
  name: z.string().min(1),
  description: z.string().optional(),
  order: z.number().int().min(0),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const playlistItemSchema = z.object({
  playlistId: z.string().min(1),
  title: z.string().min(1),
  subtype: z.string().optional(),
  author: z.string().optional(),
  link: z.string().optional(),
  notes: z.string().optional(),
  requirement: playlistItemRequirementSchema,
  order: z.number().int().min(0),
});

export const playlistItemProgressSchema = z.object({
  playlistId: z.string().min(1),
  playlistItemId: z.string().min(1),
  classId: z.string().min(1),
  status: playlistProgressStatusSchema,
  addedToDoAt: z.number().optional(),
  updatedAt: z.number(),
});
