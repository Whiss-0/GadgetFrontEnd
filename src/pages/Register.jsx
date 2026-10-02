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
    <main className="auth-page">
      <div className="auth-frame">
        <div className="auth-visual" aria-hidden="true">
          <span className="auth-visual-code">Gadget/Store · Create account</span>
        </div>

        <section className="auth-form-panel">
          <div className="auth-heading">
            <p className="eyebrow">Start with Gadget Store</p>
            <h1 className="font-[var(--font-display)] text-3xl font-semibold tracking-tight">
              Create an account
            </h1>
            <p className="auth-lede">Join to track orders, save favourites, and check out faster.</p>
          </div>

          {success ? (
            <p className="mt-10 text-sm text-[var(--color-circuit)] font-medium">
              Account created. Taking you to log in…
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  required
                  value={form.username}
                  onChange={(e) => update("username", e.target.value)}
                  autoComplete="username"
                  className="auth-input input-premium"
                />
              </div>
              <div className="auth-field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  autoComplete="email"
                  className="auth-input input-premium"
                />
                <span className="auth-field-help">Used only for password resets.</span>
              </div>
              <div className="auth-field">
                <label htmlFor="password">Password</label>
                <PasswordInput
                  id="password"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              {error && <p className="auth-error" role="alert">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary auth-submit"
              >
                {loading ? "Creating…" : "Create an account"}
              </button>
            </form>
          )}

          <div className="auth-links">
            <Link to="/login">Already have an account? Log in</Link>
          </div>
        </section>

        <div className="auth-visual-footer">
          <span>Your cart, wherever you left it</span>
          <span>Easy access to your orders</span>
          <span>Thoughtful tech, all in one place</span>
        </div>
      </div>
    </main>
  );
}
