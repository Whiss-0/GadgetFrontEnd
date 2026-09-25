import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PasswordInput from "../components/PasswordInput";

export default function Login() {
  const { login, verifyMfa } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [mfaStep, setMfaStep] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (!mfaStep) {
        const result = await login(username, password);
        if (result.requiresMfa) {
          setMfaStep(true);
        } else {
          navigate("/");
        }
      } else {
        await verifyMfa(username, code);
        navigate("/");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-frame">
        <aside className="auth-visual" aria-label="Gadget Store benefits">
          <div>
            <p className="auth-visual-code">A better way to shop for tech</p>
            <h2>Welcome back.<br /><span>Your setup is waiting.</span></h2>
            <p className="auth-visual-copy">Pick up where you left off, keep your favorites close, and make checkout easy.</p>
          </div>
          <div className="auth-visual-footer">
            <span>Your cart, wherever you left it</span>
            <span>Easy access to your orders</span>
            <span>Thoughtful tech, all in one place</span>
          </div>
        </aside>

        <section className="auth-form-panel">
          <div className="auth-heading">
            <p className="eyebrow">{mfaStep ? "One more quick step" : "Good to see you"}</p>
            <h1 className="font-[var(--font-display)] text-3xl font-semibold tracking-tight">
              {mfaStep ? "Verify your sign-in" : "Welcome back"}
            </h1>
            <p className="auth-lede">
              {mfaStep ? "Enter the six-digit code sent to your email to finish logging in." : "Sign in to pick up where you left off."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {!mfaStep ? (
              <>
                <div className="auth-field">
                  <label htmlFor="username">Username</label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                    className="auth-input input-premium"
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="password">Password</label>
                  <PasswordInput
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>
              </>
            ) : (
              <div className="auth-field">
                <label htmlFor="code">Verification code</label>
                <input
                  id="code"
                  name="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  maxLength={6}
                  pattern="[0-9]{6}"
                  aria-describedby="code-help"
                  className="auth-input input-premium auth-code-input"
                />
                <span id="code-help" className="auth-field-help">6 digits · sent to your verified email</span>
              </div>
            )}

            {error && <p className="auth-error" role="alert">{error}</p>}

            <button type="submit" disabled={loading} className="w-full btn-primary auth-submit">
              {loading ? "Processing…" : (mfaStep ? "Verify and continue" : "Log in")}
            </button>
          </form>

          {!mfaStep && (
            <div className="auth-links">
              <Link to="/forgot-password">Forgot password?</Link>
              <Link to="/register" className="auth-create-link">Create account <span aria-hidden="true">→</span></Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
