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
    <div className="max-w-sm mx-auto mt-16 px-5">
      <div className="spec-ticket rounded-md p-6 pt-8">
        <p className="font-[var(--font-mono)] text-xs text-[var(--color-ink-soft)] mb-1">AUTH-004</p>
        <h1 className="font-[var(--font-display)] text-2xl font-semibold mb-6">Enter your code</h1>

        {success ? (
          <p className="mt-10 text-sm text-[var(--color-circuit)] font-medium">
            Password updated. Taking you to log in…
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-10">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="username">Username</label>
              <input
                id="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-[var(--color-line)] rounded px-3 py-2 bg-white focus:border-[var(--color-circuit)] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="code">6-digit code</label>
              <input
                id="code"
                required
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-full border border-[var(--color-line)] rounded px-3 py-2 bg-white focus:border-[var(--color-circuit)] outline-none font-[var(--font-mono)] text-lg tracking-[0.4em] text-center"
              />
              <p className="text-xs text-[var(--color-ink-soft)] mt-1">Check your email — the code expires in 10 minutes.</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="password">New password</label>
              <PasswordInput
                id="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

        <div className="mt-5 flex justify-between text-sm">
          <Link to="/login" className="text-[var(--color-ink-soft)] hover:text-[var(--color-circuit)]">
            Back to log in
          </Link>
          <Link to="/forgot-password" className="text-[var(--color-ink-soft)] hover:text-[var(--color-circuit)]">
            Resend code
          </Link>
        </div>
      </div>
    </div>
  );
}
