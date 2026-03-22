import { createContext, useContext, useState } from "react";

const CartCtx = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("ec_cart") || "[]");
      // migrate old cart items that have guests as number for tours
      return saved.map((i) => {
        if (i.type === "tour" && typeof i.guests === "number") {
          const adultPrice = i.basePrice || 0;
          const childPrice = i.childPrice ?? Math.round(adultPrice / 2);
          const guests = { infants: 0, children: 0, adults: i.guests };
          return { ...i, guests, lineTotal: guests.adults * adultPrice + guests.children * childPrice };
        }
        return i;
      });
    }
    catch { return []; }
  });

  const save = (next) => {
    setItems(next);
    localStorage.setItem("ec_cart", JSON.stringify(next));
  };

  // For tours: pass { infants, children, adults } as guestData
  // For others: pass a number as guestData (guests count)
  const addItem = (product, guestData = 1, bookingDetails = null) => {
    const isTour = product.type === "tour";
    const isVehicle = product.type === "vehicle";
    const adultPrice = product.basePrice || 0;
    const childPrice = product.childPricing?.childPrice ?? Math.round(adultPrice / 2);

    const normalizeGuests = (g) => {
      if (isTour && typeof g === "object") return g;
      if (isTour) return { infants: 0, children: 0, adults: Number(g) || 1 };
      return Number(g) || 1;
    };

    const calcTotal = (g) => {
      if (isTour && typeof g === "object") {
        return (g.adults || 0) * adultPrice + (g.children || 0) * childPrice;
      }
      return (Number(g) || 1) * adultPrice;
    };

    setItems((prev) => {
      // vehicles always replace (unique by _id + serviceType)
      const vehicleKey = isVehicle ? `${product._id}_${bookingDetails?.serviceType}_${bookingDetails?.tripType || bookingDetails?.duration || ""}` : null;
      const exists = isVehicle
        ? prev.find((i) => i.vehicleKey === vehicleKey)
        : prev.find((i) => i._id === product._id);
      let next;
      if (exists && !isVehicle) {
        next = prev.map((i) => {
          if (i._id !== product._id) return i;
          if (isTour && typeof guestData === "object") {
            const merged = {
              infants: (i.guests?.infants || 0) + (guestData.infants || 0),
              children: (i.guests?.children || 0) + (guestData.children || 0),
              adults: (i.guests?.adults || 0) + (guestData.adults || 0),
            };
            return { ...i, guests: merged, lineTotal: calcTotal(merged) };
          }
          const newGuests = (i.guests || 1) + (Number(guestData) || 1);
          return { ...i, guests: newGuests, lineTotal: calcTotal(newGuests) };
        });
      } else {
        const guests = normalizeGuests(guestData);
        const newItem = {
          _id: product._id,
          title: product.title,
          type: product.type,
          image: product.media?.[0]?.url || "",
          basePrice: adultPrice,
          childPrice,
          baseCurrency: product.baseCurrency,
          guests,
          lineTotal: calcTotal(guests),
          ...(isVehicle && { vehicleKey, bookingDetails }),
        };
        next = isVehicle
          ? [...prev.filter((i) => i.vehicleKey !== vehicleKey), newItem]
          : [...prev, newItem];
      }
      localStorage.setItem("ec_cart", JSON.stringify(next));
      return next;
    });
  };

  const removeItem = (id) => save(items.filter((i) => i._id !== id));
  const clearCart = () => save([]);

  const updateTourGuests = (id, key, delta) => {
    const next = items.map((i) => {
      if (i._id !== id || i.type !== "tour") return i;
      const adultPrice = i.basePrice || 0;
      const childPrice = i.childPrice ?? Math.round(adultPrice / 2);
      const updated = { ...i.guests, [key]: Math.max(0, (i.guests[key] || 0) + delta) };
      const lineTotal = (updated.adults || 0) * adultPrice + (updated.children || 0) * childPrice;
      return { ...i, guests: updated, lineTotal };
    });
    save(next);
  };

  const total = items.reduce((s, i) => s + (i.lineTotal ?? i.basePrice * (i.guests || 1)), 0);

  return (
    <CartCtx.Provider value={{ items, addItem, updateTourGuests, removeItem, clearCart, total }}>
      {children}
    </CartCtx.Provider>
  );
}

export const useCart = () => useContext(CartCtx);
