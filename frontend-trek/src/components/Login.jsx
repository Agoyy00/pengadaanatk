import "./Login.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import logo from "../gambar/LogoYarsi.jpeg";
import atk from "../gambar/LogoATK.png";

const API_BASE = "http://127.0.0.1:8000/api";

function Login({ onClose }) {
  const [ceklis, tidak] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // 👈 STATE SHOW/HIDE PASSWORD

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

      const user = data.user;

      // Simpan user ke localStorage
      localStorage.setItem("user", JSON.stringify(user));

      // 🔥 Arahkan sesuai role
      if (user.role === "superadmin") {
        navigate("/approval");        // halaman superadmin
      } else if (user.role === "admin") {
        navigate("/dashboardadmin");  // halaman admin
      } else {
        navigate("/dashboarduser");   // halaman user
      }

      if (onClose) onClose();

    } catch (error) {
      console.error("Login error:", error);
      alert("Terjadi kesalahan saat menghubungi server!");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <button className="close-btn" onClick={onClose}>
          ✖
        </button>

        {/* Tombol Close */}
        <button className="close-btn-small" onClick={onClose}>✖</button>

        <div className="login-container-small">

          {/* KIRI — LOGO */}
          <div className="left-side-small">
            <img src={logo} className="logo-atas-small" alt="Logo Yarsi" />
            <img src={atk} className="logo-bawah-small" alt="Logo ATK" />
          </div>

          {/* KANAN — FORM LOGIN */}
          <div className="right-side-small">

            <h2 className="login-title">Login</h2>
            <form onSubmit={handleLogin} className="login-form-small">

              {/* Email */}
              <label className="input-label">Email</label>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              {/* Password */}
              <label className="input-label">Password</label>
              <div className="password-wrapper-small">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <button
                  type="button"
                  className="show-password-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEye /> : <FaEyeSlash />}
                </button>
              </div>

              {/* Ingat Saya */}
              <label className="checkbox-small">
                <input
                  type="checkbox"
                  checked={ceklis}
                  onChange={(e) => tidak(e.target.checked)}
                />
                <span>Ingat Saya</span>
              </label>

              {/* Tombol Login */}
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
