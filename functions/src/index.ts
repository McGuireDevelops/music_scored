/**
 * Cloud Functions for Learning Scores
 * Auth trigger, AI analysis pipeline
 */

import { setGlobalOptions } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { onUserCreate } from "./auth/onUserCreate";
import {
  requestAnalysis,
  saveAnalysisSnapshot,
} from "./ai/analysis";
import { generateLessonSummary } from "./ai/lessonSummary";
import {
  createCheckoutSession,
  stripeWebhook,
} from "./stripe/checkout";
import { getStripeConnectOnboardingLink } from "./stripe/connect";
import { submitQuizAttempt } from "./quiz/submitAttempt";
import { generateQuizQuestions } from "./quiz/generateQuizQuestions";
import { listUsers } from "./admin/listUsers";
import { updateUserRole } from "./admin/updateUserRole";
import { getTeacherSettings, updateTeacherSettings } from "./admin/getTeacherSettings";
import {
  getTeacherLessons,
  createTeacherLesson,
  updateTeacherLesson,
  deleteTeacherLesson,
} from "./admin/getTeacherLessons";
import { getTeacherStudents } from "./admin/getTeacherStudents";
import { getTeacherAnalytics } from "./admin/getTeacherAnalytics";
import { getTeacherCommunity } from "./admin/getTeacherCommunity";
import { createZoomMeeting } from "./zoom/createZoomMeeting";
import { updateLiveLessonStatus } from "./zoom/updateLiveLessonStatus";
import { zoomRecordingWebhook } from "./zoom/zoomRecordingWebhook";
import { shareRecording } from "./zoom/shareRecording";
import { createBooking } from "./booking/createBooking";
import { cancelBooking } from "./booking/cancelBooking";

// invoker: "public" so browser OPTIONS preflight succeeds (no auth header). Handlers still require Firebase Auth.
setGlobalOptions({
  maxInstances: 10,
  region: "us-central1",
  invoker: "public",
});

admin.initializeApp();

export {
  onUserCreate,
  requestAnalysis,
  saveAnalysisSnapshot,
  generateLessonSummary,
  createCheckoutSession,
  stripeWebhook,
  getStripeConnectOnboardingLink,
  submitQuizAttempt,
  generateQuizQuestions,
  listUsers,
  updateUserRole,
  getTeacherSettings,
  updateTeacherSettings,
  getTeacherLessons,
  createTeacherLesson,
  updateTeacherLesson,
  deleteTeacherLesson,
  getTeacherStudents,
  getTeacherAnalytics,
  getTeacherCommunity,
  createZoomMeeting,
  updateLiveLessonStatus,
  zoomRecordingWebhook,
  shareRecording,
  createBooking,
  cancelBooking,
};
