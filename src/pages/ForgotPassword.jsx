import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/client";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [devToken, setDevToken] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setDevToken("");
    try {
      const res = await authApi.forgotPassword({ username });
      setMessage(res.data.message);
      // The API only includes `token` in the response while running in
      // Development (see the backend's forgot-password task notes).
      if (res.data.token) setDevToken(res.data.token);
    } catch {
      setMessage("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16 px-5">
      <div className="spec-ticket rounded-md p-6 pt-8">
        <p className="font-[var(--font-mono)] text-xs text-[var(--color-ink-soft)] mb-1">AUTH-003</p>
        <h1 className="font-[var(--font-display)] text-2xl font-semibold mb-6">Reset password</h1>

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
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--color-ink)] text-white font-semibold py-2 rounded hover:bg-[var(--color-circuit)] transition-colors disabled:opacity-50"
          >
            {loading ? "Sending…" : "Send reset code"}
          </button>
        </form>

        {message && <p className="mt-4 text-sm text-[var(--color-ink-soft)]">{message}</p>}

        {devToken && (
          <div className="mt-4 p-3 bg-[var(--color-paper)] border border-dashed border-[var(--color-line)] rounded">
            <p className="text-xs font-[var(--font-mono)] text-[var(--color-ink-soft)] mb-1">DEV MODE — reset token</p>
            <p className="font-[var(--font-mono)] text-xs break-all">{devToken}</p>
            <button
              onClick={() => navigate("/reset-password", { state: { token: devToken } })}
              className="mt-2 text-xs font-semibold text-[var(--color-circuit)] hover:underline"
            >
              Use this token →
            </button>
          </div>
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
