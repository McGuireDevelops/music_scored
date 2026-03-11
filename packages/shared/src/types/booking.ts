/**
 * 1-on-1 booking types: teacher availability and student bookings
 */

import type { ZoomRecording } from "./curriculum.js";

export interface WeeklySlot {
  dayOfWeek: number; // 0 (Sun) – 6 (Sat)
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
}

export interface BookingLimit {
  maxPerStudent: number;
  periodDays: number; // e.g. 7 = weekly, 30 = monthly
}

export interface TeacherAvailability {
  teacherId: string;
  slotDurationMinutes: number;
  timezone: string; // IANA e.g. "America/New_York"
  weeklySlots: WeeklySlot[];
  bookingLimit: BookingLimit;
  bufferMinutes?: number;
  fallbackMeetingLink?: string;
  updatedAt: number;
}

export type BookingStatus =
  | "confirmed"
  | "cancelled_by_student"
  | "cancelled_by_teacher";

export interface Booking {
  id: string;
  teacherId: string;
  studentId: string;
  startAt: number; // UTC ms
  endAt: number;   // UTC ms
  status: BookingStatus;
  zoomMeetingId?: number;
  zoomJoinUrl?: string;
  zoomStartUrl?: string;
  fallbackMeetingLink?: string;
  cancelledAt?: number;
  createdAt: number;
  recording?: ZoomRecording;
}
