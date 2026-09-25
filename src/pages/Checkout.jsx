import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { ordersApi, cartApi } from "../api/client";

const PAYMENT_METHODS = [
  { id: "COD", label: "Cash on delivery" },
  { id: "Card", label: "Card (Visa / Mastercard)" },
  { id: "GCash", label: "GCash" },
];

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { items: cartItems, refresh } = useCart();

  // Buy Now passes its own single-item list via router state;
  // otherwise checkout uses whatever's currently in the cart.
  const buyNow = location.state?.buyNow;
  const items = buyNow ? location.state.items : cartItems;

  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState("COD");
  const [step, setStep] = useState("form"); // form | processing | done
  const [error, setError] = useState("");
  const [completedOrder, setCompletedOrder] = useState(null);

  const total = items.reduce((sum, i) => {
    const price = i.price ?? i.Price ?? 0;
    const quantity = i.quantity ?? i.Quantity ?? 1;
    return sum + price * quantity;
  }, 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const orderSnapshot = {
      items: [...items],
      total: total,
    };

    if (method !== "COD") {
      // Simulated payment step — no real gateway, no real card data collected.
      // This just mimics the UX of a processing screen for demo purposes.
      setStep("processing");
      await new Promise((r) => setTimeout(r, 1400));
    }

    try {
      // Atomic checkout: creates the order, validates stock, and inserts all
      // line items in a single database transaction. If any item fails (e.g.
      // out of stock), the entire order is rolled back.
      await ordersApi.checkout({
        totalAmount: total,
        shippingAddress: address,
        phoneNumber: phone,
        paymentMethod: method,
        items: items.map((item) => ({
          productId: item.product_id ?? item.productId ?? item.ProductId,
          quantity: item.quantity ?? item.Quantity ?? 1,
          price: item.price ?? item.Price ?? 0,
        })),
      });

      // Save order snapshot before cart items are cleared from state
      setCompletedOrder(orderSnapshot);

      // Clear cart if not buy now
      if (!buyNow) {
        await cartApi.clear();
        await refresh();
      }

      setStep("done");
    } catch (err) {
      setStep("form");
      setError(err.response?.data?.message || "Couldn't place the order.");
    }
  }

  if (items.length === 0 && step !== "done") {
    return (
      <div className="max-w-md mx-auto px-5 py-16 text-center">
        <p className="text-[var(--color-ink-soft)] mb-4">Nothing to check out. Add something from the catalog first.</p>
        <button
          onClick={() => navigate("/")}
          className="btn-secondary px-5 py-2.5 rounded text-sm font-semibold inline-flex items-center gap-2"
        >
          ← Browse Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-5 py-8 sm:py-12">
      <h1 className="font-[var(--font-display)] text-2xl sm:text-3xl font-semibold mb-2">Complete your order</h1>
      <p className="text-[var(--color-ink-soft)] text-sm mb-8">
        Review your delivery details and choose your preferred payment method.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Shipping details */}
        <div className="spec-ticket rounded-xl p-6 border border-[var(--color-line)] bg-[var(--color-panel)]">
          <h2 className="font-[var(--font-display)] text-base font-semibold mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[var(--color-circuit-soft)] text-[var(--color-circuit)] text-xs flex items-center justify-center font-bold">1</span>
            Shipping details
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-ink-soft)] mb-1" htmlFor="address">
                Full delivery address
              </label>
              <textarea
                id="address"
                required
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={step === "processing"}
                placeholder="Street address, apartment/suite, city, postal code"
                className="w-full border border-[var(--color-line)] rounded-lg p-3 bg-white dark:bg-slate-900 focus:border-[var(--color-circuit)] outline-none text-sm disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-ink-soft)] mb-1" htmlFor="phone">
                Contact phone number
              </label>
              <input
                id="phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={step === "processing"}
                placeholder="+63 9XX XXX XXXX"
                className="w-full border border-[var(--color-line)] rounded-lg p-3 bg-white dark:bg-slate-900 focus:border-[var(--color-circuit)] outline-none text-sm disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Payment method */}
        <div className="spec-ticket rounded-xl p-6 border border-[var(--color-line)] bg-[var(--color-panel)]">
          <h2 className="font-[var(--font-display)] text-base font-semibold mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[var(--color-circuit-soft)] text-[var(--color-circuit)] text-xs flex items-center justify-center font-bold">2</span>
            Payment method
          </h2>
          <div className="space-y-2.5">
            {PAYMENT_METHODS.map((m) => (
              <label
                key={m.id}
                className={`flex items-center gap-3 border rounded-lg p-3.5 ${
                  step === "processing" ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                } transition-all ${
                  method === m.id
                    ? "border-[var(--color-circuit)] bg-[var(--color-circuit-soft)]/20"
                    : "border-[var(--color-line)] hover:border-[var(--color-circuit)]/50"
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  value={m.id}
                  checked={method === m.id}
                  onChange={() => setMethod(m.id)}
                  disabled={step === "processing"}
                  className="accent-[var(--color-circuit)]"
                />
                <span className="text-sm font-medium">{m.label}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-[var(--color-ink-soft)] mt-3">
            This demo uses simulated payment. No real payment is processed.
          </p>
        </div>

        {/* Section 3: Review your order */}
        <div className="spec-ticket rounded-xl p-6 border border-[var(--color-line)] bg-[var(--color-panel)]">
          <h2 className="font-[var(--font-display)] text-base font-semibold mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[var(--color-circuit-soft)] text-[var(--color-circuit)] text-xs flex items-center justify-center font-bold">3</span>
            Review your order
          </h2>
          <div className="space-y-2 pb-4 border-b border-[var(--color-line)]">
            {items.map((i, idx) => {
              const name = i.name ?? i.Name ?? `Product #${i.product_ID ?? i.product_id}`;
              const price = i.price ?? i.Price ?? 0;
              const quantity = i.quantity ?? i.Quantity ?? 1;
              return (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-[var(--color-ink)] truncate max-w-[70%]">{name} <span className="text-[var(--color-ink-soft)] text-xs">× {quantity}</span></span>
                  <span className="font-[var(--font-mono)]">${(price * quantity).toFixed(2)}</span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between font-semibold mt-4 text-base">
            <span>Total amount</span>
            <span className="font-[var(--font-mono)] text-xl text-[var(--color-gold)]">${total.toFixed(2)}</span>
          </div>
        </div>

        {error && <p className="text-sm text-[var(--color-signal)]" role="alert">{error}</p>}

        <button
          type="submit"
          disabled={step === "processing"}
          className="btn-primary w-full py-3.5 rounded-lg font-semibold text-base shadow-sm"
        >
          {step === "processing" ? (
            <span className="btn-loading-content flex items-center justify-center gap-2">
              <span className="spinner"></span>
              <span>Processing order…</span>
            </span>
          ) : "Place order"}
        </button>
      </form>

      {step === "done" && (() => {
        const displayItems = completedOrder?.items ?? items;
        const displayTotal = completedOrder?.total ?? total;
        return (
          <div className="modal-backdrop">
            <div className="purchase-modal">
              <div className="success-icon-badge">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>

              <h3 className="modal-title">Order placed</h3>
              <p className="modal-description">
                Thanks for your order.{" "}
                {displayItems.length === 1
                  ? <>{"We're getting"} <strong id="purchased-item-name">{displayItems[0].name ?? displayItems[0].Name ?? "your item"}</strong>{" ready for you."}</>
                  : "We're getting your items ready for you."}
              </p>

              <div className="summary-card">
                <div className="summary-row">
                  <span>Status</span>
                  <span className="status-badge">Processing</span>
                </div>
                <div className="summary-row">
                  <span>Order total</span>
                  <strong className="summary-price">${displayTotal.toFixed(2)}</strong>
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => navigate("/orders")}>View Orders</button>
                <button className="btn-primary" onClick={() => navigate("/")}>Continue Shopping</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
