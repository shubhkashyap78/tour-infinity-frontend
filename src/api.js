const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

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
