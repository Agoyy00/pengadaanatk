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
            <div className="card-title">Daftar Pengajuan</div>
            <div className="card-subtitle">
              Admin dapat memverifikasi atau menolak pengajuan ATK.
            </div>

            {loading && <p>Sedang memuat...</p>}
            {errorMsg && <p className="error-text">{errorMsg}</p>}

            {!loading && !errorMsg && (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Pemohon</th>
                      <th>Tahun</th>
                      <th>Unit</th>
                      <th>Jabatan</th>
                      <th>Status</th>
                      <th>Tanggal</th>
                      <th>Barang</th>
                      <th>Aksi</th>
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

                        <td>
                          {p.items?.length > 0 ? (
                            <ul style={{ margin: 0, paddingLeft: 20 }}>
                              {p.items.map((item) => (
                                <li key={item.id}>
                                  {item.barang?.nama} —{" "}
                                  <strong>
                                    {item.jumlah_diajukan} {item.barang?.satuan}
                                  </strong>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 6,
                            }}
                          >
                            {/* hanya jika masih diajukan */}
                            {p.status === "diajukan" && (
                              <>
                                <button
                                  className="btn btn-primary"
                                  onClick={() =>
                                    updateStatus(p.id, "diverifikasi")
                                  }
                                  disabled={updatingId === p.id}
                                >
                                  {updatingId === p.id
                                    ? "Memproses..."
                                    : "Verifikasi"}
                                </button>

                                <button
                                  className="btn btn-danger"
                                  onClick={() => updateStatus(p.id, "ditolak")}
                                  disabled={updatingId === p.id}
                                >
                                  {updatingId === p.id
                                    ? "Memproses..."
                                    : "Tolak"}
                                </button>
                              </>
                            )}

                            {p.status === "diverifikasi" && (
                              <span style={{ color: "green", fontWeight: 600 }}>
                                ✔ Sudah diverifikasi
                              </span>
                            )}

                            {p.status === "ditolak" && (
                              <span style={{ color: "red", fontWeight: 600 }}>
                                ✖ Ditolak
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
