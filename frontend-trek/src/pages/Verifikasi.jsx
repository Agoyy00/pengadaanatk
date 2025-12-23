// frontend-trek/src/components/Verifikasi.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/Pengajuan.css";

const API_BASE = "http://127.0.0.1:8000/api";

export default function Verifikasi() {
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    async function loadPengajuan() {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/pengajuan`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Gagal memuat pengajuan:", err);
        setErrorMsg("Gagal memuat data pengajuan.");
      } finally {
        setLoading(false);
      }
    }

    loadPengajuan();
  }, []);

  const renderStatusBadge = (status) => {
    if (status === "diajukan") {
      return <span className="status-badge status-diajukan">Diajukan</span>;
    }
    if (status === "diverifikasi") {
      return <span className="status-badge status-diverifikasi">Diverifikasi</span>;
    }
    if (status === "ditolak") {
      return <span className="status-badge status-ditolak">Ditolak</span>;
    }
    if (status === "disetujui") {
      return <span className="status-badge status-disetujui">Disetujui</span>;
    }
    return <span className="status-badge">{status}</span>;
  };

  // PATCH status biasa
  const handleUpdateStatus = async (pengajuanId, newStatus) => {
    if (!window.confirm(`Ubah status pengajuan #${pengajuanId} menjadi "${newStatus}"?`)) {
      return;
    }

    try {
      setProcessingId(pengajuanId);

      const res = await fetch(`${API_BASE}/pengajuan/${pengajuanId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        console.error("Gagal update status:", json);
        alert("Gagal mengubah status pengajuan.");
        return;
      }

      setData((prev) =>
        prev.map((p) =>
          p.id === pengajuanId ? { ...p, status: newStatus } : p
        )
      );
    } catch (err) {
      console.error("Error jaringan:", err);
      alert("Kesalahan jaringan.");
    } finally {
      setProcessingId(null);
    }
  };

  // 🔹 Revisi jumlah + catatan, lalu set status disetujui
  const handleRevisi = async (pengajuan) => {
    if (!pengajuan.items || pengajuan.items.length === 0) {
      alert("Tidak ada item yang bisa direvisi.");
      return;
    }

    const revisions = [];

    for (const item of pengajuan.items) {
      const namaBarang = item.barang?.nama ?? "Barang";
      const satuan = item.barang?.satuan ?? "";
      const currentQty = item.jumlah_disetujui ?? item.jumlah_diajukan;

      const qtyStr = window.prompt(
        `Jumlah disetujui untuk ${namaBarang} (${satuan})`,
        currentQty
      );

      if (qtyStr === null) {
        // batal semua
        return;
      }

      const qty = parseInt(qtyStr, 10);
      if (isNaN(qty) || qty < 0) {
        alert("Jumlah tidak valid.");
        return;
      }

      const reason = window.prompt(
        `Catatan revisi untuk ${namaBarang} (boleh dikosongkan)`,
        item.catatan_revisi || ""
      );

      revisions.push({
        id: item.id,
        jumlah_disetujui: qty,
        catatan_revisi: reason || "",
      });
    }

    try {
      setProcessingId(pengajuan.id);

      const res = await fetch(`${API_BASE}/pengajuan/${pengajuan.id}/revisi`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: revisions }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        console.error("Gagal menyimpan revisi:", json);
        alert(json.message || "Gagal menyimpan revisi.");
        return;
      }

      // update data di state
      const updated = json.pengajuan;

      setData((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );

      alert("Revisi berhasil disimpan dan pengajuan disetujui.");
    } catch (err) {
      console.error("Error jaringan:", err);
      alert("Kesalahan jaringan saat menyimpan revisi.");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredData =
    filterStatus === "semua"
      ? data
      : data.filter((p) => p.status === filterStatus);

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
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/dashboardadmin")}
          >
            Dashboard
          </div>
          <div className="menu-item disabled">Verifikasi</div>
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
            <div className="topbar-sub">Selamat datang: Admin ATK</div>
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
              Admin dapat memverifikasi, merevisi, atau menolak pengajuan ATK.
            </div>

            {/* FILTER STATUS */}
            <div style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 13 }} className="A">Filter status:</span>
              <select
                className="select-input"
                style={{ maxWidth: 220 }}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="semua">Semua</option>
                <option value="diajukan">Diajukan</option>
                <option value="diverifikasi">Diverifikasi</option>
                <option value="ditolak">Ditolak</option>
                <option value="disetujui">Disetujui</option>
              </select>
            </div>

            {loading && <p>Sedang memuat...</p>}
            {errorMsg && <p className="error-text">{errorMsg}</p>}

            {!loading && !errorMsg && (
              <>
                {filteredData.length === 0 ? (
                  <p>Belum ada pengajuan dengan filter ini.</p>
                ) : (
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
                        {filteredData.map((p) => (
                          <tr key={p.id}>
                            <td>{p.id}</td>
                            <td>{p.nama_pemohon}</td>
                            <td>{p.tahun_akademik}</td>
                            <td>{p.unit}</td>
                            <td>{p.jabatan}</td>
                            <td>{renderStatusBadge(p.status)}</td>
                            <td>
                              {p.created_at
                                ? new Date(p.created_at).toLocaleString("id-ID")
                                : "-"}
                            </td>
                            <td>
                              {(!p.items || p.items.length === 0) && <span>-</span>}
                              {p.items && p.items.length > 0 && (
                                <ul style={{ paddingLeft: 18, margin: 0 }}>
                                  {p.items.map((item) => {
                                    const namaBarang = item.barang?.nama ?? "Barang";
                                    const satuan = item.barang?.satuan ?? "";
                                    const diajukan = item.jumlah_diajukan;
                                    const disetujui =
                                      item.jumlah_disetujui ?? item.jumlah_diajukan;

                                    return (
                                      <li key={item.id}>
                                        {namaBarang} — diajukan{" "}
                                        <strong>{diajukan} {satuan}</strong>
                                        {item.jumlah_disetujui != null &&
                                          item.jumlah_disetujui !== item.jumlah_diajukan && (
                                            <>
                                              {" , "}
                                              disetujui{" "}
                                              <strong>
                                                {disetujui} {satuan}
                                              </strong>{" "}
                                              (direvisi)
                                            </>
                                          )}
                                        {item.catatan_revisi && (
                                          <div className="revisi-note">
                                            Catatan revisi: {item.catatan_revisi}
                                          </div>
                                        )}
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </td>
                            <td>
                              {p.status === "diajukan" && (
                                <>
                                  <button
                                    className="btn-status-verif"
                                    disabled={processingId === p.id}
                                    onClick={() =>
                                      handleUpdateStatus(p.id, "diverifikasi")
                                    }
                                  >
                                    {processingId === p.id
                                      ? "Memproses..."
                                      : "Verifikasi"}
                                  </button>
                                  <button
                                    className="btn-status-tolak"
                                    disabled={processingId === p.id}
                                    onClick={() =>
                                      handleUpdateStatus(p.id, "ditolak")
                                    }
                                  >
                                    {processingId === p.id
                                      ? "Memproses..."
                                      : "Tolak"}
                                  </button>
                                  <button
                                    className="btn-status-revisi"
                                    disabled={processingId === p.id}
                                    onClick={() => handleRevisi(p)}
                                  >
                                    {processingId === p.id
                                      ? "Memproses..."
                                      : "Revisi & Setujui"}
                                  </button>
                                </>
                              )}

                              {p.status === "diverifikasi" && (
                                <span className="status-text done">
                                  ✓ Sudah diverifikasi
                                </span>
                              )}

                              {p.status === "ditolak" && (
                                <span className="status-text rejected">
                                  ✗ Pengajuan ditolak
                                </span>
                              )}

                              {p.status === "disetujui" && (
                                <span className="status-text approved">
                                  ✓ Pengajuan disetujui
                                </span>
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
