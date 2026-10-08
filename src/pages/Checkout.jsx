import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { ordersApi, cartApi } from "../api/client";
import PhilippineAddressSelector from "../components/PhilippineAddressSelector";

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
  const [cleanupWarning, setCleanupWarning] = useState("");
  const [showPhSelector, setShowPhSelector] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const submittingRef = useRef(false);
  const dialogRef = useRef(null);
  const dialogTitleRef = useRef(null);

  useEffect(() => {
    if (step === "done") dialogTitleRef.current?.focus();
  }, [step]);

  function containDialogFocus(event) {
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll("button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex='-1'])");
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!Array.from(focusable).includes(document.activeElement)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
      return;
    }
    if (event.shiftKey && (document.activeElement === first || !Array.from(focusable).includes(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const total = items.reduce((sum, i) => {
    const price = i.price ?? i.Price ?? 0;
    const quantity = i.quantity ?? i.Quantity ?? 1;
    return sum + price * quantity;
  }, 0);

  async function handleSubmit(e) {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!address.trim()) {
      setError("Enter a delivery address.");
      return;
    }
    submittingRef.current = true;
    setError("");
    setCleanupWarning("");
    setStep("processing");

    const orderSnapshot = {
      items: [...items],
      total: total,
    };

    try {
      if (method !== "COD") {
        // Simulated payment step — no real gateway, no real card data collected.
        await new Promise((r) => setTimeout(r, 1400));
      }

      // Atomic checkout: creates the order, validates stock, and inserts all
      // line items in a single database transaction. If any item fails (e.g.
      // out of stock), the entire order is rolled back.
      await ordersApi.checkout({
        totalAmount: total,
        shippingAddress: address.trim(),
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

      // The order is committed. Cleanup is best-effort and must not turn a
      // successful purchase into a failure that encourages a duplicate retry.
      setStep("done");
      if (!buyNow) {
        try {
          await cartApi.clear();
          const refreshed = await refresh();
          if (!refreshed) setCleanupWarning("Your order was placed, but we couldn’t refresh the cart. Please review it before your next checkout.");
        } catch {
          setCleanupWarning("Your order was placed, but we couldn’t clear the cart. Please review it before your next checkout.");
        }
      }
    } catch (err) {
      setStep("form");
      setError(err.response?.data?.message || "Couldn't place the order.");
    } finally {
      submittingRef.current = false;
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
            {/* Philippine address selector helper */}
            <div>
              <button
                type="button"
                className="ph-selector-toggle"
                onClick={() => setShowPhSelector((v) => !v)}
                disabled={step === "processing"}
              >
                {showPhSelector ? "▲ Hide" : "▼ Use"} Philippine address selector
              </button>

              {showPhSelector && (
                <div className="ph-selector-panel">
                  <p className="text-xs text-[var(--color-ink-soft)] mb-3">
                    Pick your location — it will be applied to the address field below.
                  </p>
                  <PhilippineAddressSelector
                    street=""
                    onAddressChange={(formatted) => setAddress(formatted)}
                    disabled={step === "processing"}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-ink-soft)] mb-1" htmlFor="address">
                Full delivery address
              </label>
              <textarea
                id="address"
                required
                autoComplete="street-address"
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={step === "processing"}
                placeholder="Street / house number, barangay, city, province (or use selector above)"
                className="w-full border border-[var(--color-line)] rounded-lg p-3 bg-[var(--color-panel)] text-[var(--color-ink)] placeholder:text-[var(--color-ink-soft)] focus:border-[var(--color-circuit)] outline-none text-sm disabled:opacity-50"
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
                autoComplete="tel"
                inputMode="tel"
                minLength={7}
                maxLength={24}
                pattern="[+0-9 ()-]{7,24}"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={step === "processing"}
                placeholder="+63 9XX XXX XXXX"
                className="w-full border border-[var(--color-line)] rounded-lg p-3 bg-[var(--color-panel)] text-[var(--color-ink)] placeholder:text-[var(--color-ink-soft)] focus:border-[var(--color-circuit)] outline-none text-sm disabled:opacity-50"
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
            <div ref={dialogRef} onKeyDown={containDialogFocus} className="purchase-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-success-title">
              <div className="success-icon-badge">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>

              <h3 ref={dialogTitleRef} tabIndex={-1} className="modal-title" id="checkout-success-title">Order placed</h3>
              {cleanupWarning && <p className="text-sm text-[var(--color-signal)]" role="status">{cleanupWarning}</p>}
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
