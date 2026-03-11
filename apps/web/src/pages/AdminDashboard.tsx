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
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-gray-900">
          Admin
        </h1>
        <p className="mb-8 text-gray-600">
          Manage user roles. Only users with admin role can access this page.
        </p>
        {loading && <p className="text-gray-500">Loading users…</p>}
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {!loading && !error && (
          <div className="overflow-hidden rounded-card border border-gray-200 bg-white shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-gray-100 transition-colors last:border-b-0 hover:bg-gray-50/50"
                    >
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {u.email ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {u.displayName ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {u.role}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role}
                          onChange={(e) => setRole(u.id, e.target.value)}
                          disabled={updating === u.id}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
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
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
