import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "../css/Login.css";

import logoFull from "./LogoYarsiFull.png";
import atk from "../gambar/Logo.png";

function Login({ onClose }) {
  const [ingatSaya, setIngatSaya] = useState(false);
  const [username, setUsername] = useState(""); // 👈 Ganti email jadi username
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        // 👈 Payload sekarang mengirim 'email' tapi isinya adalah username (untuk cocok dengan Controller Laravel)
        body: JSON.stringify({ email: username, password }), 
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.message || "Login gagal. Periksa username dan password Anda.");
        setLoading(false);
        return;
      }

      // SIMPAN TOKEN & USER
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setSuccessMsg("Login berhasil! Mengalihkan halaman...");

      // Redirect setelah jeda agar notifikasi sukses terbaca
      setTimeout(() => {
        window.location.href =
          data.user.role === "superadmin"
            ? "/dashboardsuperadmin"
            : data.user.role === "admin"
            ? "/dashboardadmin"
            : "/dashboarduser";
      }, 1200);

    } catch (err) {
      console.error("FETCH ERROR:", err);
      setErrorMsg("Terjadi kesalahan saat menghubungi server.");
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box-small">
        <button className="close-btn-small" onClick={onClose}>✖</button>

        <div className="login-container-small">
          <div className="left-side-small">
            <div className="login-left-header">
              <img src={logoFull} className="logo-atas-small" alt="Logo Universitas YARSI" />
            </div>

            <div className="login-left-illustration">
              <img src={atk} className="logo-bawah-small" alt="Ilustrasi Pengadaan ATK" />
            </div>
          </div>

          <div className="right-side-small">
            <h2 className="login-title">Login</h2>
            
            {/* Tambahkan teks informasi di sini */}
            <p style={{
              textAlign: 'center',
              fontSize: '13px',
              color: '#64748b', // Warna slate grey yang elegan
              marginTop: '6px', 
              marginBottom: '32px',
              lineHeight: '1.5',
              fontWeight: '400'
            }}>
              Silakan login menggunakan akun YARSI yang <br /> 
              <span style={{ color: '#005826', fontWeight: '600' }}>Sudah Terdaftar</span>
            </p>

            {errorMsg && (
              <div style={{
                background: "#fee2e2",
                color: "#ef4444",
                border: "1px solid #fecaca",
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "600",
                marginBottom: "16px",
                textAlign: "center"
              }}>
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div style={{
                background: "#dcfce7",
                color: "#16a34a",
                border: "1px solid #bbf7d0",
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "600",
                marginBottom: "16px",
                textAlign: "center"
              }}>
                {successMsg}
              </div>
            )}

            <form onSubmit={handleLogin} className="login-form-small">
              {/* USERNAME (Bukan Email) */}
              <div className="input-group">
                <label>Username</label>
                <input
                  type="text" // 👈 Ganti type email ke text
                  placeholder="Masukkan username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              {/* PASSWORD */}
              <div className="input-group">
                <label>Password</label>
                <div className="password-wrapper-small">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="show-password-btn-small"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEye /> : <FaEyeSlash />}
                  </button>
                </div>
              </div>

              {/* INGAT SAYA */}
              <label className="checkbox-small">
                <input
                  type="checkbox"
                  checked={ingatSaya}
                  onChange={(e) => setIngatSaya(e.target.checked)}
                />
                <span>Ingat Saya</span>
              </label>

              {/* SUBMIT */}
              <button
                type="submit"
                className="submit-btn-small"
                disabled={loading}
              >
                {loading ? "Memproses..." : "Masuk"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;