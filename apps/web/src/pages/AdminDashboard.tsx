import { useState, useEffect } from "react";
import ProtectedRoute from "../components/ProtectedRoute";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

interface UserDoc {
  id: string;
  email: string | null;
  displayName: string | null;
  role: string;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      try {
        const snap = await getDocs(collection(db, "users"));
        const list: UserDoc[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            email: data.email ?? null,
            displayName: data.displayName ?? null,
            role: data.role ?? "student",
          };
        });
        setUsers(list);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load users");
      } finally {
        setLoading(false);
      }
    }

    fetch();
  }, []);

  const setRole = async (userId: string, role: string) => {
    setUpdating(userId);
    try {
      await updateDoc(doc(db, "users", userId), { role });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role } : u))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <ProtectedRoute requiredRole="admin">
      <div>
        <h2>Admin Dashboard</h2>
        <p>Manage user roles. Only users with admin role can access this page.</p>
        {loading && <p>Loading users…</p>}
        {error && <p style={{ color: "#c00" }}>{error}</p>}
        {!loading && !error && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #333" }}>
                  <th style={{ textAlign: "left", padding: "0.5rem" }}>Email</th>
                  <th style={{ textAlign: "left", padding: "0.5rem" }}>Name</th>
                  <th style={{ textAlign: "left", padding: "0.5rem" }}>Role</th>
                  <th style={{ textAlign: "left", padding: "0.5rem" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "0.5rem" }}>{u.email ?? "—"}</td>
                    <td style={{ padding: "0.5rem" }}>{u.displayName ?? "—"}</td>
                    <td style={{ padding: "0.5rem" }}>{u.role}</td>
                    <td style={{ padding: "0.5rem" }}>
                      <select
                        value={u.role}
                        onChange={(e) => setRole(u.id, e.target.value)}
                        disabled={updating === u.id}
                        style={{ padding: "0.25rem" }}
                      >
                        <option value="student">student</option>
                        <option value="teacher">teacher</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
