import { useEffect, useState, useCallback } from "react";
import { ordersApi } from "../../api/client";
import ConfirmDialog from "../../components/ConfirmDialog";
import { useToast } from "../../hooks/useToast";

const STATUS_OPTIONS = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];

function getStatusBadgeClass(status) {
  switch (status) {
    case "Pending":
      return "admin-status-pending";
    case "Processing":
      return "admin-status-processing";
    case "Shipped":
      return "admin-status-shipped";
    case "Delivered":
      return "admin-status-delivered";
    case "Cancelled":
      return "admin-status-cancelled";
    default:
      return "admin-status-pending";
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function OrdersAdmin() {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [orderToCancel, setOrderToCancel] = useState(null); // { id, displayId }

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await ordersApi.listAllAdmin();
      setOrders(res.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Couldn't load orders. Make sure the API is running and you have admin access."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStatusChange(id, status) {
    if (status === "Cancelled") {
      setOrderToCancel({ id, displayId: id });
      return;
    }
    setUpdatingId(id);
    try {
      await ordersApi.updateStatus(id, status);
      await load();
      toast.show(`Order #${id} updated to ${status}.`, { tone: "success" });
    } catch (err) {
      toast.show(err.response?.data?.message || "Couldn't update order status.", { tone: "error" });
    } finally {
      setUpdatingId(null);
    }
  }

  async function confirmCancelOrder() {
    if (!orderToCancel) return;
    const { id } = orderToCancel;
    setUpdatingId(id);
    try {
      await ordersApi.updateStatus(id, "Cancelled");
      setOrderToCancel(null);
      await load();
      toast.show(`Order #${id} was cancelled.`, { tone: "success" });
    } catch (err) {
      toast.show(err.response?.data?.message || "Couldn't cancel this order.", { tone: "error" });
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="admin-glass-panel rounded-xl p-6">
      {/* Table header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Customer orders</h2>
          <p className="text-xs text-[var(--color-dark-ink)]/60">
            Manage order fulfilment, status progression, and cancellation.
          </p>
        </div>

        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="admin-btn-secondary self-start sm:self-auto"
          aria-label="Reload orders"
        >
          <svg
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 11a8.1 8.1 0 0 0-14.7-3L3 11" />
            <path d="M3 4v7h7" />
            <path d="M4 13a8.1 8.1 0 0 0 14.7 3L21 13" />
            <path d="M21 20v-7h-7" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {/* Loading state */}
      {loading && orders.length === 0 && (
        <div className="py-16 text-center text-sm text-[var(--color-dark-ink)]/60 flex flex-col items-center justify-center gap-3">
          <svg className="w-6 h-6 animate-spin text-[var(--color-circuit)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
          </svg>
          <p>Loading customer orders…</p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="bg-[var(--color-signal)]/10 border border-[var(--color-signal)]/30 rounded-lg p-5 text-center my-4">
          <p className="text-sm text-[var(--color-signal)] mb-3">{error}</p>
          <button
            type="button"
            onClick={load}
            className="admin-btn-secondary"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && orders.length === 0 && (
        <div className="py-16 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-[var(--color-dark-panel)] border border-[var(--color-dark-line)] flex items-center justify-center text-[var(--color-dark-ink)]/40 mb-3">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-white mb-1">No orders found</h3>
          <p className="text-xs text-[var(--color-dark-ink)]/50 max-w-sm">
            Orders will appear here after customers place them.
          </p>
        </div>
      )}

      {/* Orders content: Desktop Table + Mobile Cards */}
      {orders.length > 0 && (
        <>
          {/* Desktop Table (hidden on small screens) */}
          <div className="hidden md:block admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const id = o.order_id ?? o.orderId ?? o.OrderId;
                  const userId = o.user_id ?? o.userId ?? o.User_ID;
                  const currentStatus = o.status ?? o.Status ?? "Pending";
                  const orderDate = o.order_date ?? o.orderDate ?? o.OrderDate;
                  const total = Number(o.total_amount ?? o.totalAmount ?? o.TotalAmount ?? 0);
                  const isUpdating = updatingId === id;

                  return (
                    <tr key={id}>
                      <td className="font-[var(--font-mono)] font-semibold text-white">
                        Order #{id}
                      </td>
                      <td className="text-sm text-[var(--color-dark-ink)]/80">
                        Customer #{userId}
                      </td>
                      <td className="font-[var(--font-mono)] text-xs text-[var(--color-dark-ink)]/60">
                        {formatDate(orderDate)}
                      </td>
                      <td>
                        <span className={`admin-status-badge ${getStatusBadgeClass(currentStatus)}`}>
                          {currentStatus}
                        </span>
                      </td>
                      <td className="font-[var(--font-mono)] font-semibold text-[#F59E0B]">
                        ${total.toFixed(2)}
                      </td>
                      <td className="text-right">
                        <select
                          value={currentStatus}
                          disabled={isUpdating}
                          onChange={(e) => handleStatusChange(id, e.target.value)}
                          className="admin-input-premium border border-[var(--color-dark-line)] rounded px-3 py-1.5 text-xs text-white outline-none cursor-pointer focus:border-[var(--color-circuit)] transition-colors"
                          aria-label={`Change status for Order #${id}`}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s} className="bg-[var(--color-dark-panel)]">
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards (visible only on small screens) */}
          <div className="md:hidden space-y-3">
            {orders.map((o) => {
              const id = o.order_id ?? o.orderId ?? o.OrderId;
              const userId = o.user_id ?? o.userId ?? o.User_ID;
              const currentStatus = o.status ?? o.Status ?? "Pending";
              const orderDate = o.order_date ?? o.orderDate ?? o.OrderDate;
              const total = Number(o.total_amount ?? o.totalAmount ?? o.TotalAmount ?? 0);
              const isUpdating = updatingId === id;

              return (
                <div
                  key={id}
                  className="admin-item-card rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-[var(--font-mono)] font-bold text-white text-sm">
                        Order #{id}
                      </span>
                      <p className="text-xs text-[var(--color-dark-ink)]/50 mt-0.5">
                        Customer #{userId} · {formatDate(orderDate)}
                      </p>
                    </div>
                    <span className="font-[var(--font-mono)] text-base font-bold text-[#F59E0B]">
                      ${total.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[var(--color-dark-line)]">
                    <span className={`admin-status-badge ${getStatusBadgeClass(currentStatus)}`}>
                      {currentStatus}
                    </span>

                    <select
                      value={currentStatus}
                      disabled={isUpdating}
                      onChange={(e) => handleStatusChange(id, e.target.value)}
                      className="admin-input-premium border border-[var(--color-dark-line)] rounded px-2.5 py-1 text-xs text-white outline-none"
                      aria-label={`Change status for Order #${id}`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s} className="bg-[var(--color-dark-panel)]">
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Strong cancellation confirmation */}
      <ConfirmDialog
        open={Boolean(orderToCancel)}
        title="Cancel this order for the customer?"
        description={orderToCancel ? `Order #${orderToCancel.displayId} will be permanently marked as cancelled.` : ""}
        warning="This changes the customer's order record and reverses reported revenue. Check the order details before continuing."
        confirmLabel="Yes, cancel order"
        cancelLabel="Go back"
        tone="danger"
        busy={updatingId === orderToCancel?.id}
        onConfirm={confirmCancelOrder}
        onCancel={() => setOrderToCancel(null)}
      />
    </div>
  );
}
