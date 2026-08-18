import { useState, useEffect } from "react";
import { authApi } from "../api/client";
import { useAuth } from "../context/AuthContext";
import PasswordInput from "../components/PasswordInput";

export default function Settings() {
  const { user, setUser } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    address: "",
    password: "",
    currentPassword: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    // Fetch fresh profile data to pre-fill the form
    authApi.me()
      .then((res) => {
        setFormData({
          name: res.data.username || "",
          email: res.data.email || "",
          address: res.data.address || "",
          password: "",
          currentPassword: "",
        });
      })
      .catch(() => setMessage({ type: "error", text: "Failed to load profile data." }))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const updateData = {
        Name: formData.name,
        Email: formData.email,
        Address: formData.address,
      };
      if (formData.password) {
        updateData.Password = formData.password;
        updateData.CurrentPassword = formData.currentPassword;
      }

      await authApi.updateMe(updateData);
      
      // Update the AuthContext user name just in case it changed
      if (setUser && user) {
        setUser({ ...user, username: formData.name });
      }

      setMessage({ type: "success", text: "Profile updated successfully!" });
      setFormData(prev => ({ ...prev, password: "", currentPassword: "" })); // Clear password fields
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to update profile." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="max-w-xl mx-auto px-5 py-10 text-[var(--color-ink-soft)]">Loading profile...</div>;
  }

  return (
    <div className="max-w-xl mx-auto px-5 py-10">
      <div className="mb-8 border-b border-[var(--color-line)] pb-4">
        <h1 className="font-[var(--font-display)] text-3xl font-semibold">Account Settings</h1>
        <p className="text-sm text-[var(--color-ink-soft)] mt-2">
          Update your personal information and address.
        </p>
      </div>

      {message.text && (
        <div className={`mb-6 p-4 rounded text-sm font-medium ${
          message.type === 'success' 
            ? 'bg-[var(--color-circuit)]/10 text-[var(--color-circuit-dark)] border border-[var(--color-circuit)]/30' 
            : 'bg-[var(--color-signal)]/10 text-[var(--color-signal)] border border-[var(--color-signal)]/30'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="spec-ticket p-6 space-y-5 rounded">
        <div>
          <label className="block text-sm font-semibold mb-1">Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="input-premium w-full bg-[var(--color-paper)] border border-[var(--color-line)] rounded px-3 py-2 text-sm focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="input-premium w-full bg-[var(--color-paper)] border border-[var(--color-line)] rounded px-3 py-2 text-sm focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Address</label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            rows="3"
            className="input-premium w-full bg-[var(--color-paper)] border border-[var(--color-line)] rounded px-3 py-2 text-sm focus:outline-none"
            placeholder="Shipping address..."
          />
        </div>

        <div className="pt-4 border-t border-[var(--color-line)]">
          <div>
            <label className="block text-sm font-semibold mb-1">Current Password</label>
            <p className="text-xs text-[var(--color-ink-soft)] mb-2">Required only if you're setting a new password below.</p>
            <PasswordInput
              id="currentPassword"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="current-password"
              className="bg-[var(--color-paper)] border-[var(--color-line)] text-sm"
            />
          </div>

          <label className="block text-sm font-semibold mb-1 mt-4">New Password</label>
          <p className="text-xs text-[var(--color-ink-soft)] mb-2">Leave blank to keep your current password.</p>
          <PasswordInput
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            autoComplete="new-password"
            className="bg-[var(--color-paper)] border-[var(--color-line)] text-sm"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary px-6 py-2 rounded font-semibold disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
