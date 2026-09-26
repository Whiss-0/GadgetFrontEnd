import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import client, { categoriesApi, productsApi } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useToast } from "../hooks/useToast";
import ProductCard from "../components/ProductCard";

const PAGE_SIZE = 12;
const CATEGORY_ART = [
  { terms: ["laptop", "computer", "computing", "pc"], image: "/product-art-laptop.webp" },
  { terms: ["monitor", "display", "screen"], image: "/product-art-monitor.webp" },
  { terms: ["phone", "mobile"], image: "/product-art-phone.webp" },
  { terms: ["audio", "headphone", "sound"], image: "/product-art-audio.webp" },
  { terms: ["keyboard", "accessor", "peripheral"], image: "/product-art-keyboard.webp" },
];

function categoryImage(categoryName, index) {
  const label = String(categoryName ?? "").toLowerCase();
  const match = CATEGORY_ART.find((item) => item.terms.some((term) => label.includes(term)));
  return match?.image ?? CATEGORY_ART[index % CATEGORY_ART.length].image;
}

function ProductIcon({ type }) {
  const common = { width: 17, height: 17, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  if (type === "shield") return <svg {...common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></svg>;
  if (type === "box") return <svg {...common}><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="M3 8v9l9 5 9-5V8M12 13v9" /></svg>;
  return <svg {...common}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" /><path d="M8 10h8M8 14h5" /></svg>;
}

export default function Home() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("featured");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryNonce, setRetryNonce] = useState(0);
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const toast = useToast();

  useEffect(() => {
    let active = true;
    categoriesApi.list()
      .then((res) => { if (active) setCategories(Array.isArray(res.data) ? res.data : []); })
      .catch(() => { if (active) setCategories([]); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const handle = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        let response;
        const term = searchTerm.trim();
        if (term) {
          response = await productsApi.search(term);
        } else if (selectedCategory) {
          response = await client.get(`/api/product?categoryId=${encodeURIComponent(selectedCategory)}`);
        } else {
          response = await productsApi.list();
        }

        if (!active) return;
        const data = response.data;
        const items = Array.isArray(data) ? data : data?.items ?? data?.Items ?? [];
        const matchingItems = selectedCategory && term
          ? items.filter((item) => item.category_id === selectedCategory)
          : items;
        const count = selectedCategory && term
          ? matchingItems.length
          : Array.isArray(data)
            ? items.length
            : data?.totalCount ?? data?.TotalCount ?? items.length;
        setProducts(matchingItems);
        setTotalCount(count);
      } catch {
        if (active) setError("We couldn’t reach the product catalog. Check that the store API is running, then try again.");
      } finally {
        if (active) setLoading(false);
      }
    }, searchTerm.trim() ? 250 : 0);

    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [searchTerm, selectedCategory, page, retryNonce]);

  async function handleAdd(productOrId) {
    const id = typeof productOrId === "object" ? productOrId.product_id : productOrId;
    const name = typeof productOrId === "object" ? productOrId.product_name : "Product";

    if (!isAuthenticated) {
      toast.show("Log in to add items to your cart.", { tone: "error" });
      return false;
    }
    try {
      await addItem(id, 1);
      toast.show(`“${name}” added to your cart.`, { tone: "success" });
      return true;
    } catch (err) {
      toast.show(err.response?.data?.message || "Couldn’t add this item to your cart.", { tone: "error" });
      return false;
    }
  }

  const sortedProducts = useMemo(() => {
    const next = [...products];
    if (sortBy === "price-low") next.sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0));
    if (sortBy === "price-high") next.sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0));
    if (sortBy === "name") next.sort((a, b) => String(a.product_name ?? "").localeCompare(String(b.product_name ?? "")));
    return next;
  }, [products, sortBy]);

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const visibleProducts = sortedProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const firstProduct = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastProduct = Math.min(page * PAGE_SIZE, totalCount);
  const activeCategory = categories.find((category) => category.category_id === selectedCategory);

  function selectCategory(categoryId) {
    setSelectedCategory(categoryId);
    setPage(1);
  }

  function resetFilters() {
    setSelectedCategory(null);
    setSearchTerm("");
    setSortBy("featured");
    setPage(1);
  }

  return (
    <main className="catalog-page max-w-6xl mx-auto px-5 py-6 sm:py-9">
      <section className="catalog-hero mb-7 sm:mb-9" aria-labelledby="storefront-title">
        <div className="catalog-hero-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> Good tech, thoughtfully chosen</p>
          <h1 id="storefront-title" className="font-[var(--font-display)] text-4xl sm:text-5xl lg:text-[3.6rem] font-semibold tracking-tight leading-[1.04]">
            Make room for <span className="hero-accent">better tech.</span>
          </h1>
          <p className="catalog-hero-description">
            Find the gear that earns its place in your everyday — from a cleaner desk to a better listening session.
          </p>
          <div className="catalog-hero-actions">
            <a href="#products" className="btn-primary px-5 py-3 rounded-lg text-sm font-semibold inline-flex items-center gap-2">
              Explore the collection
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </a>
            <span className="catalog-hero-note">A little less scrolling. A lot more discovering.</span>
          </div>
          <div className="catalog-trust-row" aria-label="Shopping information">
            <span><ProductIcon type="shield" /> Secure account checkout</span>
            <span><ProductIcon type="box" /> Product details up front</span>
            <span><ProductIcon type="support" /> Here when you need us</span>
          </div>
        </div>

        <div className="catalog-hero-art" aria-label="A selection of laptops, audio gear and phones">
          <div className="hero-art-orbit hero-art-orbit-one" />
          <div className="hero-art-orbit hero-art-orbit-two" />
          <img className="hero-product hero-product-back" src="/product-art-audio.webp" alt="" />
          <img className="hero-product hero-product-side" src="/product-art-phone.webp" alt="" />
          <img className="hero-product hero-product-front" src="/product-art-laptop.webp" alt="" />
          <div className="hero-art-caption"><span className="hero-art-caption-dot" /> THE EVERYDAY UPGRADE</div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="category-spotlight mb-9" aria-labelledby="category-heading">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow mb-1">Find your next favorite</p>
              <h2 id="category-heading" className="font-[var(--font-display)] text-xl sm:text-2xl font-semibold">Shop by category</h2>
            </div>
            <button type="button" onClick={() => { resetFilters(); document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }); }} className="text-sm font-semibold text-[var(--color-circuit)] hover:underline">Shop everything <span aria-hidden="true">→</span></button>
          </div>
          <div className="category-tile-grid">
            {categories.slice(0, 5).map((category, index) => (
              <button
                type="button"
                key={category.category_id}
                className={`category-tile ${selectedCategory === category.category_id ? "selected" : ""}`}
                onClick={() => { selectCategory(category.category_id); document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }); }}
                aria-pressed={selectedCategory === category.category_id}
              >
                <img src={categoryImage(category.category_name, index)} alt="" loading="lazy" />
                <span className="category-tile-shade" />
                <span className="category-tile-label">{category.category_name}<span aria-hidden="true">↗</span></span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section id="products" className="catalog-section scroll-mt-24" aria-labelledby="products-heading">
        <div className="catalog-section-heading">
          <div>
            <p className="eyebrow mb-1">A good place to start</p>
            <h2 id="products-heading" className="font-[var(--font-display)] text-2xl sm:text-3xl font-semibold tracking-tight">
              {activeCategory?.category_name || (searchTerm.trim() ? "Search results" : "The collection")}
            </h2>
            <p className="catalog-section-description">
              {activeCategory ? `Explore the ${activeCategory.category_name} edit.` : "Thoughtful picks for your desk, your downtime, and everywhere between."}
            </p>
          </div>
          {(selectedCategory || searchTerm) && (
            <button type="button" onClick={resetFilters} className="reset-filter-link">Clear filters <span aria-hidden="true">×</span></button>
          )}
        </div>

        <div className="catalog-toolbar" aria-label="Catalog controls">
          <div className="search-field-wrap">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="search-icon"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => { setSearchTerm(event.target.value); setPage(1); }}
              placeholder="Search products or brands"
              aria-label="Search products or brands"
              className="catalog-search"
            />
            {searchTerm && <button type="button" className="search-clear" onClick={() => { setSearchTerm(""); setPage(1); }} aria-label="Clear search">×</button>}
          </div>
          <div className="catalog-toolbar-end">
            <label className="sort-control"><span>Sort by</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort products">
                <option value="featured">Featured</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
                <option value="name">Name: A to Z</option>
              </select>
            </label>
            <span className="catalog-toolbar-meta" aria-live="polite">
              {loading ? "Finding your next favorite…" : totalCount === 0 ? "No products" : `${firstProduct}–${lastProduct} of ${totalCount}`}
            </span>
          </div>
        </div>

        {categories.length > 0 && (
          <div className="category-filter-row" aria-label="Filter by category">
            <span className="category-filter-label">Browse:</span>
            <button type="button" onClick={() => selectCategory(null)} aria-pressed={selectedCategory === null} className={`filter-pill ${selectedCategory === null ? "active" : ""}`}>All products</button>
            {categories.map((category) => (
              <button type="button" key={category.category_id} onClick={() => selectCategory(category.category_id)} aria-pressed={selectedCategory === category.category_id} className={`filter-pill ${selectedCategory === category.category_id ? "active" : ""}`}>
                {category.category_name}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="product-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" aria-label="Loading products" aria-busy="true">
            {Array.from({ length: 8 }).map((_, index) => <div key={index} className="skeleton-card"><div className="skeleton skeleton-image" /><div className="skeleton-body"><div className="skeleton skeleton-title" /><div className="skeleton skeleton-subtitle" /><div className="skeleton skeleton-footer"><div className="skeleton skeleton-price" /><div className="skeleton skeleton-btn" /></div></div></div>)}
          </div>
        ) : error ? (
          <div className="catalog-state catalog-state-error" role="alert">
            <span className="catalog-state-kicker">We hit a small snag</span>
            <h2>The collection isn’t available right now.</h2>
            <p>{error}</p>
            <button type="button" className="btn-primary px-4 py-2 rounded" onClick={() => { setError(""); setRetryNonce((value) => value + 1); }}>Try again</button>
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="catalog-state">
            <span className="catalog-state-kicker">No matches yet</span>
            <h2>Nothing matched your search.</h2>
            <p>Try another phrase or browse the full collection — your next favorite might be one filter away.</p>
            {(selectedCategory || searchTerm) && <button type="button" className="btn-secondary px-4 py-2 rounded" onClick={resetFilters}>Show all products</button>}
          </div>
        ) : (
          <div className="product-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {visibleProducts.map((product) => <ProductCard key={product.product_id} product={product} onAddToCart={handleAdd} />)}
          </div>
        )}

        {!loading && !error && pageCount > 1 && (
          <nav className="catalog-pagination" aria-label="Product pages">
            <button type="button" onClick={() => { setPage((current) => Math.max(1, current - 1)); document.getElementById("products-heading")?.scrollIntoView({ behavior: "smooth" }); }} disabled={page === 1} className="pagination-button">← <span>Previous</span></button>
            <span className="pagination-count">Page <strong>{page}</strong> of <strong>{pageCount}</strong></span>
            <button type="button" onClick={() => { setPage((current) => Math.min(pageCount, current + 1)); document.getElementById("products-heading")?.scrollIntoView({ behavior: "smooth" }); }} disabled={page >= pageCount} className="pagination-button"><span>Next</span> →</button>
          </nav>
        )}
      </section>

      <section className="store-assurance" aria-label="Why shop Gadget Store">
        <div><span className="store-assurance-icon"><ProductIcon type="shield" /></span><div><strong>Shop with confidence</strong><span>Your account and checkout stay protected.</span></div></div>
        <div><span className="store-assurance-icon"><ProductIcon type="box" /></span><div><strong>Know before you choose</strong><span>Clear pricing, product details, and stock status.</span></div></div>
        <div><span className="store-assurance-icon"><ProductIcon type="support" /></span><div><strong>A real store experience</strong><span>Order history and account tools, all in one place.</span></div></div>
        <Link to={isAuthenticated ? "/orders" : "/register"} className="store-assurance-link">{isAuthenticated ? "View your orders" : "Create an account"}<span aria-hidden="true">→</span></Link>
      </section>
    </main>
  );
}
