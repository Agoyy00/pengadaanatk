// src/components/Approval.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import "./Pengajuan.css";

export default function Approval() {
  const navigate = useNavigate();

  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;

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
            Dashboard Super Admin
          </div>

          <div
            className="menu-item"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/tambahuser")}
          >
            Tambah User
          </div>

          {/* ✅ MENU BARU */}
          <div
            className="menu-item"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/kelola-harga")}
          >
            Kelola Harga ATK
          </div>

          <div
            className="menu-item"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/periode")}
          >
            Atur Periode
          </div>
        </nav>

        <div
          className="logout"
          style={{ cursor: "pointer" }}
          onClick={() => {
            localStorage.removeItem("user");
            window.location.href = "/";
          }}
        >
          Log Out
        </div>
      </aside>

      {/* MAIN */}
      <main className="main">
        <header className="topbar">
          <div>
            <div className="topbar-title">Dashboard Super Admin</div>
            <div className="topbar-sub">
              Selamat datang: {currentUser?.name || "Super Admin ATK"}
            </div>
          </div>
          <div className="topbar-right">
            <span>Role: Super Admin</span>
            <span className="role-pill">Super Admin</span>
          </div>
        </header>

        <section className="main-content">
          <div className="card">
            <div className="card-title">Panel Super Admin</div>
            <p>
              Super Admin dapat mengelola user, mengatur periode pengajuan,
              serta mengelola <strong>harga ATK</strong>.
            </p>
            <div
  className="menu-item"
  style={{ cursor: "pointer" }}
  onClick={() => navigate("/kelola-barang")}
>
  Kelola Barang ATK
</div>

          </div>
        </section>
      </main>
    </div>
  );
}
