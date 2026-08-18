import DesktopSidebarToggle from '../../components/DesktopSidebarToggle';
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import "../../css/layout.css";
import "../../css/tabel.css";
import "../../css/verifikasi.css";
import DetailVerifikasi from "../../components/DetailVerifikasi";
import RoleSwitcher from "../../components/RoleSwitcher";




const API_BASE = import.meta.env.VITE_API_BASE;
const token = localStorage.getItem("token");

import SidebarLogo from "../../components/SidebarLogo";
import useSupportUnread from "../../hooks/useSupportUnread";

export default function Verifikasi() {
  const navigate = useNavigate();
  const location = useLocation();
  const { supportUnreadCount } = useSupportUnread("admin");

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
        Swal.fire({
          icon: "error",
          title: "Gagal Update",
          text: json.message || "Gagal mengubah status pengajuan.",
          confirmButtonColor: "#ef4444",
        });
        return;
      }

      setData((prev) =>
        prev.map((p) =>
          p.id === pengajuanId ? { ...p, status: "diverifikasi" } : p
        )
      );

      Swal.fire({
        icon: "success",
        title: "Berhasil Diverifikasi",
        text: "Pengajuan berhasil diverifikasi.",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Error jaringan:", err);
      Swal.fire({
        icon: "error",
        title: "Kesalahan Jaringan",
        text: "Terjadi kesalahan saat terhubung ke server.",
        confirmButtonColor: "#ef4444",
      });
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
        { label: "Monitoring Admin & User", to: "/superadmin/monitoring" },
        { label: "Grafik Barang", to: "/superadmin/grafik-barang" },
        { label: "Grafik Belanja", to: "/superadmin/grafik-belanja" },
        { label: "Verifikasi Pengajuan", to: "/verifikasi", active: location.pathname === "/verifikasi" },
        { label: "Approval Pengajuan", to: "/approval" },
        { label: "Tambah & Kelola User", to: "/tambahuser" },
        { label: "Atur Periode", to: "/periode" },
        { label: "Daftar Barang ATK", to: "/superadmin/daftar-barang" },
        { label: "Stock Opname Barang", to: "/stock-opname" },
        { label: "Support", to: "/support" },
      ];
     } else {
       return [
         { label: "Dashboard Admin", to: "/dashboardadmin" },
         { label: "Verifikasi Pengajuan", to: "/verifikasi", active: true },
         { label: "Kelola Barang ATK", to: "/kelola-barang" },
         { label: "Grafik Usulan Barang", to: "/grafik-usulan-barang" },
         { label: "Stock Opname Barang", to: "/stock-opname" },
         { label: "Support", to: "/support" },
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
      const [activeUnitView, setActiveUnitView] = useState(null);
      // Per-item decisions: { [itemId]: { status: 'approved' | 'rejected' | null, catatan: '' } }
      const [itemDecisions, setItemDecisions] = useState({});
      // Per-item edits: { [itemId]: { kebutuhan: number, sisa: number } }
      const [itemEdits, setItemEdits] = useState({});

      const getItemValues = (item) => {
        const edits = itemEdits[item.id];
        const kebutuhan = edits?.kebutuhan ?? item.kebutuhan_total;
        const sisa = edits?.sisa ?? item.sisa_stok;
        const diajukan = Math.max(kebutuhan - sisa, 0);
        return { kebutuhan, sisa, diajukan };
      };

      const setItemEdit = (itemId, field, value) => {
        const num = Number(value) || 0;
        setItemEdits((prev) => ({
          ...prev,
          [itemId]: { ...prev[itemId], [field]: num },
        }));
      };

      const setItemDecision = (itemId, status) => {
        setItemDecisions((prev) => ({
          ...prev,
          [itemId]: { ...prev[itemId], status: prev[itemId]?.status === status ? null : status },
        }));
      };

      const setItemCatatan = (itemId, catatan) => {
        setItemDecisions((prev) => ({
          ...prev,
          [itemId]: { ...prev[itemId], catatan },
        }));
      };

      const handleSubmitPerItem = async (p) => {
        const allItems = p.items || [];
        const undecided = allItems.filter((item) => !itemDecisions[item.id]?.status);
        if (undecided.length > 0) {
          Swal.fire({
            icon: 'warning',
            title: 'Belum Lengkap',
            text: `Masih ada ${undecided.length} barang yang belum diputuskan (setujui/tolak).`,
            confirmButtonColor: '#3b82f6',
          });
          return;
        }

        const allRejected = allItems.every((item) => itemDecisions[item.id]?.status === 'rejected');

         // Build revisi items (use edited values)
        const items = allItems.map((item) => {
          const decision = itemDecisions[item.id];
          const vals = getItemValues(item);
          return {
            id: item.id,
            jumlah_disetujui: decision.status === 'approved' ? vals.diajukan : 0,
            kebutuhan_total: vals.kebutuhan,
            sisa_stok: vals.sisa,
            catatan_revisi: decision.catatan || (decision.status === 'rejected' ? 'Ditolak oleh Admin' : ''),
          };
        });

        try {
          setProcessingId(p.id);

          // Send revisi
          await fetch(`${API_BASE}/pengajuan/${p.id}/revisi`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ actor_user_id: currentUser.id, items }),
          });

          // Update status
          const newStatus = allRejected ? 'ditolak_admin' : 'diverifikasi_admin';
          const statusRes = await fetch(`${API_BASE}/pengajuan/${p.id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ status: newStatus, user_id: currentUser.id }),
          });

          if (!statusRes.ok) {
            const errJson = await statusRes.json().catch(() => ({}));
            console.error('Gagal update status:', errJson);
            Swal.fire({ icon: 'error', title: 'Gagal Update Status', text: errJson.message || 'Gagal mengubah status pengajuan.', confirmButtonColor: '#ef4444' });
            return;
          }

          Swal.fire({
            icon: 'success',
            title: allRejected ? 'Pengajuan Ditolak' : 'Verifikasi Berhasil!',
            text: allRejected ? 'Semua barang ditolak.' : 'Pengajuan berhasil diverifikasi.',
            confirmButtonColor: '#10b981',
          }).then(() => window.location.reload());
        } catch (err) {
          console.error(err);
          Swal.fire({ icon: 'error', title: 'Gagal', text: 'Terjadi kesalahan saat memproses verifikasi.', confirmButtonColor: '#ef4444' });
        } finally {
          setProcessingId(null);
        }
      };

      // Semua pengajuan dari unit yang sedang dilihat
      const unitDetailData = React.useMemo(() => {
        if (!activeUnitView) return [];
        return data.filter((p) => p.unit === activeUnitView && p.status === filterStatus);
      }, [data, activeUnitView, filterStatus]);

      // Daftar unit unik berdasarkan status filter
      const unitSummaryList = React.useMemo(() => {
        const statusFiltered = data.filter((p) => p.status === filterStatus);
        const unitMap = {};
        statusFiltered.forEach((p) => {
          if (!p.unit) return;
          if (!unitMap[p.unit]) {
            unitMap[p.unit] = { unit: p.unit, tahun: p.tahun_akademik, status: p.status, totalItems: 0, totalPengajuan: 0 };
          }
          unitMap[p.unit].totalItems += (p.items?.length || 0);
          unitMap[p.unit].totalPengajuan += 1;
        });
        return Object.values(unitMap);
      }, [data, filterStatus]);

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
    const statusRes = await fetch(`${API_BASE}/pengajuan/${pengajuanId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, },
      body: JSON.stringify({ status: "diverifikasi_admin", user_id: currentUser.id }),
    });

    if (!statusRes.ok) {
      const errJson = await statusRes.json().catch(() => ({}));
      alert(errJson.message || "Gagal update status verifikasi");
      return;
    }

    setEditingId(null);
  } catch (err) {
    alert("Gagal submit verifikasi");
  } finally {
    setProcessingId(null);
  }
};

