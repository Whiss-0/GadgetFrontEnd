import { Link } from "react-router-dom";

// Build a short SKU code from the product id and name
function sku(id, name) {
  const code = (name || "GDG").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
  return `${code}-${String(id).padStart(4, "0")}`;
}

export default function ProductCard({ product, onAddToCart }) {
  // API returns snake_case: product_id, product_name, price, stock, brand, image
  const id    = product.product_id;
  const name  = product.product_name ?? "Unnamed product";
  const price = product.price ?? 0;
  const stock = product.stock;

  return (
    <div className="spec-ticket rounded-md overflow-hidden flex flex-col h-full">
      <div className="h-[148px] bg-[var(--color-line)]/40 flex items-center justify-center relative">
        <span className="font-[var(--font-mono)] text-xs text-[var(--color-ink-soft)] mono-tag absolute top-2 left-2 bg-[var(--color-paper)] px-1.5 py-0.5 rounded border border-[var(--color-line)]">
          {sku(id, name)}
        </span>
        {product.image ? (
          <img
            src={product.image}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-[var(--color-ink-soft)]/40">
            <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 9h8M8 13h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </div>

      <div className="p-4 pt-5 flex flex-col flex-1">
        <Link
          to={`/products/${id}`}
          className="font-[var(--font-display)] font-semibold text-base leading-snug hover:text-[var(--color-circuit)] transition-colors"
        >
          {name}
        </Link>
        {product.brand && (
          <span className="text-xs mt-0.5 font-[var(--font-mono)] text-[var(--color-ink-soft)]/70">
            {product.brand}
          </span>
        )}
        {typeof stock === "number" && (
          <span className="text-xs mt-1 font-[var(--font-mono)] text-[var(--color-ink-soft)]">
            {stock > 0 ? `${stock} in stock` : "Out of stock"}
          </span>
        )}

        <div className="mt-auto pt-4 flex items-center justify-between">
          <span className="font-[var(--font-mono)] font-semibold text-lg text-[var(--color-gold)]">
            ${Number(price).toFixed(2)}
          </span>
          <button
            onClick={() => onAddToCart?.(id)}
            disabled={stock === 0}
            className="text-xs font-semibold uppercase tracking-wide bg-[var(--color-ink)] text-white px-3 py-2 rounded hover:bg-[var(--color-circuit)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
