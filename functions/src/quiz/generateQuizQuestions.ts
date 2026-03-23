/**
 * generateQuizQuestions: teacher-only callable; uses Gemini to propose quiz questions (JSON).
 * Validates ownership of the quiz; returns normalized chord-spelling questions using shared theory helpers.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { chordToMidi, spellChord } from "@learning-scores/shared";
import { checkRateLimit } from "../utils/rateLimit";
import { validateInput } from "../validation";
import { generateQuizQuestionsSchema } from "../validation/schemas";

interface GenerateQuizQuestionsInput {
  quizId: string;
  prompt: string;
}

function assertChordSpelling(
  key: string,
  chordLabel: string,
  points: number
): { type: "chordSpelling"; payload: Record<string, unknown>; points: number } | null {
  const spelled = spellChord(key, chordLabel);
  const midi = chordToMidi(key, chordLabel, 4);
  if (!spelled?.length || !midi?.length) return null;
  return {
    type: "chordSpelling",
    payload: {
      key,
      chordLabel,
      answerMode: "either",
      toneCount: spelled.length,
      validSpellings: [spelled],
      clef: "treble",
      expectedMidi: midi,
    },
    points: Number.isFinite(points) && points > 0 ? points : 1,
  };
}

function stripJsonFence(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  }
  return s.trim();
}

async function generateRawJson(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new HttpsError(
      "failed-precondition",
      "Set GEMINI_API_KEY to enable AI quiz generation."
    );
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const system = `You generate music theory quiz questions as JSON only.
Return a JSON array. Each item must be:
{"type":"chordSpelling","points":1,"payload":{"key":"C Major","chordLabel":"V7","answerMode":"either","toneCount":4,"validSpellings":[["G","B","D","F"]],"clef":"treble","expectedMidi":[67,71,74,77]}}

Rules:
- "key" must be tonic + " Major" or " Minor" (e.g. "G Minor", "Bb Major").
- "chordLabel" is a Roman numeral figure (e.g. V7, ii6, IV, vii°).
- toneCount, validSpellings[0].length, and expectedMidi.length must match.
- Use correct spellings and MIDI for the given key and Roman numeral.

Output ONLY the JSON array, no markdown, no commentary. At most 20 items.`;

  const result = await model.generateContent(`${system}\n\nTeacher request:\n${prompt}`);
  const text = result.response.text()?.trim();
  if (!text) {
    throw new HttpsError("internal", "Empty AI response");
  }
  return stripJsonFence(text);
}

export const generateQuizQuestions = onCall(
  {
    cors: true,
    timeoutSeconds: 120,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    const uid = request.auth.uid;
    const userDoc = await admin.firestore().doc(`users/${uid}`).get();
    const role = userDoc.data()?.role;
    if (role !== "teacher" && role !== "admin") {
      throw new HttpsError("permission-denied", "Only teachers can generate quiz questions");
    }

    const data = validateInput(
      generateQuizQuestionsSchema,
      request.data
    ) as GenerateQuizQuestionsInput;

    await checkRateLimit("generateQuizQuestions", uid);

    const quizSnap = await admin.firestore().doc(`quizzes/${data.quizId}`).get();
    if (!quizSnap.exists) {
      throw new HttpsError("not-found", "Quiz not found");
    }
    const quiz = quizSnap.data()!;
    if (quiz.ownerId !== uid && role !== "admin") {
      throw new HttpsError("permission-denied", "You can only edit your own quizzes");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(await generateRawJson(data.prompt));
    } catch (e) {
      console.error("generateQuizQuestions parse error", e);
      throw new HttpsError("internal", "AI returned invalid JSON");
    }

    if (!Array.isArray(parsed)) {
      throw new HttpsError("internal", "AI response must be a JSON array");
    }

    const out: Array<{ type: string; payload: Record<string, unknown>; points: number }> = [];

    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      if (rec.type !== "chordSpelling") continue;
      const payload = rec.payload as Record<string, unknown> | undefined;
      if (!payload) continue;
      const key = String(payload.key ?? "").trim();
      const chordLabel = String(payload.chordLabel ?? "").trim();
      const points = Number(rec.points) || 1;
      const normalized = assertChordSpelling(key, chordLabel, points);
      if (normalized) out.push(normalized);
    }

    if (out.length === 0) {
      throw new HttpsError(
        "invalid-argument",
        "No valid chord-spelling questions could be built from the AI response. Try a more specific prompt."
      );
    }

    return { questions: out };
  }
);
