import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach token to every request
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global response error handling
// true when the saved token is missing or past its expiry time
const tokenIsDead = () => {
  const token = localStorage.getItem("token");
  if (!token) return true;
  try {
    const p = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return Boolean(p.exp && p.exp * 1000 < Date.now());
  } catch {
    return true;
  }
};

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    const msg = String(error.response?.data?.message || error.response?.data?.error || "").toLowerCase();

    if (status === 401 && !url.includes("/login")) {
      // helps you find which request caused the logout
      console.warn("[auth] 401 from", url, "-", msg || "(no message)");

      // log out only when the token is really finished, not for any 401
      const code = error.response?.data?.code;
      const tokenRejected = ["TOKEN_EXPIRED", "TOKEN_INVALID", "USER_INACTIVE"].includes(code) || /session|jwt|token|expired|signature/.test(msg);
      if (tokenIsDead() || tokenRejected) {
        localStorage.removeItem("token");
        sessionStorage.setItem("sessionExpired", "1");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;