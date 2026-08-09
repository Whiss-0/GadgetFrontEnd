import { useEffect, useState } from "react";
import { productsApi } from "../../api/client";

// Default empty form — matches ProductRequest DTO field names
const empty = { ProductName: "", Price: "", Description: "", Stock: "", Brand: "" };

export default function ProductsAdmin() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  function load() {
    productsApi.list().then((res) => setProducts(res.data || []));
  }

  useEffect(load, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function startEdit(p) {
    // Product model: product_id, product_name, brand, price, description, stock
    setEditingId(p.product_id);
    setForm({
      ProductName:  p.product_name ?? "",
      Price:        p.price ?? "",
      Description:  p.description ?? "",
      Stock:        p.stock ?? "",
      Brand:        p.brand ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(empty);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    // ProductRequest DTO expects: ProductName, Brand, Description, Price, Stock, CategoryId, Image
    const payload = {
      ProductName:  form.ProductName,
      Brand:        form.Brand || null,
      Description:  form.Description || null,
      Price:        Number(form.Price),
      Stock:        Number(form.Stock),
    };
    try {
      if (editingId) {
        await productsApi.update(editingId, payload);
      } else {
        await productsApi.create(payload);
      }
      cancelEdit();
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save the product.");
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this product?")) return;
    try {
      await productsApi.remove(id);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't delete the product.");
    }
  }

  return (
    <div className="grid md:grid-cols-[1fr_320px] gap-8">
      <div className="space-y-2">
        {products.map((p) => (
          <div
            key={p.product_id}
            className="flex items-center justify-between bg-[var(--color-dark-panel)] border border-[var(--color-dark-line)] rounded px-4 py-3"
          >
            <div>
              <p className="font-medium">{p.product_name}</p>
              <p className="font-[var(--font-mono)] text-xs text-[var(--color-dark-ink)]/50">
                {p.brand ? `${p.brand} · ` : ""}
                ${Number(p.price ?? 0).toFixed(2)} · stock {p.stock ?? "—"}
              </p>
            </div>
            <div className="flex gap-3 text-sm">
              <button onClick={() => startEdit(p)} className="text-[var(--color-circuit)] hover:underline">
                Edit
              </button>
              <button
                onClick={() => handleDelete(p.product_id)}
                className="text-[var(--color-signal)] hover:underline"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <p className="text-[var(--color-dark-ink)]/50">No products yet.</p>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-[var(--color-dark-panel)] border border-[var(--color-dark-line)] rounded p-5 h-fit sticky top-24"
      >
        <p className="font-[var(--font-mono)] text-xs text-[var(--color-circuit)] mb-3">
          {editingId ? `EDITING #${editingId}` : "NEW PRODUCT"}
        </p>
        <div className="space-y-3">
          <input
            placeholder="Product name *"
            required
            value={form.ProductName}
            onChange={(e) => update("ProductName", e.target.value)}
            className="w-full bg-[var(--color-dark-bg)] border border-[var(--color-dark-line)] rounded px-3 py-2 text-sm focus:border-[var(--color-circuit)] outline-none"
          />
          <input
            placeholder="Brand"
            value={form.Brand}
            onChange={(e) => update("Brand", e.target.value)}
            className="w-full bg-[var(--color-dark-bg)] border border-[var(--color-dark-line)] rounded px-3 py-2 text-sm focus:border-[var(--color-circuit)] outline-none"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Price *"
            required
            value={form.Price}
            onChange={(e) => update("Price", e.target.value)}
            className="w-full bg-[var(--color-dark-bg)] border border-[var(--color-dark-line)] rounded px-3 py-2 text-sm focus:border-[var(--color-circuit)] outline-none"
          />
          <input
            type="number"
            placeholder="Stock"
            value={form.Stock}
            onChange={(e) => update("Stock", e.target.value)}
            className="w-full bg-[var(--color-dark-bg)] border border-[var(--color-dark-line)] rounded px-3 py-2 text-sm focus:border-[var(--color-circuit)] outline-none"
          />
          <textarea
            placeholder="Description"
            rows={3}
            value={form.Description}
            onChange={(e) => update("Description", e.target.value)}
            className="w-full bg-[var(--color-dark-bg)] border border-[var(--color-dark-line)] rounded px-3 py-2 text-sm focus:border-[var(--color-circuit)] outline-none"
          />
        </div>

        {error && <p className="text-xs text-[var(--color-signal)] mt-2">{error}</p>}

        <div className="flex gap-2 mt-4">
          <button
            type="submit"
            className="flex-1 bg-[var(--color-circuit)] text-[var(--color-ink)] font-semibold text-sm py-2 rounded hover:bg-[var(--color-circuit-dark)] hover:text-white transition-colors"
          >
            {editingId ? "Save changes" : "Add product"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="px-3 text-sm text-[var(--color-dark-ink)]/60 hover:text-[var(--color-dark-ink)]"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
