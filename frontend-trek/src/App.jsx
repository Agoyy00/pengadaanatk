import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import "./App.css";

import yarsi from "./gambar/yarsi.png";

import Navbar from "./components/Navbar";
import Login from "./components/Login";
import Pengajuan from "./components/Pengajuan";
import DashboardUser from "./components/DashboardUser";
import DashboardAdmin from "./components/DashboardAdmin";
import Verifikasi from "./components/Verifikasi";
import Periode from "./components/Periode";
import Approval from "./components/Approval";
import Grafik from "./components/Grafik";
import TambahUser from "./components/TambahUser";
import Riwayat from "./components/Riwayat";

const API_BASE = "http://127.0.0.1:8000/api";

function App() {
  const [showLogin, setShowLogin] = useState(false);

  // 👉 Informasi periode untuk login (tidak auto-hide)
  const [periodeInfo, setPeriodeInfo] = useState("");
  const [periodeType, setPeriodeType] = useState("none");

  // 👉 Toast di pojok kanan (auto-hide)
  const [toastText, setToastText] = useState("");
  const [toastType, setToastType] = useState("none");

  // ===================================================
  // 🔹 Ambil informasi periode dari backend
  // ===================================================
  useEffect(() => {
    async function loadPeriode() {
      try {
        const res = await fetch(`${API_BASE}/periode/active`);
        const data = await res.json();

        if (!data.periode) {
          const msg =
            data.message || "Periode pengajuan belum ditetapkan oleh admin.";

          setPeriodeType("none");
          setPeriodeInfo(msg);

          setToastType("none");
          setToastText(msg);

          return;
        }

        const p = data.periode;
        const mulai = new Date(p.mulai);
        const selesai = new Date(p.selesai);
        const now = new Date();

        let type = "none";
        let msg = "";

        if (now < mulai) {
          type = "upcoming";
          msg = `Periode ${p.tahun_akademik} akan dibuka pada ${mulai.toLocaleString(
            "id-ID"
          )} dan ditutup pada ${selesai.toLocaleString("id-ID")}.`;

        } else if (now >= mulai && now <= selesai && data.is_open) {
          type = "open";
          msg = `Periode ${p.tahun_akademik} sedang DIBUKA hingga ${selesai.toLocaleString(
            "id-ID"
          )}.`;

        } else {
          type = "closed";
          msg = `Periode ${p.tahun_akademik} sudah DITUTUP pada ${selesai.toLocaleString(
            "id-ID"
          )}.`;
        }

        // 👉 Untuk popup login
        setPeriodeType(type);
        setPeriodeInfo(msg);

        // 👉 Untuk toast pojok kanan
        setToastType(type);
        setToastText(msg);
      } catch (err) {
        console.error("Gagal mengambil periode:", err);

        const msg = "Gagal memuat informasi periode.";
        setPeriodeType("none");
        setPeriodeInfo(msg);

        setToastType("none");
        setToastText(msg);
      }
    }

    loadPeriode();
  }, []);

  // ===================================================
  // 🔹 Toast Auto-hide (5 detik)
  // ===================================================
  useEffect(() => {
    if (!toastText) return;

    const timer = setTimeout(() => {
      setToastText("");
    }, 5000);

    return () => clearTimeout(timer);
  }, [toastText]);

  const getToastClass = () => {
    if (toastType === "open") return "periode-toast open";
    if (toastType === "upcoming") return "periode-toast upcoming";
    if (toastType === "closed") return "periode-toast closed";
    return "periode-toast none";
  };

  // ===================================================
  // 🔹 Render
  // ===================================================
  return (
    <BrowserRouter>
      {/* 🔔 TOAST DI POJOK KANAN ATAS */}
      {toastText && (
        <div className={getToastClass()}>
          <div className="periode-toast-title">📢 Informasi Periode Pengajuan</div>
          <div className="periode-toast-text">{toastText}</div>
        </div>
      )}

      <Routes>
        {/* LANDING PAGE */}
        <Route
          path="/"
          element={
            <>
              <Navbar onLoginClick={() => setShowLogin(true)} />

              <div
                className="landing"
                style={{
                  backgroundImage: `url(${yarsi})`,
                }}
              >
                <div className="landing-overlay">
                  <div className="landing-content">
                    <h1>Sistem Pengajuan ATK</h1>
                    <p>Universitas YARSI</p>
                    <span>
                      Pengajuan alat tulis kantor terintegrasi, transparan, dan efisien
                    </span>
                  </div>
                </div>
              </div>
              {showLogin && (
                <Login
                  onClose={() => setShowLogin(false)}
                  periodeInfo={periodeInfo}
                  periodeType={periodeType}
                />
              )}
            </>
          }
        />

        {/* USER ROUTES */}
        <Route path="/pengajuan" element={<Pengajuan />} />
        <Route path="/dashboarduser" element={<DashboardUser />} />
        <Route path="/riwayat" element={<Riwayat />} />

        {/* ADMIN ROUTES */}
        <Route path="/dashboardadmin" element={<DashboardAdmin />} />
        <Route path="/verifikasi" element={<Verifikasi />} />
        <Route path="/periode" element={<Periode />} />

        {/* SUPER ADMIN ROUTES */}
        <Route path="/approval" element={<Approval />} />
        <Route path="/grafik" element={<Grafik />} />
        <Route path="/tambahuser" element={<TambahUser />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
