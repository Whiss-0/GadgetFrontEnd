import { useLocation, Link, useNavigate } from "react-router-dom";

export default function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="empty-page">
      <div className="empty-page-card">
        <p className="font-[var(--font-mono)] text-xs text-[var(--color-circuit)] mb-2 tracking-widest uppercase">
          404
        </p>
        <h1 className="font-[var(--font-display)] text-4xl font-semibold mb-3">
          Page not found
        </h1>
        <p className="text-[var(--color-ink-soft)] mb-1">
          That page has moved on.
        </p>
        <p className="text-[var(--color-ink-soft)] text-sm mb-8">
          We couldn't find{" "}
          <code className="font-[var(--font-mono)] text-xs bg-[var(--color-line)]/50 px-1.5 py-0.5 rounded">
            {location.pathname}
          </code>
          . Try the catalog instead, or head back to the home page.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            to="/"
            className="btn-primary px-5 py-2.5 rounded text-sm font-semibold"
          >
            Browse the catalog
          </Link>
          <button
            onClick={() => navigate(-1)}
            className="btn-secondary px-5 py-2.5 rounded text-sm font-semibold"
          >
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}
