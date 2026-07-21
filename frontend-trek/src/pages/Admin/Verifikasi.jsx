// frontend-trek/src/components/Verifikasi.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../../css/layout.css";
import "../../css/tabel.css";
import "../../css/verifikasi.css";
import DetailVerifikasi from "../../components/DetailVerifikasi";
import RoleSwitcher from "../../components/RoleSwitcher";


const API_BASE = import.meta.env.VITE_API_BASE;
const token = localStorage.getItem("token");

export default function Verifikasi() {
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [filterStatus, setFilterStatus] = useState("diajukan");
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    async function loadPengajuan() {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/pengajuan`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
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
  switch (status) {
    case "diajukan":
      return <span className="status-badge status-diajukan">Diajukan</span>;

    case "diverifikasi_admin":
      return (
        <span className="status-badge status-diverifikasi">
          Diverifikasi Admin
        </span>
      );

    case "ditolak_admin":
      return (
        <span className="status-badge status-ditolak">
          Ditolak Admin
        </span>
      );

    case "disetujui":
      return (
        <span className="status-badge status-disetujui">
          Disetujui Super Admin
        </span>
      );

    default:
      return <span className="status-badge">{status}</span>;
  }
};

const downloadPdfAdmin = async (id, status) => {
  if (status !== "diajukan") {
    alert("PDF Admin hanya tersedia saat pengajuan masih diajukan");
    return;
  }
  
  console.log("TOKEN:", token);
  try {
    const response = await fetch(
      `${API_BASE}/pengajuan/${id}/pdf/admin`,
      {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    );  

    if (!response.ok) {
      const text = await response.text();
      console.error("PDF ERROR:", text);
      throw new Error("Response not ok");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `pengajuan-admin-${id}.pdf`;
    a.click();

    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert("Gagal download PDF Admin");
  }
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
          "Content-Type": "application/json", "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: currentUser.id,status: newStatus }),
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

  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const role = (currentUser?.role || "").toLowerCase();

  const sidebarMenus = useMemo(() => {
    if (role === "superadmin") {
      return [
        { label: "Dashboard Super Admin", to: "/dashboardsuperadmin" },
        { label: "Approval Pengajuan", to: "/approval" },
        { label: "Tambah & Kelola User", to: "/tambahuser" },
        { label: "Atur Periode", to: "/periode" },
        { label: "Daftar Barang ATK", to: "/superadmin/daftar-barang" },
        { label: "Grafik Belanja", to: "/superadmin/grafik-belanja" },
        { label: "Stock Opname Barang", to: "/stock-opname" },
        { label: "Template Dokumen", to: "/template-dokumen" },
      ];
    } else {
      return [
        { label: "Dashboard Admin", to: "/dashboardadmin" },
        { label: "Verifikasi Pengajuan", to: "/verifikasi", active: true },
        { label: "Kelola Barang ATK", to: "/kelola-barang" },
        { label: "Grafik Usulan Barang", to: "/grafik-usulan-barang" },
        { label: "Stock Opname Barang", to: "/stock-opname" },
        { label: "Template Dokumen", to: "/template-dokumen" },
      ];
    }
  }, [role]);

  const formatRole = (role) => {
    if (!role) return "-";

    return role
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
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
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
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

  const [selectedUnit, setSelectedUnit] = useState("all");

  const uniqueUnits = React.useMemo(() => {
    return [...new Set(data.map((p) => p.unit))].filter(Boolean);
  }, [data]);

  const filteredData = React.useMemo(() => {
    const statusFiltered = data.filter((p) => p.status === filterStatus);

    if (selectedUnit === "all") {
      // Tampilkan hanya pengajuan pertama (terbaru) untuk setiap unit
      const seenUnits = new Set();
      return statusFiltered.filter((p) => {
        if (!p.unit) return true;
        if (seenUnits.has(p.unit)) {
          return false;
        }
        seenUnits.add(p.unit);
        return true;
      });
    } else {
      // Tampilkan semua pengajuan dari unit terpilih
      return statusFiltered.filter((p) => p.unit === selectedUnit);
    }
  }, [data, filterStatus, selectedUnit]);



      const [editingId, setEditingId] = useState(null);
      const [draftItems, setDraftItems] = useState({});

      const startEdit = (pengajuan) => {
      setEditingId(pengajuan.id);

      const initial = {};
      pengajuan.items.forEach((item) => {
        initial[item.id] = {
          kebutuhan_total: item.kebutuhan_total,
          sisa_stok: item.sisa_stok,
          jumlah_diajukan: item.kebutuhan_total - item.sisa_stok,
        };
      });

      setDraftItems(initial);
    };

    const updateDraftItem = (itemId, field, value) => {
  setDraftItems((prev) => {
    const kebutuhan =
      field === "kebutuhan_total"
        ? Number(value)
        : Number(prev[itemId].kebutuhan_total);

    const sisa =
      field === "sisa_stok"
        ? Number(value)
        : Number(prev[itemId].sisa_stok);

    return {
      ...prev,
      [itemId]: {
        kebutuhan_total: kebutuhan,
        sisa_stok: sisa,
        jumlah_diajukan: Math.max(kebutuhan - sisa, 0),
      },
    };
  });
};



const submitVerifikasi = async (pengajuanId) => {
  try {
    setProcessingId(pengajuanId);

    const items = [];

    for (const p of data) {
      if (p.id !== pengajuanId) continue;

      for (const item of p.items) {
        const v = draftItems[item.id];
        if (!v) continue;

        const namaBarang = item.barang?.nama ?? "Barang";
        const kebutuhan = item.kebutuhan_total ?? 0;
        const stok = item.stok_saat_ini ?? 0;

        const jumlahDiajukan = Math.max(kebutuhan - stok, 0);
        const jumlahDisetujui = Number(v.jumlah_disetujui);

        // ❌ VALIDASI
        if (jumlahDisetujui < 0) {
          alert(`Jumlah disetujui ${namaBarang} tidak boleh negatif`);
          return;
        }

        if (jumlahDisetujui > kebutuhan) {
          alert(
            `Jumlah disetujui ${namaBarang} melebihi kebutuhan (${kebutuhan})`
          );
          return;
        }

        items.push({
          id: item.id,
          jumlah_disetujui: jumlahDisetujui,
          catatan_revisi: v.catatan_revisi || "",
        });
      }
    }

    // 🚀 kirim ke backend
    await fetch(`${API_BASE}/pengajuan/${pengajuanId}/revisi`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, },
      body: JSON.stringify({ actor_user_id: currentUser.id, items }),
    });

    // update status
    await fetch(`${API_BASE}/pengajuan/${pengajuanId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, },
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
            <span>Role: </span>
            <RoleSwitcher />
          </div>
        </header>

        <section className="main-content">
          <div className="card">
            <div className="card-title">Daftar Pengajuan</div>
            <div className="card-subtitle">
              Admin dapat memverifikasi, merevisi, atau menolak pengajuan ATK.
            </div>

            {/* FILTER STATUS & UNIT */}
            <div style={{ marginBottom: 16, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Filter Status:</span>
                <select
                  className="select-input"
                  style={{ minWidth: 150 }}
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="diajukan">Diajukan</option>
                  <option value="diverifikasi_admin">Diverifikasi Admin</option>
                  <option value="ditolak_admin">Ditolak Admin</option>
                  <option value="disetujui">Disetujui Super Admin</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Filter Unit:</span>
                <select
                  className="select-input"
                  style={{ minWidth: 180 }}
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                >
                  <option value="all">Semua Unit</option>
                  {uniqueUnits.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
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
                          <th style={{ textAlign: "center" }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.map((p) => (
                          <tr key={p.id}>
                            <td>{p.id}</td>
                            <td>{p.nama_pemohon}</td>
                            <td>{p.tahun_akademik}</td>
                            <td>
                              <span
                                style={{
                                  color: "#0284c7",
                                  textDecoration: "underline",
                                  cursor: "pointer",
                                  fontWeight: 600
                                }}
                                onClick={() => setSelectedUnit(p.unit)}
                                title={`Klik untuk melihat semua pengajuan dari ${p.unit}`}
                              >
                                {p.unit}
                              </span>
                            </td>
                            <td>{p.jabatan}</td>
                            <td>{renderStatusBadge(p.status)}</td>
                            <td>
                              {p.created_at
                                ? new Date(p.created_at).toLocaleString("id-ID")
                                : "-"}
                            </td>
                            <td>
                              {p.items.map((item) => {
                              const kebutuhan = item.kebutuhan_total;
                              const sisa = item.sisa_stok;
                              const diajukan = item.jumlah_diajukan;
                              const disetujui =
                                item.jumlah_disetujui !== null
                                  ? item.jumlah_disetujui
                                  : diajukan;

                              return (
                                <li key={item.id}>
                                  <strong>{item.barang?.nama}</strong>

                                  {/* 🔹 SAAT MASIH DIAJUKAN */}
                                  {p.status === "diajukan" && (
                                    <div className="item-meta">
                                      Kebutuhan total:{" "}
                                      <b>{kebutuhan} {item.barang?.satuan}</b><br />
                                      Sisa stok saat ini:{" "}
                                      <b>{sisa} {item.barang?.satuan}</b><br />
                                      Jumlah diajukan:{" "}
                                      <b>{diajukan} {item.barang?.satuan}</b>
                                    </div>
                                  )}

                                  {/* 🔹 SETELAH DIVERIFIKASI ADMIN */}
                                  {p.status !== "diajukan" && (
                                    <div className="item-meta">
                                      Jumlah disetujui:{" "}
                                      <b>{disetujui} {item.barang?.satuan}</b>
                                    </div>
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
                              {/* ===== AKSI PDF (AMAN, TIDAK GANGGU STATUS) ===== */}
                              {(p.status === "diajukan") && (
                                <button
                                className="btn-pdf"
                                onClick={() => downloadPdfAdmin(p.id, p.status)}
                              >
                                📄 PDF Admin
                              </button>
                              )}
                              
                              {p.status === "diajukan" && (
                                <button
                                  className="btn-status-verif"
                                  onClick={() => setSelectedPengajuan(p)}
                                >
                                  Verifikasi / Tolak
                                </button>
                              )}
                              
                              {p.status === "diverifikasi_admin" && (
                                <span className="status-text done" style={{ color: "#10b981", fontWeight: "bold" }}>
                                  ✓ Pengajuan diverifikasi
                                </span>
                              )}
                              
                              {p.status === "ditolak_admin" && (
                                <div style={{ textAlign: "left" }}>
                                  <span className="status-text rejected" style={{ color: "#ef4444", fontWeight: "bold", display: "block" }}>
                                    ✗ Pengajuan ditolak Admin
                                  </span>
                                  {p.catatan_admin && (
                                    <div style={{ fontSize: "11px", color: "#ef4444", marginTop: "4px" }}>
                                      Catatan: <i>{p.catatan_admin}</i>
                                    </div>
                                  )}
                                </div>
                              )}

                              {p.status === "disetujui" && (
                                <span className="status-text approved" style={{ color: "#10b981", fontWeight: "bold" }}>
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
