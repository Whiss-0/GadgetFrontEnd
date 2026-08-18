import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { cartApi } from "../api/client";
import { useState } from "react";

export default function Cart() {
  const { items, loading, updateQuantity, removeItem, refresh } = useCart();
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
    <div className="max-w-2xl mx-auto px-5 py-12">
      <p className="font-[var(--font-mono)] text-xs text-[var(--color-circuit)] mb-1">
        RECEIPT — CART-{new Date().getFullYear()}
      </p>
      <h1 className="font-[var(--font-display)] text-3xl font-semibold mb-8">Your cart</h1>

      {items.length === 0 ? (
        <p className="text-[var(--color-ink-soft)]">Your cart is empty. Go add something from the catalog.</p>
      ) : (
        <div className="spec-ticket rounded-md p-6">
          <div className="space-y-4 pb-10">
            {items.map((item) => {
              // cart_id is the primary key from the cart table
              const cartId   = item.cart_id;
              const name     = item.name ?? `Product #${item.product_id}`;
              const price    = item.price ?? 0;
              const quantity = item.quantity ?? 1;

              return (
                <div
                  key={cartId}
                  className="flex items-center justify-between border-b border-dashed border-[var(--color-line)] pb-4"
                >
                  <div>
                    <p className="font-medium">{name}</p>
                    {item.brand && (
                      <p className="text-xs text-[var(--color-ink-soft)]/70">{item.brand}</p>
                    )}
                    <p className="font-[var(--font-mono)] text-xs text-[var(--color-ink-soft)]">
                      ${Number(price).toFixed(2)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) =>
                        updateQuantity(cartId, Math.max(1, Number(e.target.value)))
                      }
                      className="w-14 border border-[var(--color-line)] rounded px-2 py-1 text-center text-sm"
                    />
                    <span className="font-[var(--font-mono)] text-sm w-16 text-right">
                      ${(price * quantity).toFixed(2)}
                    </span>
                    <button
                      onClick={() => removeItem(cartId)}
                      className="text-alert text-xs"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="font-[var(--font-display)] font-semibold text-lg">Total</span>
            <span className="font-[var(--font-mono)] font-semibold text-xl text-[var(--color-gold)]">
              ${total.toFixed(2)}
            </span>
          </div>

          <button
            onClick={() => navigate("/checkout")}
            className="mt-6 w-full checkout-btn btn-primary font-semibold py-3 rounded"
          >
            Proceed to checkout
          </button>
        </div>
      )}
    </div>
  );
}
