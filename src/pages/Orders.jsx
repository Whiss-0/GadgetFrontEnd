import { useEffect, useState } from "react";
import {
  ordersApi,
  orderDetailApi,
  productsApi,
  categoriesApi,
} from "../api/client";
import ConfirmDialog from "../components/ConfirmDialog";
import ProductArt from "../components/ProductArt";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [detailsByOrder, setDetailsByOrder] = useState({});
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [orderToCancel, setOrderToCancel] = useState(null); // { id, total }
  const [categories, setCategories] = useState([]);

  // Load orders
  useEffect(() => {
    ordersApi
      .myOrders()
      .then((res) => setOrders(res.data || []))
      .catch((err) => {
        setError(err.response?.data?.message || "Couldn't load your orders. Make sure you're logged in.");
      })
      .finally(() => setLoading(false));
  }, []);

  // Load categories once — a failure here must not block orders
  useEffect(() => {
    categoriesApi
      .list()
      .then((res) => setCategories(res.data || []))
      .catch(() => setCategories([]));
  }, []);

  async function handleCancel(orderId) {
    setCancellingId(orderId);
    try {
      await ordersApi.cancel(orderId);
      setOrders((prev) =>
        prev.map((o) =>
          (o.order_id ?? o.orderId ?? o.OrderId) === orderId
            ? { ...o, status: "Cancelled", Status: "Cancelled" }
            : o
        )
      );
    } catch (err) {
      alert(err.response?.data?.message || "Couldn't cancel this order.");
    } finally {
      setCancellingId(null);
      setOrderToCancel(null);
    }
  }

  async function confirmCancel() {
    if (!orderToCancel) return;
    await handleCancel(orderToCancel.id);
  }

  async function toggleExpand(orderId) {
    if (expandedId === orderId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(orderId);

    // Cache: only fetch if not already loaded
    if (!detailsByOrder[orderId]) {
      setDetailsLoading(true);
      try {
        const res = await orderDetailApi.getByOrder(orderId);
        const details = res.data || [];

        // Enrich each line with its product data
        const enriched = await Promise.all(
          details.map(async (detail) => {
            const productId =
              detail.product_id ??
              detail.productId ??
              detail.ProductId;

            try {
              const productRes = await productsApi.get(productId);
              return { ...detail, product: productRes.data };
            } catch {
              // Keep the order line visible even if the product was deleted
              return detail;
            }
          })
        );

        setDetailsByOrder((previous) => ({
          ...previous,
          [orderId]: enriched,
        }));
      } catch {
        setDetailsByOrder((prev) => ({ ...prev, [orderId]: [] }));
      } finally {
        setDetailsLoading(false);
      }
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-12">
      <p className="font-[var(--font-mono)] text-xs text-[var(--color-circuit)] mb-1">
        Order history
      </p>
      <h1 className="font-[var(--font-display)] text-3xl font-semibold mb-2">Your orders</h1>
      <p className="text-[var(--color-ink-soft)] text-sm mb-8">
        See what you bought and follow each order from purchase to delivery.
      </p>

      {loading && <p className="text-[var(--color-ink-soft)]">Loading…</p>}
      {error && <p className="text-sm text-[var(--color-signal)] mb-4">{error}</p>}
      {!loading && !error && orders.length === 0 && (
        <p className="text-[var(--color-ink-soft)]">No orders yet.</p>
      )}

      <div className="space-y-3">
        {orders.map((o) => {
          const id = o.order_id ?? o.orderId ?? o.OrderId;
          const status = o.status ?? o.Status ?? "Pending";
          const date = o.order_date ?? o.orderDate ?? o.OrderDate;
          const total = o.total_amount ?? o.totalAmount ?? o.TotalAmount ?? 0;
          const isOpen = expandedId === id;

          return (
            <div key={id} className="spec-ticket rounded-md overflow-hidden">
              <button
                onClick={() => toggleExpand(id)}
                className="w-full p-4 flex items-center justify-between text-left"
              >
                <div>
                  <p className="font-[var(--font-mono)] text-xs text-[var(--color-ink-soft)]">
                    PO-{String(id).padStart(5, "0")}
                  </p>
                  <p className="text-sm text-[var(--color-ink-soft)]">
                    {date ? new Date(date).toLocaleDateString() : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded bg-[var(--color-circuit)]/10 text-[var(--color-circuit-dark)]">
                    {status}
                  </span>
                  {status === "Pending" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // don't trigger the row's expand/collapse click
                        setOrderToCancel({ id, total });
                      }}
                      disabled={cancellingId === id}
                      className="text-alert text-xs disabled:opacity-50"
                    >
                      {cancellingId === id ? "Cancelling…" : "Cancel"}
                    </button>
                  )}
                </div>
                <span className="font-[var(--font-mono)] font-semibold text-[var(--color-gold)]">
                  ${Number(total).toFixed(2)}
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-[var(--color-line)] px-4 py-3 bg-[var(--color-paper)]">
                  {detailsLoading && !detailsByOrder[id] ? (
                    <p className="text-xs text-[var(--color-ink-soft)]">Loading items…</p>
                  ) : (detailsByOrder[id] || []).length === 0 ? (
                    <p className="text-xs text-[var(--color-ink-soft)]">No line items found for this order.</p>
                  ) : (
                    <div>
                      {detailsByOrder[id].map((d, idx) => {
                        const productId = d.product_id ?? d.productId ?? d.ProductId;
                        const product = d.product;
                        const productName = product?.product_name ?? `Product #${productId}`;
                        const quantity = d.quantity ?? d.Quantity ?? 1;
                        const price = d.price ?? d.Price ?? 0;
                        const category = categories.find(
                          (item) => item.category_id === product?.category_id
                        );

                        return (
                          <div key={idx} className="order-line-item">
                            {/* Product thumbnail */}
                            <div className="order-line-art">
                              <ProductArt
                                product={product ?? { product_id: productId }}
                                alt=""
                                className="w-full h-full object-contain p-1"
                              />
                            </div>

                            {/* Name + subtitle */}
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate text-sm">{productName}</p>
                              <p className="text-xs text-[var(--color-ink-soft)]">
                                {product?.brand || category?.category_name || "Gadget"} · Qty {quantity}
                              </p>
                            </div>

                            {/* Saved price */}
                            <span className="font-[var(--font-mono)] text-sm flex-shrink-0">
                              ${Number(price).toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={Boolean(orderToCancel)}
        title="Cancel this order?"
        description={orderToCancel ? `Order #${String(orderToCancel.id).padStart(5, "0")} will be marked as cancelled.` : ""}
        warning="This cannot be undone from your account. If you still want the items, you will need to place a new order."
        confirmLabel="Yes, cancel order"
        cancelLabel="Go back"
        tone="warning"
        busy={cancellingId === orderToCancel?.id}
        onConfirm={confirmCancel}
        onCancel={() => setOrderToCancel(null)}
      />
    </div>
  );
}
