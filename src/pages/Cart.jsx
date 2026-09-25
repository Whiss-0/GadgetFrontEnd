import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import ProductArt from "../components/ProductArt";

export default function Cart() {
  const { items, loading, updateQuantity, removeItem } = useCart();
  const navigate = useNavigate();

  // Cart items are enriched in CartContext with `name`, `price` joined from products table.
  // DB fields from the cart row: cart_id, user_id, product_id, quantity
  const rawTotal = items.reduce((sum, i) => sum + (i.price ?? 0) * (i.quantity ?? 1), 0);
  // Guard against NaN / Infinity (e.g. if prices didn't load yet)
  const total = Number.isFinite(rawTotal) ? rawTotal : 0;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-12 text-[var(--color-ink-soft)]">
        Loading cart…
      </div>
    );
  }

  return (
    <div className="cart-page max-w-5xl mx-auto px-5 py-8 sm:py-12">
      <h1 className="font-[var(--font-display)] text-2xl sm:text-3xl font-semibold mb-2">Your cart</h1>
      <p className="text-[var(--color-ink-soft)] text-sm mb-8">
        Review your items before proceeding to checkout.
      </p>

      {items.length === 0 ? (
        <div className="spec-ticket rounded-xl p-8 sm:p-12 text-center border border-[var(--color-line)] bg-[var(--color-panel)] max-w-lg mx-auto">
          <p className="font-[var(--font-display)] text-xl font-semibold mb-2">Your cart is empty</p>
          <p className="text-[var(--color-ink-soft)] text-sm mb-6">
            Have a look around and find something you'll enjoy using.
          </p>
          <button
            onClick={() => navigate("/")}
            className="btn-primary px-6 py-2.5 rounded-lg text-sm font-semibold"
          >
            Continue shopping
          </button>
        </div>
      ) : (
        <div className="cart-layout">
          {/* Left column — cart items */}
          <div className="spec-ticket rounded-xl p-4 sm:p-6 border border-[var(--color-line)] bg-[var(--color-panel)]">
            <div className="space-y-0">
              {items.map((item) => {
                // cart_id is the primary key from the cart table
                const cartId   = item.cart_id;
                const name     = item.name ?? `Product #${item.product_id}`;
                const price    = item.price ?? 0;
                const quantity = item.quantity ?? 1;

                return (
                  <div key={cartId} className="cart-item">
                    {/* Thumbnail */}
                    <div className="cart-item-art">
                      <ProductArt
                        product={item}
                        alt=""
                        className="w-full h-full object-contain p-2"
                      />
                    </div>

                    {/* Info */}
                    <div className="cart-item-info">
                      <p className="font-medium text-[var(--color-ink)] leading-snug">{name}</p>
                      {item.brand && (
                        <p className="text-xs text-[var(--color-ink-soft)] mt-0.5">{item.brand}</p>
                      )}
                      <p className="font-[var(--font-mono)] text-xs text-[var(--color-ink-soft)] mt-1">
                        ${Number(price).toFixed(2)} each
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="cart-item-actions">
                      {/* Quantity stepper */}
                      <div className="quantity-stepper" role="group" aria-label="Quantity">
                        <button
                          onClick={() => updateQuantity(cartId, Math.max(1, quantity - 1))}
                          disabled={quantity <= 1}
                          aria-label="Decrease product quantity"
                          className="qty-btn"
                        >
                          −
                        </button>
                        <span
                          className="qty-display"
                          aria-live="polite"
                          aria-atomic="true"
                        >
                          {quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(cartId, quantity + 1)}
                          aria-label="Increase product quantity"
                          className="qty-btn"
                        >
                          +
                        </button>
                      </div>

                      {/* Line total + remove */}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="font-[var(--font-mono)] text-sm font-semibold">
                          ${(price * quantity).toFixed(2)}
                        </span>
                        <button
                          onClick={() => removeItem(cartId)}
                          className="text-[var(--color-signal)] text-xs hover:opacity-75 transition-opacity"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right column — order summary */}
          <aside className="cart-summary spec-ticket rounded-xl p-6 border border-[var(--color-line)] bg-[var(--color-panel)]">
            <h2 className="font-[var(--font-display)] font-semibold text-lg mb-4">
              Order summary
            </h2>

            <div className="space-y-2.5 text-sm pb-4 border-b border-[var(--color-line)]">
              <div className="flex justify-between text-[var(--color-ink-soft)]">
                <span>Subtotal ({items.reduce((sum, i) => sum + (i.quantity || 1), 0)} items)</span>
                <span className="font-[var(--font-mono)] text-[var(--color-ink)]">${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[var(--color-ink-soft)] text-xs">
                <span>Shipping</span>
                <span className="text-[var(--color-ink)]">Calculated at checkout</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 mb-6">
              <span className="font-[var(--font-display)] font-semibold text-base">Total</span>
              <span className="font-[var(--font-mono)] font-bold text-2xl text-[var(--color-gold)]">
                ${total.toFixed(2)}
              </span>
            </div>

            <button
              onClick={() => navigate("/checkout")}
              className="checkout-btn btn-primary w-full font-semibold py-3 rounded-lg mb-3 flex items-center justify-center gap-2"
            >
              Proceed to checkout
              <span aria-hidden="true">→</span>
            </button>
            <button
              onClick={() => navigate("/")}
              className="btn-secondary w-full font-semibold py-2.5 rounded-lg text-sm"
            >
              Continue shopping
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
