
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// NEW
const API = import.meta.env.VITE_API_URL;
const originalFetch = window.fetch;
window.fetch = async (input, init = {}) => {
  const url = typeof input === "string" ? input : input.url;
  if (url.startsWith(API)) {
    const token = localStorage.getItem("token");
    init = {
      ...init,
      headers: { ...(init.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    };
  }
  const res = await originalFetch(input, init);
  if (res.status === 401 && !url.includes("/auth/login")) {
    localStorage.removeItem("token");
    window.location.href = "/login";
  }
  return res;
};
