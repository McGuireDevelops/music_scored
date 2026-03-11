import { useState, useEffect } from "react";
import { collection, getDocs, query, where, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";

export default function PortfolioPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<{ id: string; classId: string; label?: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "portfolioItems"),
      where("userId", "==", user.uid)
    );
    getDocs(q).then((snap) => {
      setItems(
        snap.docs.map((d) => ({
          id: d.id,
          classId: d.data().classId,
          label: d.data().label,
        }))
      );
      setLoading(false);
    });
  }, [user?.uid]);

  return (
    <ProtectedRoute requiredRole="student">
      <div>
        <h2>Portfolio</h2>
        {loading && <p>Loading…</p>}
        {!loading && items.length === 0 && (
          <p>No portfolio items yet. Add submissions from your classes.</p>
        )}
        {!loading && items.map((item) => (
          <div
            key={item.id}
            style={{
              padding: "1rem",
              marginBottom: "0.5rem",
              background: "#f5f5f5",
              borderRadius: 8,
            }}
          >
            {item.label ?? `Item from class ${item.classId}`}
          </div>
        ))}
      </div>
    </ProtectedRoute>
  );
}
