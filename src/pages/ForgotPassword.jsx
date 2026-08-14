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
              className="w-full input-premium border rounded px-3 py-2 bg-white outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary font-semibold py-2 rounded disabled:opacity-50"
          >
            {loading ? "Sending…" : "Send reset code"}
          </button>
        </form>

        {message && <p className="mt-4 text-sm text-[var(--color-ink-soft)]">{message}</p>}

        <div className="mt-5 text-sm flex justify-between">
          <Link to="/login" className="text-[var(--color-ink-soft)] hover:text-[var(--color-circuit)]">
            Back to log in
          </Link>
          <Link to="/reset-password" className="text-[var(--color-ink-soft)] hover:text-[var(--color-circuit)]">
            Already have a code?
          </Link>
        </div>
      </div>
    </div>
  );
}
