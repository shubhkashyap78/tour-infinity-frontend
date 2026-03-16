import { createContext, useContext, useState } from "react";

const CartCtx = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ec_cart") || "[]"); }
    catch { return []; }
  });

  const save = (next) => {
    setItems(next);
    localStorage.setItem("ec_cart", JSON.stringify(next));
  };

  const addItem = (product, guests = 1) => {
    setItems((prev) => {
      const exists = prev.find((i) => i._id === product._id);
      const next = exists
        ? prev.map((i) => i._id === product._id ? { ...i, guests: i.guests + guests } : i)
        : [...prev, { _id: product._id, title: product.title, type: product.type, image: product.media?.[0]?.url || "", basePrice: product.basePrice, baseCurrency: product.baseCurrency, guests }];
      localStorage.setItem("ec_cart", JSON.stringify(next));
      return next;
    });
  };

  const removeItem = (id) => save(items.filter((i) => i._id !== id));
  const clearCart = () => save([]);
  const total = items.reduce((s, i) => s + i.basePrice * i.guests, 0);

  return (
    <CartCtx.Provider value={{ items, addItem, removeItem, clearCart, total }}>
      {children}
    </CartCtx.Provider>
  );
}

export const useCart = () => useContext(CartCtx);
