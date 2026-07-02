import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaFileInvoiceDollar, FaSignInAlt } from "react-icons/fa";
import useAuth from "../hooks/useAuth";
import { getErrorMessage } from "../utils/errorHandler";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Login failed');
        return;
      }

      login(data.token);
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: "#f1f5f9" }}>
      <div className="card shadow p-4" style={{ width: "100%", maxWidth: "420px" }}>
        <div className="text-center mb-4">
          <FaFileInvoiceDollar size={36} color="#f97316" />
          <h4 className="fw-bold mt-2">InvoicePro</h4>
          <p className="text-muted">Sign in to your account</p>
        </div>

        {error && <div className="alert alert-danger py-2">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <button
            type="submit"
            className="btn w-100 text-white fw-semibold d-flex align-items-center justify-content-center gap-2"
            style={{ backgroundColor: "#f97316" }}
            disabled={loading}
          >
            <FaSignInAlt /> {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}