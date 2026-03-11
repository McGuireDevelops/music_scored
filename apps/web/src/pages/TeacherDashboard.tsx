import ProtectedRoute from "../components/ProtectedRoute";

export default function TeacherDashboard() {
  return (
    <ProtectedRoute requiredRole="teacher">
      <div>
        <h2>Teacher Dashboard</h2>
        <p>Manage your classes and students here.</p>
      </div>
    </ProtectedRoute>
  );
}
