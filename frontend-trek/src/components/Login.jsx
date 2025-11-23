import "./Login.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../gambar/LogoYarsi.jpeg";
import atk from "../gambar/LogoATK.png";

function Login({ onClose }) {
  const [ceklis, tidak] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://127.0.0.1:8000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!data.success) {
        alert(data.message || "Email atau password salah!");
        return;
      }

      // Simpan user
      localStorage.setItem("user", JSON.stringify(data.user));

      // Redirect berdasarkan role
      if (data.user.role === "admin") {
        navigate("/dashboardadmin");
      } else {
        navigate("/dashboarduser");
      }

      // tutup modal
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

        <div className="login-container">
          <div className="left-side">
            <div className="left-top">
              <img src={logo} className="logo-atas" />
            </div>

            <div className="left-bottom">
              <img src={atk} className="logo-bawah" />
            </div>
          </div>

          <div className="right-side">
            <h2>Login</h2>

            <form onSubmit={handleLogin}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={ceklis}
                  onChange={(e) => tidak(e.target.checked)}
                />
                <span>Ingat Saya</span>
              </label>

              <button type="submit">Masuk</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
