import { useState, useEffect } from "react";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { useStudentCertifications } from "../hooks/useCertifications";
import { formatUtcForDisplay } from "../utils/timezone";

export default function CertificationsPage() {
  const { user } = useAuth();
  const { certifications, loading } = useStudentCertifications(user?.uid);
  const [classNames, setClassNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const ids = [...new Set(certifications.map((c) => c.classId))];
    Promise.all(
      ids.map(async (id) => {
        const snap = await getDoc(doc(db, "classes", id));
        return [id, snap.exists() ? snap.data().name ?? "Class" : "Unknown"];
      })
    ).then((entries) => {
      setClassNames(Object.fromEntries(entries as [string, string][]));
    });
  }, [certifications]);

  return (
    <ProtectedRoute requiredRole="student">
      <div>
        <h2 className="mb-6 text-2xl font-semibold tracking-tight text-gray-900">
          My certifications
        </h2>
        {loading && <p className="text-gray-500">Loading…</p>}
        {!loading && certifications.length === 0 && (
          <p className="text-gray-600">
            No certifications yet. Complete classes and assignments to earn
            certifications from your teachers.
          </p>
        )}
        {!loading && certifications.length > 0 && (
          <div className="space-y-4">
            {certifications.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow-card"
              >
                <h3 className="font-semibold text-gray-900">
                  {classNames[c.classId] ?? c.classId}
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Issued {formatUtcForDisplay(c.issuedAt)}
                </p>
                {c.criteriaMet.length > 0 && (
                  <p className="mt-2 text-sm text-gray-600">
                    Criteria: {c.criteriaMet.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