const [selectedPengajuan, setSelectedPengajuan] = useState(null);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);

  return (
    <div className="layout">
      <DesktopSidebarToggle isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      {/* SIDEBAR */}
      {isSidebarOpen && (
        <div 
          className="sidebar-overlay open" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}
      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <SidebarLogo />

        <nav className="sidebar-menu">
          {sidebarMenus.map((m) => {
            const isActive = m.to === location.pathname || m.active;
            const isSupport = m.label === "Support";
            return (
              <div
                key={m.label}
                className={`menu-item ${isActive ? "active" : ""}`}
                style={{ cursor: isActive ? "default" : "pointer" }}
                onClick={() => {
                  if (!isActive) navigate(m.to);
                }}
              >
                {m.label}
                {isSupport && supportUnreadCount > 0 && (
                  <span className="support-badge">{supportUnreadCount}</span>
                )}
              </div>
            );
          })}
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
      <main className={`main ${!isSidebarOpen ? 'expanded' : ''}`}>
        <header className={`topbar ${!isSidebarOpen ? 'expanded' : ''}`}>
          <div className="topbar-left-wrapper">
            <button 
              className={`hamburger-menu ${isSidebarOpen ? 'open' : ''}`} 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label="Toggle Sidebar"
            >
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </button>
            <div>
            <div className="topbar-title">Verifikasi Pengajuan ATK</div>
            <div className="topbar-sub">Selamat datang: Admin ATK</div>
          </div>
          </div>
          <div className="topbar-right">
            <span>Role: </span>
            <RoleSwitcher />
          </div>
        </header>

        <section className="main-content">
          <div className="card">

            {/* ========== VIEW 1: DAFTAR UNIT ========== */}
            {!activeUnitView && (
              <>
                <div className="card-title">Daftar Pengajuan per Unit</div>
                <div className="card-subtitle">
                  Pilih unit untuk melihat detail pengajuan, nama pemohon, dan barang-barang yang diajukan.
                </div>

                {/* FILTER STATUS */}
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
                </div>

                {loading && <p>Sedang memuat...</p>}
                {errorMsg && <p className="error-text">{errorMsg}</p>}

                {!loading && !errorMsg && (
                  <>
                    {unitSummaryList.length === 0 ? (
                      <p>Belum ada pengajuan dengan filter ini.</p>
                    ) : (
                      <div className="table-wrapper">
                        <table>
                          <thead>
                            <tr>
                              <th>No</th>
                              <th>Nama Unit</th>
                              <th>Tahun Akademik</th>
                              <th>Status</th>
                              <th>Jumlah Pengajuan</th>
                              <th>Total Barang</th>
                              <th style={{ textAlign: "center" }}>Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {unitSummaryList.map((u, idx) => (
                              <tr
                                key={u.unit}
                                style={{ cursor: "pointer", transition: "background-color 0.2s ease" }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f0f9ff")}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
                                onClick={() => setActiveUnitView(u.unit)}
                              >
                                <td style={{ fontWeight: 600, color: "#64748b" }}>{idx + 1}</td>
                                <td>
                                  <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "14px" }}>
                                    {u.unit}
                                  </span>
                                </td>
                                <td>{u.tahun}</td>
                                <td>{renderStatusBadge(u.status)}</td>
                                <td>
                                  <span style={{ background: "#ede9fe", color: "#7c3aed", padding: "4px 10px", borderRadius: "12px", fontWeight: 600, fontSize: "12px" }}>
                                    {u.totalPengajuan} Pengajuan
                                  </span>
                                </td>
                                <td>
                                  <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "4px 10px", borderRadius: "12px", fontWeight: 600, fontSize: "12px" }}>
                                    {u.totalItems} Barang
                                  </span>
                                </td>
                                <td style={{ textAlign: "center" }}>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setActiveUnitView(u.unit); }}
                                    style={{
                                      background: "#005826",
                                      color: "#ffffff",
                                      padding: "8px 16px",
                                      borderRadius: "8px",
                                      fontSize: "12px",
                                      fontWeight: 600,
                                      cursor: "pointer",
                                      border: "none",
                                      transition: "transform 0.15s ease"
                                    }}
                                    onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
                                    onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
                                  >
                                    Lihat Detail
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* ========== VIEW 2: DETAIL UNIT (user & barang info) + VERIFIKASI ========== */}
            {activeUnitView && (() => {
              // Sub-view state managed via verifMode
              const isVerifMode = activeUnitView.startsWith("VERIF:");
              const unitName = isVerifMode ? activeUnitView.replace("VERIF:", "") : activeUnitView;
              const unitPengajuan = data.filter((p) => p.unit === unitName && p.status === filterStatus);

              // Merge items by barang_id for verification
              const mergedItems = React.useMemo ? (() => {
                const map = {};
                unitPengajuan.forEach((p) => {
                  (p.items || []).forEach((item) => {
                    const key = item.barang_id || item.barang?.id || item.id;
                    if (!map[key]) {
                      map[key] = {
                        key,
                        nama: item.barang?.nama || "Barang",
                        satuan: item.barang?.satuan || "pcs",
                        totalKebutuhan: 0,
                        totalSisaStok: 0,
                        totalDiajukan: 0,
                        sourceItems: [], // track original item IDs for submission
                      };
                    }
                    map[key].totalKebutuhan += (item.kebutuhan_total || 0);
                    map[key].totalSisaStok += (item.sisa_stok || 0);
                    map[key].totalDiajukan += (item.jumlah_diajukan || 0);
                    map[key].sourceItems.push({ itemId: item.id, pengajuanId: p.id, qty: item.jumlah_diajukan });
                  });
                });
                return Object.values(map);
              })() : [];

              // ---- MERGED ITEM EDIT/DECISION STATE (reuse itemEdits/itemDecisions with "merged_" prefix) ----
              const getMergedValues = (m) => {
                const edits = itemEdits["merged_" + m.key];
                const kebutuhan = edits?.kebutuhan ?? m.totalKebutuhan;
                const sisa = edits?.sisa ?? m.totalSisaStok;
                const diajukan = Math.max(kebutuhan - sisa, 0);
                return { kebutuhan, sisa, diajukan };
              };

              const mergedDecidedCount = mergedItems.filter((m) => itemDecisions["merged_" + m.key]?.status).length;
              const allMergedDecided = mergedDecidedCount === mergedItems.length && mergedItems.length > 0;

              const handleApproveAllMerged = () => {
                const newDecisions = { ...itemDecisions };
                mergedItems.forEach((m) => {
                  newDecisions["merged_" + m.key] = {
                    ...newDecisions["merged_" + m.key],
                    status: 'approved',
                  };
                });
                setItemDecisions(newDecisions);
              };

              const handleRejectAllMerged = () => {
                const newDecisions = { ...itemDecisions };
                mergedItems.forEach((m) => {
                  newDecisions["merged_" + m.key] = {
                    ...newDecisions["merged_" + m.key],
                    status: 'rejected',
                    catatan: newDecisions["merged_" + m.key]?.catatan || 'Ditolak oleh Admin',
                  };
                });
                setItemDecisions(newDecisions);
              };

              // SUBMIT ALL MERGED
              const handleSubmitMerged = async () => {
                const undecided = mergedItems.filter((m) => !itemDecisions["merged_" + m.key]?.status);
                if (undecided.length > 0) {
                  Swal.fire({ icon: 'warning', title: 'Belum Lengkap', text: `Masih ada ${undecided.length} barang belum diputuskan.`, confirmButtonColor: '#3b82f6' });
                  return;
                }

                try {
                  setProcessingId("merged");
                  // For each pengajuan in this unit, submit revisi + status
                  for (const p of unitPengajuan) {
                    const items = (p.items || []).map((item) => {
                      const key = item.barang_id || item.barang?.id || item.id;
                      const decision = itemDecisions["merged_" + key];
                      const mItem = mergedItems.find((m) => m.key === key) || {};
                      const vals = getMergedValues(mItem);

                      let prop = 1;
                      if (mItem.totalDiajukan > 0) {
                        prop = item.jumlah_diajukan / mItem.totalDiajukan;
                      } else {
                        const index = (mItem.sourceItems || []).findIndex(si => si.itemId === item.id);
                        prop = index === 0 ? 1 : 0;
                      }

                      const qtyDisetujui = decision?.status === 'approved' ? Math.round(vals.diajukan * prop) : 0;
                      const kebTotal = Math.round(vals.kebutuhan * prop);
                      const sStok = Math.round(vals.sisa * prop);

                      return {
                        id: item.id,
                        jumlah_disetujui: qtyDisetujui,
                        kebutuhan_total: kebTotal,
                        sisa_stok: sStok,
                        catatan_revisi: decision?.catatan || (decision?.status === 'rejected' ? 'Ditolak oleh Admin' : ''),
                      };
                    });

                    await fetch(`${API_BASE}/pengajuan/${p.id}/revisi`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
                      body: JSON.stringify({ actor_user_id: currentUser.id, items }),
                    });

                    const allRejectedForP = items.every((i) => i.jumlah_disetujui === 0);
                    const statusRes = await fetch(`${API_BASE}/pengajuan/${p.id}/status`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
                      body: JSON.stringify({
                        status: allRejectedForP ? 'ditolak_admin' : 'diverifikasi_admin',
                        user_id: currentUser.id,
                        catatan_admin: allRejectedForP ? 'Semua barang ditolak oleh Admin' : undefined
                      }),
                    });

                    if (!statusRes.ok) {
                      const errJson = await statusRes.json().catch(() => ({}));
                      console.error('Gagal update status:', errJson);
                      Swal.fire({ icon: 'error', title: 'Gagal Update Status', text: errJson.message || 'Gagal mengubah status pengajuan.', confirmButtonColor: '#ef4444' });
                      return;
                    }
                  }

                  Swal.fire({ icon: 'success', title: 'Verifikasi Berhasil!', text: 'Semua pengajuan unit ini telah diverifikasi.', confirmButtonColor: '#10b981' })
                    .then(() => window.location.reload());
                } catch (err) {
                  console.error(err);
                  Swal.fire({ icon: 'error', title: 'Gagal', text: 'Terjadi kesalahan saat memproses.', confirmButtonColor: '#ef4444' });
                } finally {
                  setProcessingId(null);
                }
              };

              const inputStyle = {
                width: "70px", padding: "6px 8px", fontSize: "13px",
                border: "1px solid #cbd5e1", borderRadius: "6px",
                textAlign: "center", fontWeight: 600,
                background: "#f8fafc", color: "#0f172a",
                outline: "none", transition: "border-color 0.15s ease"
              };

              const btnBack = (onClick, label) => (
                <button type="button" onClick={onClick}
                  style={{ background: "linear-gradient(135deg, #64748b, #475569)", color: "#fff", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: "none", display: "flex", alignItems: "center", gap: "6px" }}
                >{label}</button>
              );

              return (
                <>
                  {/* ===== SUB-VIEW A: DETAIL UNIT (daftar user & barang, info saja) ===== */}
                  {!isVerifMode && (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
                        {btnBack(() => setActiveUnitView(null), "Kembali")}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>{unitName}</div>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>Daftar pengajuan dari unit ini ({unitPengajuan.length} pengajuan)</div>
                        </div>
                        {filterStatus === "diajukan" && unitPengajuan.length > 0 && (
                          <button type="button" onClick={() => setActiveUnitView("VERIF:" + unitName)}
                            style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", padding: "10px 20px", borderRadius: "10px", fontSize: "13px", fontWeight: 700, cursor: "pointer", border: "none", boxShadow: "0 4px 12px rgba(16,185,129,0.3)" }}
                          >
                            Mulai Verifikasi
                          </button>
                        )}
                      </div>

                      {unitPengajuan.length === 0 ? (
                        <p style={{ color: "#64748b" }}>Tidak ada pengajuan dari unit ini.</p>
                      ) : (
                        unitPengajuan.map((p) => (
                          <div key={p.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderLeft: "4px solid #0284c7", borderRadius: "12px", padding: "20px 24px", marginBottom: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", paddingBottom: "10px", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap", gap: "10px" }}>
                              <div>
                                <div style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>{p.nama_pemohon}</div>
                                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                                  Jabatan: <b>{p.jabatan}</b> • Tanggal: <b>{p.created_at ? new Date(p.created_at).toLocaleString("id-ID") : "-"}</b>
                                </div>
                              </div>
                              {renderStatusBadge(p.status)}
                            </div>
                            <div style={{ overflowX: "auto" }}>
                              <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
                                <thead>
                                  <tr>
                                    <th>BARANG</th>
                                    <th>SATUAN</th>
                                    <th>KEBUTUHAN</th>
                                    <th>SISA STOK</th>
                                    <th>DIAJUKAN</th>
                                    {p.status !== "diajukan" && (
                                      <th>DISETUJUI</th>
                                    )}
                                  </tr>
                                </thead>
                                <tbody>
                                  {(p.items || []).map((item) => (
                                    <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                      <td style={{ padding: "8px 12px", fontWeight: 600 }}>{item.barang?.nama || "Barang"}</td>
                                      <td style={{ padding: "8px 12px" }}>{item.barang?.satuan || "pcs"}</td>
                                      <td style={{ padding: "8px 12px" }}>{item.kebutuhan_total}</td>
                                      <td style={{ padding: "8px 12px" }}>{item.sisa_stok}</td>
                                      <td style={{ padding: "8px 12px", fontWeight: 700, color: "#2563eb" }}>{item.jumlah_diajukan}</td>
                                      {p.status !== "diajukan" && (
                                        <td style={{ padding: "8px 12px", fontWeight: 700, color: item.jumlah_disetujui === 0 ? "#ef4444" : "#10b981" }}>
                                          {item.jumlah_disetujui ?? item.jumlah_diajukan}
                                        </td>
                                      )}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))
                      )}
                    </>
                  )}

                  {/* ===== SUB-VIEW B: VERIFIKASI (merged items, no user names) ===== */}
                  {isVerifMode && (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
                        {btnBack(() => setActiveUnitView(unitName), "Kembali ke Detail")}
                        <div>
                          <div style={{ fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>Verifikasi — {unitName}</div>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>
                            Barang yang sama dari semua user sudah dijumlahkan. Edit, setujui atau tolak tiap barang.
                          </div>
                        </div>
                        <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                          <button
                            type="button"
                            onClick={handleApproveAllMerged}
                            style={{
                              background: "#dcfce7",
                              color: "#166534",
                              border: "1px solid #86efac",
                              padding: "8px 14px",
                              borderRadius: "8px",
                              fontWeight: 700,
                              fontSize: "12px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            Setujui Semua
                          </button>
                          <button
                            type="button"
                            onClick={handleRejectAllMerged}
                            style={{
                              background: "#fee2e2",
                              color: "#991b1b",
                              border: "1px solid #fca5a5",
                              padding: "8px 14px",
                              borderRadius: "8px",
                              fontWeight: 700,
                              fontSize: "12px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            Tolak Semua
                          </button>
                        </div>
                      </div>

                      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
                            <thead>
                              <tr>
                                <th>BARANG</th>
                                <th>SATUAN</th>
                                <th style={{ textAlign: "center" }}>TOTAL KEBUTUHAN</th>
                                <th style={{ textAlign: "center" }}>TOTAL SISA STOK</th>
                                <th style={{ textAlign: "center" }}>TOTAL DIAJUKAN</th>
                                <th style={{ textAlign: "center" }}>KEPUTUSAN</th>
                              </tr>
                            </thead>
                            <tbody>
                              {mergedItems.map((m) => {
                                const mKey = "merged_" + m.key;
                                const decision = itemDecisions[mKey]?.status || null;
                                const vals = getMergedValues(m);
                                const rowBg = decision === 'approved' ? '#f0fdf4' : decision === 'rejected' ? '#fef2f2' : '#ffffff';
                                return (
                                  <React.Fragment key={m.key}>
                                    <tr style={{ borderBottom: "1px solid #f1f5f9", backgroundColor: rowBg, transition: "background-color 0.2s ease" }}>
                                      <td style={{ padding: "10px 12px", fontWeight: 600, fontSize: "14px" }}>{m.nama}</td>
                                      <td style={{ padding: "10px 12px" }}>{m.satuan}</td>
                                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                                        <input type="number" min="0" value={vals.kebutuhan}
                                          onChange={(e) => setItemEdit("merged_" + m.key, 'kebutuhan', e.target.value)}
                                          style={inputStyle}
                                          onFocus={(e) => (e.target.style.borderColor = '#0284c7')}
                                          onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
                                        />
                                      </td>
                                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                                        <input type="number" min="0" value={vals.sisa}
                                          onChange={(e) => setItemEdit("merged_" + m.key, 'sisa', e.target.value)}
                                          style={inputStyle}
                                          onFocus={(e) => (e.target.style.borderColor = '#0284c7')}
                                          onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
                                        />
                                      </td>
                                      <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: "#2563eb", fontSize: "15px" }}>
                                        {vals.diajukan}
                                      </td>
                                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                                        <div style={{ display: "flex", gap: "6px", justifyContent: "center", alignItems: "center" }}>
                                          <button type="button" onClick={() => setItemDecision(mKey, 'approved')} title="Setujui"
                                            style={{ height: "36px", padding: "0 12px", borderRadius: "8px", border: decision === 'approved' ? "2px solid #10b981" : "2px solid #d1d5db", background: decision === 'approved' ? "#10b981" : "#fff", color: decision === 'approved' ? "#fff" : "#9ca3af", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s ease" }}
                                          >Setujui</button>
                                          <button type="button" onClick={() => setItemDecision(mKey, 'rejected')} title="Tolak"
                                            style={{ height: "36px", padding: "0 12px", borderRadius: "8px", border: decision === 'rejected' ? "2px solid #ef4444" : "2px solid #d1d5db", background: decision === 'rejected' ? "#ef4444" : "#fff", color: decision === 'rejected' ? "#fff" : "#9ca3af", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s ease" }}
                                          >Tolak</button>
                                        </div>
                                      </td>
                                    </tr>
                                    {/* Catatan penolakan */}
                                    {decision === 'rejected' && (
                                      <tr style={{ backgroundColor: "#fef2f2" }}>
                                        <td colSpan="6" style={{ padding: "4px 12px 10px 12px" }}>
                                          <input type="text" placeholder="Alasan penolakan (opsional)"
                                            value={itemDecisions[mKey]?.catatan || ''}
                                            onChange={(e) => setItemCatatan(mKey, e.target.value)}
                                            style={{ width: "100%", padding: "6px 10px", fontSize: "12px", border: "1px solid #fca5a5", borderRadius: "6px", background: "#fff5f5", color: "#b91c1c", outline: "none" }}
                                          />
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* SUBMIT */}
                        <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", paddingTop: "16px", borderTop: "1px solid #f1f5f9" }}>
                          <div style={{ fontSize: "13px", color: "#64748b" }}>
                            {mergedDecidedCount} / {mergedItems.length} barang sudah diputuskan
                          </div>
                          <button type="button" disabled={!allMergedDecided || processingId === "merged"} onClick={handleSubmitMerged}
                            style={{
                              background: allMergedDecided ? "linear-gradient(135deg, #10b981, #059669)" : "#d1d5db",
                              color: allMergedDecided ? "#fff" : "#9ca3af",
                              padding: "12px 28px", borderRadius: "10px", fontSize: "14px", fontWeight: 700,
                              cursor: allMergedDecided ? "pointer" : "not-allowed", border: "none",
                              transition: "all 0.2s ease",
                              boxShadow: allMergedDecided ? "0 4px 12px rgba(16,185,129,0.3)" : "none"
                            }}
                          >
                            {processingId === "merged" ? "Memproses..." : "Kirim Hasil Verifikasi Unit"}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              );
            })()}

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