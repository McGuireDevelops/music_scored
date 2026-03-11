/**
 * AI analysis pipeline – teacher-only, analyse-only
 * requestAnalysis: returns draft (not written)
 * saveAnalysisSnapshot: teacher saves edited result
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

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

/**
 * Callable: requestAnalysis
 * Accepts media ref; returns draft result. Does NOT write to Firestore.
 * Teacher edits in UI, then calls saveAnalysisSnapshot.
 */
export const requestAnalysis = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    await assertTeacher(request.auth.uid);

    const data = request.data as RequestAnalysisInput;
    if (!data?.source || !data?.sourceId) {
      throw new HttpsError("invalid-argument", "source and sourceId required");
    }

    // Placeholder: integrate with Google AI services (structure analysis, tags,
    // transcription, etc.). For now return a stub draft.
    const draft = {
      source: data.source,
      sourceId: data.sourceId,
      confidence: 0.5,
      timestamp: Date.now(),
      editedByTeacher: false,
      payload: {
        segments: [],
        tags: [],
        _placeholder: "Integrate Google AI services here",
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
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    const uid = request.auth.uid;
    await assertTeacher(uid);

    const data = request.data as SaveAnalysisSnapshotInput;
    if (!data?.source || !data?.sourceId || !data?.payload) {
      throw new HttpsError(
        "invalid-argument",
        "source, sourceId, and payload required"
      );
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
