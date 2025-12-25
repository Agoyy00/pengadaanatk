// frontend-trek/src/components/Verifikasi.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/Pengajuan.css";
import DetailVerifikasi from "../components/DetailVerifikasi";


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
      return <span className="status-badge status-diverifikasi">Diverifikasi Admin</span>;
    }
    if (status === "ditolak") {
      return <span className="status-badge status-ditolak">Ditolak Admin</span>;
    }
    if (status === "disetujui") {
      return <span className="status-badge status-disetujui">Disetujui Admin</span>;
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
          p.id === pengajuanId ? { ...p, status: "diverifikasi" } : p
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

      const sidebarMenus = [
      { label: "Dashboard Admin", to: "/approval"},
      { label: "Verifikasi", to: "/verifikasi", active: true  },
      { label: "Kelola Barang ATK", to: "/kelola-barang" },
      { label: "Kelola Harga ATK", to: "/kelola-harga" },
      ];

      const [editingId, setEditingId] = useState(null);
      const [draftItems, setDraftItems] = useState({});

      const startEdit = (pengajuan) => {
      setEditingId(pengajuan.id);

      const initial = {};
      pengajuan.items.forEach((item) => {
        initial[item.id] = {
          jumlah_disetujui: item.jumlah_disetujui ?? item.jumlah_diajukan,
          catatan_revisi: item.catatan_revisi ?? "",
        };
      });

  setDraftItems(initial);
};

const submitVerifikasi = async (pengajuanId) => {
  try {
    setProcessingId(pengajuanId);

    // 1. simpan revisi (kalau ada)
    const items = Object.entries(draftItems).map(([id, v]) => ({
      id,
      jumlah_disetujui: v.jumlah_disetujui,
      catatan_revisi: v.catatan_revisi,
    }));

    if (items.length > 0) {
      await fetch(`${API_BASE}/pengajuan/${pengajuanId}/revisi`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
    }

    // 2. update status (FLOW LAMA)
   await fetch(`${API_BASE}/pengajuan/${pengajuanId}/status`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ status: "diverifikasi" }),
});


    setEditingId(null);
  } catch (err) {
    alert("Gagal submit verifikasi");
  } finally {
    setProcessingId(null);
  }
};

const [selectedPengajuan, setSelectedPengajuan] = useState(null);


  return (
    <div className="layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-logo">Sistem Pengajuan ATK</div>
          <div className="sidebar-subtitle">Universitas Yarsi</div>
        </div>

        <nav className="sidebar-menu">
          {sidebarMenus.map((m) => (
            <div
              key={m.label}
              className={`menu-item ${m.active ? "disabled" : ""}`}
              style={{ cursor: m.active ? "default" : "pointer" }}
              onClick={() => {
                if (!m.active) navigate(m.to);
              }}
            >
              {m.label}
            </div>
          ))}
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
                <option value="diajukan">Diajukan</option>
                <option value="diverifikasi_admin">Diverifikasi Admin</option>
                <option value="ditolak_admin">Ditolak Admin</option>
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
                              {p.items.map((item) => {
                              const namaBarang = item.barang?.nama ?? "Barang";
                              const satuan = item.barang?.satuan ?? "";
                              const diajukan = item.jumlah_diajukan;
                              const disetujui =
                                item.jumlah_disetujui !== null
                                  ? item.jumlah_disetujui
                                  : item.jumlah_diajukan;

                              const isRevisi =
                                item.jumlah_disetujui !== null &&
                                item.jumlah_disetujui !== item.jumlah_diajukan;

                              return (
                                <li key={item.id}>
                                  {namaBarang} —{" "}
                                  <span>
                                    diajukan{" "}
                                    <strong>
                                      {diajukan} {satuan}
                                    </strong>
                                  </span>

                                  {isRevisi && (
                                    <>
                                      {" , "}
                                      <span className="text-revisi">
                                        disetujui{" "}
                                        <strong>
                                          {disetujui} {satuan}
                                        </strong>{" "}
                                        (direvisi)
                                      </span>
                                    </>
                                  )}
                                  {item.catatan_revisi && (
                                    <div className="revisi-note">
                                      Catatan: {item.catatan_revisi}
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                            </td>
                            <td>
                              {p.status === "diajukan" && (
                                <>
                                  <button
                                  className="btn-status-verif"
                                  onClick={() => setSelectedPengajuan(p)}
                                >
                                  Verifikasi
                                </button> 
                                {editingId === p.id && (
                                <button
                                  className="btn-status-verif"
                                  onClick={() => submitVerifikasi(p.id)}
                                >
                                  Submit Verifikasi
                                </button>
                              )}  
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
      {selectedPengajuan && (
        <DetailVerifikasi
          pengajuan={selectedPengajuan}
          onClose={() => setSelectedPengajuan(null)}
          onSuccess={() => window.location.reload()}
        />
      )}
    </div>
  );
}
