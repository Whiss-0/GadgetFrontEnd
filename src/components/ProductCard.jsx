import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { wishlistApi } from "../api/client";
import { useAuth } from "../context/AuthContext";

// Build a short SKU code from the product id and name
function sku(id, name) {
  const code = (name || "GDG").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
  return `${code}-${String(id).padStart(4, "0")}`;
}

export default function ProductCard({ product, onAddToCart }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);

  // API returns snake_case: product_id, product_name, price, stock, brand, image
  const id    = product.product_id;
  const name  = product.product_name ?? "Unnamed product";
  const price = product.price ?? 0;
  const stock = product.stock;

  async function handleWishlist(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    try {
      await wishlistApi.add(id);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // already added or error
    }
  }

  return (
    <div className="product-card relative group">
      <div className="product-image-wrap flex items-center justify-center relative">
        <span className="sku-badge">
          {sku(id, name)}
        </span>
        <button
          onClick={handleWishlist}
          title={saved ? "Saved to wishlist!" : "Save to wishlist"}
          className={`absolute top-2 right-2 z-10 p-1.5 rounded-full backdrop-blur-sm transition-all ${
            saved
              ? "bg-[var(--color-signal)] text-white"
              : "bg-black/20 hover:bg-black/40 text-white"
          }`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>
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

      <div className="product-card-body">
        <Link
          to={`/products/${id}`}
          className="font-[var(--font-display)] font-semibold text-base leading-snug hover:text-[var(--color-circuit)] transition-colors line-clamp-2"
        >
          {name}
        </Link>
        
        <div className="text-[0.875rem] text-[#64748b]">
          {product.brand ? `${product.brand} • ` : ""}
          {typeof stock === "number" ? (stock > 0 ? `${stock} in stock` : "Out of stock") : ""}
        </div>

        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="font-semibold text-lg text-[#0f172a]">
            ${Number(price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <button
            onClick={() => onAddToCart?.(id)}
            disabled={stock === 0}
            className="btn-primary text-sm font-semibold uppercase tracking-wide px-4 py-2 rounded disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
