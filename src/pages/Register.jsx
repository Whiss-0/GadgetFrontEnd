import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/client";
import PasswordInput from "../components/PasswordInput";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authApi.register(form);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Try a different username.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16 px-5">
      <div className="spec-ticket rounded-md p-6 pt-8">
        <p className="font-[var(--font-mono)] text-xs text-[var(--color-ink-soft)] mb-1">AUTH-002</p>
        <h1 className="font-[var(--font-display)] text-2xl font-semibold mb-6">Create account</h1>

        {success ? (
          <p className="mt-10 text-sm text-[var(--color-circuit)] font-medium">
            Account created. Taking you to log in…
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-10">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="username">Username</label>
              <input
                id="username"
                required
                value={form.username}
                onChange={(e) => update("username", e.target.value)}
                className="w-full input-premium border rounded px-3 py-2 bg-white outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className="w-full input-premium border rounded px-3 py-2 bg-white outline-none"
              />
              <p className="text-xs text-[var(--color-ink-soft)] mt-1">Used only for password resets.</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="password">Password</label>
              <PasswordInput
                id="password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && <p className="text-sm text-[var(--color-signal)]">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary font-semibold py-2 rounded disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create account"}
            </button>
          </form>
        )}

        <div className="mt-5 text-sm">
          <Link to="/login" className="text-[var(--color-ink-soft)] hover:text-[var(--color-circuit)]">
            Already have an account? Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
