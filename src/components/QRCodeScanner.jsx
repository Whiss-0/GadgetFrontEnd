import { useEffect, useRef, useState } from "react";

export default function QRCodeScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const scanCallback = useRef(onScan);
  const [message, setMessage] = useState("");
  const [manualValue, setManualValue] = useState("");
  scanCallback.current = onScan;

  useEffect(() => {
    let active = true;
    let stream;
    let timer;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMessage("Camera access is unavailable here. Use the manual demo payload below.");
        return;
      }
      if (typeof window.BarcodeDetector !== "function") {
        setMessage("This browser does not support native QR scanning. Use the manual demo payload below.");
        return;
      }
      try {
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (!active) { stream.getTracks().forEach((track) => track.stop()); return; }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const scan = async () => {
          if (!active || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes[0]?.rawValue) {
              scanCallback.current?.(codes[0].rawValue);
              return;
            }
          } catch {
            if (active) setMessage("Could not read that QR code. Try again or enter the demo payload below.");
          }
          timer = window.setTimeout(scan, 320);
        };
        scan();
      } catch {
        if (active) setMessage("Camera permission was denied or the camera is unavailable. Use the manual demo payload below.");
      }
    }

    startCamera();
    return () => {
      active = false;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function submitManual(event) {
    event.preventDefault();
    if (manualValue.trim()) scanCallback.current?.(manualValue.trim());
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="qr-scanner-dialog" role="dialog" aria-modal="true" aria-labelledby="qr-scanner-title">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-circuit)]">Demo utility</p><h2 id="qr-scanner-title" className="mt-1 text-lg font-bold text-[var(--color-ink)]">Scan an order QR code</h2></div>
          <button type="button" className="qr-scanner-close" onClick={onClose} aria-label="Close scanner">×</button>
        </div>
        <div className="qr-camera-frame"><video ref={videoRef} muted playsInline aria-label="Live QR camera view" /><span className="qr-camera-guide" /></div>
        <p className="min-h-5 text-xs text-[var(--color-ink-soft)]" role="status">{message || "Point the camera at a GadgetStore order QR code."}</p>
        <form onSubmit={submitManual} className="qr-manual-form">
          <label htmlFor="qr-demo-payload">Manual demo payload</label>
          <div className="flex gap-2"><input id="qr-demo-payload" value={manualValue} onChange={(event) => setManualValue(event.target.value)} placeholder="GADGETSTORE:ORDER:42" /><button className="btn-primary px-3 py-2 text-xs font-semibold" type="submit">Open order</button></div>
        </form>
        <p className="mt-3 text-[10px] leading-relaxed text-[var(--color-ink-soft)]">Camera scanning requires browser permission and a secure page (HTTPS or localhost). The QR contains only the order ID.</p>
      </section>
    </div>
  );
}
