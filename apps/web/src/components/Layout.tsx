import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Layout() {
  const { user, profile, signInWithGoogle, signOut } = useAuth();
  const location = useLocation();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <nav
        style={{
          padding: "1rem 2rem",
          background: "#1a1a1a",
          color: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Link to="/" style={{ color: "#fff", textDecoration: "none", fontWeight: "bold" }}>
          Learning Scores
        </Link>
        <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
          <NavLink to="/" current={location.pathname === "/"}>
            Home
          </NavLink>
          {user && (
            <>
              <NavLink to="/student" current={location.pathname.startsWith("/student")}>
                Student
              </NavLink>
              {(profile?.role === "teacher" || profile?.role === "admin") && (
                <NavLink to="/teacher" current={location.pathname.startsWith("/teacher")}>
                  Teacher
                </NavLink>
              )}
              {profile?.role === "admin" && (
                <NavLink to="/admin" current={location.pathname.startsWith("/admin")}>
                  Admin
                </NavLink>
              )}
            </>
          )}
          <span style={{ color: "#888" }}>
            {user ? profile?.displayName || profile?.email || "Signed in" : null}
          </span>
          {user ? (
            <button onClick={signOut} style={{ padding: "0.5rem 1rem", cursor: "pointer" }}>
              Sign out
            </button>
          ) : (
            <button onClick={signInWithGoogle} style={{ padding: "0.5rem 1rem", cursor: "pointer" }}>
              Sign in with Google
            </button>
          )}
        </div>
      </nav>
      <main style={{ flex: 1, padding: "2rem" }}>
        <Outlet />
      </main>
    </div>
  );
}

function NavLink({
  to,
  current,
  children,
}: {
  to: string;
  current: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      style={{
        color: current ? "#fff" : "#bbb",
        textDecoration: "none",
        fontWeight: current ? 600 : 400,
      }}
    >
      {children}
    </Link>
  );
}
