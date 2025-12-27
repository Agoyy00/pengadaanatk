import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "../css/Login.css";

import atk from "../gambar/Logo.png";
import logo from "../gambar/LogoYarsi.jpeg";

const API_BASE = "http://127.0.0.1:8000/api";

function Login({ onClose }) {
  const [ceklis, tidak] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  // 🔹 Login handler
  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!data.success) {
        alert(data.message || "Email atau password salah!");
        return;
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      
      if (data.user.role === "superadmin") {
        navigate("/dashboardsuperadmin");
      } else if (data.user.role === "admin") {
        navigate("/dashboardadmin");
      } else {
        navigate("/dashboarduser");
      }


      if (onClose) onClose();
    } catch (error) {
      console.error("Login error:", error);
      alert("Terjadi kesalahan saat menghubungi server!");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box-small">
        <button className="close-btn-small" onClick={onClose} aria-label="Tutup login">
          ✖
        </button>

        <div className="login-container-small">
          <div className="left-side-small">
            <img src={logo} className="logo-atas-small" alt="Logo Yarsi" />
            <img src={atk} className="logo-bawah-small" alt="Logo ATK" />
          </div>

          <div className="right-side-small">
            <h2 className="login-title">Login</h2>
            <form onSubmit={handleLogin} className="login-form-small">

              {/* INPUT EMAIL */}
              <div className="input-group">
                <label className="input-label">Email</label>
                <input
                  type="email"
                  placeholder="Masukkan email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* INPUT PASSWORD */}
              <div className="input-group">
                <label className="input-label">Password</label>
                <div className="password-wrapper-small">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />

                  {/* Show/hide password */}
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
                  checked={ceklis}
                  onChange={(e) => tidak(e.target.checked)}
                />
                <span>Ingat Saya</span>
              </label>

              {/* TOMBOL LOGIN */}
              <button type="submit" className="submit-btn-small">
                Masuk
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Login;