import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/client";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await authApi.forgotPassword({ username });
      setMessage(res.data.message);
      // Move straight to the code-entry step, pre-filling the username.
      setTimeout(() => navigate("/reset-password", { state: { username } }), 900);
    } catch {
      setMessage("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-frame">
        <div className="auth-visual" aria-hidden="true">
          <span className="auth-visual-code">Gadget/Store · Account help</span>
        </div>

        <section className="auth-form-panel">
          <div className="auth-heading">
            <p className="eyebrow">Account help</p>
            <h1 className="font-[var(--font-display)] text-3xl font-semibold tracking-tight">
              Reset password
            </h1>
            <p className="auth-lede">Enter your username and we'll send a reset code to your email.</p>
          </div>

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

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary auth-submit"
            >
              {loading ? "Sending…" : "Send reset code"}
            </button>
          </form>

          {message && <p className="auth-error" role="status">{message}</p>}

          <div className="auth-links">
            <Link to="/login">Back to log in</Link>
            <Link to="/reset-password" className="auth-create-link">
              Already have a code? <span aria-hidden="true">→</span>
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
