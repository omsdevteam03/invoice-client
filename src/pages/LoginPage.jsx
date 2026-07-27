import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaFileInvoiceDollar, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaArrowRight } from "react-icons/fa";
import useAuth from "../hooks/useAuth";
import { getErrorMessage } from "../utils/errorHandler";

const styles = `
.lp-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
  overflow: hidden;
  background: radial-gradient(circle at 15% 20%, #E6F1EC 0%, transparent 45%),
              radial-gradient(circle at 85% 15%, #BFDED2 0%, transparent 40%),
              radial-gradient(circle at 50% 100%, #d7ebe3 0%, transparent 50%),
              #f4faf7;
}
.lp-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.5;
  pointer-events: none;
}
.lp-card {
  position: relative;
  width: 100%;
  max-width: 400px;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.6);
  border-radius: 24px;
  box-shadow: 0 24px 60px -12px rgba(19,74,62,0.25);
  padding: 40px 36px 36px;
}
.lp-badge {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  background: linear-gradient(135deg,#1F6F5C,#134A3E);
  box-shadow: 0 10px 24px rgba(31,111,92,0.35);
}
.lp-title {
  text-align: center;
  font-weight: 800;
  font-size: 1.5rem;
  color: #0f172a;
  letter-spacing: -0.01em;
  margin-bottom: 4px;
}
.lp-subtitle {
  text-align: center;
  color: #64748b;
  font-size: 0.88rem;
  margin-bottom: 28px;
}
.lp-field {
  margin-bottom: 16px;
}
.lp-label {
  display: block;
  font-size: 0.78rem;
  font-weight: 700;
  color: #134A3E;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
}
.lp-input-group {
  position: relative;
  display: flex;
  align-items: center;
}
.lp-input-icon {
  position: absolute;
  left: 14px;
  color: #6FA894;
  pointer-events: none;
}
.lp-input {
  width: 100%;
  border: 1.5px solid #dbe9e3;
  background: #fbfefc;
  border-radius: 12px;
  padding: 12px 14px 12px 40px;
  font-size: 0.92rem;
  color: #0f172a;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}
.lp-input::placeholder { color: #a9c2ba; }
.lp-input:focus {
  border-color: #1F6F5C;
  background: #fff;
  box-shadow: 0 0 0 4px rgba(31,111,92,0.12);
}
.lp-toggle-eye {
  position: absolute;
  right: 14px;
  background: none;
  border: none;
  color: #6FA894;
  cursor: pointer;
  display: flex;
  padding: 0;
}
.lp-forgot {
  text-align: right;
  margin: -6px 0 20px;
}
.lp-forgot a {
  font-size: 0.8rem;
  font-weight: 600;
  color: #1F6F5C;
  text-decoration: none;
}
.lp-forgot a:hover { text-decoration: underline; }
.lp-submit {
  width: 100%;
  border: none;
  border-radius: 12px;
  padding: 13px;
  font-size: 0.95rem;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg,#1F6F5C,#134A3E);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: 0 12px 24px rgba(31,111,92,0.32);
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
}
.lp-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 14px 28px rgba(31,111,92,0.4); }
.lp-submit:active:not(:disabled) { transform: translateY(0); }
.lp-submit:disabled { opacity: 0.7; cursor: not-allowed; }
.lp-error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  font-size: 0.82rem;
  font-weight: 600;
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 18px;
  text-align: center;
}
.lp-footer {
  text-align: center;
  color: #94a3b8;
  font-size: 0.76rem;
  margin-top: 22px;
}
`;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: 'POST',
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
    <div className="lp-wrap">
      <style>{styles}</style>

      <div className="lp-blob" style={{ width: 260, height: 260, top: -60, left: -60, background: "#1F6F5C" }} />
      <div className="lp-blob" style={{ width: 220, height: 220, bottom: -70, right: -50, background: "#6FA894" }} />

      <div className="lp-card">
        <div className="lp-badge">
          <FaFileInvoiceDollar size={22} color="#fff" />
        </div>
        <div className="lp-title">InvoicePro</div>
        <div className="lp-subtitle">Sign in to your account</div>

        {error && <div className="lp-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="lp-field">
            <label className="lp-label">Email</label>
            <div className="lp-input-group">
              <FaEnvelope className="lp-input-icon" size={14} />
              <input
                type="email"
                className="lp-input"
                placeholder="admin@test.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="lp-field">
            <label className="lp-label">Password</label>
            <div className="lp-input-group">
              <FaLock className="lp-input-icon" size={14} />
              <input
                type={showPassword ? "text" : "password"}
                className="lp-input"
                placeholder="••••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button
                type="button"
                className="lp-toggle-eye"
                onClick={() => setShowPassword(s => !s)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
              </button>
            </div>
          </div>

          <div className="lp-forgot">
            <a href="#">Forgot password?</a>
          </div>

          <button type="submit" className="lp-submit" disabled={loading}>
            {loading ? "Signing in..." : "Login"} {!loading && <FaArrowRight size={13} />}
          </button>
        </form>

        <div className="lp-footer">Manage invoices, quotations &amp; payments in one place.</div>
      </div>
    </div>
  );
}