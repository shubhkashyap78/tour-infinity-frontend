import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Dashboard from "./Dashboard";
import { apiFetch } from "./api";

// Decode JWT payload locally — no network call needed
const getStoredToken = () => {
  const t = localStorage.getItem("token");
  if (!t) return "";
  try {
    const payload = JSON.parse(atob(t.split(".")[1]));
    // Expired?
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem("token");
      return "";
    }
    return t;
  } catch {
    localStorage.removeItem("token");
    return "";
  }
};

function AdminApp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(() => getStoredToken());
  const [error, setError] = useState("");

  const onLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");
      localStorage.setItem("token", data.token);
      setToken(data.token);
    } catch (err) {
      setError(err.message || "Login failed");
    }
  };

  const onLogout = () => {
    localStorage.removeItem("token");
    setToken("");
  };

  if (token) return <Dashboard token={token} onLogout={onLogout} />;

  return (
    <div className="page">
      <div className="hero">
        <img src="/assests/logo.png" alt="Andaman Tour Infinity Logo" className="hero-logo" />
        <div className="brand">Andaman Tour Infinity</div>
        <div className="tag">Admin Console</div>
        <p className="lead">
          Secure access for your team to manage hotels, tours, packages, and vehicle inventory.
        </p>
      </div>
      <form className="card" onSubmit={onLogin}>
        <h1>Admin Login</h1>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label>
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        </label>
        {error ? <div className="error">{error}</div> : null}
        <button type="submit">Sign In</button>
      </form>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/*" element={<AdminApp />} />
    </Routes>
  );
}
