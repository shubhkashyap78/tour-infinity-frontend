const BASE = "https://tour-infinity-backend.onrender.com";

export const apiFetch = (path, options = {}) =>
  fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

// Keep Vercel container warm — ping every 4 minutes
setInterval(() => fetch(`${BASE}/`).catch(() => {}), 4 * 60 * 1000);
// Also ping immediately on load
fetch(`${BASE}/`).catch(() => {});
