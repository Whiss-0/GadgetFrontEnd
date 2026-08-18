import { useEffect, useState } from "react";
import { ordersApi, orderDetailApi } from "../api/client";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [detailsByOrder, setDetailsByOrder] = useState({});
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    ordersApi
      .myOrders()
      .then((res) => setOrders(res.data || []))
      .catch((err) => {
        setError(err.response?.data?.message || "Couldn't load your orders. Make sure you're logged in.");
      })
      .finally(() => setLoading(false));
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
    }
  }

  async function toggleExpand(orderId) {
    if (expandedId === orderId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(orderId);
    if (!detailsByOrder[orderId]) {
      setDetailsLoading(true);
      try {
        const res = await orderDetailApi.getByOrder(orderId);
        setDetailsByOrder((prev) => ({ ...prev, [orderId]: res.data || [] }));
      } catch {
        setDetailsByOrder((prev) => ({ ...prev, [orderId]: [] }));
      } finally {
        setDetailsLoading(false);
      }
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-12">
      <p className="font-[var(--font-mono)] text-xs text-[var(--color-circuit)] mb-1">ORDER LOG</p>
      <h1 className="font-[var(--font-display)] text-3xl font-semibold mb-8">Your orders</h1>

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
                        handleCancel(id);
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
                    <div className="space-y-1">
                      {detailsByOrder[id].map((d, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>Product #{d.product_id ?? d.productId} × {d.quantity ?? d.Quantity}</span>
                          <span className="font-[var(--font-mono)]">
                            ${Number(d.price ?? d.Price ?? 0).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
