import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PasswordInput from "../components/PasswordInput";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't log in. Check your username and password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16 px-5">
      <div className="spec-ticket rounded-md p-6 pt-8">
        <p className="font-[var(--font-mono)] text-xs text-[var(--color-ink-soft)] mb-1">AUTH-001</p>
        <h1 className="font-[var(--font-display)] text-2xl font-semibold mb-6">Log in</h1>

        <form onSubmit={handleSubmit} className="space-y-4 mt-10">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="username">Username</label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full border border-[var(--color-line)] rounded px-3 py-2 bg-white focus:border-[var(--color-circuit)] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="password">Password</label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-[var(--color-signal)]">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--color-ink)] text-white font-semibold py-2 rounded hover:bg-[var(--color-circuit)] transition-colors disabled:opacity-50"
          >
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>

        <div className="mt-5 flex justify-between text-sm">
          <Link to="/forgot-password" className="text-[var(--color-ink-soft)] hover:text-[var(--color-circuit)]">
            Forgot password?
          </Link>
          <Link to="/register" className="text-[var(--color-ink-soft)] hover:text-[var(--color-circuit)]">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
