import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { cartApi, productsApi } from "../api/client";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      // Fetch raw cart rows and all products, then join so cart items have
      // name + price (the Cart DB model only stores product_id, not the product details).
      const [cartRes, productsRes] = await Promise.all([
        cartApi.list(),
        productsApi.list(),
      ]);

      const rawCart = cartRes.data || [];
      const products = productsRes.data || [];

      // Build a map keyed by product_id for O(1) lookup
      const productMap = {};
      for (const p of products) {
        productMap[p.product_id] = p;
      }

      // Enrich each cart row with product details
      const enriched = rawCart.map((item) => {
        const prod = productMap[item.product_id] ?? {};
        return {
          ...item,
          // normalised accessors used by the UI
          name: prod.product_name ?? `Product #${item.product_id}`,
          price: prod.price ?? 0,
          image: prod.image ?? null,
          brand: prod.brand ?? null,
        };
      });

      setItems(enriched);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

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

  return (
    <CartContext.Provider value={{ items, loading, addItem, updateQuantity, removeItem, refresh }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
