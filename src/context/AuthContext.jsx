import { createContext, useState, useEffect, useContext } from "react";

export const AuthContext = createContext();

// Shortcut so pages can write: const { user } = useAuth();
export const useAuth = () => useContext(AuthContext);

// Reads id, name, email and role out of the JWT. Returns null if the
// token is invalid or expired.
const userFromToken = (token) => {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const p = JSON.parse(json);
    if (p.exp && p.exp * 1000 < Date.now()) return null;
    return { token, id: p.id, name: p.name, email: p.email, role: p.role };
  } catch {
    return null;
  }
};
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const u = userFromToken(token);
      if (u) setUser(u);
      else localStorage.removeItem("token"); // bad or expired token
    }
    setLoading(false);
  }, []);

  const login = (token) => {
    localStorage.setItem("token", token);
    setUser(userFromToken(token));
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  // Don't render anything until we check localStorage
  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}