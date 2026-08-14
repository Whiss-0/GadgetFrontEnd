import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { ordersApi, orderDetailApi, cartApi } from "../api/client";

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

  const total = items.reduce((sum, i) => {
    const price = i.price ?? i.Price ?? 0;
    const quantity = i.quantity ?? i.Quantity ?? 1;
    return sum + price * quantity;
  }, 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (method !== "COD") {
      // Simulated payment step — no real gateway, no real card data collected.
      // This just mimics the UX of a processing screen for demo purposes.
      setStep("processing");
      await new Promise((r) => setTimeout(r, 1400));
    }

    try {
      // 1. Create the master order
      const orderRes = await ordersApi.create({
        totalAmount: total,
        shippingAddress: address,
        phoneNumber: phone,
        paymentMethod: method,
      });
      const orderId = orderRes.data.order_id ?? orderRes.data.orderId ?? orderRes.data.OrderId;

      // 2. Save individual items
      for (const i of items) {
        await orderDetailApi.create({
          orderId: orderId,
          productId: i.product_id ?? i.productId ?? i.ProductId,
          quantity: i.quantity ?? i.Quantity ?? 1,
          price: i.price ?? i.Price ?? 0,
        });
      }

      // 3. Clear cart if not buy now
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

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto px-5 py-16 text-center text-[var(--color-ink-soft)]">
        Nothing to check out. Add something from the catalog first.
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-5 py-12">
      <p className="font-[var(--font-mono)] text-xs text-[var(--color-circuit)] mb-1">CHECKOUT</p>
      <h1 className="font-[var(--font-display)] text-3xl font-semibold mb-8">Complete your order</h1>

      <div className="spec-ticket rounded-md p-6">
        {/* Order summary */}
        <div className="pb-6 mb-6 border-b border-dashed border-[var(--color-line)]">
          {items.map((i, idx) => {
            const name = i.name ?? i.Name ?? `Product #${i.product_ID ?? i.product_id}`;
            const price = i.price ?? i.Price ?? 0;
            const quantity = i.quantity ?? i.Quantity ?? 1;
            return (
              <div key={idx} className="flex justify-between text-sm mb-1">
                <span>{name} × {quantity}</span>
                <span className="font-[var(--font-mono)]">${(price * quantity).toFixed(2)}</span>
              </div>
            );
          })}
          <div className="flex justify-between font-semibold mt-3 pt-3 border-t border-[var(--color-line)]">
            <span>Total</span>
            <span className="font-[var(--font-mono)] text-[var(--color-gold)]">${total.toFixed(2)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="address">Shipping address</label>
              <textarea
                id="address"
                required
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={step === "processing"}
                className="w-full border border-[var(--color-line)] rounded px-3 py-2 bg-white focus:border-[var(--color-circuit)] outline-none disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="phone">Phone number</label>
              <input
                id="phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={step === "processing"}
                placeholder="+63 9XX XXX XXXX"
                className="w-full border border-[var(--color-line)] rounded px-3 py-2 bg-white focus:border-[var(--color-circuit)] outline-none disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Payment method</label>
              <div className="space-y-2">
                {PAYMENT_METHODS.map((m) => (
                  <label
                    key={m.id}
                    className={`flex items-center gap-3 border rounded px-3 py-2 ${step === "processing" ? "cursor-not-allowed opacity-50" : "cursor-pointer"} transition-colors ${
                      method === m.id ? "border-[var(--color-circuit)] bg-[var(--color-circuit)]/5" : "border-[var(--color-line)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={m.id}
                      checked={method === m.id}
                      onChange={() => setMethod(m.id)}
                      disabled={step === "processing"}
                    />
                    <span className="text-sm">{m.label}</span>
                  </label>
                ))}
              </div>
              {method !== "COD" && (
                <p className="text-xs text-[var(--color-ink-soft)] mt-2">
                  Demo project — payment is simulated, no real transaction is processed.
                </p>
              )}
            </div>

            {error && <p className="text-sm text-[var(--color-signal)]">{error}</p>}

            <button
               type="submit"
               disabled={step === "processing"}
               className="btn-primary w-full py-3 rounded"
            >
              {step === "processing" ? (
                <span className="btn-loading-content">
                  <span className="spinner"></span>
                  <span>Processing...</span>
                </span>
              ) : method === "COD" ? "Place order" : "Pay & place order"}
            </button>
          </form>

        {step === "done" && (
          <div className="modal-backdrop">
            <div className="purchase-modal">
              <div className="success-icon-badge">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>

              <h3 className="modal-title">Transaction Confirmed</h3>
              <p className="modal-description">
                Your order for <strong id="purchased-item-name">{items.length === 1 ? (items[0].name ?? items[0].Name ?? "your item") : `${items.length} items`}</strong> has been processed successfully.
              </p>

              <div className="summary-card">
                <div className="summary-row">
                  <span>Status</span>
                  <span className="status-badge">Processing</span>
                </div>
                <div className="summary-row">
                  <span>Total Paid</span>
                  <strong className="summary-price">${total.toFixed(2)}</strong>
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn-primary" onClick={() => navigate("/orders")}>View Orders</button>
                <button className="btn-secondary" onClick={() => navigate("/")}>Continue Shopping</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
