import ProtectedRoute from "../components/ProtectedRoute";

export default function AdminDashboard() {
  return (
    <ProtectedRoute requiredRole="admin">
      <div>
        <h2>Admin Dashboard</h2>
        <p>System administration and user management.</p>
      </div>
    </ProtectedRoute>
  );
}
