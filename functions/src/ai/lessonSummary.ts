/**
 * AI lesson summary – teacher-only
 * generateLessonSummary: returns summary from lesson title/content using Gemini.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { checkRateLimit } from "../utils/rateLimit";
import { validateInput } from "../validation";
import { generateLessonSummarySchema } from "../validation/schemas";

interface GenerateLessonSummaryInput {
  lessonId?: string;
  title?: string;
  content?: string;
}

async function assertTeacher(uid: string): Promise<void> {
  const userDoc = await admin.firestore().doc(`users/${uid}`).get();
  const role = userDoc.data()?.role;
  if (role !== "teacher" && role !== "admin") {
    throw new HttpsError(
      "permission-denied",
      "Only teachers can generate lesson summaries"
    );
  }
}

async function generateSummaryWithGemini(
  title: string,
  content: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return "Set GEMINI_API_KEY to enable AI summary generation.";
  }
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Summarize this lesson in 2-3 concise sentences suitable for students.

Title: ${title}
Content: ${content || "(no content)"}

Return only the summary text, no JSON or extra formatting.`;
    const result = await model.generateContent(prompt);
    const text = result.response.text()?.trim();
    return text || "Unable to generate summary.";
  } catch (err) {
    console.error("Gemini lesson summary error:", err);
    throw new HttpsError("internal", "AI summary generation failed");
  }
}

/**
 * Callable: generateLessonSummary
 * Accepts lessonId (to fetch from Firestore) or title+content directly.
 * Returns { summary: string }. Does NOT write to Firestore.
 */
export const generateLessonSummary = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    const uid = request.auth.uid;
    await assertTeacher(uid);
    await checkRateLimit("generateLessonSummary", uid);

    const data = validateInput(
      generateLessonSummarySchema,
      request.data
    ) as GenerateLessonSummaryInput;

    let title = data.title ?? "";
    let content = data.content ?? "";

    if (data.lessonId) {
      const lessonDoc = await admin
        .firestore()
        .doc(`lessons/${data.lessonId}`)
        .get();
      if (!lessonDoc.exists) {
        throw new HttpsError("not-found", "Lesson not found");
      }
      const lesson = lessonDoc.data();
      if (lesson?.ownerId !== uid) {
        throw new HttpsError(
          "permission-denied",
          "You can only generate summaries for your own lessons"
        );
      }
      title = lesson?.title ?? "";
      content = lesson?.content ?? "";
    }

    if (!title && !content) {
      throw new HttpsError(
        "invalid-argument",
        "Provide lessonId or title/content to summarize"
      );
    }

    const summary = await generateSummaryWithGemini(title, content);
    return { summary };
  }
);
