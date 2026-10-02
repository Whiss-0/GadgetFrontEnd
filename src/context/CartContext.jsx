import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { cartApi, productsApi } from "../api/client";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(isAuthenticated);
  const [loadError, setLoadError] = useState("");

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      setLoadError("");
      setLoading(false);
      return true;
    }

    setLoading(true);
    setLoadError("");
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
      setLoadError("We couldn’t load your cart. Check your connection and try again.");
      return false;
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
    <CartContext.Provider value={{ items, loading, loadError, addItem, updateQuantity, removeItem, refresh }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
