import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ordersApi,
  orderDetailApi,
  categoriesApi,
} from "../api/client";
import ConfirmDialog from "../components/ConfirmDialog";
import ProductArt from "../components/ProductArt";
import { useToast } from "../hooks/useToast";
import { formatPrice } from "../utils/format";

const TIMELINE_STEPS = ["Pending", "Processing", "Shipped", "Delivered"];

function formatDateTime(value) {
  if (!value) return "Time unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Time unavailable" : date.toLocaleString();
}

function OrderTimeline({ status }) {
  const isCancelled = status === "Cancelled";
  if (isCancelled) {
    return (
      <div className="order-timeline cancelled">
        <span className="order-cancelled-badge">Order cancelled</span>
      </div>
    );
  }
  const currentIdx = TIMELINE_STEPS.indexOf(status);
  return (
    <div className="order-timeline">
      {TIMELINE_STEPS.map((step, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        return (
          <div key={step} className={`order-timeline-step${done ? " done" : ""}${active ? " active" : ""}`}>
            <div className="order-timeline-dot" />
            <span className="order-timeline-label">{step}</span>
            {idx < TIMELINE_STEPS.length - 1 && (
              <div className={`order-timeline-connector${done ? " done" : ""}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Orders() {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [detailsByOrder, setDetailsByOrder] = useState({});
  const [eventsByOrder, setEventsByOrder] = useState({});
  const [detailsErrorByOrder, setDetailsErrorByOrder] = useState({});
  const [eventsErrorByOrder, setEventsErrorByOrder] = useState({});
  const [loadingByOrder, setLoadingByOrder] = useState({});
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
      toast.show("Your order was cancelled.", { tone: "success" });
    } catch (err) {
      toast.show(err.response?.data?.message || "Couldn't cancel this order.", { tone: "error" });
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

    const needsItems = !Object.prototype.hasOwnProperty.call(detailsByOrder, orderId);
    const needsEvents = !Object.prototype.hasOwnProperty.call(eventsByOrder, orderId);
    if ((!needsItems && !needsEvents) || loadingByOrder[orderId]) return;
    setLoadingByOrder((previous) => ({ ...previous, [orderId]: true }));
    const requests = await Promise.allSettled([
      needsItems ? orderDetailApi.getByOrder(orderId) : Promise.resolve(null),
      needsEvents ? ordersApi.deliveryEvents(orderId) : Promise.resolve(null),
    ]);
    if (needsItems) {
      if (requests[0].status === "fulfilled") {
        setDetailsByOrder((previous) => ({ ...previous, [orderId]: requests[0].value.data || [] }));
        setDetailsErrorByOrder((previous) => ({ ...previous, [orderId]: "" }));
      } else {
        setDetailsErrorByOrder((previous) => ({ ...previous, [orderId]: requests[0].reason.response?.data?.message || "Couldn't load the items in this order." }));
      }
    }
    if (needsEvents) {
      if (requests[1].status === "fulfilled") {
        setEventsByOrder((previous) => ({ ...previous, [orderId]: requests[1].value.data || [] }));
        setEventsErrorByOrder((previous) => ({ ...previous, [orderId]: "" }));
      } else {
        setEventsErrorByOrder((previous) => ({ ...previous, [orderId]: requests[1].reason.response?.data?.message || "Couldn't load delivery history." }));
      }
    }
    setLoadingByOrder((previous) => ({ ...previous, [orderId]: false }));
  }

  return (
    <div className="orders-page max-w-3xl mx-auto px-5 py-8 sm:py-12">
      <h1 className="font-[var(--font-display)] text-2xl sm:text-3xl font-semibold mb-2">Your orders</h1>
      <p className="text-[var(--color-ink-soft)] text-sm mb-8">
        Track previous purchases and see what is happening with each order.
      </p>

      {loading && <p className="text-[var(--color-ink-soft)]">Loading…</p>}
      {error && <p className="text-sm text-[var(--color-signal)] mb-4">{error}</p>}

      {!loading && !error && orders.length === 0 && (
        <div className="empty-state-card text-center p-8 sm:p-12 border border-[var(--color-line)] rounded-xl bg-[var(--color-panel)]">
          <p className="font-[var(--font-display)] font-semibold text-lg mb-2">No orders yet</p>
          <p className="text-[var(--color-ink-soft)] text-sm mb-6 max-w-md mx-auto">
            Your Techstead orders will appear here after checkout.
          </p>
          <Link to="/" className="btn-primary px-5 py-2.5 rounded-lg text-sm font-semibold inline-block">
            Browse the catalog
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {orders.map((o) => {
          const id = o.order_id ?? o.orderId ?? o.OrderId;
          const status = o.status ?? o.Status ?? "Pending";
          const date = o.order_date ?? o.orderDate ?? o.OrderDate;
          const total = o.total_amount ?? o.totalAmount ?? o.TotalAmount ?? 0;
          const paymentMethod = o.payment_method ?? o.paymentMethod ?? o.PaymentMethod;
          const paymentStatus = o.payment_status ?? o.paymentStatus ?? o.PaymentStatus;
          const shippingAddress = o.shipping_address ?? o.shippingAddress ?? o.ShippingAddress;
          const shippingPhone = o.shipping_phone ?? o.shippingPhone ?? o.customer_phone ?? o.customerPhone ?? o.phone ?? o.Phone;
          const courierName = o.courier_name ?? o.courierName ?? o.CourierName;
          const trackingNumber = o.tracking_number ?? o.trackingNumber ?? o.TrackingNumber;
          const estimatedDeliveryDate = o.estimated_delivery_date ?? o.estimatedDeliveryDate ?? o.EstimatedDeliveryDate;
          const isDetailsLoading = Boolean(loadingByOrder[id]);
          const isOpen = expandedId === id;

          return (
            <div key={id} className="spec-ticket rounded-xl overflow-hidden border border-[var(--color-line)] bg-[var(--color-panel)]">
              <div className="w-full p-4 flex items-center justify-between gap-3 text-left">
                <button type="button" onClick={() => toggleExpand(id)} aria-expanded={isOpen} className="min-w-0 flex-1 text-left">
                  <p className="font-semibold text-sm text-[var(--color-ink)]">Order #{id}</p>
                  <p className="text-xs text-[var(--color-ink-soft)] mt-0.5">
                    {date ? new Date(date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : ""}
                  </p>
                </button>
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded bg-[var(--color-circuit)]/10 text-[var(--color-circuit-dark)]">{status}</span>
                  {status === "Pending" && (
                    <button
                      type="button"
                      onClick={() => setOrderToCancel({ id, total })}
                      disabled={cancellingId === id}
                      className="text-alert text-xs disabled:opacity-50"
                    >{cancellingId === id ? "Cancelling…" : "Cancel"}</button>
                  )}
                </div>
                <span className="font-[var(--font-mono)] font-semibold text-[var(--color-gold)]">{formatPrice(total)}</span>
              </div>

              {isOpen && (
                <div className="border-t border-[var(--color-line)] px-4 py-4 bg-[var(--color-paper)]">
                  {isDetailsLoading && <p className="text-xs text-[var(--color-ink-soft)] mb-3">Loading order details…</p>}

                  <section aria-label="Order items">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-soft)] mb-2">Items</h3>
                    {detailsErrorByOrder[id] && <p role="alert" className="text-xs text-[var(--color-signal)]">{detailsErrorByOrder[id]}</p>}
                    {Object.prototype.hasOwnProperty.call(detailsByOrder, id) && detailsByOrder[id].length === 0 && <p className="text-xs text-[var(--color-ink-soft)]">No line items found for this order.</p>}
                    {(detailsByOrder[id] || []).map((d, idx) => {
                      const productId = d.product_id ?? d.productId ?? d.ProductId;
                      const product = d.product ?? d.Product;
                      const productName = product?.product_name ?? product?.productName ?? product?.ProductName ?? `Product #${productId}`;
                      const quantity = d.quantity ?? d.Quantity ?? 1;
                      const price = d.price ?? d.Price ?? 0;
                      const category = categories.find((item) => item.category_id === product?.category_id);
                      return (
                        <div key={d.order_detail_id ?? d.orderDetailId ?? idx} className="order-line-item">
                          <div className="order-line-art">
                            <ProductArt product={product ?? { product_id: productId }} alt="" className="w-full h-full object-contain p-1" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate text-sm">{productName}</p>
                            <p className="text-xs text-[var(--color-ink-soft)]">{product?.brand || category?.category_name || "Gadget"} · Qty {quantity}</p>
                          </div>
                          <span className="font-[var(--font-mono)] text-sm flex-shrink-0">{formatPrice(price)}</span>
                        </div>
                      );
                    })}
                  </section>

                  <div className="order-detail-meta mt-4">
                    <div className="order-detail-meta-row">
                      <span className="order-detail-meta-label">Payment</span>
                      <span className="order-detail-meta-value">{paymentMethod || "Not specified"}{paymentStatus ? ` · ${paymentStatus}` : ""}</span>
                    </div>
                    <div className="order-detail-meta-row">
                      <span className="order-detail-meta-label">Ship to</span>
                      <span className="order-detail-meta-value">{shippingAddress || "No shipping address provided"}</span>
                    </div>
                    {shippingPhone && <div className="order-detail-meta-row"><span className="order-detail-meta-label">Phone</span><span className="order-detail-meta-value">{shippingPhone}</span></div>}
                  </div>

                  <section className="mt-5" aria-label="Shipment tracking">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-soft)] mb-2">Shipment tracking</h3>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-[var(--color-ink-soft)]">Courier:</span> {courierName || "Not assigned"}</p>
                      <p><span className="text-[var(--color-ink-soft)]">Tracking number:</span> {trackingNumber || "Not available"}</p>
                      {estimatedDeliveryDate && <p><span className="text-[var(--color-ink-soft)]">Estimated delivery:</span> {String(estimatedDeliveryDate).slice(0, 10)}</p>}
                    </div>
                  </section>

                  <div className="mt-5"><OrderTimeline status={status} /></div>

                  <section className="mt-5 border-t border-[var(--color-line)] pt-4" aria-label="Delivery event history">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-soft)] mb-2">Delivery updates</h3>
                    {eventsErrorByOrder[id] && <p role="alert" className="text-xs text-[var(--color-signal)]">{eventsErrorByOrder[id]}</p>}
                    {!isDetailsLoading && Object.prototype.hasOwnProperty.call(eventsByOrder, id) && eventsByOrder[id].length === 0 && <p className="text-xs text-[var(--color-ink-soft)]">No delivery updates recorded yet.</p>}
                    {eventsByOrder[id]?.length > 0 && (
                      <ol className="space-y-3">
                        {[...eventsByOrder[id]].sort((a, b) => new Date(a.created_at ?? a.createdAt) - new Date(b.created_at ?? b.createdAt)).map((deliveryEvent, index) => (
                          <li key={deliveryEvent.delivery_event_id ?? deliveryEvent.deliveryEventId ?? index} className="border-l-2 border-[var(--color-circuit)]/40 pl-3">
                            <p className="text-sm font-medium">{deliveryEvent.status || deliveryEvent.event_type || deliveryEvent.eventType || "Delivery update"}</p>
                            {deliveryEvent.note && <p className="text-xs text-[var(--color-ink-soft)] mt-0.5">{deliveryEvent.note}</p>}
                            <time dateTime={deliveryEvent.created_at ?? deliveryEvent.createdAt} className="text-[11px] text-[var(--color-ink-soft)]">{formatDateTime(deliveryEvent.created_at ?? deliveryEvent.createdAt)}</time>
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>
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
