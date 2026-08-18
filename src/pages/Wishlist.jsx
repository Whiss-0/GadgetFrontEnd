import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { wishlistApi, productsApi, cartApi } from "../api/client";

export default function Wishlist() {
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    Promise.all([wishlistApi.list(), productsApi.list()])
      .then(([wishRes, prodRes]) => {
        setItems(wishRes.data || []);
        setProducts(prodRes.data || []);
      })
      .catch(() => setError("Couldn't load your wishlist."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleRemove(wishlistId) {
    await wishlistApi.remove(wishlistId);
    load();
  }

  async function handleAddToCart(productId) {
    try {
      await cartApi.add({ Product_ID: productId, Quantity: 1 });
    } catch {
      // ignore — cart page will show the real error if something's wrong
    }
  }

  const merged = items
    .map((w) => {
      const product = products.find((p) => p.product_id === w.product_id);
      return product ? { wishlistId: w.wishlist_id, ...product } : null;
    })
    .filter(Boolean);

  return (
    <div className="max-w-4xl mx-auto px-5 py-12">
      <p className="font-[var(--font-mono)] text-xs text-[var(--color-circuit)] mb-1">SAVED ITEMS</p>
      <h1 className="font-[var(--font-display)] text-3xl font-semibold mb-8">Your wishlist</h1>

      {loading && <p className="text-[var(--color-ink-soft)]">Loading…</p>}
      {error && <p className="text-sm text-[var(--color-signal)]">{error}</p>}
      {!loading && !error && merged.length === 0 && (
        <p className="text-[var(--color-ink-soft)]">Nothing saved yet — tap the heart on a product to add it here.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {merged.map((p) => (
          <div key={p.wishlistId} className="spec-ticket rounded-md p-4 flex flex-col">
            <Link
              to={`/products/${p.product_id}`}
              className="font-[var(--font-display)] font-semibold text-base mb-1 hover:text-[var(--color-circuit)] transition-colors"
            >
              {p.product_name}
            </Link>
            <span className="font-[var(--font-mono)] font-semibold text-[var(--color-gold)] mb-3">
              ${Number(p.price).toFixed(2)}
            </span>
            <div className="mt-auto flex gap-2">
              <button
                onClick={() => handleAddToCart(p.product_id)}
                className="flex-1 btn-primary text-xs font-semibold uppercase px-3 py-2 rounded"
              >
                Add to cart
              </button>
              <button
                onClick={() => handleRemove(p.wishlistId)}
                className="text-[var(--color-signal)] text-xs px-2"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
