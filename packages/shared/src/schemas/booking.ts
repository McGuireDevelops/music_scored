import { z } from "zod";

export const weeklySlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export const bookingLimitSchema = z.object({
  maxPerStudent: z.number().int().positive(),
  periodDays: z.number().int().positive(),
});

export const teacherAvailabilitySchema = z.object({
  teacherId: z.string().min(1),
  slotDurationMinutes: z.number().int().min(15).max(120),
  timezone: z.string().min(1),
  weeklySlots: z.array(weeklySlotSchema).min(1),
  bookingLimit: bookingLimitSchema,
  bufferMinutes: z.number().int().min(0).optional(),
  fallbackMeetingLink: z.string().url().optional().or(z.literal("")),
});

export const bookingStatusSchema = z.enum([
  "confirmed",
  "cancelled_by_student",
  "cancelled_by_teacher",
]);

export const createBookingRequestSchema = z.object({
  teacherId: z.string().min(1),
  startAt: z.number().int().positive(),
});

export const cancelBookingRequestSchema = z.object({
  bookingId: z.string().min(1),
});
