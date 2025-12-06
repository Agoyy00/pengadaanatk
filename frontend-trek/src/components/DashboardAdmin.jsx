import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Pengajuan.css";

const API_BASE = "http://127.0.0.1:8000/api";

export default function DashboardAdmin() {
  const navigate = useNavigate();

  const [statusText, setStatusText] = useState("");
  const [statusType, setStatusType] = useState("none"); // 'open' | 'upcoming' | 'none'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStatus() {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/periode/active`);
        const data = await res.json();

        // Tidak ada periode sama sekali (sudah lewat semua / belum diatur)
        if (!data.periode) {
          setStatusType("none");
          setStatusText(
            data.message ||
              "Saat ini tidak ada periode pengajuan aktif maupun yang akan datang."
          );
          return;
        }

        // Ada periode:
        // - kalau is_open = true → SEDANG dibuka
        // - kalau is_open = false tapi periode belum lewat → AKAN dibuka
        if (data.is_open) {
          setStatusType("open");
        } else {
          setStatusType("upcoming");
        }

        // Teks langsung pakai message dari backend (sudah rapi pakai timezone Asia/Jakarta)
        setStatusText(
          data.message ||
            "Informasi periode pengajuan tidak tersedia."
        );
      } catch (err) {
        console.error("Gagal memuat status periode:", err);
        setStatusType("none");
        setStatusText("Gagal memuat status periode.");
      } finally {
        setLoading(false);
      }
    }

    loadStatus();
  }, []);

  const getStatusClass = () => {
    if (statusType === "open") return "periode-status periode-open";
    if (statusType === "upcoming") return "periode-status periode-upcoming";
    return "periode-status periode-none";
  };

  return (
    <div className="layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-logo">Sistem Pengajuan ATK</div>
          <div className="sidebar-subtitle">Universitas Yarsi</div>
        </div>

        <nav className="sidebar-menu">
          <div className="menu-item disabled" style={{ cursor: "default" }}>
            Dashboard
          </div>
          <div
            className="menu-item"
            onClick={() => navigate("/verifikasi")}
            style={{ cursor: "pointer" }}
          >
            Verifikasi
          </div>
          <div
            className="menu-item"
            onClick={() => navigate("/periode")}
            style={{ cursor: "pointer" }}
          >
            Atur Periode
          </div>
        </nav>

        <div
          className="logout"
          onClick={() => (window.location.href = "/")}
          style={{ cursor: "pointer" }}
        >
          Log Out
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main">
        {/* TOPBAR */}
        <header className="topbar">
          <div>
            <div className="topbar-title">Dashboard Admin</div>
            <div className="topbar-sub">Selamat datang: Admin</div>
          </div>
          <div className="topbar-right">
            <span>Role: Admin</span>
            <span className="role-pill">Admin</span>
          </div>
        </header>

        {/* ISI DASHBOARD */}
        <section className="main-content">
          <div className="card">
            <div className="card-title">Status Periode Pengajuan</div>

            {loading ? (
              <p>Sedang memuat status periode...</p>
            ) : (
              <div className={getStatusClass()}>{statusText}</div>
            )}

            <hr style={{ margin: "20px 0" }} />

            <div className="card-title">Ringkasan Pengajuan</div>
            <p>
              Ini adalah menu Dashboard. Nanti kamu bisa tambahkan statistik
              jumlah pengajuan, grafik, dan lain-lain di sini.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
