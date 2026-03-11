import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { db, storage, functions, httpsCallable } from "../firebase";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { useSubmissionFeedback, useCreateFeedback } from "../hooks/useFeedback";
import { useRubrics } from "../hooks/useRubrics";
import type { Assignment, Submission, Rubric, FeedbackCriterionResult } from "@learning-scores/shared";
import { formatUtcForDisplay } from "../utils/timezone";

export default function AssignmentDetail() {
  const { classId, assignmentId } = useParams<{
    classId: string;
    assignmentId: string;
  }>();
  const { user, profile } = useAuth();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const isTeacher = profile?.role === "teacher" || profile?.role === "admin";
  const viewingSubmission = isTeacher ? selectedSubmission : submission;

  const { feedback, refetch: refetchFeedback } = useSubmissionFeedback(
    viewingSubmission?.id,
    user?.uid
  );

  const { createFeedback, creating: feedbackCreating } = useCreateFeedback();
  const { rubrics } = useRubrics(isTeacher ? user?.uid : undefined);

  useEffect(() => {
    if (!assignmentId) return;
    getDoc(doc(db, "assignments", assignmentId))
      .then((snap) => {
        if (snap.exists())
          setAssignment({ id: snap.id, ...snap.data() } as Assignment);
        else setAssignment(null);
      })
      .finally(() => setLoading(false));
  }, [assignmentId]);

  useEffect(() => {
    if (!assignmentId || !user?.uid) return;
    if (isTeacher) {
      getDocs(collection(db, "assignments", assignmentId, "submissions")).then((snap) => {
        setSubmissions(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as Submission))
        );
      });
    } else {
      const q = query(
        collection(db, "assignments", assignmentId, "submissions"),
        where("userId", "==", user.uid)
      );
      getDocs(q).then((snap) => {
        if (!snap.empty) {
          const d = snap.docs[0];
          setSubmission({ id: d.id, ...d.data() } as unknown as Submission);
        } else setSubmission(null);
      });
    }
  }, [assignmentId, user?.uid, isTeacher]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentId || !classId || !user?.uid || !file) return;
    setSubmitting(true);
    try {
      const path = `assignments/${assignmentId}/submissions/${user.uid}/${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      await addDoc(
        collection(db, "assignments", assignmentId, "submissions"),
        {
          assignmentId,
          userId: user.uid,
          classId,
          mediaRefs: [{ type: "audio", resourceId: path }],
          submittedAt: Date.now(),
        }
      );
      setSubmission({
        id: "",
        assignmentId,
        userId: user.uid,
        classId,
        mediaRefs: [{ type: "audio", resourceId: path }],
        submittedAt: Date.now(),
      });
      setFile(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div>Loading…</div>;
  if (!assignment) return <div>Assignment not found.</div>;

  return (
    <ProtectedRoute>
      <div>
        <Link
          to={`/${isTeacher ? "teacher" : "student"}/class/${classId}`}
          style={{ color: "#666", marginBottom: "1rem", display: "inline-block" }}
        >
          ← Back to class
        </Link>
        <h2>{assignment.title}</h2>
        <p style={{ whiteSpace: "pre-wrap" }}>{assignment.brief}</p>
        {assignment.deadline && (
          <p style={{ color: "#666" }}>
            Due: {formatUtcForDisplay(assignment.deadline)}
          </p>
        )}

        {isTeacher && submissions.length > 0 && (
          <div style={{ marginBottom: "1.5rem" }}>
            <h3>Submissions</h3>
            {submissions.map((s) => (
              <div
                key={s.id}
                onClick={() => setSelectedSubmission(s)}
                style={{
                  padding: "0.5rem",
                  marginBottom: "0.25rem",
                  background: selectedSubmission?.id === s.id ? "#e8e8e8" : "#f5f5f5",
                  cursor: "pointer",
                  borderRadius: 4,
                }}
              >
                Student submission – {formatUtcForDisplay(s.submittedAt)}
              </div>
            ))}
          </div>
        )}

        {!isTeacher && (
          <>
            <h3>Your submission</h3>
            {submission ? (
              <>
                <p>Submitted at {new Date(submission.submittedAt).toLocaleString()}</p>
                {feedback && (
                  <div style={{ marginTop: "1rem", padding: "1rem", background: "#f5f5f5" }}>
                    <h4>Feedback</h4>
                    <p>{feedback.comment}</p>
                  </div>
                )}
              </>
            ) : (
              <form onSubmit={handleSubmit}>
                <input
                  type="file"
                  accept="audio/*,video/*,.pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <button type="submit" disabled={!file || submitting}>
                  {submitting ? "Submitting…" : "Submit"}
                </button>
              </form>
            )}
          </>
        )}

        {isTeacher && selectedSubmission && (
          <AIAnalysisPanel
            submission={selectedSubmission}
            assignmentId={assignmentId!}
          />
        )}
        {isTeacher && selectedSubmission && !feedback && rubrics.length > 0 && (
          <GiveFeedbackForm
            submissionId={selectedSubmission.id}
            assignmentId={assignmentId!}
            rubricId={rubrics[0].id}
            userId={selectedSubmission.userId}
            teacherId={user!.uid}
            rubric={rubrics[0]}
            createFeedback={createFeedback}
            creating={feedbackCreating}
            onSuccess={refetchFeedback}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

function AIAnalysisPanel({
  submission,
  assignmentId,
}: {
  submission: Submission;
  assignmentId: string;
}) {
  const [draft, setDraft] = useState<{
    source: string;
    sourceId: string;
    confidence: number;
    payload: Record<string, unknown>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingPayload, setEditingPayload] = useState("");
  const [saved, setSaved] = useState(false);

  const requestAnalysis = httpsCallable<
    { source: string; sourceId: string; mediaRef?: { type: string; resourceId: string; start?: number; end?: number } },
    { draft: { source: string; sourceId: string; confidence: number; payload: Record<string, unknown> } }
  >(functions, "requestAnalysis");

  const saveAnalysisSnapshot = httpsCallable<
    { source: string; sourceId: string; confidence?: number; payload: Record<string, unknown>; editedByTeacher: boolean },
    { id: string }
  >(functions, "saveAnalysisSnapshot");

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const mediaRef = submission.mediaRefs?.[0];
      const res = await requestAnalysis({
        source: "submission",
        sourceId: submission.id,
        mediaRef: mediaRef
          ? {
              type: mediaRef.type,
              resourceId: mediaRef.resourceId,
              start: mediaRef.start,
              end: mediaRef.end,
            }
          : undefined,
      });
      const data = res.data;
      if (data?.draft) {
        setDraft(data.draft);
        setEditingPayload(JSON.stringify(data.draft.payload, null, 2));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(editingPayload) as Record<string, unknown>;
      } catch {
        return;
      }
      await saveAnalysisSnapshot({
        source: draft.source,
        sourceId: draft.sourceId,
        confidence: draft.confidence,
        payload,
        editedByTeacher: true,
      });
      setSaved(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <h4 className="mb-2 font-medium text-gray-900">AI analysis</h4>
      {!draft ? (
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={loading}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {loading ? "Analyzing…" : "Analyze with AI"}
        </button>
      ) : (
        <div>
          <textarea
            value={editingPayload}
            onChange={(e) => setEditingPayload(e.target.value)}
            className="mb-2 w-full rounded-lg border border-gray-300 p-3 font-mono text-sm"
            rows={10}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save analysis snapshot"}
            </button>
            {saved && (
              <span className="flex items-center text-sm text-green-600">
                Saved.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function GiveFeedbackForm({
  submissionId,
  assignmentId,
  rubricId,
  userId,
  teacherId,
  rubric,
  createFeedback,
  creating,
  onSuccess,
}: {
  submissionId: string;
  assignmentId: string;
  rubricId: string;
  userId: string;
  teacherId: string;
  rubric: Rubric;
  onSuccess?: () => void;
  createFeedback: (data: {
    userId: string;
    teacherId: string;
    submissionId: string;
    assignmentId: string;
    rubricId: string;
    criterionResults: FeedbackCriterionResult[];
    comment?: string;
  }) => Promise<string | void>;
  creating: boolean;
  onSuccess?: () => void;
}) {
  const [comment, setComment] = useState("");
  const [results, setResults] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const criterionResults: FeedbackCriterionResult[] = [];
    for (const axis of rubric.axes) {
      for (const c of axis.criteria) {
        const levelId = results[`${axis.id}-${c.id}`];
        if (levelId)
          criterionResults.push({ criterionId: c.id, axisId: axis.id, levelId });
      }
    }
    await createFeedback({
      userId,
      teacherId,
      submissionId,
      assignmentId,
      rubricId,
      criterionResults,
      comment: comment.trim() || undefined,
    });
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: "1rem", padding: "1rem", background: "#f9f9f9" }}>
      <h4>Give feedback</h4>
      {rubric.axes.map((axis) => (
        <div key={axis.id} style={{ marginBottom: "1rem" }}>
          <strong>{axis.name}</strong>
          {axis.criteria.map((c) => (
            <div key={c.id} style={{ marginLeft: "1rem" }}>
              <label>{c.description}</label>
              <select
                value={results[`${axis.id}-${c.id}`] ?? ""}
                onChange={(e) =>
                  setResults((prev) => ({
                    ...prev,
                    [`${axis.id}-${c.id}`]: e.target.value,
                  }))
                }
              >
                <option value="">Select level</option>
                {c.partialSatisfactionLevels.map((l) => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      ))}
      <div style={{ marginBottom: "1rem" }}>
        <label>Comment</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          style={{ display: "block", width: "100%", minHeight: 80 }}
        />
      </div>
      <button type="submit" disabled={creating}>{creating ? "Saving…" : "Save feedback"}</button>
    </form>
  );
}
