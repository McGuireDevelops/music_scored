import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { useStudentSubmissions } from "../hooks/useStudentSubmissions";
import { formatUtcForDisplay } from "../utils/timezone";
import { getPermissionErrorMessage, isFirebasePermissionError } from "../utils/firebaseErrors";

interface PortfolioItem {
  id: string;
  classId: string;
  label?: string;
  submissionIds: string[];
}

export default function PortfolioPage() {
  const { user } = useAuth();
  const { submissions, loading: submissionsLoading, permissionError: submissionsError } =
    useStudentSubmissions(user?.uid);
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");

  useEffect(() => {
    if (!user?.uid) return;
    setPortfolioError(null);
    const q = query(
      collection(db, "portfolioItems"),
      where("userId", "==", user.uid)
    );
    getDocs(q)
      .then((snap) => {
        setItems(
          snap.docs.map((d) => ({
            id: d.id,
            classId: d.data().classId,
            label: d.data().label,
            submissionIds: d.data().submissionIds ?? [],
          }))
        );
      })
      .catch((err) => {
        if (isFirebasePermissionError(err)) {
          setPortfolioError(getPermissionErrorMessage(err, "Failed to load portfolio"));
        }
      })
      .finally(() => setLoading(false));
  }, [user?.uid]);

  const submissionIdsInPortfolio = new Set(
    items.flatMap((i) => i.submissionIds)
  );

  const addToPortfolio = async (submissionId: string) => {
    if (!user?.uid) return;
    const submission = submissions.find((s) => s.id === submissionId);
    if (!submission) return;
    setAddingFor(submissionId);
    setPortfolioError(null);
    try {
      const ref = await addDoc(collection(db, "portfolioItems"), {
        userId: user.uid,
        classId: submission.classId,
        submissionIds: [submissionId],
        label: newLabel.trim() || submission.assignmentTitle || "Portfolio item",
      });
      setItems((prev) => [
        ...prev,
        {
          id: ref.id,
          classId: submission.classId,
          label: newLabel.trim() || submission.assignmentTitle || "Portfolio item",
          submissionIds: [submissionId],
        },
      ]);
      setNewLabel("");
    } catch (err) {
      if (isFirebasePermissionError(err)) {
        setPortfolioError(getPermissionErrorMessage(err, "Failed to add to portfolio"));
      }
    } finally {
      setAddingFor(null);
    }
  };

  const removeFromPortfolio = async (itemId: string) => {
    try {
      await deleteDoc(doc(db, "portfolioItems", itemId));
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (err) {
      if (isFirebasePermissionError(err)) {
        setPortfolioError(getPermissionErrorMessage(err, "Failed to remove item"));
      }
      console.error(err);
    }
  };

  const displayError = portfolioError ?? submissionsError;

  return (
    <ProtectedRoute requiredRole="student">
      <div>
        <h2 className="mb-6 text-2xl font-semibold tracking-tight text-gray-900">
          Portfolio
        </h2>
        {displayError && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {displayError}
          </p>
        )}
        {loading && <p className="text-gray-500">Loading…</p>}
        {!loading && (
          <>
            <section className="mb-8">
              <h3 className="mb-4 text-lg font-medium text-gray-900">
                Your portfolio items
              </h3>
              {items.length === 0 && (
                <p className="text-gray-600">
                  No portfolio items yet. Add submissions from your assignments
                  below.
                </p>
              )}
              {items.length > 0 && (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4"
                    >
                      <div>
                        <span className="font-medium text-gray-900">
                          {item.label ?? `Item from class ${item.classId}`}
                        </span>
                        <p className="mt-1 text-sm text-gray-600">
                          {item.submissionIds.length} submission
                          {item.submissionIds.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromPortfolio(item.id)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <section>
              <h3 className="mb-4 text-lg font-medium text-gray-900">
                Add from your submissions
              </h3>
              {submissionsLoading && (
                <p className="text-gray-500">Loading submissions…</p>
              )}
              {!submissionsLoading && submissions.length === 0 && (
                <p className="text-gray-600">
                  No submissions yet. Complete assignments in your classes to add
                  them here.
                </p>
              )}
              {!submissionsLoading && submissions.length > 0 && (
                <div className="space-y-3">
                  {submissions.map((s) => {
                    const inPortfolio = submissionIdsInPortfolio.has(s.id);
                    const isAdding = addingFor === s.id;
                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4"
                      >
                        <div>
                          <span className="font-medium text-gray-900">
                            {s.assignmentTitle ?? "Assignment"}
                          </span>
                          <p className="mt-1 text-sm text-gray-600">
                            Submitted {formatUtcForDisplay(s.submittedAt)}
                          </p>
                        </div>
                        {inPortfolio ? (
                          <span className="text-sm text-gray-500">
                            In portfolio
                          </span>
                        ) : isAdding ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Label (optional)"
                              value={newLabel}
                              onChange={(e) => setNewLabel(e.target.value)}
                              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => addToPortfolio(s.id)}
                              className="text-sm font-medium text-primary hover:underline"
                            >
                              Add
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAddingFor(null);
                                setNewLabel("");
                              }}
                              className="text-sm text-gray-600 hover:underline"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAddingFor(s.id)}
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            Add to portfolio
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
