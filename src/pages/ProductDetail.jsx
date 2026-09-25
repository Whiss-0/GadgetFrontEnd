import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { productsApi, categoriesApi, wishlistApi } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useToast } from "../hooks/useToast";
import ProductReviews from "../components/ProductReviews";
import ProductArt from "../components/ProductArt";

// A single spec row in the specs table
function SpecRow({ label, value }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <tr className="border-b border-[var(--color-line)]/60 last:border-0">
      <td className="py-2.5 pr-6 text-xs text-[var(--color-ink-soft)] font-medium whitespace-nowrap w-36">
        {label}
      </td>
      <td className="py-2.5 text-sm text-[var(--color-ink)]">{value}</td>
    </tr>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isMod } = useAuth();
  const { addItem } = useCart();
  const toast = useToast();

  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [savedWishlist, setSavedWishlist] = useState(false);

  // Description edit state (staff/admin only)
  const [editingDesc, setEditingDesc] = useState(false);
  const [draftDesc, setDraftDesc] = useState("");
  const [savingDesc, setSavingDesc] = useState(false);
  const [descMsg, setDescMsg] = useState("");

  useEffect(() => {
    // Fetch the product — this is the only call that can trigger "not found".
    productsApi.get(id)
      .then((res) => setProduct(res.data))
      .catch(() => setNotFound(true));

    // Fetch categories separately so a failure here never hides the product.
    categoriesApi.list()
      .then((res) => setCategories(res.data || []))
      .catch(() => setCategories([])); // graceful degradation — category name just won't show
  }, [id]);

  if (notFound)
    return (
      <div className="max-w-4xl mx-auto px-5 py-16">
        <p className="text-[var(--color-signal)] text-lg font-semibold mb-2">Product not found.</p>
        <Link to="/" className="text-sm text-[var(--color-circuit)] hover:underline">← Back to shop</Link>
      </div>
    );

  if (!product)
    return (
      <div className="max-w-4xl mx-auto px-5 py-16 text-[var(--color-ink-soft)]">
        Loading product…
      </div>
    );

  // API returns snake_case fields
  const name        = product.product_name ?? "Unnamed product";
  const price       = product.price ?? 0;
  const description = product.description;
  const stock       = product.stock;
  const brand       = product.brand;
  const categoryId  = product.category_id;

  // Resolve category name from the categories list
  const category = categories.find((c) => c.category_id === categoryId || c.id === categoryId);
  const categoryName = category
    ? (category.category_name ?? category.name ?? `Category #${categoryId}`)
    : categoryId != null ? `Category #${categoryId}` : null;

  const inStock = typeof stock === "number" && stock > 0;
  const stockText =
    typeof stock === "number"
      ? stock === 0
        ? "Out of stock"
        : stock <= 3
        ? `Only ${stock} left in stock`
        : "In stock · Ready to ship"
      : "";

  async function handleAdd() {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    setAdding(true);
    try {
      await addItem(Number(id), qty);
      toast.show(`${qty}× "${name}" added to your cart.`, { tone: "success" });
    } catch (err) {
      toast.show(err.response?.data?.message || "Couldn't add to cart.", { tone: "error" });
    } finally {
      setAdding(false);
    }
  }

  function handleBuyNow() {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    // Skip the cart entirely — go straight to checkout with just this item.
    navigate("/checkout", {
      state: {
        buyNow: true,
        items: [{ product_id: Number(id), name, price: Number(price), quantity: qty }],
      },
    });
  }

  async function handleWishlist() {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    try {
      await wishlistApi.add(Number(id));
      setSavedWishlist(true);
      toast.show(`Added "${name}" to your wishlist.`, { tone: "success" });
      setTimeout(() => setSavedWishlist(false), 2500);
    } catch (err) {
      toast.show(err.response?.data?.message || "Couldn't save to wishlist.", { tone: "error" });
    }
  }

  function startEditDesc() {
    setDraftDesc(product.description ?? "");
    setDescMsg("");
    setEditingDesc(true);
  }

  async function handleSaveDesc() {
    setSavingDesc(true);
    setDescMsg("");
    try {
      const res = await productsApi.updateDescription(id, draftDesc);
      // Update the local product state so the UI reflects the saved value immediately
      setProduct((p) => ({ ...p, description: res.data.description ?? draftDesc }));
      setEditingDesc(false);
      setDescMsg("Description saved.");
      toast.show("Product description updated.", { tone: "success" });
      setTimeout(() => setDescMsg(""), 2500);
    } catch (err) {
      setDescMsg(err.response?.data?.message || "Couldn't save description.");
    } finally {
      setSavingDesc(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-5 py-8 sm:py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[var(--color-ink-soft)] mb-6" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-[var(--color-circuit)] transition-colors">Shop</Link>
        <span>/</span>
        {categoryName && (
          <>
            <span className="hover:text-[var(--color-ink)] transition-colors">{categoryName}</span>
            <span>/</span>
          </>
        )}
        <span className="text-[var(--color-ink)] font-medium truncate max-w-[240px]">{name}</span>
      </nav>

      {/* ── Top section: 2 columns on desktop, image then purchase controls on mobile ── */}
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start mb-12">
        {/* Left: Product presentation */}
        <div className="spec-ticket rounded-2xl overflow-hidden border border-[var(--color-line)] bg-[var(--color-panel)]">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <span className="text-xs text-[var(--color-ink-soft)] font-medium">
              {brand || "Authentic Product"}
            </span>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                inStock
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "bg-red-500/10 text-red-700 dark:text-red-400"
              }`}
            >
              {inStock ? "In stock" : "Out of stock"}
            </span>
          </div>

          <div className="mx-4 mb-4 aspect-square rounded-xl bg-[var(--color-paper)] flex items-center justify-center overflow-hidden relative">
            <ProductArt
              product={product}
              alt={name}
              className="w-full h-full object-contain p-6 transition-transform duration-300 hover:scale-105"
            />
          </div>
        </div>

        {/* Right: Info and purchase actions */}
        <div className="flex flex-col gap-5">
          <div>
            {brand && (
              <p className="text-xs font-medium text-[var(--color-ink-soft)] uppercase tracking-wider mb-1">
                {brand}
              </p>
            )}
            <h1 className="font-[var(--font-display)] text-2xl sm:text-3xl font-semibold leading-tight mb-3">
              {name}
            </h1>
            <div className="flex items-baseline gap-3">
              <span className="font-[var(--font-mono)] text-3xl font-bold text-[var(--color-gold)]">
                ${Number(price).toFixed(2)}
              </span>
              <span className="text-xs text-[var(--color-ink-soft)]">Taxes included</span>
            </div>
          </div>

          <div className="py-2">
            <span
              className={`text-sm font-medium ${
                inStock
                  ? stock <= 3
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-700 dark:text-emerald-400"
                  : "text-[var(--color-signal)]"
              }`}
            >
              {stockText}
            </span>
          </div>

          {/* ── Purchase controls (visible without excessive scrolling) ── */}
          <div className="pt-2 border-t border-[var(--color-line)]">
            {inStock ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {/* Quantity Stepper */}
                  <div className="quantity-stepper h-11" role="group" aria-label="Quantity">
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      disabled={qty <= 1}
                      className="qty-btn px-3 text-base h-full"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span
                      className="qty-display flex items-center justify-center min-w-[2.5rem] h-full font-semibold text-sm"
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.min(stock, q + 1))}
                      disabled={qty >= stock}
                      className="qty-btn px-3 text-base h-full"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  {/* Add to Cart */}
                  <button
                    onClick={handleAdd}
                    disabled={adding}
                    className="flex-1 btn-primary font-semibold py-2.5 px-4 rounded-lg disabled:opacity-50 transition-all"
                  >
                    {adding ? "Adding…" : "Add to cart"}
                  </button>

                  {/* Wishlist */}
                  <button
                    type="button"
                    onClick={handleWishlist}
                    title="Save to wishlist"
                    aria-label={`Save ${name} to wishlist`}
                    className={`border border-[var(--color-line)] p-2.5 rounded-lg transition-colors flex items-center justify-center ${
                      savedWishlist
                        ? "bg-[var(--color-signal)] text-white border-[var(--color-signal)]"
                        : "hover:border-[var(--color-circuit)] text-[var(--color-ink-soft)] hover:text-[var(--color-circuit)]"
                    }`}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={savedWishlist ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </button>
                </div>

                {/* Buy Now button */}
                <button
                  onClick={handleBuyNow}
                  className="w-full btn-secondary font-semibold py-2.5 rounded-lg text-sm"
                >
                  Buy now
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-[var(--color-paper)] text-center">
                <p className="font-medium text-[var(--color-signal)] text-sm mb-1">Currently unavailable</p>
                <p className="text-xs text-[var(--color-ink-soft)]">We will restock this item soon. Save it to your wishlist to check back easily.</p>
              </div>
            )}

            {!isAuthenticated && (
              <p className="mt-3 text-xs text-[var(--color-ink-soft)]">
                <Link to="/login" className="text-[var(--color-circuit)] hover:underline font-medium">Log in</Link> to save to wishlist or speed up checkout.
              </p>
            )}
          </div>

          {/* Trust points */}
          <div className="grid grid-cols-2 gap-2.5 pt-4 border-t border-[var(--color-line)] text-xs text-[var(--color-ink-soft)]">
            <div className="flex items-center gap-2">
              <span className="text-[var(--color-circuit)]">✓</span>
              <span>Fast & careful dispatch</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--color-circuit)]">✓</span>
              <span>Simple 30-day returns</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--color-circuit)]">✓</span>
              <span>Standard warranty included</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--color-circuit)]">✓</span>
              <span>Customer support</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Lower sections: Description, Specs, Delivery/Returns, Reviews ── */}
      <div className="space-y-10 pt-6 border-t border-[var(--color-line)]">
        {/* About this product */}
        <section aria-labelledby="about-heading" className="spec-ticket rounded-xl p-6 bg-[var(--color-panel)] border border-[var(--color-line)]">
          <div className="flex items-center justify-between mb-4">
            <h2 id="about-heading" className="font-[var(--font-display)] text-lg font-semibold">
              About this product
            </h2>
            {isMod && !editingDesc && (
              <button
                onClick={startEditDesc}
                className="flex items-center gap-1.5 text-xs text-[var(--color-circuit)] hover:underline font-medium"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit description
              </button>
            )}
          </div>

          {editingDesc ? (
            <div className="space-y-3">
              <textarea
                rows={5}
                value={draftDesc}
                onChange={(e) => setDraftDesc(e.target.value)}
                className="w-full border border-[var(--color-circuit)] rounded-lg p-3 text-sm text-[var(--color-ink)] bg-white dark:bg-slate-900 focus:outline-none"
                placeholder="Enter product description…"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveDesc}
                  disabled={savingDesc}
                  className="btn-primary text-xs font-semibold px-4 py-1.5 rounded-lg disabled:opacity-50"
                >
                  {savingDesc ? "Saving…" : "Save description"}
                </button>
                <button
                  onClick={() => setEditingDesc(false)}
                  className="text-xs text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors px-2 py-1.5"
                >
                  Cancel
                </button>
              </div>
              {descMsg && <p className="text-xs text-[var(--color-signal)]">{descMsg}</p>}
            </div>
          ) : description ? (
            <p className="text-[var(--color-ink-soft)] leading-relaxed text-sm whitespace-pre-line">
              {description}
            </p>
          ) : (
            <p className="text-[var(--color-ink-soft)]/70 text-sm italic">
              {isMod
                ? "No description yet. Click Edit description to add one."
                : "Detailed description is being prepared for this item."}
            </p>
          )}
        </section>

        {/* Specifications */}
        <section aria-labelledby="specs-heading" className="spec-ticket rounded-xl p-6 bg-[var(--color-panel)] border border-[var(--color-line)]">
          <h2 id="specs-heading" className="font-[var(--font-display)] text-lg font-semibold mb-4">
            Specifications
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <tbody>
                <SpecRow label="Brand" value={brand} />
                <SpecRow label="Category" value={categoryName} />
                <SpecRow label="Processor" value={product.processor} />
                <SpecRow label="Memory (RAM)" value={product.ram_gb ? `${product.ram_gb} GB` : null} />
                <SpecRow label="Storage" value={product.storage_gb ? `${product.storage_gb} GB` : null} />
                <SpecRow
                  label="Availability"
                  value={
                    typeof stock === "number"
                      ? inStock
                        ? `${stock} unit${stock !== 1 ? "s" : ""} in stock`
                        : "Currently out of stock"
                      : null
                  }
                />
              </tbody>
            </table>
          </div>
        </section>

        {/* Delivery and returns */}
        <section aria-labelledby="delivery-heading" className="spec-ticket rounded-xl p-6 bg-[var(--color-panel)] border border-[var(--color-line)]">
          <h2 id="delivery-heading" className="font-[var(--font-display)] text-lg font-semibold mb-3">
            Delivery and returns
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 text-sm text-[var(--color-ink-soft)]">
            <div>
              <p className="font-semibold text-[var(--color-ink)] mb-1">Shipping</p>
              <p className="leading-relaxed text-xs">
                Orders are packed carefully and dispatched promptly. Standard delivery takes 2–4 business days within metropolitan areas.
              </p>
            </div>
            <div>
              <p className="font-semibold text-[var(--color-ink)] mb-1">Returns</p>
              <p className="leading-relaxed text-xs">
                Items in original packaging can be returned within 30 days of receipt. Our customer support team is available to assist with any questions.
              </p>
            </div>
          </div>
        </section>

        {/* Customer reviews */}
        <ProductReviews productId={id} />
      </div>
    </div>
  );
}
