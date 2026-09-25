import { useEffect, useState } from "react";
import client, { productsApi, categoriesApi } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useToast } from "../hooks/useToast";
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
  const toast = useToast();

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
      toast.show("Log in to add items to your cart.", { tone: "error" });
      return;
    }
    try {
      await addItem(id, 1);
      toast.show(`"${name}" added to your cart.`, { tone: "success" });
    } catch (err) {
      toast.show(err.response?.data?.message || "Couldn't add to cart.", { tone: "error" });
    }
  }

  const visibleProducts = selectedCategory
    ? products.filter((p) => p.category_id === selectedCategory)
    : products;

  return (
    <div className="catalog-page max-w-6xl mx-auto px-5 py-6 sm:py-10">
      <section className="catalog-hero mb-8 sm:mb-10">
        <div className="catalog-hero-copy">
          <p className="eyebrow mb-2">Curated tech store</p>
          <h1 className="font-[var(--font-display)] text-3xl sm:text-5xl font-semibold tracking-tight leading-[1.1]">
            Technology you'll enjoy using.
          </h1>
          <p className="catalog-hero-description mt-2 mb-5 text-base sm:text-lg text-[var(--color-ink-soft)] max-w-xl">
            Thoughtful gadgets for work, play, and everyday life.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="#products"
              className="btn-primary px-5 py-2.5 rounded-lg text-sm font-semibold inline-flex items-center gap-2"
            >
              Shop products
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <polyline points="19 12 12 19 5 12"></polyline>
              </svg>
            </a>
            <span className="text-xs sm:text-sm text-[var(--color-ink-soft)] font-medium">
              {totalCount > 0 ? `${totalCount} products to explore` : "Carefully selected gear"}
            </span>
          </div>
        </div>

        {/* Restrained trust row */}
        <div className="catalog-trust-row grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-[var(--color-line)] text-xs text-[var(--color-ink-soft)]" aria-label="Store commitments">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-circuit)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>Secure checkout</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-circuit)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            <span>Fast dispatch</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-circuit)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            <span>Easy returns</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-circuit)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span>Helpful support</span>
          </div>
        </div>
      </section>

      <section id="products" className="catalog-toolbar mb-6 scroll-mt-20" aria-label="Catalog filters">
        <div className="search-field-wrap">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="search-icon"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Search products or brands"
            aria-label="Search products or brands"
            className="catalog-search"
          />
          {searchTerm && (
            <button
              type="button"
              className="search-clear"
              onClick={() => { setSearchTerm(""); setPage(1); }}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
        <div className="catalog-toolbar-meta text-xs sm:text-sm">
          {loading ? "Finding products…" : `${visibleProducts.length} ${visibleProducts.length === 1 ? "product" : "products"}`}
        </div>
      </section>

      {categories.length > 0 && (
        <div className="category-filter-row flex flex-wrap items-center gap-2 mb-6" aria-label="Filter by category">
          <span className="category-filter-label text-xs text-[var(--color-ink-soft)] font-medium mr-1">Categories:</span>
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            aria-pressed={selectedCategory === null}
            className={`filter-pill text-xs font-medium capitalize px-3 py-1.5 rounded-full border transition-colors ${
              selectedCategory === null ? "active" : ""
            }`}
          >
            All products
          </button>
          {categories.map((c) => (
            <button
              type="button"
              key={c.category_id}
              onClick={() => setSelectedCategory(c.category_id)}
              aria-pressed={selectedCategory === c.category_id}
              className={`filter-pill text-xs font-medium capitalize px-3 py-1.5 rounded-full border transition-colors ${
                selectedCategory === c.category_id ? "active" : ""
              }`}
            >
              {c.category_name}
            </button>
          ))}
          {(selectedCategory !== null || searchTerm) && (
            <button
              type="button"
              onClick={() => { setSelectedCategory(null); setSearchTerm(""); setPage(1); }}
              className="text-xs text-[var(--color-circuit)] hover:underline ml-auto font-medium"
            >
              Clear filters
            </button>
          )}
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
          <span className="catalog-state-kicker">We hit a small snag</span>
          <h2>We couldn't load the products.</h2>
          <p>{error}</p>
          <button type="button" className="btn-primary px-4 py-2 rounded" onClick={() => { setError(""); setRetryNonce((value) => value + 1); }}>Try again</button>
        </div>
      ) : visibleProducts.length === 0 ? (
        <div className="catalog-state">
          <span className="catalog-state-kicker">No matches yet</span>
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
