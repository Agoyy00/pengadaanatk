// src/App.jsx
import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";

import yarsi from "./gambar/yarsi.png";
import DetailVerifikasi from "./components/DetailVerifikasi";

import Login from "./components/Login";
import Navbar from "./components/Navbar";
import Import from "./components/ImportExcelBarang";

import Pengajuan from "./pages/User/Pengajuan";
import DashboardUser from "./pages/User/DashboardUser";
import Riwayat from "./pages/User/Riwayat";


import DashboardAdmin from "./pages/Admin/DashboardAdmin";
import Verifikasi from "./pages/Admin/Verifikasi";
import KelolaBarangATK from "./pages/Admin/KelolaBarangATK";
import GrafikUsulanBarang from "./pages/Admin/GrafikUsulanBarang";

import Periode from "./pages/Superadmin/Periode";
import DashboardSuperAdmin from "./pages/Superadmin/DashboardSuperAdmin";
import Approval from "./pages/Superadmin/Approval";
import TambahUser from "./pages/Superadmin/TambahUser";
import DaftarBarangATKSuperAdmin from "./pages/Superadmin/DaftarBarangATKSuperAdmin";
import GrafikBelanjaSuperAdmin from "./pages/Superadmin/GrafikBelanjaSuperAdmin";
import MonitoringAdmin from "./pages/Superadmin/MonitoringAdmin";
import MonitoringUser from "./pages/Superadmin/MonitoringUser";
import GrafikBarangSuperAdmin from "./pages/Superadmin/GrafikBarangSuperAdmin";
import StockOpname from "./pages/StockOpname";
import TemplateDokumen from "./pages/TemplateDokumen";
import Support from "./pages/Support/Support";
import SupportRouter from "./pages/Support/SupportRouter";
import OpenTicket from "./pages/Support/OpenTicket";
import TicketDetail from "./pages/Support/TicketDetail";
import UserSupport from "./pages/User/UserSupport";


// SUPER ADMIN - FITUR BARU



const API_BASE = import.meta.env.VITE_API_BASE;

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

  // ✅ Superadmin selalu diizinkan mengakses semua halaman & fitur di seluruh aplikasi!
  if (role === "superadmin") return children;

  if (allow.length > 0 && !allow.includes(role)) {
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
        const res = await fetch(`${API_BASE}/periode/active`, {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
          },
        });
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

        const formatShortDateTime = (d) => {
          if (!d || isNaN(d.getTime())) return "";
          const dateStr = d.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });
          const hours = String(d.getHours()).padStart(2, "0");
          const minutes = String(d.getMinutes()).padStart(2, "0");
          return `${dateStr}, pukul ${hours}:${minutes} WIB`;
        };

        const strMulai = formatShortDateTime(mulai);
        const strSelesai = formatShortDateTime(selesai);

        let type = "none";
        let msg = "";

        if (now < mulai) {
          type = "upcoming";
          msg = `Periode ${p.tahun_akademik} akan dibuka pada ${strMulai} dan ditutup pada ${strSelesai}.`;
        } else if (now >= mulai && now <= selesai && data.is_open) {
          type = "open";
          msg = `Periode ${p.tahun_akademik} sedang DIBUKA hingga ${strSelesai}.`;
        } else {
          type = "closed";
          msg = `Periode ${p.tahun_akademik} sudah DITUTUP pada ${strSelesai}.`;
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

  const renderFormattedToastText = (text) => {
    if (!text) return null;
    const parts = text.split(/(DIBUKA|DITUTUP|AKAN DIBUKA)/g);
    return parts.map((part, i) =>
      part === "DIBUKA" || part === "DITUTUP" || part === "AKAN DIBUKA" ? (
        <strong key={i} style={{ fontWeight: 800 }}>{part}</strong>
      ) : (
        part
      )
    );
  };

  return (
    <BrowserRouter>
      {/* TOAST DI POJOK KANAN ATAS */}
      {toastText && (
        <div className={getToastClass()}>
          <div className="periode-toast-title">
            Informasi Periode Pengajuan
          </div>
          <div className="periode-toast-text">{renderFormattedToastText(toastText)}</div>
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
                  <div className="landing-content glass floating">
                    <h1>Sistem Pengajuan ATK</h1>
                    <p>Universitas YARSI</p>
                    <span>
                      Pengajuan alat tulis kantor terintegrasi, transparan, dan efisien
                    </span>
                    <div className="landing-divider"></div>
                    <button className="landing-btn" onClick={() => setShowLogin(true)}> Login </button>
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
          path="/grafik-usulan-barang"
          element={
            <RequireAuth allowRoles={["admin"]}>
              <GrafikUsulanBarang />
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
          path="/periode"
          element={
            <RequireAuth allowRoles={["superadmin"]}>
              <Periode />
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

        <Route
          path="/superadmin/monitoring-admin"
          element={
            <RequireAuth allowRoles={["superadmin"]}>
              <MonitoringAdmin />
            </RequireAuth>
          }
        />
        <Route
          path="/superadmin/monitoring-user"
          element={
            <RequireAuth allowRoles={["superadmin"]}>
              <MonitoringUser />
            </RequireAuth>
          }
        />
        <Route
          path="/superadmin/grafik-barang"
          element={
            <RequireAuth allowRoles={["superadmin"]}>
              <GrafikBarangSuperAdmin />
            </RequireAuth>
          }
        />
        <Route
          path="/superadmin/daftar-barang"
          element={
            <RequireAuth allowRoles={["superadmin"]}>
              <DaftarBarangATKSuperAdmin />
            </RequireAuth>
          }
        />
        <Route
          path="/superadmin/grafik-belanja"
          element={
            <RequireAuth allowRoles={["superadmin"]}>
              <GrafikBelanjaSuperAdmin />
            </RequireAuth>
          }
        />

        {/* ✅ ROUTE BARU: Kelola Barang ATK */}
        <Route
          path="/kelola-barang"
          element={
            <RequireAuth allowRoles={["admin"]}>
              <KelolaBarangATK />
            </RequireAuth>
          }
        />

         <Route
          path="/dashboardsuperadmin"
          element={
            <RequireAuth allowRoles={["superadmin"]}>
              <DashboardSuperAdmin />
            </RequireAuth>
          }
        />

          <Route path="/verifikasi/:id" element={<DetailVerifikasi />} />

          {/* ✅ ROUTES BARU: Stock Opname & Template Dokumen */}
          <Route
            path="/stock-opname"
            element={
              <RequireAuth allowRoles={["user", "admin", "superadmin"]}>
                <StockOpname />
              </RequireAuth>
            }
          />
          <Route
            path="/template-dokumen"
            element={
              <RequireAuth allowRoles={["user", "admin", "superadmin"]}>
                <TemplateDokumen />
              </RequireAuth>
            }
          />

          {/* ✅ ROUTES BARU: Support Ticket */}
          <Route
            path="/support"
            element={
              <RequireAuth allowRoles={["user", "admin", "superadmin"]}>
                <SupportRouter />
              </RequireAuth>
            }
          />
          <Route
            path="/support/open-ticket"
            element={
              <RequireAuth allowRoles={["user", "admin", "superadmin"]}>
                <OpenTicket />
              </RequireAuth>
            }
          />
          <Route
            path="/support/:id"
            element={
              <RequireAuth allowRoles={["user", "admin", "superadmin"]}>
                <TicketDetail />
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
