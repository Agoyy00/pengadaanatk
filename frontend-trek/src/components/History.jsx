import React from "react";
import { useNavigate } from "react-router-dom";
import "./Pengajuan.css";

export default function Dashboard() {
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
            className="menu-item"
            onClick={() => navigate("/dashboarduser")}
            style={{ cursor: "pointer" }}
          >
            Dashboard
          </div>
          <div
            className="menu-item"
            onClick={() => navigate("/pengajuan")}
            style={{ cursor: "pointer" }}
          >
            Buat Pengajuan Baru
          </div>
          <div
            className="menu-item"
            onClick={() => navigate("/riwayat")}
            style={{ cursor: "pointer" }}
          >
            Riwayat Pengajuan
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
            <div className="topbar-title">Riwayat Pengajuan</div>
            <div className="topbar-sub">Selamat datang: Nama Kamu</div>
          </div>
          <div className="topbar-right">
            <span>Role: User</span>
            <span className="role-pill">User</span>
          </div>
        </header>

        {/* ISI DASHBOARD */}
        <section className="main-content">
          <div className="card">
            <div className="card-title">Ringkasan Pengajuan</div>
            <p>Ini adalah menu dashboard. Isi data atau statistik bisa dimasukkan di sini.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
