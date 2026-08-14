import { useEffect, useState } from "react";
import { ordersApi } from "../api/client";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // /api/order/my returns the authenticated user's orders.
    // The bare GET /api/order requires AdminAccess and would return 403 here.
    ordersApi
      .myOrders()
      .then((res) => setOrders(res.data || []))
      .catch((err) => {
        setError(
          err.response?.data?.message ||
          "Couldn't load your orders. Make sure you're logged in."
        );
      })
      .finally(() => setLoading(false));
  }, []);

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
          // Order model: order_id, user_id, order_date, total_amount, status
          const id     = o.order_id ?? o.orderId ?? o.OrderId;
          const status = o.status ?? o.Status ?? "Pending";
          const date   = o.order_date ?? o.orderDate ?? o.OrderDate;
          const total  = o.total_amount ?? o.totalAmount ?? o.TotalAmount ?? 0;
          return (
            <div
              key={id}
              className="spec-ticket rounded-md p-4 flex items-center justify-between"
              style={{ "--tw-before-hidden": "true" }}
            >
              <div>
                <p className="font-[var(--font-mono)] text-xs text-[var(--color-ink-soft)]">
                  PO-{String(id).padStart(5, "0")}
                </p>
                <p className="text-sm text-[var(--color-ink-soft)]">
                  {date ? new Date(date).toLocaleDateString() : ""}
                </p>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded bg-[var(--color-circuit)]/10 text-[var(--color-circuit-dark)]">
                {status}
              </span>
              <span className="font-[var(--font-mono)] font-semibold text-[var(--color-gold)]">
                ${Number(o.total_amount ?? o.totalAmount ?? o.TotalAmount ?? 0).toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
