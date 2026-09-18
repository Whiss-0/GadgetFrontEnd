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
  const [retryNonce, setRetryNonce] = useState(0);
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const [toast, setToast] = useState(null);

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
  }, [searchTerm, page, retryNonce]);

  async function handleAdd(productOrId) {
    const id = typeof productOrId === "object" ? productOrId.product_id : productOrId;
    const name = typeof productOrId === "object" ? productOrId.product_name : "Product";

    if (!isAuthenticated) {
      setToast({ text: "Log in to add items to your cart.", type: "error" });
      setTimeout(() => setToast(null), 2500);
      return;
    }
    try {
      await addItem(id, 1);
      setToast({ text: `✓ Added "${name}" to your cart!`, type: "success" });
    } catch (err) {
      setToast({ text: err.response?.data?.message || "Couldn't add to cart.", type: "error" });
    }
    setTimeout(() => setToast(null), 2500);
  }

  const visibleProducts = selectedCategory
    ? products.filter((p) => p.category_id === selectedCategory)
    : products;

  return (
    <div className="catalog-page max-w-6xl mx-auto px-5 py-8 sm:py-12">
      <section className="catalog-hero mb-10">
        <div className="catalog-hero-copy">
          <p className="eyebrow mb-3"><span className="eyebrow-dot" /> GOOD GEAR, WELL CHOSEN</p>
          <h1 className="font-[var(--font-display)] text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.05]">Technology you'll love using.<br /><span className="hero-accent">No filler.</span></h1>
          <p className="catalog-hero-description">From everyday essentials to the piece that finishes your desk, find reliable tech that fits the way you work, play, and live.</p>
          <div className="catalog-hero-stats" aria-label="Catalog highlights">
            <span><strong>{totalCount || "—"}</strong> products to browse</span>
            <span><strong>24h</strong> fast dispatch</span>
            <span><strong>Easy</strong> returns</span>
          </div>
        </div>
        <div className="catalog-hero-mark" aria-hidden="true">
          <span className="hero-mark-label">MADE FOR DAILY USE</span>
          <span className="hero-mark-ring hero-mark-ring-one" />
          <span className="hero-mark-ring hero-mark-ring-two" />
          <span className="hero-mark-crosshair" />
        </div>
      </section>

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

      <section className="catalog-toolbar mb-7" aria-label="Catalog filters">
        <div className="search-field-wrap">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="search-icon"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Search products or brands…"
            aria-label="Search products or brands"
            className="catalog-search"
          />
          {searchTerm && <button type="button" className="search-clear" onClick={() => { setSearchTerm(""); setPage(1); }} aria-label="Clear search">×</button>}
        </div>
        <div className="catalog-toolbar-meta">{loading ? "Finding products…" : `${visibleProducts.length} ${visibleProducts.length === 1 ? "RESULT" : "RESULTS"}`}</div>
      </section>

      {categories.length > 0 && (
        <div className="category-filter-row flex flex-wrap gap-2 mb-6" aria-label="Filter by category">
          <span className="category-filter-label">FILTER BY</span>
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            aria-pressed={selectedCategory === null}
            className={`filter-pill text-xs font-semibold uppercase px-3 py-1.5 rounded-full border transition-colors ${
              selectedCategory === null ? "active" : ""
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              type="button"
              key={c.category_id}
              onClick={() => setSelectedCategory(c.category_id)}
              aria-pressed={selectedCategory === c.category_id}
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
                <div className="skeleton skeleton-footer">
                  <div className="skeleton skeleton-price"></div>
                  <div className="skeleton skeleton-btn"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="catalog-state catalog-state-error">
          <span className="catalog-state-kicker">SORRY, SOMETHING WENT WRONG</span>
          <h2>We couldn't load the products.</h2>
          <p>{error}</p>
          <button type="button" className="btn-primary px-4 py-2 rounded" onClick={() => { setError(""); setRetryNonce((value) => value + 1); }}>Try again</button>
        </div>
      ) : visibleProducts.length === 0 ? (
        <div className="catalog-state">
          <span className="catalog-state-kicker">NO PRODUCTS FOUND</span>
          <h2>Nothing matched your search.</h2>
          <p>{selectedCategory ? "Try another category or clear the active filter." : "Try a different search term or check back soon."}</p>
          {(selectedCategory || searchTerm) && <button type="button" className="btn-secondary px-4 py-2 rounded" onClick={() => { setSelectedCategory(null); setSearchTerm(""); setPage(1); }}>Reset filters</button>}
        </div>
      ) : (
        <div className="product-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
