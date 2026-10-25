import { Fragment, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { orderDetailApi, ordersApi } from "../../api/client";
import ConfirmDialog from "../../components/ConfirmDialog";
import { useToast } from "../../hooks/useToast";
import { scrollToElement } from "../../utils/scroll";
import { formatPrice } from "../../utils/format";
import { printOrderLabel } from "../../utils/printOrderLabel";

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
  if (!dateStr) return "No date";
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return "Time unavailable";
  const date = new Date(dateStr);
  return Number.isNaN(date.getTime()) ? "Time unavailable" : date.toLocaleString();
}

function AdminOrderDetails({ order, onRefresh }) {
  const id = order.order_id ?? order.orderId ?? order.OrderId;
  const toast = useToast();
  const [lineItems, setLineItems] = useState([]);
  const [events, setEvents] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [itemsError, setItemsError] = useState("");
  const [eventsError, setEventsError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [form, setForm] = useState({
    courierName: order.courier_name ?? order.courierName ?? order.CourierName ?? "",
    trackingNumber: order.tracking_number ?? order.trackingNumber ?? order.TrackingNumber ?? "",
    eta: (order.estimated_delivery_date ?? order.estimatedDeliveryDate ?? order.EstimatedDeliveryDate ?? "").slice(0, 10),
    note: "",
  });

  async function loadDetails() {
    setLoadingItems(true);
    setLoadingEvents(true);
    setItemsError("");
    setEventsError("");
    const [itemsResult, eventsResult] = await Promise.allSettled([
      orderDetailApi.getByOrder(id),
      ordersApi.deliveryEvents(id),
    ]);
    if (itemsResult.status === "fulfilled") {
      setLineItems(itemsResult.value.data || []);
    } else {
      setItemsError(itemsResult.reason.response?.data?.message || "Couldn't load order items.");
    }
    if (eventsResult.status === "fulfilled") {
      setEvents(eventsResult.value.data || []);
    } else {
      setEventsError(eventsResult.reason.response?.data?.message || "Couldn't load delivery history.");
    }
    setLoadingItems(false);
    setLoadingEvents(false);
  }

  useEffect(() => {
    loadDetails();
    // This component is mounted for one expanded order at a time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setSaveError("");
    setSaveSuccess("");
  }

  async function saveFulfillment(event) {
    event.preventDefault();
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");
    try {
      await ordersApi.updateFulfillment(id, {
        CourierName: form.courierName.trim(),
        TrackingNumber: form.trackingNumber.trim(),
        EstimatedDeliveryDate: form.eta || null,
        Note: form.note.trim(),
      });
      setSaveSuccess("Fulfillment details saved.");
      setForm((current) => ({ ...current, note: "" }));
      await Promise.all([onRefresh(), loadDetails()]);
    } catch (err) {
      setSaveError(err.response?.data?.message || "Couldn't save fulfillment details.");
    } finally {
      setSaving(false);
    }
  }

  const shippingAddress = order.shipping_address ?? order.shippingAddress ?? order.ShippingAddress ?? order.address ?? order.Address;
  const phone = order.shipping_phone ?? order.shippingPhone ?? order.customer_phone ?? order.customerPhone ?? order.phone ?? order.Phone ?? order.user?.phone ?? order.customer?.phone;
  const paymentMethod = order.payment_method ?? order.paymentMethod ?? order.PaymentMethod;
  const paymentStatus = order.payment_status ?? order.paymentStatus ?? order.PaymentStatus;

  return (
    <div className="rounded-lg border border-[var(--color-dark-line)] bg-[var(--color-dark-panel)]/50 p-4 sm:p-5 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div>
          <h4 className="text-[10px] uppercase tracking-wider text-[var(--color-dark-ink)]/50">Ship to</h4>
          <p className="text-sm text-white mt-1 break-words">{shippingAddress || "No shipping address provided"}</p>
          <p className="text-xs text-[var(--color-dark-ink)]/70 mt-1">{phone || "No phone provided"}</p>
        </div>
        <div>
          <h4 className="text-[10px] uppercase tracking-wider text-[var(--color-dark-ink)]/50">Payment</h4>
          <p className="text-sm text-white mt-1">{paymentMethod || "Not specified"}</p>
          <p className="text-xs text-[var(--color-dark-ink)]/70 mt-1">{paymentStatus || "Status unavailable"}</p>
        </div>
        <div className="sm:col-span-2">
          <h4 className="text-[10px] uppercase tracking-wider text-[var(--color-dark-ink)]/50">Line items</h4>
          {loadingItems ? <p className="text-xs text-[var(--color-dark-ink)]/60 mt-1">Loading items…</p> : null}
          {itemsError ? <p className="text-xs text-[var(--color-signal)] mt-1">{itemsError}</p> : null}
          {!loadingItems && !itemsError && lineItems.length === 0 ? <p className="text-xs text-[var(--color-dark-ink)]/60 mt-1">No line items found.</p> : null}
          <ul className="mt-1 space-y-1">
            {lineItems.map((item, index) => {
              const product = item.product ?? item.Product;
              const productId = item.product_id ?? item.productId ?? item.ProductId;
              const name = product?.product_name ?? product?.productName ?? product?.ProductName ?? item.product_name ?? item.ProductName ?? `Product #${productId ?? index + 1}`;
              const quantity = item.quantity ?? item.Quantity ?? 1;
              const price = item.price ?? item.Price;
              return <li key={item.order_detail_id ?? item.orderDetailId ?? index} className="text-xs text-white/90 break-words">{name} · Qty {quantity}{price != null ? ` · ${formatPrice(Number(price))}` : ""}</li>;
            })}
          </ul>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[var(--color-dark-line)] pt-4">
        <p className="text-xs text-[var(--color-dark-ink)]/60">Print a 4 × 6 in store label for packing and order identification.</p>
        <button type="button" onClick={() => {
          if (!printOrderLabel(order, lineItems)) toast.show("Your browser blocked the print window. Allow pop-ups and try again.", { tone: "error" });
        }} className="admin-btn-secondary self-start sm:self-auto">Print parcel label</button>
      </div>

      <form onSubmit={saveFulfillment} className="border-t border-[var(--color-dark-line)] pt-4">
        <h4 className="text-xs font-semibold text-white mb-3">Manual fulfillment</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <label className="text-xs text-[var(--color-dark-ink)]/70">Courier
            <input value={form.courierName} onChange={(e) => updateField("courierName", e.target.value)} className="admin-input-premium mt-1 w-full rounded border border-[var(--color-dark-line)] px-3 py-2 text-sm text-white" autoComplete="organization" />
          </label>
          <label className="text-xs text-[var(--color-dark-ink)]/70">Tracking number
            <input value={form.trackingNumber} onChange={(e) => updateField("trackingNumber", e.target.value)} className="admin-input-premium mt-1 w-full rounded border border-[var(--color-dark-line)] px-3 py-2 text-sm text-white" />
          </label>
          <label className="text-xs text-[var(--color-dark-ink)]/70">Estimated delivery
            <input type="date" value={form.eta} onChange={(e) => updateField("eta", e.target.value)} className="admin-input-premium mt-1 w-full rounded border border-[var(--color-dark-line)] px-3 py-2 text-sm text-white" />
          </label>
          <label className="text-xs text-[var(--color-dark-ink)]/70">Note
            <input value={form.note} onChange={(e) => updateField("note", e.target.value)} className="admin-input-premium mt-1 w-full rounded border border-[var(--color-dark-line)] px-3 py-2 text-sm text-white" placeholder="Optional update for the delivery history" />
          </label>
        </div>
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <button type="submit" disabled={saving} className="admin-btn-secondary self-start disabled:opacity-50">{saving ? "Saving…" : "Save fulfillment"}</button>
          {saveError && <p role="alert" className="text-xs text-[var(--color-signal)]">{saveError}</p>}
          {saveSuccess && <p role="status" className="text-xs text-emerald-400">{saveSuccess}</p>}
        </div>
      </form>

      <section className="border-t border-[var(--color-dark-line)] pt-4">
        <h4 className="text-xs font-semibold text-white mb-2">Delivery tracking</h4>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--color-dark-ink)]/80">
          <span>Courier: {order.courier_name ?? order.courierName ?? order.CourierName ?? "Not assigned"}</span>
          <span>Tracking #: {order.tracking_number ?? order.trackingNumber ?? order.TrackingNumber ?? "Not assigned"}</span>
          {(order.estimated_delivery_date ?? order.estimatedDeliveryDate ?? order.EstimatedDeliveryDate) && <span>ETA: {formatDate(order.estimated_delivery_date ?? order.estimatedDeliveryDate ?? order.EstimatedDeliveryDate)}</span>}
        </div>
        {loadingEvents && <p className="text-xs text-[var(--color-dark-ink)]/60 mt-2">Loading delivery history…</p>}
        {eventsError && <p className="text-xs text-[var(--color-signal)] mt-2">{eventsError}</p>}
        {!loadingEvents && !eventsError && events.length === 0 && <p className="text-xs text-[var(--color-dark-ink)]/60 mt-2">No delivery events recorded yet.</p>}
        {events.length > 0 && <ol className="mt-3 space-y-2">{[...events].sort((a, b) => new Date(a.created_at ?? a.createdAt) - new Date(b.created_at ?? b.createdAt)).map((item, index) => <li key={item.delivery_event_id ?? item.deliveryEventId ?? index} className="border-l-2 border-[var(--color-circuit)]/40 pl-3"><p className="text-xs font-medium text-white">{item.status || item.event_type || item.eventType || "Delivery update"}</p>{(item.note) && <p className="text-xs text-[var(--color-dark-ink)]/70">{item.note}</p>}<p className="text-[10px] text-[var(--color-dark-ink)]/50">{formatDateTime(item.created_at ?? item.createdAt)}{item.actor_role ?? item.actorRole ? ` · ${item.actor_role ?? item.actorRole}` : ""}</p></li>)}</ol>}
      </section>
    </div>
  );
}

