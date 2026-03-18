import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";

export function PortalLoginPage() {
  const { login, isAuthenticated, isAuthLoading, userType } = useAuth();
  const location = useLocation();
  const redirectTo = location.state?.from || "/portal";

  const [email, setEmail] = useState("maria.carter@example.com");
  const [password, setPassword] = useState("portal123");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthLoading && isAuthenticated) {
    return <Navigate to={userType === "customer" ? redirectTo : "/"} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    const result = await login({
      email,
      password,
      audience: "portal"
    });
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? "Portal login failed.");
    }
  }

  return (
    <div className="portal-login-screen">
      <div className="portal-login-card">
        <h1>Customer Portal Login</h1>
        <p className="muted">Access your upcoming services, invoices, proof history, and booking requests.</p>

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

        <div className="login-hints">
          <p>Portal demo accounts:</p>
          <p>
            <code>maria.carter@example.com / portal123</code>
          </p>
          <p>
            <code>oliver.brooks@example.com / portal123</code>
          </p>
        </div>
      </div>
    </div>
  );
}
