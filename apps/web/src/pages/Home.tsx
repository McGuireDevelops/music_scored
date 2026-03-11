import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";

export default function Home() {
  const { user, profile } = useAuth();

  return (
    <div>
      <h1>Learning Scores</h1>
      <p style={{ color: "#666", marginBottom: "2rem" }}>
        Professional Film Music Learning Platform by McGuireDevelops
      </p>
      {user ? (
        <div>
          <p>Welcome, {profile?.displayName || profile?.email}.</p>
          <p>You are signed in as <strong>{profile?.role}</strong>.</p>
          <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem" }}>
            <Link to="/student" style={{ color: "#0066cc" }}>Go to Student Dashboard</Link>
            {(profile?.role === "teacher" || profile?.role === "admin") && (
              <Link to="/teacher" style={{ color: "#0066cc" }}>Go to Teacher Dashboard</Link>
            )}
          </div>
        </div>
      ) : (
        <div>
          <p>Sign in to access your classes and lessons.</p>
        </div>
      )}
    </div>
  );
}
