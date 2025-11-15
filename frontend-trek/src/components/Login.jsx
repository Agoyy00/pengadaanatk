import "./Login.css";
import { useState } from "react";
import logo from "../gambar/LogoYarsi.jpeg";
import atk from "../gambar/LogoATK.png";


function Login({ onClose }) {
  const [ceklis, tidak] = useState(false);
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

            <form>
              <input type="email" placeholder="Email" />
              <input type="password" placeholder="Password" />
              <label className="checkbox">
                <input type="checkbox" checked={ceklis} onChange={(e) => tidak(e.target.checked)}></input>
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
