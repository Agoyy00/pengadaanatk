import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../css/layout.css";
import "../css/Barang.css";
import RoleSwitcher from "../components/RoleSwitcher";

const API_BASE = import.meta.env.VITE_API_BASE;
const token = localStorage.getItem("token");

const normalizeRole = (role) =>
  String(role || "")
    .toLowerCase()
    .replace(/[\s_]+/g, "");

export default function StockOpname() {
  const navigate = useNavigate();

  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const role = normalizeRole(currentUser?.role);

  // Safety Redirect
  useEffect(() => {
    if (!currentUser?.id) {
      navigate("/", { replace: true });
    }
  }, [currentUser, navigate]);

  const [opnames, setOpnames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [barangs, setBarangs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");

  // Form Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBarang, setSelectedBarang] = useState(null);
  const [stokFisik, setStokFisik] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [queryBarang, setQueryBarang] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [formError, setFormError] = useState("");

  const formatRole = (role) => {
    if (!role) return "-";
    return role
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Sidebar Menu depending on Role
  const sidebarMenus = useMemo(() => {
    if (role === "superadmin") {
      return [
        { label: "Dashboard Super Admin", to: "/dashboardsuperadmin" },
        { label: "Approval Pengajuan", to: "/approval" },
        { label: "Tambah & Kelola User", to: "/tambahuser" },
        { label: "Atur Periode", to: "/periode" },
        { label: "Daftar Barang ATK", to: "/superadmin/daftar-barang" },
        { label: "Grafik Belanja", to: "/superadmin/grafik-belanja" },
        { label: "Stock Opname Barang", to: "/stock-opname", active: true },
        { label: "Template Dokumen", to: "/template-dokumen" },
      ];
    } else if (role === "admin") {
      return [
        { label: "Dashboard Admin", to: "/dashboardadmin" },
        { label: "Verifikasi Pengajuan", to: "/verifikasi" },
        { label: "Kelola Barang ATK", to: "/kelola-barang" },
        { label: "Grafik Usulan Barang", to: "/grafik-usulan-barang" },
        { label: "Stock Opname Barang", to: "/stock-opname", active: true },
        { label: "Template Dokumen", to: "/template-dokumen" },
      ];
    } else {
      return [
        { label: "Dashboard User", to: "/dashboarduser" },
        { label: "Buat Pengajuan Baru", to: "/pengajuan" },
        { label: "Riwayat Pengajuan", to: "/riwayat" },
        { label: "Stock Opname Barang", to: "/stock-opname", active: true },
        { label: "Template Dokumen", to: "/template-dokumen" },
      ];
    }
  }, [role]);

  // Load Laporan Stock Opname
  const loadOpnames = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/stock-opname`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
      });
      const data = await res.json();
      if (data.success) {
        setOpnames(data.data || []);
      }
    } catch (e) {
      console.error("Gagal memuat stock opname:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOpnames();
  }, []);

  // Search barang inside modal (debounce)
  useEffect(() => {
    if (!queryBarang.trim()) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setLoadingSearch(true);
        const res = await fetch(`${API_BASE}/barang?q=${encodeURIComponent(queryBarang)}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json",
          },
        });
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Gagal memuat barang:", err);
      } finally {
        setLoadingSearch(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [queryBarang]);

  const openCreate = () => {
    setSelectedBarang(null);
    setStokFisik("");
    setKeterangan("");
    setQueryBarang("");
    setSearchResults([]);
    setFormError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const selectBarangItem = (b) => {
    setSelectedBarang(b);
    setQueryBarang("");
    setSearchResults([]);
  };

  // Submit stock opname
  const onSubmit = async () => {
    if (!selectedBarang) {
      setFormError("Pilih barang terlebih dahulu.");
      return;
    }
    if (stokFisik === "" || stokFisik === null) {
      setFormError("Stok fisik wajib diisi.");
      return;
    }
    if (Number(stokFisik) < 0) {
      setFormError("Stok fisik tidak boleh negatif.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/stock-opname`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
        body: JSON.stringify({
          barang_id: selectedBarang.id,
          stok_fisik: Number(stokFisik),
          keterangan: keterangan,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert("Laporan stock opname berhasil dikirim ✅");
        closeModal();
        loadOpnames();
      } else {
        setFormError(data.message || "Gagal mengirim laporan.");
      }
    } catch (err) {
      console.error(err);
      setFormError("Terjadi kesalahan server.");
    } finally {
      setLoading(false);
    }
  };

  // Admin verifies a report
  const handleVerify = async (id) => {
    const ok = window.confirm("Verifikasi laporan stock opname ini?");
    if (!ok) return;

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/stock-opname/${id}/verify`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
      });
      const data = await res.json();
      if (data.success) {
        alert("Laporan berhasil diverifikasi admin ✅");
        loadOpnames();
      } else {
        alert(data.message || "Gagal memverifikasi laporan.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan server.");
    } finally {
      setLoading(false);
    }
  };

  // Superadmin approves a report (which updates inventory stock)
  const handleApprove = async (id) => {
    const ok = window.confirm(
      "Setujui laporan stock opname ini? Tindakan ini akan memperbarui stok barang di inventaris secara otomatis."
    );
    if (!ok) return;

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/stock-opname/${id}/approve`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
      });
      const data = await res.json();
      if (data.success) {
        alert("Laporan disetujui & Stok inventaris diperbarui ✅");
        loadOpnames();
      } else {
        alert(data.message || "Gagal menyetujui laporan.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan server.");
    } finally {
      setLoading(false);
    }
  };

  // Admin/Superadmin rejects a report
  const handleReject = async (id) => {
    const ok = window.confirm("Tolak laporan stock opname ini?");
    if (!ok) return;

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/stock-opname/${id}/reject`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
      });
      const data = await res.json();
      if (data.success) {
        alert("Laporan ditolak ❌");
        loadOpnames();
      } else {
        alert(data.message || "Gagal menolak laporan.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan server.");
    } finally {
      setLoading(false);
    }
  };

  // Delete pending report
  const handleDelete = async (id) => {
    const ok = window.confirm("Hapus laporan stock opname pending ini?");
    if (!ok) return;

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/stock-opname/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
      });
      const data = await res.json();
      if (data.success) {
        alert("Laporan berhasil dihapus ✅");
        loadOpnames();
      } else {
        alert(data.message || "Gagal menghapus laporan.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan server.");
    } finally {
      setLoading(false);
    }
  };

  // Filter local state list
  const filteredOpnames = useMemo(() => {
    if (statusFilter === "all") return opnames;
    return opnames.filter((o) => o.status === statusFilter);
  }, [opnames, statusFilter]);

  // Status Pill Styling
  const getStatusPill = (status) => {
    let bg = "#f3f4f6";
    let text = "#374151";
    let label = "Pending";

    if (status === "verified") {
      bg = "#dbeafe";
      text = "#1e40af";
      label = "Terverifikasi Admin";
    } else if (status === "approved") {
      bg = "#dcfce7";
      text = "#14532d";
      label = "Disetujui Superadmin";
    } else if (status === "rejected") {
      bg = "#fee2e2";
      text = "#991b1b";
      label = "Ditolak";
    }

    return (
      <span
        style={{
          padding: "4px 10px",
          borderRadius: "9999px",
          fontSize: "12px",
          fontWeight: 600,
          backgroundColor: bg,
          color: text,
        }}
      >
        {label}
      </span>
    );
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
          onClick={() => {
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            window.location.href = "/";
          }}
          style={{ cursor: "pointer" }}
        >
          Log Out
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="main">
        {/* TOPBAR */}
        <header className="topbar">
          <div>
            <div className="topbar-title">Stock Opname Barang</div>
            <div className="topbar-sub">
              Sistem pencatatan dan penyesuaian stok fisik ATK
            </div>
          </div>

          <div className="topbar-right">
            <span style={{ marginRight: 8 }}>Pengguna: <b>{currentUser?.name}</b></span>
            <RoleSwitcher />
          </div>
        </header>

        {/* CONTENT */}
        <section className="main-content">
          <div className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 18 }}>Daftar Laporan Stock Opname</h3>
                <p style={{ margin: "4px 0 0 0", color: "#6b7280", fontSize: 14 }}>
                  Menampilkan laporan pencocokan stok fisik dengan sistem.
                </p>
              </div>

              {/* Action Button for User/Admin/Superadmin */}
              {(role === "user" || role === "admin" || role === "superadmin") && (
                <button
                  onClick={openCreate}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 10,
                    border: "none",
                    background: "#16a34a",
                    color: "white",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  ➕ Buat Laporan Stock Opname
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, overflowX: "auto", paddingBottom: 6 }}>
              {[
                { value: "all", label: "Semua Laporan" },
                { value: "pending", label: "Pending" },
                { value: "verified", label: "Terverifikasi Admin" },
                { value: "approved", label: "Disetujui Superadmin" },
                { value: "rejected", label: "Ditolak" },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: statusFilter === tab.value ? "none" : "1px solid #ddd",
                    background: statusFilter === tab.value ? "#2a5385" : "white",
                    color: statusFilter === tab.value ? "white" : "#4b5563",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Table or Loading */}
            {loading && <p>Memuat data laporan...</p>}

            {!loading && filteredOpnames.length === 0 && (
              <div style={{ padding: "40px 0", textAlign: "center", color: "#9ca3af" }}>
                Tidak ada laporan stock opname yang sesuai filter.
              </div>
            )}

            {!loading && filteredOpnames.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb", background: "#f9fafb" }}>
                      <th style={{ padding: "12px 16px" }}>Tanggal</th>
                      <th style={{ padding: "12px 16px" }}>Unit / Fakultas</th>
                      <th style={{ padding: "12px 16px" }}>Barang</th>
                      <th style={{ padding: "12px 16px", textAlign: "center" }}>Stok Sistem</th>
                      <th style={{ padding: "12px 16px", textAlign: "center" }}>Stok Fisik</th>
                      <th style={{ padding: "12px 16px", textAlign: "center" }}>Selisih</th>
                      <th style={{ padding: "12px 16px" }}>Status</th>
                      <th style={{ padding: "12px 16px" }}>Keterangan</th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOpnames.map((o) => {
                      const date = new Date(o.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      });
                      const selisihLabel = o.selisih > 0 ? `+${o.selisih}` : o.selisih;
                      const selisihColor = o.selisih === 0 ? "#374151" : o.selisih > 0 ? "#16a34a" : "#dc2626";

                      return (
                        <tr key={o.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "14px 16px", fontSize: 14 }}>{date}</td>
                          <td style={{ padding: "14px 16px", fontSize: 14 }}>
                            <div><b>{o.user?.name}</b></div>
                            <div style={{ fontSize: 12, color: "#6b7280" }}>{o.user?.fakultas || "Fakultas Yarsi"}</div>
                          </td>
                          <td style={{ padding: "14px 16px", fontSize: 14 }}>
                            <div><b>{o.barang?.nama || "Barang Terhapus"}</b></div>
                            <div style={{ fontSize: 12, color: "#9ca3af" }}>Kode: {o.barang?.kode}</div>
                          </td>
                          <td style={{ padding: "14px 16px", textAlign: "center", fontSize: 14 }}>
                            {o.stok_sistem}
                          </td>
                          <td style={{ padding: "14px 16px", textAlign: "center", fontSize: 14 }}>
                            {o.stok_fisik}
                          </td>
                          <td
                            style={{
                              padding: "14px 16px",
                              textAlign: "center",
                              fontWeight: 700,
                              color: selisihColor,
                              fontSize: 14,
                            }}
                          >
                            {selisihLabel}
                          </td>
                          <td style={{ padding: "14px 16px" }}>{getStatusPill(o.status)}</td>
                          <td style={{ padding: "14px 16px", fontSize: 13, color: "#4b5563", maxWidth: 150 }}>
                            {o.keterangan || "-"}
                          </td>
                          <td style={{ padding: "14px 16px", textAlign: "right" }}>
                            {/* User actions */}
                            {role === "user" && o.status === "pending" && (
                              <button
                                onClick={() => handleDelete(o.id)}
                                style={{
                                  padding: "6px 10px",
                                  fontSize: 12,
                                  borderRadius: 8,
                                  border: "1px solid #dc2626",
                                  background: "transparent",
                                  color: "#dc2626",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                Hapus
                              </button>
                            )}

                            {/* Admin actions */}
                            {role === "admin" && o.status === "pending" && (
                              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                <button
                                  onClick={() => handleVerify(o.id)}
                                  style={{
                                    padding: "6px 10px",
                                    fontSize: 12,
                                    borderRadius: 8,
                                    border: "none",
                                    background: "#2563eb",
                                    color: "white",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  Verifikasi
                                </button>
                                <button
                                  onClick={() => handleReject(o.id)}
                                  style={{
                                    padding: "6px 10px",
                                    fontSize: 12,
                                    borderRadius: 8,
                                    border: "1px solid #dc2626",
                                    background: "transparent",
                                    color: "#dc2626",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  Tolak
                                </button>
                              </div>
                            )}

                            {/* Superadmin actions */}
                            {role === "superadmin" && (o.status === "verified" || o.status === "pending") && (
                              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                <button
                                  onClick={() => handleApprove(o.id)}
                                  style={{
                                    padding: "6px 10px",
                                    fontSize: 12,
                                    borderRadius: 8,
                                    border: "none",
                                    background: "#16a34a",
                                    color: "white",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReject(o.id)}
                                  style={{
                                    padding: "6px 10px",
                                    fontSize: 12,
                                    borderRadius: 8,
                                    border: "1px solid #dc2626",
                                    background: "transparent",
                                    color: "#dc2626",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  Tolak
                                </button>
                              </div>
                            )}

                            {o.status !== "pending" && o.status !== "verified" && (
                              <span style={{ fontSize: 12, color: "#9ca3af" }}>Tidak ada aksi</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* CREATE MODAL */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-box-small" style={{ width: 560 }}>
            <button className="close-btn-small" onClick={closeModal}>
              ✖
            </button>

            <div style={{ padding: 16 }}>
              <h2 style={{ marginTop: 0 }}>Buat Laporan Stock Opname</h2>

              <label style={{ display: "block", marginTop: 10, marginBottom: 6 }}>
                <b>Cari Barang ATK</b>
              </label>
              
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  style={{
                    flex: 1,
                    padding: 10,
                    borderRadius: 10,
                    border: "1px solid #ddd",
                  }}
                  value={queryBarang}
                  onChange={(e) => setQueryBarang(e.target.value)}
                  placeholder="Ketik nama barang untuk mencari..."
                />
              </div>

              {/* Search Suggestions */}
              {loadingSearch && <p style={{ fontSize: 12, margin: "6px 0" }}>Mencari barang...</p>}
              
              {searchResults.length > 0 && (
                <div
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    maxHeight: 180,
                    overflowY: "auto",
                    marginTop: 6,
                    background: "white",
                  }}
                >
                  {searchResults.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => selectBarangItem(b)}
                      style={{
                        padding: "10px 12px",
                        cursor: "pointer",
                        borderBottom: "1px solid #f3f3f3",
                        fontSize: 14,
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) => (e.target.style.background = "#f3f4f6")}
                      onMouseLeave={(e) => (e.target.style.background = "white")}
                    >
                      <div><b>{b.nama}</b> (Kode: {b.kode})</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>
                        Stok Sistem: {b.stok} {b.satuan} | Rp {Number(b.harga_satuan).toLocaleString("id-ID")}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected Barang Info */}
              {selectedBarang && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 8,
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                  }}
                >
                  <div style={{ fontSize: 13, color: "#1e40af" }}>Barang Terpilih:</div>
                  <h4 style={{ margin: "4px 0" }}>{selectedBarang.nama}</h4>
                  <div style={{ display: "flex", gap: 20, marginTop: 6, fontSize: 13 }}>
                    <div>Kode: <b>{selectedBarang.kode}</b></div>
                    <div>Stok Terdaftar: <b>{selectedBarang.stok} {selectedBarang.satuan}</b></div>
                  </div>
                </div>
              )}

              {/* Stock count and discrepancy */}
              <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: 6 }}>
                    <b>Stok Fisik yang Ditemukan</b>
                  </label>
                  <input
                    type="number"
                    style={{
                      width: "100%",
                      padding: 10,
                      borderRadius: 10,
                      border: "1px solid #ddd",
                    }}
                    value={stokFisik}
                    onChange={(e) => setStokFisik(e.target.value)}
                    placeholder="Contoh: 10"
                    min="0"
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: 6 }}>
                    <b>Selisih Perhitungan</b>
                  </label>
                  <div
                    style={{
                      padding: 10,
                      borderRadius: 10,
                      border: "1px solid #ddd",
                      background: "#f9fafb",
                      fontWeight: 700,
                      color:
                        selectedBarang && stokFisik !== ""
                          ? Number(stokFisik) - selectedBarang.stok === 0
                            ? "#374151"
                            : Number(stokFisik) - selectedBarang.stok > 0
                            ? "#16a34a"
                            : "#dc2626"
                          : "#9ca3af",
                    }}
                  >
                    {selectedBarang && stokFisik !== ""
                      ? `${Number(stokFisik) - selectedBarang.stok > 0 ? "+" : ""}${
                          Number(stokFisik) - selectedBarang.stok
                        }`
                      : "Pilih barang & isi stok fisik"}
                  </div>
                </div>
              </div>

              {/* Keterangan */}
              <label style={{ display: "block", marginTop: 16, marginBottom: 6 }}>
                <b>Keterangan (Alasan Selisih / Kondisi Barang)</b>
              </label>
              <textarea
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  height: 80,
                  resize: "vertical",
                }}
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Contoh: Rusak 2 pcs terkena air, 3 pcs dipinjam ruangan lain..."
              />

              {formError && (
                <div style={{ color: "#ef4444", marginTop: 10, fontSize: 14 }}>
                  <b>⚠️ {formError}</b>
                </div>
              )}

              {/* Actions */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 20,
                }}
              >
                <button
                  onClick={closeModal}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    background: "white",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  Batal
                </button>

                <button
                  onClick={onSubmit}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "none",
                    cursor: "pointer",
                    background: "#16a34a",
                    color: "white",
                    fontWeight: 800,
                  }}
                >
                  Kirim Laporan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
