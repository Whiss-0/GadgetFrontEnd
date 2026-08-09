import { useEffect, useState } from "react";
import { ordersApi } from "../../api/client";

const STATUS_OPTIONS = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];

export default function OrdersAdmin() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  function load() {
    // GET /api/order requires AdminAccess — this page is only reachable by admins (RequireAdmin)
    ordersApi
      .listAllAdmin()
      .then((res) => setOrders(res.data || []))
      .catch((err) =>
        setError(
          err.response?.data?.message ||
          "Couldn't load orders. Make sure the API is running and you have admin access."
        )
      );
  }

  useEffect(load, []);

  async function handleStatusChange(id, status) {
    setUpdatingId(id);
    try {
      await ordersApi.updateStatus(id, status);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't update order status.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      {error && <p className="text-sm text-[var(--color-signal)] mb-4">{error}</p>}
      <div className="space-y-2">
        {orders.map((o) => {
          // Order model: order_id, user_id, order_date, total_amount, status
          const id = o.order_id;
          return (
            <div
              key={id}
              className="flex items-center justify-between bg-[var(--color-dark-panel)] border border-[var(--color-dark-line)] rounded px-4 py-3 gap-4"
            >
              <span className="font-[var(--font-mono)] text-sm whitespace-nowrap">
                PO-{String(id).padStart(5, "0")}
              </span>
              <span className="text-sm text-[var(--color-dark-ink)]/70">
                user #{o.user_id}
              </span>
              <span className="text-xs text-[var(--color-dark-ink)]/50 hidden sm:inline">
                {o.order_date ? new Date(o.order_date).toLocaleDateString() : ""}
              </span>
              <select
                value={o.status ?? "Pending"}
                disabled={updatingId === id}
                onChange={(e) => handleStatusChange(id, e.target.value)}
                className="bg-[var(--color-dark-bg)] border border-[var(--color-dark-line)] rounded px-2 py-1 text-xs text-[var(--color-circuit)] focus:border-[var(--color-circuit)] outline-none"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <span className="font-[var(--font-mono)] text-sm text-[var(--color-gold)] whitespace-nowrap">
                ${Number(o.total_amount ?? 0).toFixed(2)}
              </span>
            </div>
          );
        })}
        {orders.length === 0 && !error && (
          <p className="text-[var(--color-dark-ink)]/50">No orders yet.</p>
        )}
      </div>
    </div>
  );
}
