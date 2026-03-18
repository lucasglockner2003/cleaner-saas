import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";

export function LoginPage() {
  const { login, isAuthenticated, isAuthLoading, authMode } = useAuth();
  const location = useLocation();
  const redirectTo = location.state?.from || "/";

  const [email, setEmail] = useState("owner@cleanerops.local");
  const [password, setPassword] = useState("owner123");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthLoading && isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    const result = await login({
      email,
      password,
      audience: "internal"
    });
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? "Login failed.");
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <h1>Cleaner Ops Login</h1>
        <p className="muted">Sign in to access the operations platform.</p>
        <p className="muted">Auth provider: {authMode}</p>

        <form className="page-grid compact-grid" onSubmit={handleSubmit}>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>

          {error ? <p className="field-error">{error}</p> : null}

          <button className="btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {authMode === "local" ? (
          <div className="login-hints">
            <p>Local demo accounts:</p>
            <p>
              <code>owner@cleanerops.local / owner123</code>
            </p>
            <p>
              <code>ops@cleanerops.local / ops12345</code>
            </p>
            <p>
              <code>cleaner@cleanerops.local / clean123</code>
            </p>
            <p className="muted">Customer accounts use the portal login at /portal/login.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
