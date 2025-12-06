import "./Login.css";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../gambar/LogoYarsi.jpeg";
import atk from "../gambar/LogoATK.png";

const API_BASE = "http://127.0.0.1:8000/api";

function Login({ onClose }) {
  const [ceklis, tidak] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // STATE UNTUK PENGUMUMAN PERIODE
  const [periodeInfo, setPeriodeInfo] = useState("");
  const [periodeType, setPeriodeType] = useState("none"); // open | upcoming | closed | none

  const navigate = useNavigate();

  // 🔹 Ambil info periode saat modal login dibuka
  useEffect(() => {
    async function loadPeriode() {
      try {
        const res = await fetch(`${API_BASE}/periode/active`);
        const data = await res.json();

        if (!data.periode) {
          setPeriodeType("none");
          setPeriodeInfo(
            data.message || "Periode pengajuan belum ditetapkan oleh admin."
          );
          return;
        }

        const p = data.periode;
        const mulai = new Date(p.mulai);
        const selesai = new Date(p.selesai);
        const now = new Date();

        if (now < mulai) {
          setPeriodeType("upcoming");
          setPeriodeInfo(
            `Periode ${p.tahun_akademik} akan dibuka pada ${mulai.toLocaleString(
              "id-ID"
            )} dan ditutup pada ${selesai.toLocaleString("id-ID")}.`
          );
        } else if (now >= mulai && now <= selesai && data.is_open) {
          setPeriodeType("open");
          setPeriodeInfo(
            `Periode ${p.tahun_akademik} sedang DIBUKA hingga ${selesai.toLocaleString(
              "id-ID"
            )}.`
          );
        } else {
          setPeriodeType("closed");
          setPeriodeInfo(
            `Periode ${p.tahun_akademik} sudah DITUTUP pada ${selesai.toLocaleString(
              "id-ID"
            )}.`
          );
        }
      } catch (err) {
        console.error("Gagal mengambil periode:", err);
        setPeriodeType("none");
        setPeriodeInfo("Gagal memuat informasi periode.");
      }
    }

    loadPeriode();
  }, []);

  // 🔹 Login handler
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

  // 🔹 Tentukan class banner berdasarkan status periode
  const getBannerClass = () => {
    if (periodeType === "open") return "periode-banner open";
    if (periodeType === "upcoming") return "periode-banner upcoming";
    if (periodeType === "closed") return "periode-banner closed";
    return "periode-banner none";
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <button className="close-btn" onClick={onClose}>
          ✖
        </button>

        <div className="login-container">
          {/* Kiri: logo */}
          <div className="left-side">
            <div className="left-top">
              <img src={logo} className="logo-atas" alt="Logo Yarsi" />
            </div>

            <div className="left-bottom">
              <img src={atk} className="logo-bawah" alt="Logo ATK" />
            </div>
          </div>

          {/* Kanan: form + info periode */}
          <div className="right-side">
            <h2>Login</h2>

            {/* 🔹 Pengumuman periode di atas form */}
            {periodeInfo && (
              <div className={getBannerClass()}>
                <div className="periode-banner-title">
                  📢 Informasi Periode Pengajuan
                </div>
                <div className="periode-banner-text">{periodeInfo}</div>
              </div>
            )}

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
