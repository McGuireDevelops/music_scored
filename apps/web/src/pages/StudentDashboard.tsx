import ProtectedRoute from "../components/ProtectedRoute";

export default function StudentDashboard() {
  return (
    <ProtectedRoute requiredRole="student">
      <div>
        <h2>Student Dashboard</h2>
        <p>Your classes and progress will appear here.</p>
      </div>
    </ProtectedRoute>
  );
}
