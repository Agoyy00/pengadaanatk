// src/App.jsx
import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";

import yarsi from "./gambar/yarsi.png";

import Login from "./components/Login";
import Navbar from "./components/Navbar";

import DashboardAdmin from "./components/DashboardAdmin";
import DashboardUser from "./components/DashboardUser";
import Pengajuan from "./components/Pengajuan";
import Periode from "./components/Periode";
import Verifikasi from "./components/Verifikasi";

import Approval from "./components/Approval";
import Riwayat from "./components/Riwayat";
import TambahUser from "./components/TambahUser";

// ✅ HALAMAN BARU
import KelolaBarangATK from "./components/KelolaBarangATK"; // ✅ ROUTE BARU
import KelolaHargaATK from "./components/KelolaHargaATK";

const API_BASE = "http://127.0.0.1:8000/api";

// ✅ Normalisasi role: "Super Admin" / "super_admin" -> "superadmin"
const normalizeRole = (role) =>
  String(role || "")
    .toLowerCase()
    .replace(/[\s_]+/g, "");

function RequireAuth({ children, allowRoles = [] }) {
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  if (!user) return <Navigate to="/" replace />;

  const role = normalizeRole(user.role);
  const allow = allowRoles.map(normalizeRole);

  if (allow.length > 0 && !allow.includes(role)) {
    // kalau role tidak sesuai, lempar ke dashboard masing-masing
    if (role === "superadmin") return <Navigate to="/approval" replace />;
    if (role === "admin") return <Navigate to="/dashboardadmin" replace />;
    return <Navigate to="/dashboarduser" replace />;
  }

  return children;
}

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

        setPeriodeType(type);
        setPeriodeInfo(msg);

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

  return (
    <BrowserRouter>
      {/* 🔔 TOAST DI POJOK KANAN ATAS */}
      {toastText && (
        <div className={getToastClass()}>
          <div className="periode-toast-title">
            📢 Informasi Periode Pengajuan
          </div>
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
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  height: "100vh",
                }}
              ></div>

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

        {/* =========================
            USER ROUTES
        ========================= */}
        <Route
          path="/dashboarduser"
          element={
            <RequireAuth allowRoles={["user"]}>
              <DashboardUser />
            </RequireAuth>
          }
        />
        <Route
          path="/pengajuan"
          element={
            <RequireAuth allowRoles={["user"]}>
              <Pengajuan />
            </RequireAuth>
          }
        />
        <Route
          path="/riwayat"
          element={
            <RequireAuth allowRoles={["user"]}>
              <Riwayat />
            </RequireAuth>
          }
        />

        {/* =========================
            ADMIN ROUTES
        ========================= */}
        <Route
          path="/dashboardadmin"
          element={
            <RequireAuth allowRoles={["admin"]}>
              <DashboardAdmin />
            </RequireAuth>
          }
        />
        <Route
          path="/verifikasi"
          element={
            <RequireAuth allowRoles={["admin"]}>
              <Verifikasi />
            </RequireAuth>
          }
        />
        <Route
          path="/periode"
          element={
            <RequireAuth allowRoles={["admin", "superadmin"]}>
              <Periode />
            </RequireAuth>
          }
        />

        {/* =========================
            SUPER ADMIN ROUTES
        ========================= */}
        <Route
          path="/approval"
          element={
            <RequireAuth allowRoles={["superadmin"]}>
              <Approval />
            </RequireAuth>
          }
        />
        <Route
          path="/tambahuser"
          element={
            <RequireAuth allowRoles={["superadmin"]}>
              <TambahUser />
            </RequireAuth>
          }
        />

        {/* =========================
            FITUR BARU
        ========================= */}
        <Route
          path="/kelola-harga"
          element={
            <RequireAuth allowRoles={["admin", "superadmin"]}>
              <KelolaHargaATK />
            </RequireAuth>
          }
        />

        {/* ✅ ROUTE BARU: Kelola Barang ATK */}
        <Route
          path="/kelola-barang"
          element={
            <RequireAuth allowRoles={["admin", "superadmin"]}>
              <KelolaBarangATK />
            </RequireAuth>
          }
        />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
