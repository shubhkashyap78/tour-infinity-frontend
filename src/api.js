const BASE = import.meta.env.VITE_API_URL || "";

// Debug — production me console me dikhega
console.log("[api] BASE URL:", BASE || "(empty — using relative paths)");

export const apiFetch = (path, options = {}) =>
  fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
