import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { authApi } from "../api/client";
import PasswordInput from "../components/PasswordInput";

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const [username, setUsername] = useState(location.state?.username || "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authApi.resetPassword({ username, code, newPassword: password });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't reset password. The code may be invalid or expired.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-frame">
        <div className="auth-visual" aria-hidden="true">
          <span className="auth-visual-code">Techstead · Account help</span>
        </div>

        <section className="auth-form-panel">
          <div className="auth-heading">
            <p className="eyebrow">Almost there</p>
            <h1 className="font-[var(--font-display)] text-3xl font-semibold tracking-tight">
              Enter your code
            </h1>
            <p className="auth-lede">Check your email for the 6-digit code and choose a new password.</p>
          </div>

          {success ? (
            <p className="mt-8 text-sm text-[var(--color-circuit)] font-medium">
              Password updated. Taking you to log in…
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  className="auth-input input-premium"
                />
              </div>
              <div className="auth-field">
                <label htmlFor="code">6-digit code</label>
                <input
                  id="code"
                  required
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  aria-describedby="code-help"
                  className="auth-input input-premium auth-code-input"
                />
                <span id="code-help" className="auth-field-help">Check your email · code expires in 10 minutes</span>
              </div>
              <div className="auth-field">
                <label htmlFor="password">New password</label>
                <PasswordInput
                  id="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error && <p className="auth-error" role="alert">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary auth-submit"
              >
                {loading ? "Updating…" : "Update password"}
              </button>
            </form>
          )}

          <div className="auth-links">
            <Link to="/login">Back to log in</Link>
            <Link to="/forgot-password" className="auth-create-link">
              Resend code <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        <div className="auth-visual-footer">
          <span>Check your spam folder too</span>
          <span>Code expires in 10 minutes</span>
          <span>Still stuck? Contact support</span>
        </div>
      </div>
    </main>
  );
}
