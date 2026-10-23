import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { cartApi, productsApi } from "../api/client";
import { useAuth } from "./AuthContext";
import {
  getGuestCart,
  addToGuestCart,
  removeFromGuestCart,
  clearGuestCart,
  guestCartCount,
} from "../hooks/useGuestCart";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(isAuthenticated);
  const [loadError, setLoadError] = useState("");
  // Guest items that failed to merge after sign-in (so the user can retry).
  const [mergeErrors, setMergeErrors] = useState([]);
  // Reactive guest cart count so the navbar badge updates without a full reload.
  const [guestCount, setGuestCount] = useState(() => guestCartCount());
  const mergePromiseRef = useRef(null);

  /**
   * Save to the guest cart (unauthenticated path).
   * Updates the reactive guest count so the navbar badge updates immediately.
   */
  const addGuestItem = useCallback((productId, quantity = 1) => {
    addToGuestCart(productId, quantity);
    setGuestCount(guestCartCount());
  }, []);

  /**
   * After sign-in, add each saved guest item to the authenticated cart.
   * Items are removed from guest storage only after the API confirms the add.
   * Items that fail are kept in guest storage and surfaced via mergeErrors so
   * the user can retry by refreshing the cart page.
   */
  const mergeGuestCart = useCallback(async () => {
    if (mergePromiseRef.current) {
      return mergePromiseRef.current;
    }

    const run = async () => {
      const guest = getGuestCart();
      if (guest.length === 0) {
        setMergeErrors([]);
        return;
      }

      const failed = [];
      for (const { productId, quantity } of guest) {
        try {
          await cartApi.add({ Product_ID: productId, Quantity: quantity });
          removeFromGuestCart(productId);
          setGuestCount(guestCartCount());
        } catch {
          failed.push({ productId, quantity });
        }
      }

      setMergeErrors(failed);
      if (failed.length === 0) {
        clearGuestCart();
        setGuestCount(0);
      }
    };

    mergePromiseRef.current = run().finally(() => {
      mergePromiseRef.current = null;
    });

    return mergePromiseRef.current;
  }, []);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      setLoadError("");
      setLoading(false);
      setGuestCount(guestCartCount());
      return true;
    }

    setLoading(true);
    setLoadError("");

    // If there are saved guest items, merge them first
    if (getGuestCart().length > 0) {
      await mergeGuestCart();
    }

    try {
      // Fetch raw cart rows and all products, then join so cart items have
      // name + price (the Cart DB model only stores product_id, not product details).
      const [cartRes, productsRes] = await Promise.all([
        cartApi.list(),
        productsApi.list(),
      ]);
      const rawCart = Array.isArray(cartRes.data) ? cartRes.data : [];
      const products = Array.isArray(productsRes.data) ? productsRes.data : [];
      const productMap = Object.fromEntries(products.map((product) => [product.product_id, product]));
      const enriched = rawCart.map((item) => {
        const product = productMap[item.product_id] ?? {};
        return {
          ...item,
          name: product.product_name ?? `Product #${item.product_id}`,
          price: product.price ?? 0,
          image: product.image ?? null,
          brand: product.brand ?? null,
        };
      });
      setItems(enriched);
      return true;
    } catch {
      // Keep the last known cart instead of making a network failure look empty.
      setLoadError("We couldn't load your cart. Check your connection and try again.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, mergeGuestCart]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = useCallback(async (productId, quantity = 1) => {
    await cartApi.add({ Product_ID: productId, Quantity: quantity });
    await refresh();
  }, [refresh]);

  const updateQuantity = useCallback(async (cartId, quantity) => {
    await cartApi.updateQuantity(cartId, quantity);
    await refresh();
  }, [refresh]);

  const removeItem = useCallback(async (cartId) => {
    await cartApi.remove(cartId);
    await refresh();
  }, [refresh]);

  // Total count visible in the navbar: account-cart items + (unauthenticated) guest items.
  const totalCount = isAuthenticated
    ? items.reduce((sum, item) => sum + (item.quantity || 1), 0)
    : guestCount;

  return (
    <CartContext.Provider
      value={{
        items,
        loading,
        loadError,
        mergeErrors,
        totalCount,
        addItem,
        addGuestItem,
        mergeGuestCart,
        updateQuantity,
        removeItem,
        refresh,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
