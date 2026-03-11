/**
 * AI analysis pipeline – teacher-only, analyse-only
 * requestAnalysis: returns draft (not written)
 * saveAnalysisSnapshot: teacher saves edited result
 * Integrates with Google Gemini when GEMINI_API_KEY is configured.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { checkRateLimit } from "../utils/rateLimit";
import { validateInput } from "../validation";
import {
  requestAnalysisSchema,
  saveAnalysisSnapshotSchema,
} from "../validation/schemas";

interface RequestAnalysisInput {
  source: string;
  sourceId: string;
  mediaRef?: {
    type: string;
    resourceId: string;
    start?: number;
    end?: number;
  };
}

interface SaveAnalysisSnapshotInput {
  source: string;
  sourceId: string;
  confidence?: number;
  payload: Record<string, unknown>;
  editedByTeacher: boolean;
}

async function assertTeacher(uid: string): Promise<void> {
  const userDoc = await admin.firestore().doc(`users/${uid}`).get();
  const role = userDoc.data()?.role;
  if (role !== "teacher" && role !== "admin") {
    throw new HttpsError(
      "permission-denied",
      "Only teachers can use the AI analysis pipeline"
    );
  }
}

async function analyzeWithGemini(
  mediaRef: RequestAnalysisInput["mediaRef"],
  sourceId: string
): Promise<{ segments: unknown[]; tags: string[]; summary?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      segments: [],
      tags: [],
      summary: "Set GEMINI_API_KEY to enable AI analysis.",
    };
  }
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = mediaRef
      ? `Analyze this media submission (${mediaRef.type}, resource: ${mediaRef.resourceId}). Provide:
1. A short summary of the content.
2. Structural segments (if applicable) as a JSON array of {label, start?, end?, notes?}.
3. Relevant tags (e.g. instrumentation, mood, style) as an array of strings.
Return JSON: { "summary": string, "segments": array, "tags": array }`
      : `Analyze submission ${sourceId}. Provide summary, segments, and tags. Return JSON: { "summary": string, "segments": array, "tags": array }`;
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    if (!text) return { segments: [], tags: [] };
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as {
        summary?: string;
        segments?: unknown[];
        tags?: string[];
      };
      return {
        segments: parsed.segments ?? [],
        tags: parsed.tags ?? [],
        summary: parsed.summary,
      };
    }
  } catch (err) {
    console.error("Gemini analysis error:", err);
  }
  return { segments: [], tags: [] };
}

/**
 * Callable: requestAnalysis
 * Accepts media ref; returns draft result. Does NOT write to Firestore.
 * Teacher edits in UI, then calls saveAnalysisSnapshot.
 * Uses Gemini when GEMINI_API_KEY is set.
 */
export const requestAnalysis = onCall(
  { enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    const uid = request.auth.uid;
    await assertTeacher(uid);
    await checkRateLimit("requestAnalysis", uid);

    const data = validateInput(requestAnalysisSchema, request.data) as RequestAnalysisInput;

    const aiResult = await analyzeWithGemini(data.mediaRef, data.sourceId);

    const draft = {
      source: data.source,
      sourceId: data.sourceId,
      confidence: process.env.GEMINI_API_KEY ? 0.8 : 0.3,
      timestamp: Date.now(),
      editedByTeacher: false,
      payload: {
        segments: aiResult.segments,
        tags: aiResult.tags,
        summary: aiResult.summary,
      },
    };

    return { draft };
  }
);

/**
 * Callable: saveAnalysisSnapshot
 * Teacher-only; writes edited result to analysisSnapshots collection.
 */
export const saveAnalysisSnapshot = onCall(
  { enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    const uid = request.auth.uid;
    await assertTeacher(uid);

    const data = validateInput(saveAnalysisSnapshotSchema, request.data) as SaveAnalysisSnapshotInput;
    if (JSON.stringify(data.payload).length > 100 * 1024) {
      throw new HttpsError("invalid-argument", "Payload too large");
    }

    const snapshot = {
      source: data.source,
      sourceId: data.sourceId,
      createdBy: uid,
      confidence: data.confidence ?? null,
      timestamp: Date.now(),
      editedByTeacher: data.editedByTeacher ?? true,
      payload: data.payload,
    };

    const ref = await admin
      .firestore()
      .collection("analysisSnapshots")
      .add(snapshot);

    return { id: ref.id };
  }
);
