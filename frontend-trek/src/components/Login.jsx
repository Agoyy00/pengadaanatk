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

  const handleLogin = (e) => {
    e.preventDefault();
    if (email === "admin@yarsi.ac.id" && password === "admin123") {
      navigate("/pengajuan");
    } else {
      alert("Email atau password salah!");
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
