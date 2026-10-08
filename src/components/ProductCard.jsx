import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { wishlistApi } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../hooks/useToast";
import ProductArt from "./ProductArt";


export default function ProductCard({ product, onAddToCart }) {
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  // API returns snake_case: product_id, product_name, price, stock, brand, image
  const id    = product.product_id;
  const name  = product.product_name ?? "Unnamed product";
  const price = product.price ?? 0;
  const stock = product.stock;

  async function handleWishlist(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate("/login", { state: { from: { pathname: `/products/${id}` } } });
      return;
    }
    if (wishlistBusy) return;
    setWishlistBusy(true);
    try {
      const response = await wishlistApi.list();
      const existing = (Array.isArray(response.data) ? response.data : []).find((item) => item.product_id === id);
      if (existing) {
        if (!saved) {
          setSaved(true);
          toast.show(`“${name}” is already in your wishlist.`, { tone: "success" });
          return;
        }
        await wishlistApi.remove(existing.wishlist_id);
        setSaved(false);
        toast.show(`“${name}” removed from your wishlist.`, { tone: "success" });
      } else {
        await wishlistApi.add(id);
        setSaved(true);
        toast.show(`“${name}” saved to your wishlist.`, { tone: "success" });
      }
    } catch (error) {
      toast.show(error.response?.data?.message || "Couldn’t save this item to your wishlist.", { tone: "error" });
    } finally {
      setWishlistBusy(false);
    }
  }

  async function handleAddClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (stock === 0 || adding) return;

    setAdding(true);
    try {
      if (onAddToCart) {
        const result = await onAddToCart(product);
        if (result === false) return;
      }
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1800);
    } finally {
      setAdding(false);
    }
  }

  const stockLabel =
    typeof stock === "number"
      ? stock === 0
        ? "Out of stock"
        : stock <= 3
        ? `Only ${stock} left`
        : "In stock"
      : "";

  const availabilityKicker =
    stock === 0
      ? "Out of stock"
      : stock <= 3
      ? `Only ${stock} left`
      : "Ready to ship";

  return (
    <div className={`product-card ${stock === 0 ? "out-of-stock" : ""}`}>
      <div className="product-image-wrap main-image-container">
        <div className="product-image-stage" aria-hidden="true" />

        <span className="product-image-kicker">
          {availabilityKicker}
        </span>

        <button
          type="button"
          onClick={handleWishlist}
          title={saved ? "Remove from wishlist" : "Save to wishlist"}
          aria-label={saved ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
          disabled={wishlistBusy}
          aria-pressed={saved}
          className={`product-wishlist ${saved ? "saved" : ""}`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>

        <Link to={`/products/${id}`} className="product-art-link" aria-label={`View ${name} details`}>
          <ProductArt
            product={product}
            alt={name}
            className="product-art-image"
          />
          <span className="product-view-details">View details <span aria-hidden="true">↗</span></span>
        </Link>
      </div>

      <div className="product-card-body">
        <Link
          to={`/products/${id}`}
          className="font-[var(--font-display)] font-semibold text-base leading-snug hover:text-[var(--color-circuit)] transition-colors line-clamp-2"
        >
          {name}
        </Link>
        
        <div className="product-meta flex items-center justify-between text-xs text-[var(--color-ink-soft)]">
            <span>{product.brand || "Gadget Store pick"}</span>
          {stockLabel && (
            <span className={stock === 0 ? "text-[var(--color-signal)]" : stock <= 3 ? "text-[var(--color-warning)] font-medium" : ""}>
              {stockLabel}
            </span>
          )}
        </div>

        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          <span className="product-price">
            ${Number(price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <button
            onClick={handleAddClick}
            disabled={stock === 0 || adding}
            aria-label={`Add ${name} to cart`}
            className={`btn-primary btn-add text-sm font-semibold px-4 py-2 rounded ${
              added ? "is-added" : ""
            }`}
          >
            {stock === 0 ? "Out of stock" : adding ? "Adding…" : added ? "Added" : "Add to cart"}
          </button>
        </div>
      </div>
    </div>
  );
}
