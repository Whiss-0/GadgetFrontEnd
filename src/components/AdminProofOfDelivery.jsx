import { useRef, useState } from "react";
import { ordersApi } from "../api/client";

export default function AdminProofOfDelivery({ orderId, onSaved }) {
  const formRef = useRef(null);
  const [recipientName, setRecipientName] = useState("");
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!photo || !recipientName.trim()) return;
    if (photo.size > 5 * 1024 * 1024) { setError("Choose an image smaller than 5 MB."); return; }
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("RecipientName", recipientName.trim());
      formData.append("Photo", photo);
      await ordersApi.recordDeliveryProof(orderId, formData);
      setSuccess("Proof saved. The order is now marked delivered.");
      setRecipientName("");
      setPhoto(null);
      formRef.current?.reset();
      await onSaved?.();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not save proof of delivery.");
    } finally { setBusy(false); }
  }

  return (
    <form ref={formRef} onSubmit={submit} className="border-t border-[var(--color-dark-line)] pt-4">
      <h4 className="text-xs font-semibold text-white mb-1">Complete delivery with proof</h4>
      <p className="text-[11px] text-[var(--color-dark-ink)]/60 mb-3">Record who received the parcel and attach a demo delivery photo. JPEG, PNG, or WebP up to 5 MB.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-xs text-[var(--color-dark-ink)]/70">Received by
          <input value={recipientName} onChange={(event) => setRecipientName(event.target.value)} required maxLength={120} className="admin-input-premium mt-1 w-full rounded border border-[var(--color-dark-line)] px-3 py-2 text-sm text-white" placeholder="Recipient's full name" />
        </label>
        <label className="text-xs text-[var(--color-dark-ink)]/70">Proof photo
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhoto(event.target.files?.[0] || null)} required className="mt-1 block w-full text-xs text-[var(--color-dark-ink)]/70 file:mr-3 file:rounded file:border-0 file:bg-[var(--color-circuit)] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white" />
        </label>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-[var(--color-signal)]">{error}</p>}
      {success && <p role="status" className="mt-2 text-xs text-emerald-300">{success}</p>}
      <button type="submit" disabled={busy || !photo || !recipientName.trim()} className="admin-btn-primary mt-3 disabled:opacity-50">{busy ? "Saving proof…" : "Save proof and mark delivered"}</button>
    </form>
  );
}
