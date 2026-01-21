import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "../css/Login.css";

import atk from "../gambar/Logo.png";
import logo from "../gambar/LogoYarsi.jpeg";

function Login({ onClose }) {
  const [ingatSaya, setIngatSaya] = useState(false);
  const [username, setUsername] = useState(""); // 👈 Ganti email jadi username
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); // Set loading aktif saat tombol diklik

    try {
      const res = await fetch("http://127.0.0.1:8000/api/login", {
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
        alert(data.message || "Login gagal");
        setLoading(false);
        return;
      }

      // SIMPAN TOKEN & USER
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      alert("Login berhasil");

      // REDIRECT BERDASARKAN ROLE DARI BACKEND
      window.location.href =
        data.user.role === "superadmin"
          ? "/dashboardsuperadmin"
          : data.user.role === "admin"
          ? "/dashboardadmin"
          : "/dashboarduser";

    } catch (err) {
      console.error("FETCH ERROR:", err);
      alert("Terjadi kesalahan saat menghubungi server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box-small">
        <button className="close-btn-small" onClick={onClose}>✖</button>

        <div className="login-container-small">
          <div className="left-side-small">
            <img src={logo} className="logo-atas-small" alt="Logo Yarsi" />
            <img src={atk} className="logo-bawah-small" alt="Logo ATK" />
          </div>

          <div className="right-side-small">
            <h2 className="login-title">Login LDAP</h2>

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