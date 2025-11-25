import React from "react";
import { useNavigate } from "react-router-dom";
import "./Pengajuan.css";

export default function DashboardAdmin() {
  const navigate = useNavigate();

  return (
    <div className="layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-logo">Sistem Pengajuan ATK</div>
          <div className="sidebar-subtitle">Universitas Yarsi</div>
        </div>

        <nav className="sidebar-menu">
          <div
            className="menu-item disabled"
            style={{ cursor: "default" }}
          >
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
            <div className="card-title">Ringkasan Pengajuan</div>
            <p>Ini adalah menu Dashboard. Isi data atau statistik bisa dimasukkan di sini.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
