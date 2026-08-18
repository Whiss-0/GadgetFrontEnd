import { useEffect, useState } from "react";
import client, { productsApi, categoriesApi } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import ProductCard from "../components/ProductCard";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null); // null = all
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 12;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const [toast, setToast] = useState("");

  useEffect(() => {
    categoriesApi
      .list()
      .then((res) => setCategories(res.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      const request = searchTerm.trim()
        ? productsApi.search(searchTerm.trim())
        : client.get(`/api/product?pageNumber=${page}&pageSize=${pageSize}`);

      request
        .then((res) => {
          // Paged responses come back as { items, totalCount, ... } — plain
          // lists (from search) come back as a bare array. Handle both.
          const data = res.data;
          const items = Array.isArray(data) ? data : data?.items ?? data?.Items ?? [];
          const count = Array.isArray(data) ? data.length : data?.totalCount ?? data?.TotalCount ?? items.length;
          setProducts(items);
          setTotalCount(count);
        })
        .catch(() => setError("Couldn't load products. Is the API running on http://localhost:5064?"))
        .finally(() => setLoading(false));
    }, 350); // debounce — wait for typing to pause before firing the request

    return () => clearTimeout(handle);
  }, [searchTerm, page]);

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

  const visibleProducts = selectedCategory
    ? products.filter((p) => p.category_id === selectedCategory)
    : products;

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

      <input
        type="text"
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setPage(1);
        }}
        placeholder="Search products or brands…"
        className="w-full max-w-sm border border-[var(--color-line)] rounded px-3 py-2 mb-4 bg-white focus:border-[var(--color-circuit)] outline-none"
      />

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`filter-pill text-xs font-semibold uppercase px-3 py-1.5 rounded-full border transition-colors ${
              selectedCategory === null ? "active" : ""
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.category_id}
              onClick={() => setSelectedCategory(c.category_id)}
              className={`filter-pill text-xs font-semibold uppercase px-3 py-1.5 rounded-full border transition-colors ${
                selectedCategory === c.category_id ? "active" : ""
              }`}
            >
              {c.category_name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton skeleton-image"></div>
              <div className="skeleton-body">
                <div className="skeleton skeleton-title"></div>
                <div className="skeleton skeleton-subtitle"></div>
                <div className="skeleton-footer">
                  <div className="skeleton skeleton-price"></div>
                  <div className="skeleton skeleton-btn"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="text-[var(--color-signal)]">{error}</p>
      ) : visibleProducts.length === 0 ? (
        <p className="text-[var(--color-ink-soft)]">
          {selectedCategory ? "No products in this category." : "No products yet — add some from the admin panel."}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {visibleProducts.map((p) => (
            <ProductCard key={p.product_id} product={p} onAddToCart={handleAdd} />
          ))}
        </div>
      )}

      {!searchTerm && totalCount > pageSize && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-sm px-3 py-1.5 border border-[var(--color-line)] rounded disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm font-[var(--font-mono)] text-[var(--color-ink-soft)]">
            Page {page} of {Math.ceil(totalCount / pageSize)}
          </span>
          <button
            onClick={() => setPage((p) => (p * pageSize < totalCount ? p + 1 : p))}
            disabled={page * pageSize >= totalCount}
            className="text-sm px-3 py-1.5 border border-[var(--color-line)] rounded disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
