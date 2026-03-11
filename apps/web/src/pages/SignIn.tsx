import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function SignIn() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signin") {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, displayName || undefined);
      }
      navigate("/");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to sign in";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithGoogle();
      navigate("/");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to sign in with Google";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto" }}>
      <h2>{mode === "signin" ? "Sign in" : "Create account"}</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {mode === "signup" && (
          <div>
            <label htmlFor="displayName" style={{ display: "block", marginBottom: "0.25rem" }}>
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              style={{ width: "100%", padding: "0.5rem" }}
            />
          </div>
        )}
        <div>
          <label htmlFor="email" style={{ display: "block", marginBottom: "0.25rem" }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </div>
        <div>
          <label htmlFor="password" style={{ display: "block", marginBottom: "0.25rem" }}>
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            minLength={mode === "signup" ? 6 : undefined}
            style={{ width: "100%", padding: "0.5rem" }}
          />
          {mode === "signup" && (
            <small style={{ color: "#666" }}>Min 6 characters</small>
          )}
        </div>
        {error && (
          <div style={{ color: "#c00", fontSize: "0.9rem" }}>{error}</div>
        )}
        <button type="submit" disabled={loading} style={{ padding: "0.5rem 1rem", cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
      <div style={{ marginTop: "1.5rem", textAlign: "center", color: "#666" }}>
        or
      </div>
      <button
        onClick={handleGoogleSignIn}
        disabled={loading}
        style={{ width: "100%", marginTop: "1rem", padding: "0.5rem 1rem", cursor: loading ? "not-allowed" : "pointer" }}
      >
        Sign in with Google
      </button>
      <p style={{ marginTop: "1.5rem", textAlign: "center" }}>
        {mode === "signin" ? (
          <>
            Don't have an account?{" "}
            <button
              type="button"
              onClick={() => { setMode("signup"); setError(""); }}
              style={{ background: "none", border: "none", color: "#0066cc", cursor: "pointer", textDecoration: "underline" }}
            >
              Create account
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => { setMode("signin"); setError(""); }}
              style={{ background: "none", border: "none", color: "#0066cc", cursor: "pointer", textDecoration: "underline" }}
            >
              Sign in
            </button>
          </>
        )}
      </p>
      <p style={{ marginTop: "1rem", textAlign: "center" }}>
        <Link to="/" style={{ color: "#666" }}>Back to home</Link>
      </p>
    </div>
  );
}
