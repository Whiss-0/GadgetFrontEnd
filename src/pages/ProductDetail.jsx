import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { productsApi, categoriesApi } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import ProductReviews from "../components/ProductReviews";

// A single spec row in the tech-sheet table
function SpecRow({ label, value }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <tr className="border-b border-dashed border-[var(--color-line)] last:border-0">
      <td className="py-2.5 pr-6 font-[var(--font-mono)] text-xs text-[var(--color-ink-soft)] uppercase tracking-wider whitespace-nowrap w-32">
        {label}
      </td>
      <td className="py-2.5 text-sm font-medium text-[var(--color-ink)]">{value}</td>
    </tr>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isMod } = useAuth();
  const { addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState({ text: "", type: "ok" });
  const [adding, setAdding] = useState(false);

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
        <Link to="/" className="text-sm text-[var(--color-circuit)] hover:underline">← Back to catalog</Link>
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
  const image       = product.image;

  // Resolve category name from the categories list
  const category = categories.find((c) => c.category_id === categoryId || c.id === categoryId);
  const categoryName = category
    ? (category.category_name ?? category.name ?? `Category #${categoryId}`)
    : categoryId != null ? `Category #${categoryId}` : null;

  const skuCode = `PART-${String(id).padStart(4, "0")}`;
  const inStock = typeof stock === "number" && stock > 0;

  async function handleAdd() {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    setAdding(true);
    try {
      await addItem(Number(id), qty);
      setMessage({ text: `✓ ${qty}× "${name}" added to cart!`, type: "ok" });
    } catch (err) {
      setMessage({ text: err.response?.data?.message || "Couldn't add to cart.", type: "err" });
    } finally {
      setAdding(false);
      setTimeout(() => setMessage({ text: "", type: "ok" }), 2500);
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
        items: [{ product_ID: Number(id), name, price: Number(price), quantity: qty }],
      },
    });
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
      setTimeout(() => setDescMsg(""), 2500);
    } catch (err) {
      setDescMsg(err.response?.data?.message || "Couldn't save description.");
    } finally {
      setSavingDesc(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-[var(--font-mono)] text-[var(--color-ink-soft)] mb-8">
        <Link to="/" className="hover:text-[var(--color-circuit)] transition-colors">Catalog</Link>
        <span>/</span>
        {categoryName && <span className="text-[var(--color-ink-soft)]">{categoryName}</span>}
        {categoryName && <span>/</span>}
        <span className="text-[var(--color-ink)] font-semibold truncate max-w-[200px]">{name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-10 items-start">
        {/* ── Left: Image panel ── */}
        <div className="spec-ticket rounded-md overflow-hidden">
          {/* SKU badge */}
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <span className="font-[var(--font-mono)] text-xs text-[var(--color-ink-soft)] bg-[var(--color-paper)] border border-[var(--color-line)] px-2 py-0.5 rounded">
              {skuCode}
            </span>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded font-[var(--font-mono)] ${
                inStock
                  ? "bg-[var(--color-circuit)]/10 text-[var(--color-circuit)]"
                  : "bg-[var(--color-signal)]/10 text-[var(--color-signal)]"
              }`}
            >
              {inStock ? "IN STOCK" : "OUT OF STOCK"}
            </span>
          </div>

          <div className="mx-4 mb-4 aspect-square bg-[var(--color-paper)] rounded flex items-center justify-center overflow-hidden">
            {image ? (
              <img src={image} alt={name} className="w-full h-full object-contain p-4" />
            ) : (
              <div className="flex flex-col items-center gap-3 text-[var(--color-ink-soft)]/30">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path d="M8 21h8M12 17v4" strokeLinecap="round" />
                  <path d="M7 8h10M7 11h6" strokeLinecap="round" />
                </svg>
                <span className="font-[var(--font-mono)] text-xs">NO IMAGE</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Info panel ── */}
        <div className="flex flex-col gap-6">
          {/* Name & Price */}
          <div>
            {brand && (
              <p className="font-[var(--font-mono)] text-xs text-[var(--color-circuit)] mb-1 uppercase tracking-widest">
                {brand}
              </p>
            )}
            <h1 className="font-[var(--font-display)] text-3xl font-semibold leading-tight mb-3">
              {name}
            </h1>
            <p className="font-[var(--font-mono)] text-3xl font-bold text-[var(--color-gold)]">
              ${Number(price).toFixed(2)}
            </p>
          </div>

          {/* ── Specs sheet ── */}
          <div className="spec-ticket rounded-md p-4" style={{ "--spec-ticket-divider": "hidden" }}>
            <p className="font-[var(--font-mono)] text-xs text-[var(--color-circuit)] mb-3 uppercase tracking-widest">
              Specifications
            </p>
            <table className="w-full">
              <tbody>
                <SpecRow label="SKU"      value={skuCode} />
                <SpecRow label="Brand"    value={brand} />
                <SpecRow label="Category" value={categoryName} />
                <SpecRow label="Price"    value={`$${Number(price).toFixed(2)}`} />
                <SpecRow
                  label="Stock"
                  value={
                    typeof stock === "number"
                      ? inStock
                        ? `${stock} unit${stock !== 1 ? "s" : ""} available`
                        : "Out of stock"
                      : null
                  }
                />
              </tbody>
            </table>
          </div>

          {/* ── Description ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="font-[var(--font-mono)] text-xs text-[var(--color-circuit)] uppercase tracking-widest">
                Description
              </p>
              {/* Pencil edit button — only visible to staff (Moderator) and Admin */}
              {isMod && !editingDesc && (
                <button
                  onClick={startEditDesc}
                  title="Edit description"
                  className="flex items-center gap-1 text-xs font-[var(--font-mono)] text-[var(--color-ink-soft)] hover:text-[var(--color-circuit)] transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit
                </button>
              )}
            </div>

            {editingDesc ? (
              /* ── Edit mode (staff/admin only) ── */
              <div className="space-y-2">
                <textarea
                  rows={5}
                  value={draftDesc}
                  onChange={(e) => setDraftDesc(e.target.value)}
                  className="w-full border border-[var(--color-circuit)] rounded px-3 py-2 text-sm text-[var(--color-ink)] leading-relaxed focus:outline-none resize-y bg-white"
                  placeholder="Enter product description…"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveDesc}
                    disabled={savingDesc}
                    className="bg-[var(--color-circuit)] text-white text-xs font-semibold px-4 py-1.5 rounded hover:bg-[var(--color-circuit-dark)] transition-colors disabled:opacity-50"
                  >
                    {savingDesc ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => setEditingDesc(false)}
                    className="text-xs text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                {descMsg && <p className="text-xs text-[var(--color-signal)]">{descMsg}</p>}
              </div>
            ) : (
              /* ── View mode (everyone) ── */
              description ? (
                <p className="text-[var(--color-ink-soft)] leading-relaxed text-sm whitespace-pre-line">
                  {description}
                </p>
              ) : (
                <p className="text-[var(--color-ink-soft)]/50 text-sm italic">
                  {isMod
                    ? "No description yet. Click Edit to add one."
                    : "No description available for this product."}
                </p>
              )
            )}
            {/* Success toast after saving */}
            {!editingDesc && descMsg && (
              <p className="mt-1 text-xs text-[var(--color-circuit)] font-medium">{descMsg}</p>
            )}
          </div>

          {/* ── Add to cart ── */}
          <div className="mt-auto border-t border-[var(--color-line)] pt-5">
            {inStock ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-[var(--color-line)] rounded overflow-hidden">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="px-3 py-2 text-[var(--color-ink-soft)] hover:bg-[var(--color-paper)] transition-colors text-lg leading-none"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={stock}
                    value={qty}
                    onChange={(e) => setQty(Math.min(stock, Math.max(1, Number(e.target.value))))}
                    className="w-12 text-center py-2 border-x border-[var(--color-line)] bg-white outline-none text-sm font-[var(--font-mono)]"
                  />
                  <button
                    onClick={() => setQty((q) => Math.min(stock, q + 1))}
                    className="px-3 py-2 text-[var(--color-ink-soft)] hover:bg-[var(--color-paper)] transition-colors text-lg leading-none"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={handleAdd}
                  disabled={adding}
                  className="flex-1 btn-primary font-semibold py-2.5 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {adding ? "Adding…" : "Add to cart"}
                </button>
                <button
                  onClick={handleBuyNow}
                  className="bg-[var(--color-circuit)] text-white font-semibold px-6 py-2 rounded hover:bg-[var(--color-circuit-dark)] transition-colors"
                >
                  Buy now
                </button>
              </div>
            ) : (
              <p className="font-semibold text-[var(--color-signal)]">This product is currently out of stock.</p>
            )}

            {message.text && (
              <p
                className={`mt-3 text-sm font-medium ${
                  message.type === "ok" ? "text-[var(--color-circuit)]" : "text-[var(--color-signal)]"
                }`}
              >
                {message.text}
              </p>
            )}

            {!isAuthenticated && (
              <p className="mt-3 text-xs text-[var(--color-ink-soft)]">
                <Link to="/login" className="text-[var(--color-circuit)] hover:underline">Log in</Link> to add items to your cart.
              </p>
            )}
          </div>
        </div>
      </div>
      <ProductReviews productId={id} />
    </div>
  );
}
