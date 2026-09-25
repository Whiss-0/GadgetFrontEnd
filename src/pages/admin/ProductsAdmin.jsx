import { useEffect, useState, useCallback, useRef } from "react";
import { productsApi, categoriesApi } from "../../api/client";
import ImageDropzone from "../../components/ImageDropzone";
import ProductArt from "../../components/ProductArt";
import ConfirmDialog from "../../components/ConfirmDialog";
import { useToast } from "../../hooks/useToast";

const empty = {
  ProductName: "",
  Price: "",
  Description: "",
  Stock: "",
  Brand: "",
  CategoryId: "",
  Image: "",
  RamGb: "",
  Processor: "",
  StorageGb: "",
};

function getStockBadge(stock) {
  const count = Number(stock ?? 0);
  if (count <= 0) {
    return <span className="admin-status-badge admin-stock-out shrink-0">Out of stock</span>;
  }
  if (count <= 5) {
    return <span className="admin-status-badge admin-stock-low shrink-0">{count} left</span>;
  }
  return <span className="admin-status-badge admin-stock-ok shrink-0">In stock ({count})</span>;
}

export default function ProductsAdmin() {
  const toast = useToast();
  const formRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [productToDelete, setProductToDelete] = useState(null); // { id, name }
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productsApi.list();
      setProducts(res.data || []);
    } catch {
      setError("Couldn't load products.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    categoriesApi
      .list()
      .then((res) => setCategories(res.data || []))
      .catch(() => {});
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function startEdit(p) {
    setEditingId(p.product_id);
    setError("");
    setForm({
      ProductName:  p.product_name ?? "",
      Price:        p.price ?? "",
      Description:  p.description ?? "",
      Stock:        p.stock ?? "",
      Brand:        p.brand ?? "",
      CategoryId:   p.category_id ?? "",
      Image:        p.image ?? "",
      RamGb:        p.ram_gb ?? "",
      Processor:    p.processor ?? "",
      StorageGb:    p.storage_gb ?? "",
    });
    // Scroll form into view if on mobile
    if (window.innerWidth < 768 && formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(empty);
    setError("");
  }

  function handleStartAdd() {
    cancelEdit();
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth" });
      const firstInput = formRef.current.querySelector("#prod-name");
      if (firstInput) firstInput.focus();
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const payload = {
      ProductName:  form.ProductName.trim(),
      Brand:        form.Brand ? form.Brand.trim() : null,
      Description:  form.Description ? form.Description.trim() : null,
      Price:        Number(form.Price),
      Stock:        Number(form.Stock),
      CategoryId:   Number(form.CategoryId),
      Image:        form.Image || null,
      RamGb:        form.RamGb ? Number(form.RamGb) : null,
      Processor:    form.Processor ? form.Processor.trim() : null,
      StorageGb:    form.StorageGb ? Number(form.StorageGb) : null,
    };

    try {
      if (editingId) {
        await productsApi.update(editingId, payload);
        toast.show(`"${payload.ProductName}" updated successfully.`, { tone: "success" });
      } else {
        await productsApi.create(payload);
        toast.show(`"${payload.ProductName}" added to catalog.`, { tone: "success" });
      }
      cancelEdit();
      await load();
    } catch (err) {
      const msg = err.response?.data?.message || "Couldn't save the product.";
      setError(msg);
      toast.show(msg, { tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  function promptDelete(p) {
    setProductToDelete({ id: p.product_id, name: p.product_name });
  }

  async function confirmDelete() {
    if (!productToDelete) return;
    setDeleting(true);
    try {
      await productsApi.remove(productToDelete.id);
      toast.show(`"${productToDelete.name}" was deleted.`, { tone: "success" });
      if (editingId === productToDelete.id) {
        cancelEdit();
      }
      setProductToDelete(null);
      await load();
    } catch (err) {
      const msg = err.response?.data?.message || "Couldn't delete the product.";
      toast.show(msg, { tone: "error" });
    } finally {
      setDeleting(false);
    }
  }

  const filteredProducts = products.filter((p) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      p.product_name?.toLowerCase().includes(term) ||
      p.brand?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
      {/* Products list panel */}
      <div className="admin-glass-panel rounded-xl p-6 space-y-4">
        {/* Search & Actions Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-dark-line)]">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Products</h2>
            <p className="text-xs text-[var(--color-dark-ink)]/60">
              Search by name or brand
            </p>
          </div>

          <button
            type="button"
            onClick={handleStartAdd}
            className="admin-btn-primary text-xs py-1.5 px-3 self-start sm:self-auto"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add product</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or brand…"
            className="w-full admin-input-premium border border-[var(--color-dark-line)] rounded-lg pl-9 pr-8 py-2 text-sm text-white placeholder-[var(--color-dark-ink)]/40 outline-none focus:border-[var(--color-circuit)] transition-colors"
            aria-label="Search products"
          />
          <svg className="w-4 h-4 text-[var(--color-dark-ink)]/50 absolute left-3 top-3 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-2.5 text-xs text-[var(--color-dark-ink)]/50 hover:text-white px-1"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Loading state */}
        {loading && products.length === 0 && (
          <div className="py-12 text-center text-sm text-[var(--color-dark-ink)]/60 flex flex-col items-center justify-center gap-3">
            <svg className="w-6 h-6 animate-spin text-[var(--color-circuit)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
            </svg>
            <p>Loading catalog products…</p>
          </div>
        )}

        {/* Product rows */}
        <div className="space-y-2.5">
          {filteredProducts.map((p) => {
            const price = Number(p.price ?? 0);
            const isEditing = editingId === p.product_id;

            return (
              <div
                key={p.product_id}
                className={`flex items-center justify-between admin-item-card rounded-lg p-3 sm:p-4 gap-3 transition-colors ${
                  isEditing ? "border-[var(--color-circuit)]/60 bg-[var(--color-dark-panel)]" : ""
                }`}
              >
                {/* Product thumbnail & info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-md bg-[var(--color-dark-bg)] border border-[var(--color-dark-line)] flex items-center justify-center p-1 overflow-hidden shrink-0">
                    <ProductArt
                      product={p}
                      alt={p.product_name}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm truncate">{p.product_name}</span>
                      <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-dark-ink)]/50 shrink-0">
                        #{p.product_id}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {p.brand && (
                        <span className="text-xs text-[var(--color-dark-ink)]/60">
                          {p.brand}
                        </span>
                      )}
                      <span className="font-[var(--font-mono)] text-xs font-semibold text-[#F59E0B]">
                        ${price.toFixed(2)}
                      </span>
                      {getStockBadge(p.stock)}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(p)}
                    className="admin-btn-secondary text-xs py-1 px-2.5"
                    aria-label={`Edit ${p.product_name}`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => promptDelete(p)}
                    className="text-xs text-[var(--color-signal)] hover:underline px-2 py-1"
                    aria-label={`Delete ${p.product_name}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}

          {!loading && filteredProducts.length === 0 && (
            <div className="py-12 text-center text-xs text-[var(--color-dark-ink)]/50">
              {searchTerm ? "No products match your search query." : "No products in the catalog yet."}
            </div>
          )}
        </div>
      </div>

      {/* Product form panel */}
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="admin-glass-panel rounded-xl p-6 lg:sticky lg:top-24 space-y-4"
        aria-labelledby="product-form-title"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-dark-line)]">
          <div>
            <h3 id="product-form-title" className="text-base font-bold text-white">
              {editingId ? "Edit product" : "Add product"}
            </h3>
            <p className="text-xs text-[var(--color-dark-ink)]/50">
              {editingId ? `Catalog item #${editingId}` : "Create a new catalog item"}
            </p>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="text-xs text-[var(--color-dark-ink)]/60 hover:text-white"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Section 1: Basic information */}
        <fieldset className="admin-fieldset space-y-3">
          <legend className="admin-fieldset-legend">Basic information</legend>

          <div>
            <label htmlFor="prod-name" className="block text-xs font-medium text-[var(--color-dark-ink)]/70 mb-1">
              Product name <span className="text-[var(--color-signal)]">*</span>
            </label>
            <input
              id="prod-name"
              required
              value={form.ProductName}
              onChange={(e) => update("ProductName", e.target.value)}
              placeholder="e.g. Pixel 8 Pro"
              className="w-full admin-input-premium border border-[var(--color-dark-line)] rounded px-3 py-1.5 text-sm text-white outline-none focus:border-[var(--color-circuit)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="prod-brand" className="block text-xs font-medium text-[var(--color-dark-ink)]/70 mb-1">
                Brand
              </label>
              <input
                id="prod-brand"
                value={form.Brand}
                onChange={(e) => update("Brand", e.target.value)}
                placeholder="e.g. Google"
                className="w-full admin-input-premium border border-[var(--color-dark-line)] rounded px-3 py-1.5 text-sm text-white outline-none focus:border-[var(--color-circuit)]"
              />
            </div>

            <div>
              <label htmlFor="prod-cat" className="block text-xs font-medium text-[var(--color-dark-ink)]/70 mb-1">
                Category <span className="text-[var(--color-signal)]">*</span>
              </label>
              <select
                id="prod-cat"
                required
                value={form.CategoryId}
                onChange={(e) => update("CategoryId", e.target.value)}
                className="w-full admin-input-premium border border-[var(--color-dark-line)] rounded px-3 py-1.5 text-sm text-white outline-none focus:border-[var(--color-circuit)]"
              >
                <option value="" disabled className="bg-[var(--color-dark-panel)]">
                  Select category
                </option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id} className="bg-[var(--color-dark-panel)]">
                    {c.category_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="prod-desc" className="block text-xs font-medium text-[var(--color-dark-ink)]/70 mb-1">
              Description
            </label>
            <textarea
              id="prod-desc"
              rows={2}
              value={form.Description}
              onChange={(e) => update("Description", e.target.value)}
              placeholder="Operational product description…"
              className="w-full admin-input-premium border border-[var(--color-dark-line)] rounded px-3 py-1.5 text-sm text-white outline-none focus:border-[var(--color-circuit)]"
            />
          </div>
        </fieldset>

        {/* Section 2: Pricing and stock */}
        <fieldset className="admin-fieldset space-y-3">
          <legend className="admin-fieldset-legend">Pricing and stock</legend>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="prod-price" className="block text-xs font-medium text-[var(--color-dark-ink)]/70 mb-1">
                Price ($) <span className="text-[var(--color-signal)]">*</span>
              </label>
              <input
                id="prod-price"
                type="number"
                step="0.01"
                min="0"
                required
                value={form.Price}
                onChange={(e) => update("Price", e.target.value)}
                placeholder="0.00"
                className="w-full admin-input-premium border border-[var(--color-dark-line)] rounded px-3 py-1.5 text-sm text-white outline-none focus:border-[var(--color-circuit)]"
              />
            </div>

            <div>
              <label htmlFor="prod-stock" className="block text-xs font-medium text-[var(--color-dark-ink)]/70 mb-1">
                Stock <span className="text-[var(--color-signal)]">*</span>
              </label>
              <input
                id="prod-stock"
                type="number"
                min="0"
                required
                value={form.Stock}
                onChange={(e) => update("Stock", e.target.value)}
                placeholder="0"
                className="w-full admin-input-premium border border-[var(--color-dark-line)] rounded px-3 py-1.5 text-sm text-white outline-none focus:border-[var(--color-circuit)]"
              />
            </div>
          </div>
        </fieldset>

        {/* Section 3: Specifications */}
        <fieldset className="admin-fieldset space-y-3">
          <legend className="admin-fieldset-legend">Specifications</legend>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label htmlFor="prod-ram" className="block text-xs font-medium text-[var(--color-dark-ink)]/70 mb-1 truncate" title="RAM in GB">
                RAM (GB)
              </label>
              <input
                id="prod-ram"
                type="number"
                min="0"
                value={form.RamGb}
                onChange={(e) => update("RamGb", e.target.value)}
                placeholder="8"
                className="w-full admin-input-premium border border-[var(--color-dark-line)] rounded px-2.5 py-1.5 text-sm text-white outline-none focus:border-[var(--color-circuit)]"
              />
            </div>

            <div>
              <label htmlFor="prod-storage" className="block text-xs font-medium text-[var(--color-dark-ink)]/70 mb-1 truncate" title="Storage in GB">
                Storage
              </label>
              <input
                id="prod-storage"
                type="number"
                min="0"
                value={form.StorageGb}
                onChange={(e) => update("StorageGb", e.target.value)}
                placeholder="128"
                className="w-full admin-input-premium border border-[var(--color-dark-line)] rounded px-2.5 py-1.5 text-sm text-white outline-none focus:border-[var(--color-circuit)]"
              />
            </div>

            <div>
              <label htmlFor="prod-proc" className="block text-xs font-medium text-[var(--color-dark-ink)]/70 mb-1 truncate" title="Processor model">
                Processor
              </label>
              <input
                id="prod-proc"
                value={form.Processor}
                onChange={(e) => update("Processor", e.target.value)}
                placeholder="CPU"
                className="w-full admin-input-premium border border-[var(--color-dark-line)] rounded px-2.5 py-1.5 text-sm text-white outline-none focus:border-[var(--color-circuit)]"
              />
            </div>
          </div>
        </fieldset>

        {/* Section 4: Product image */}
        <fieldset className="admin-fieldset space-y-2">
          <legend className="admin-fieldset-legend">Product image</legend>
          <ImageDropzone
            value={form.Image}
            onChange={(url) => update("Image", url)}
          />
        </fieldset>

        {error && (
          <p className="text-xs text-[var(--color-signal)]">{error}</p>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 admin-btn-primary text-sm py-2 rounded-lg"
          >
            {saving
              ? "Saving…"
              : editingId
              ? "Save changes"
              : "Add product"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="admin-btn-secondary px-3 text-xs"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Confirmation Dialog for Product Deletion */}
      <ConfirmDialog
        open={Boolean(productToDelete)}
        title="Delete this product from catalog?"
        description={
          productToDelete
            ? `"${productToDelete.name}" (ID #${productToDelete.id}) will be permanently removed.`
            : ""
        }
        warning="This action is permanent. Any customer carts or orders referencing this item will reflect this change."
        confirmLabel="Yes, delete product"
        cancelLabel="Go back"
        tone="danger"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setProductToDelete(null)}
      />
    </div>
  );
}