export default function OrdersAdmin() {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [expandedDesktopId, setExpandedDesktopId] = useState(null);
  const [expandedMobileId, setExpandedMobileId] = useState(null);
  const [orderToCancel, setOrderToCancel] = useState(null); // { id, displayId }
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get("status");
  const visibleOrders = statusFilter
    ? orders.filter((order) => (order.status ?? order.Status ?? "Pending") === statusFilter)
    : orders;

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

  useEffect(() => {
    if (statusFilter !== "Pending" && statusFilter !== "Processing") return undefined;
    const frame = window.requestAnimationFrame(() => {
      const panel = document.getElementById("admin-orders");
      const heading = document.getElementById("admin-orders-heading");
      if (!panel || !heading) return;
      scrollToElement(panel);
      heading.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [statusFilter]);

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
    <div id="admin-orders" className="admin-glass-panel rounded-xl p-6 scroll-mt-24">
      {/* Table header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 id="admin-orders-heading" tabIndex={-1} className="text-lg font-bold text-white tracking-tight">Customer orders</h2>
          <p className="text-xs text-[var(--color-dark-ink)]/60">
            {statusFilter ? `Showing ${statusFilter.toLowerCase()} orders.` : "Manage order fulfilment, status progression, and cancellation."}
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

      {!loading && !error && orders.length > 0 && visibleOrders.length === 0 && (
        <div className="py-16 text-center text-sm text-[var(--color-dark-ink)]/60">
          No {statusFilter?.toLowerCase() || "matching"} orders found.
        </div>
      )}

      {/* Orders content: Desktop Table + Mobile Cards */}
      {visibleOrders.length > 0 && (
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
                {visibleOrders.map((o) => {
                  const id = o.order_id ?? o.orderId ?? o.OrderId;
                  const userId = o.user_id ?? o.userId ?? o.User_ID;
                  const currentStatus = o.status ?? o.Status ?? "Pending";
                  const orderDate = o.order_date ?? o.orderDate ?? o.OrderDate;
                  const total = Number(o.total_amount ?? o.totalAmount ?? o.TotalAmount ?? 0);
                  const isUpdating = updatingId === id;

                  return (
                    <Fragment key={id}>
                    <tr>
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
                        {formatPrice(total)}
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
                        <button type="button" onClick={() => { setExpandedDesktopId(expandedDesktopId === id ? null : id); setExpandedMobileId(null); }} aria-expanded={expandedDesktopId === id} className="block ml-auto mt-2 text-xs text-[var(--color-circuit)] hover:underline">
                          {expandedDesktopId === id ? "Hide details" : "Fulfillment details"}
                        </button>
                      </td>
                    </tr>
                    {expandedDesktopId === id && <tr><td colSpan={6} className="p-3"><AdminOrderDetails order={o} onRefresh={load} /></td></tr>}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards (visible only on small screens) */}
          <div className="md:hidden space-y-3">
            {visibleOrders.map((o) => {
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
                      {formatPrice(total)}
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
                  <button type="button" onClick={() => { setExpandedMobileId(expandedMobileId === id ? null : id); setExpandedDesktopId(null); }} aria-expanded={expandedMobileId === id} className="text-xs text-[var(--color-circuit)] hover:underline">
                    {expandedMobileId === id ? "Hide fulfillment details" : "Fulfillment details"}
                  </button>
                  {expandedMobileId === id && <AdminOrderDetails order={o} onRefresh={load} />}
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
