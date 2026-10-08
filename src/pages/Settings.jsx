import { useState, useEffect } from "react";
import { authApi } from "../api/client";
import { useAuth } from "../context/AuthContext";
import PasswordInput from "../components/PasswordInput";
import PhilippineAddressSelector from "../components/PhilippineAddressSelector";

function parseAddressParts(addr) {
  if (!addr) return null;
  const parts = addr.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 4) {
    if (parts[parts.length - 1].toLowerCase() === "philippines") {
      if (parts.length >= 5) {
        return {
          region: parts[parts.length - 2],
          province: parts[parts.length - 3],
          city: parts[parts.length - 4],
          barangay: parts[parts.length - 5],
        };
      }
    } else {
      return {
        region: parts[parts.length - 1],
        province: parts[parts.length - 2],
        city: parts[parts.length - 3],
        barangay: parts.length >= 4 ? parts[parts.length - 4] : "",
      };
    }
  }
  return null;
}

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    address: "",
    region: "",
    province: "",
    city_Municipality: "",
    barangay: "",
    password: "",
    currentPassword: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showPhSelector, setShowPhSelector] = useState(false);

  useEffect(() => {
    // Fetch fresh profile data to pre-fill the form
    authApi.me()
      .then((res) => {
        setFormData({
          name: res.data.username || "",
          email: res.data.email || "",
          address: res.data.address || "",
          region: res.data.region || "",
          province: res.data.province || "",
          city_Municipality: res.data.city_Municipality || res.data.cityMunicipality || "",
          barangay: res.data.barangay || "",
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
      const parsed = parseAddressParts(formData.address);
      const updateData = {
        Name: formData.name,
        Email: formData.email,
        Address: formData.address,
        Region: formData.region || parsed?.region || undefined,
        Province: formData.province || parsed?.province || undefined,
        City_Municipality: formData.city_Municipality || parsed?.city || undefined,
        Barangay: formData.barangay || parsed?.barangay || undefined,
      };
      if (formData.password) {
        updateData.Password = formData.password;
        updateData.CurrentPassword = formData.currentPassword;
      }

      const response = await authApi.updateMe(updateData);
      
      // Update the AuthContext user name just in case it changed
      const updatedName = response.data?.username ?? response.data?.Name ?? formData.name;
      if (user) updateUser({ username: updatedName });

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
        <div role={message.type === "error" ? "alert" : "status"} aria-live={message.type === "error" ? "assertive" : "polite"} className={`mb-6 p-4 rounded text-sm font-medium ${
          message.type === 'success' 
            ? 'bg-[var(--color-circuit)]/10 text-[var(--color-circuit-dark)] border border-[var(--color-circuit)]/30' 
            : 'bg-[var(--color-signal)]/10 text-[var(--color-signal)] border border-[var(--color-signal)]/30'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="spec-ticket p-6 space-y-5 rounded">
        <div>
          <label htmlFor="settings-name" className="block text-sm font-semibold mb-1">Name</label>
          <input
            id="settings-name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="input-premium w-full bg-[var(--color-paper)] border border-[var(--color-line)] rounded px-3 py-2 text-sm focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="settings-email" className="block text-sm font-semibold mb-1">Email</label>
          <input
            id="settings-email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="input-premium w-full bg-[var(--color-paper)] border border-[var(--color-line)] rounded px-3 py-2 text-sm focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="settings-address" className="block text-sm font-semibold mb-1">Address</label>

          {/* Philippine address selector helper */}
          <button
            type="button"
            className="ph-selector-toggle mb-2"
            onClick={() => setShowPhSelector((v) => !v)}
            disabled={saving}
          >
            {showPhSelector ? "▲ Hide" : "▼ Use"} Philippine address selector
          </button>

          {showPhSelector && (
            <div className="ph-selector-panel mb-3">
              <p className="text-xs text-[var(--color-ink-soft)] mb-3">
                Pick your location — it will be applied to the address field below.
                Add your street / house number in the field after selecting.
              </p>
              <PhilippineAddressSelector
                street=""
                onAddressChange={(formatted, details) =>
                  setFormData((prev) => ({
                    ...prev,
                    address: formatted,
                    region: details?.region ?? prev.region,
                    province: details?.province ?? prev.province,
                    city_Municipality: details?.city ?? prev.city_Municipality,
                    barangay: details?.barangay ?? prev.barangay,
                  }))
                }
                disabled={saving}
              />
            </div>
          )}

          <textarea
            id="settings-address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            rows="3"
            className="input-premium w-full bg-[var(--color-paper)] border border-[var(--color-line)] rounded px-3 py-2 text-sm focus:outline-none"
            placeholder="Street / house number, barangay, city, province, region, Philippines"
          />

          {(formData.region || formData.city_Municipality) && (
            <div className="mt-2 text-xs text-[var(--color-ink-soft)] bg-[var(--color-panel)] border border-[var(--color-line)] rounded p-2.5 flex flex-wrap gap-x-3 gap-y-1">
              {formData.region && <span><span className="font-semibold text-[var(--color-ink)]">Region:</span> {formData.region}</span>}
              {formData.province && <span><span className="font-semibold text-[var(--color-ink)]">Province:</span> {formData.province}</span>}
              {formData.city_Municipality && <span><span className="font-semibold text-[var(--color-ink)]">City:</span> {formData.city_Municipality}</span>}
              {formData.barangay && <span><span className="font-semibold text-[var(--color-ink)]">Barangay:</span> {formData.barangay}</span>}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-[var(--color-line)]">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-semibold mb-1">Current Password</label>
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

          <label htmlFor="password" className="block text-sm font-semibold mb-1 mt-4">New Password</label>
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
