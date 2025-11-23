import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Pengajuan.css";

const API_BASE = "http://127.0.0.1:8000/api";

export default function Riwayat() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // 🔐 ambil user login
  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const userId = currentUser?.id;

  useEffect(() => {
    async function loadRiwayat() {
      if (!userId) {
        setErrorMsg("User belum login.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // 🔥 Load pengajuan hanya milik user ini
        const res = await fetch(`${API_BASE}/pengajuan?user_id=${userId}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Gagal load riwayat:", err);
        setErrorMsg("Gagal memuat riwayat pengajuan.");
      } finally {
        setLoading(false);
      }
    }

    loadRiwayat();
  }, [userId]);

  const renderStatus = (status) => {
    if (status === "diajukan") {
      return <span className="status-badge status-diajukan">Diajukan</span>;
    }
    if (status === "diverifikasi") {
      return <span className="status-badge status-diverifikasi">Diverifikasi</span>;
    }
    if (status === "disetujui") {
      return <span className="status-badge status-disetujui">Disetujui</span>;
    }
    if (status === "ditolak") {
      return <span className="status-badge status-ditolak">Ditolak</span>;
    }
    return <span className="status-badge">{status}</span>;
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
          <Link to="/" className="menu-item">Dashboard</Link>
          <Link to="/pengajuan" className="menu-item">Buat Pengajuan Baru</Link>
          <div className="menu-item disabled">Riwayat pengajuan</div>
        </nav>

        <div className="logout">Log Out</div>
      </aside>

      {/* KANAN */}
      <main className="main">
        {/* TOPBAR */}
        <header className="topbar">
          <div>
            <div className="topbar-title">Riwayat Pengajuan ATK</div>
            <div className="topbar-sub">
              Selamat datang: {currentUser?.name || "Nama Kamu"}
            </div>
          </div>
          <div className="topbar-right">
            <span>Role: User</span>
            <span className="role-pill">User</span>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <section className="main-content">
          <div className="card">
            <div className="card-title">Riwayat Pengajuan</div>
            <div className="card-subtitle">
              Semua pengajuan ATK yang pernah kamu lakukan.
            </div>

            {loading && <p>Sedang memuat...</p>}
            {errorMsg && <p className="error-text">{errorMsg}</p>}

            {!loading && !errorMsg && (
              <>
                {data.length === 0 ? (
                  <p>Belum ada pengajuan.</p>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Nama Pemohon</th>
                          <th>Tahun Akademik</th>
                          <th>Unit</th>
                          <th>Jabatan</th>
                          <th>Status</th>
                          <th>Tanggal</th>
                          <th>Barang yang diajukan</th>
                        </tr>
                      </thead>

                      <tbody>
                        {data.map((p) => (
                          <tr key={p.id}>
                            <td>{p.id}</td>
                            <td>{p.nama_pemohon}</td>
                            <td>{p.tahun_akademik}</td>
                            <td>{p.unit}</td>
                            <td>{p.jabatan}</td>
                            <td>{renderStatus(p.status)}</td>
                            <td>
                              {p.created_at
                                ? new Date(p.created_at).toLocaleString("id-ID")
                                : "-"}
                            </td>

                            {/* BARANG YANG DIAJUKAN */}
                            <td>
                              {(!p.items || p.items.length === 0) && <span>-</span>}

                              {p.items?.length > 0 && (
                                <ul style={{ paddingLeft: 18, margin: 0 }}>
                                  {p.items.map((item) => {
                                    const namaBarang = item.barang?.nama ?? "Barang";
                                    const satuan = item.barang?.satuan ?? "";

                                    return (
                                      <li key={item.id}>
                                        {namaBarang} —{" "}
                                        <strong>
                                          {item.jumlah_diajukan} {satuan}
                                        </strong>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
