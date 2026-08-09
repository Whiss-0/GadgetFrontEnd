import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { authApi } from "../api/client";
import PasswordInput from "../components/PasswordInput";

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const [token, setToken] = useState(location.state?.token || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authApi.resetPassword({ token, newPassword: password });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't reset password. The token may be invalid or expired.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16 px-5">
      <div className="spec-ticket rounded-md p-6 pt-8">
        <p className="font-[var(--font-mono)] text-xs text-[var(--color-ink-soft)] mb-1">AUTH-004</p>
        <h1 className="font-[var(--font-display)] text-2xl font-semibold mb-6">Set new password</h1>

        {success ? (
          <p className="mt-10 text-sm text-[var(--color-circuit)] font-medium">
            Password updated. Taking you to log in…
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-10">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="token">Reset token</label>
              <textarea
                id="token"
                required
                rows={3}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full border border-[var(--color-line)] rounded px-3 py-2 bg-white focus:border-[var(--color-circuit)] outline-none font-[var(--font-mono)] text-xs"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="password">New password</label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Min. 6 characters"
              />
            </div>

            {error && <p className="text-sm text-[var(--color-signal)]">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--color-ink)] text-white font-semibold py-2 rounded hover:bg-[var(--color-circuit)] transition-colors disabled:opacity-50"
            >
              {loading ? "Updating…" : "Update password"}
            </button>
          </form>
        )}

        <div className="mt-5 text-sm">
          <Link to="/login" className="text-[var(--color-ink-soft)] hover:text-[var(--color-circuit)]">
            Back to log in
          </Link>
        </div>
      </div>
    </div>
  );
}
