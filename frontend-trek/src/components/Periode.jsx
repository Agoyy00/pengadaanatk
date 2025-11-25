import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Pengajuan.css";

const API_BASE = "http://127.0.0.1:8000/api";

export default function Periode() {
  const navigate = useNavigate();

  const [mulai, setMulai] = useState("");
  const [berakhir, setBerakhir] = useState("");
  const [message, setMessage] = useState("");

  // Load periode saat halaman dibuka
  useEffect(() => {
    async function loadPeriode() {
      const res = await fetch(`${API_BASE}/periode`);
      const data = await res.json();

      if (data) {
        setMulai(data.mulai?.slice(0, 16));    // format ke input: yyyy-mm-ddThh:mm
        setBerakhir(data.berakhir?.slice(0, 16));
      }
    }

    loadPeriode();
  }, []);

  async function handleSimpan(e) {
    e.preventDefault();
    setMessage("");

    const payload = { mulai, berakhir };

    const res = await fetch(`${API_BASE}/periode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (data.success) {
      setMessage("Periode berhasil disimpan!");
    } else {
      setMessage("Terjadi kesalahan.");
    }
  }

  return (
    <div className="layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-logo">Sistem Pengajuan ATK</div>
          <div className="sidebar-subtitle">Universitas Yarsi</div>
        </div>

        <nav className="sidebar-menu">
          <div className="menu-item" onClick={() => navigate("/dashboardadmin")}>
            Dashboard
          </div>
          <div className="menu-item" onClick={() => navigate("/verifikasi")}>
            Verifikasi
          </div>
          <div className="menu-item disabled">
            Atur Periode
          </div>
        </nav>

        <div className="logout" onClick={() => navigate("/")}>
          Log Out
        </div>
      </aside>

      {/* MAIN */}
      <main className="main">
        <header className="topbar">
          <div>
            <div className="topbar-title">Atur Periode Pengajuan</div>
            <div className="topbar-sub">Admin dapat mengatur waktu buka & tutup pengajuan.</div>
          </div>
          <div className="topbar-right">
            <span>Role: Admin</span>
            <span className="role-pill">Admin</span>
          </div>
        </header>

        <section className="main-content">
          <div className="card">
            <div className="card-title">Atur Periode</div>
            <div className="card-subtitle">Masukkan tanggal & jam dimulainya pengajuan hingga batas akhirnya.</div>

            <form onSubmit={handleSimpan}>
              <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 400 }}>
                <div>
                  <label>Mulai Pengajuan</label>
                  <input
                    type="datetime-local"
                    value={mulai}
                    className="input-text"
                    onChange={(e) => setMulai(e.target.value)}
                  />
                </div>

                <div>
                  <label>Berakhir / Deadline</label>
                  <input
                    type="datetime-local"
                    value={berakhir}
                    className="input-text"
                    onChange={(e) => setBerakhir(e.target.value)}
                  />
                </div>

                <button className="btn btn-primary">Simpan Periode</button>

                {message && <p style={{ color: "green" }}>{message}</p>}
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
