import { useEffect, useState } from "react";
import { productsApi } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import ProductCard from "../components/ProductCard";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const [toast, setToast] = useState("");

  useEffect(() => {
    productsApi
      .list()
      .then((res) => setProducts(res.data || []))
      .catch(() => setError("Couldn't load products. Is the API running on http://localhost:5064?"))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(productId) {
    if (!isAuthenticated) {
      setToast("Log in to add items to your cart.");
      setTimeout(() => setToast(""), 2500);
      return;
    }
    try {
      await addItem(productId, 1);
      setToast("Added to cart!");
    } catch (err) {
      setToast(err.response?.data?.message || "Couldn't add to cart.");
    }
    setTimeout(() => setToast(""), 2000);
  }

  return (
    <div className="max-w-6xl mx-auto px-5 py-10">
      <div className="mb-8">
        <p className="font-[var(--font-mono)] text-xs text-[var(--color-circuit)] mb-1">CATALOG — FULL RANGE</p>
        <h1 className="font-[var(--font-display)] text-3xl font-semibold">Gadgets in stock</h1>
      </div>

      {toast && (
        <div className="fixed top-20 right-5 bg-[var(--color-ink)] text-white text-sm px-4 py-2 rounded shadow-lg z-50">
          {toast}
        </div>
      )}

      {loading && <p className="text-[var(--color-ink-soft)]">Loading products…</p>}
      {error && <p className="text-[var(--color-signal)]">{error}</p>}

      {!loading && !error && products.length === 0 && (
        <p className="text-[var(--color-ink-soft)]">No products yet — add some from the admin panel.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {products.map((p) => (
          <ProductCard key={p.product_id} product={p} onAddToCart={handleAdd} />
        ))}
      </div>
    </div>
  );
}
