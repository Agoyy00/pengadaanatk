import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Pengajuan.css";

const API_BASE = "http://127.0.0.1:8000/api";

export default function Verifikasi() {
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;

  // LOAD PENGAJUAN
  useEffect(() => {
    async function loadPengajuan() {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/pengajuan`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Gagal memuat pengajuan:", err);
        setErrorMsg("Gagal memuat daftar pengajuan.");
      } finally {
        setLoading(false);
      }
    }

    loadPengajuan();
  }, []);

  const renderStatus = (status) => {
    switch (status) {
      case "diajukan":
        return <span className="status-badge status-diajukan">Diajukan</span>;
      case "diverifikasi":
        return <span className="status-badge status-diverifikasi">Diverifikasi</span>;
      case "ditolak":
        return <span className="status-badge status-ditolak">Ditolak</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  const updateStatus = async (id, newStatus) => {
    if (!window.confirm(`Yakin ingin mengubah status menjadi "${newStatus}"?`)) return;

    try {
      setUpdatingId(id);

      const res = await fetch(`${API_BASE}/pengajuan/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        alert(result.message || "Gagal mengubah status.");
        return;
      }

      setData((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
      );
    } catch (err) {
      console.error(err);
      alert("Kesalahan jaringan.");
    } finally {
      setUpdatingId(null);
    }
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
          <div
            className="menu-item"
            onClick={() => navigate("/dashboardadmin")}
          >
            Dashboard
          </div>
          <div className="menu-item disabled">Verifikasi</div>
          <div
            className="menu-item"
            onClick={() => navigate("/periode")}
          >
            Atur Periode
          </div>
        </nav>

        <div
          className="logout"
          onClick={() => (window.location.href = "/")}
        >
          Log Out
        </div>
      </aside>

      {/* MAIN */}
      <main className="main">
        <header className="topbar">
          <div>
            <div className="topbar-title">Verifikasi Pengajuan ATK</div>
            <div className="topbar-sub">
              Selamat datang: {currentUser?.name || "Admin"}
            </div>
          </div>
          <div className="topbar-right">
            <span>Role: Admin</span>
            <span className="role-pill">Admin</span>
          </div>
        </header>

        <section className="main-content">
          <div className="card">
            <div className="card-title">Ringkasan Pengajuan</div>
            <p>Ini adalah menu Verifikasi. Isi data atau statistik bisa dimasukkan di sini.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
