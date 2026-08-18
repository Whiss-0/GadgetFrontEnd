import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { wishlistApi, productsApi, cartApi } from "../api/client";

export default function Wishlist() {
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [toast, setToast] = useState(null);
  const [addingId, setAddingId] = useState(null);

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

  async function handleAddToCart(p) {
    setAddingId(p.product_id);
    try {
      await cartApi.add({ Product_ID: p.product_id, Quantity: 1 });
      setToast({ text: `✓ Added "${p.product_name}" to your cart!`, type: "success" });
    } catch (err) {
      setToast({ text: err.response?.data?.message || "Couldn't add to cart.", type: "error" });
    } finally {
      setAddingId(null);
      setTimeout(() => setToast(null), 2500);
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

      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border transition-all duration-300 ${
            toast.type === "error"
              ? "bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
              : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-emerald-500/40 dark:border-cyan-500/40 shadow-emerald-500/10 dark:shadow-cyan-500/20"
          }`}
        >
          {toast.type === "error" ? (
            <span className="text-red-500 flex-shrink-0 text-lg">⚠️</span>
          ) : (
            <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-cyan-950 flex items-center justify-center text-emerald-600 dark:text-cyan-400 font-bold text-xs flex-shrink-0">
              ✓
            </span>
          )}
          <span className="text-sm font-semibold">{toast.text}</span>
        </div>
      )}

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
                onClick={() => handleAddToCart(p)}
                disabled={addingId === p.product_id}
                className="flex-1 btn-primary text-xs font-semibold uppercase px-3 py-2 rounded disabled:opacity-50"
              >
                {addingId === p.product_id ? "Adding…" : "Add to cart"}
              </button>
              <button
                onClick={() => handleRemove(p.wishlistId)}
                className="text-alert text-xs px-2"
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
