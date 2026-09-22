import { useEffect, useRef } from "react";

/**
 * ConfirmDialog
 *
 * A reusable, accessible confirmation dialog for high-impact actions.
 *
 * Props:
 *   open        – Boolean. Renders nothing when false.
 *   title       – Short heading for the action.
 *   description – One-sentence explanation shown below the title.
 *   warning     – Consequence copy shown in the highlighted warning area.
 *   confirmLabel – Label for the confirm (destructive) button.
 *   cancelLabel  – Label for the cancel (safe) button. Defaults to "Go back".
 *   tone        – "warning" (amber) | "danger" (signal red).
 *   busy        – Disables both buttons while the API request is in flight.
 *   onConfirm   – Called when the user clicks the confirm button.
 *   onCancel    – Called when the user dismisses the dialog.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  warning,
  confirmLabel = "Confirm",
  cancelLabel = "Go back",
  tone = "warning",
  busy = false,
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null);
  const dialogId = "confirm-dialog";
  const titleId = `${dialogId}-title`;
  const descId = `${dialogId}-desc`;

  // Move focus to Cancel (safer action) when dialog opens
  useEffect(() => {
    if (open) {
      // Defer so the element is rendered in the DOM
      const t = setTimeout(() => cancelRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Escape key handler
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e) {
      if (e.key === "Escape" && !busy) onCancel?.();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const isDanger = tone === "danger";

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget && !busy) onCancel?.();
  }

  return (
    <div
      className="confirm-backdrop"
      role="presentation"
      onClick={handleBackdropClick}
    >
      <div
        id={dialogId}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={`confirm-dialog ${isDanger ? "confirm-dialog-danger" : "confirm-dialog-warning"}`}
      >
        {/* Icon */}
        <div className="confirm-dialog-icon" aria-hidden="true">
          {isDanger ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
        </div>

        {/* Content */}
        <div className="confirm-dialog-content">
          <h2 id={titleId} className="confirm-dialog-title">{title}</h2>
          {description && (
            <p id={descId} className="confirm-dialog-description">{description}</p>
          )}
          {warning && (
            <p className="confirm-dialog-warning-text">{warning}</p>
          )}
        </div>

        {/* Actions */}
        <div className="confirm-dialog-actions">
          <button
            ref={cancelRef}
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="confirm-dialog-cancel"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`confirm-dialog-confirm ${isDanger ? "confirm-dialog-confirm-danger" : "confirm-dialog-confirm-warning"}`}
          >
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
