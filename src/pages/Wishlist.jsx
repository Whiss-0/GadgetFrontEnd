import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { wishlistApi, productsApi, cartApi } from "../api/client";
import { useToast } from "../hooks/useToast";
import ProductArt from "../components/ProductArt";

export default function Wishlist() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
    try {
      await wishlistApi.remove(wishlistId);
      load();
      toast.show("Item removed from your wishlist.", { tone: "success" });
    } catch {
      toast.show("Couldn't remove item from wishlist.", { tone: "error" });
    }
  }

  async function handleAddToCart(p) {
    setAddingId(p.product_id);
    try {
      await cartApi.add({ Product_ID: p.product_id, Quantity: 1 });
      toast.show(`"${p.product_name}" added to your cart.`, { tone: "success" });
    } catch (err) {
      toast.show(err.response?.data?.message || "Couldn't add to cart.", { tone: "error" });
    } finally {
      setAddingId(null);
    }
  }

  const merged = items
    .map((w) => {
      const product = products.find((p) => p.product_id === w.product_id);
      return product ? { wishlistId: w.wishlist_id, ...product } : null;
    })
    .filter(Boolean);

  return (
    <div className="max-w-5xl mx-auto px-5 py-8 sm:py-12">
      <h1 className="font-[var(--font-display)] text-2xl sm:text-3xl font-semibold mb-2">Saved items</h1>
      <p className="text-[var(--color-ink-soft)] text-sm mb-8">
        Keep products here while you compare your options.
      </p>

      {loading && <p className="text-[var(--color-ink-soft)]">Loading…</p>}
      {error && <p className="text-sm text-[var(--color-signal)] mb-4">{error}</p>}

      {!loading && !error && merged.length === 0 && (
        <div className="empty-state-card text-center p-8 sm:p-12 border border-[var(--color-line)] rounded-xl bg-[var(--color-panel)] max-w-lg mx-auto">
          <p className="font-[var(--font-display)] font-semibold text-lg mb-2">Your wishlist is waiting</p>
          <p className="text-[var(--color-ink-soft)] text-sm mb-6">
            Save products you like while you compare your options.
          </p>
          <Link to="/" className="btn-primary px-6 py-2.5 rounded-lg text-sm font-semibold inline-block">
            Browse the catalog
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {merged.map((p) => (
          <div key={p.wishlistId} className="spec-ticket rounded-xl overflow-hidden border border-[var(--color-line)] bg-[var(--color-panel)] flex flex-col">
            <div className="aspect-[4/3] bg-[var(--color-paper)] p-4 flex items-center justify-center relative">
              <ProductArt
                product={p}
                alt={p.product_name}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="p-4 flex flex-col flex-1">
              <Link
                to={`/products/${p.product_id}`}
                className="font-[var(--font-display)] font-semibold text-base mb-1 hover:text-[var(--color-circuit)] transition-colors line-clamp-1"
              >
                {p.product_name}
              </Link>
              {p.brand && <p className="text-xs text-[var(--color-ink-soft)] mb-2">{p.brand}</p>}
              <div className="mt-auto pt-3 flex items-center justify-between border-t border-[var(--color-line)]">
                <span className="font-[var(--font-mono)] font-semibold text-base text-[var(--color-gold)]">
                  ${Number(p.price).toFixed(2)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRemove(p.wishlistId)}
                    className="text-xs text-[var(--color-ink-soft)] hover:text-[var(--color-signal)] px-2 py-1 transition-colors"
                  >
                    Remove
                  </button>
                  <button
                    onClick={() => handleAddToCart(p)}
                    disabled={addingId === p.product_id}
                    className="btn-primary text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    {addingId === p.product_id ? "Adding…" : "Add to cart"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
