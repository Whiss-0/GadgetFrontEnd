import { useState, useRef } from "react";
import { productsApi } from "../api/client";

export default function ImageDropzone({ value, onChange }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const res = await productsApi.uploadImage(file);
      onChange(res.data.url);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't upload that image.");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload product image — click or drag a file here"
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
        className={`dropzone ${isDragging ? "dropzone-active" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {value ? (
          <img src={value} alt="" className="dropzone-preview" />
        ) : (
          <div className="dropzone-placeholder">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>{uploading ? "Uploading…" : "Drag an image here, or click to browse"}</span>
          </div>
        )}
      </div>

      {value && !uploading && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange(""); }}
          className="text-alert text-xs mt-1"
        >
          Remove image
        </button>
      )}

      {error && <p className="text-xs text-[var(--color-signal)] mt-1">{error}</p>}
    </div>
  );
}
