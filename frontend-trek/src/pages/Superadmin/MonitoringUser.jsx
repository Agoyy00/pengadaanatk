import DesktopSidebarToggle from '../../components/DesktopSidebarToggle';
import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../css/layout.css";
import "../../css/tabel.css";
import RoleSwitcher from "../../components/RoleSwitcher";
import Swal from "sweetalert2";


const API_BASE = import.meta.env.VITE_API_BASE;
const token = localStorage.getItem("token");

export default function MonitoringUser() {
  const navigate = useNavigate();
  const location = useLocation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingSoId, setDeletingSoId] = useState(null);

  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;

  const sidebarMenus = useMemo(() => {
    return [
      { label: "Dashboard Super Admin", to: "/dashboardsuperadmin" },
      { label: "Monitoring Admin", to: "/superadmin/monitoring-admin" },
      { label: "Monitoring User", to: "/superadmin/monitoring-user", active: true },
      { label: "Grafik Barang", to: "/superadmin/grafik-barang" },
      { label: "Grafik Belanja", to: "/superadmin/grafik-belanja" },
      { label: "Approval Pengajuan", to: "/approval" },
      { label: "Tambah & Kelola User", to: "/tambahuser" },
      { label: "Atur Periode", to: "/periode" },
      { label: "Daftar Barang ATK", to: "/superadmin/daftar-barang" },
      { label: "Stock Opname Barang", to: "/stock-opname" },
      { label: "Template Dokumen", to: "/template-dokumen" },
    ];
  }, []);

  const [stockOpnames, setStockOpnames] = useState([]);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const freshToken = localStorage.getItem("token");

      // 1. Fetch Pengajuan ATK User
      const res = await fetch(`${API_BASE}/monitoring/user`, {
        headers: {
          "Authorization": `Bearer ${freshToken}`,
          "Accept": "application/json",
        },
      });
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests || []);
      }

      // 2. Fetch Stock Opname User
      const resSO = await fetch(`${API_BASE}/stock-opname`, {
        headers: {
          "Authorization": `Bearer ${freshToken}`,
          "Accept": "application/json",
        },
      });
      const dataSO = await resSO.json();
      if (dataSO.success) {
        setStockOpnames(dataSO.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat data monitoring user:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequest = async (req) => {
    const result = await Swal.fire({
      title: "Hapus Pengajuan?",
      html: `Anda akan menghapus pengajuan <b>${req.nama_pemohon}</b> (${req.tahun_akademik}).<br>Tindakan ini tidak dapat dibatalkan.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      setDeletingId(req.id);
      const res = await fetch(`${API_BASE}/pengajuan/${req.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        throw new Error(data.message || "Gagal menghapus pengajuan");
      }

      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      setSelectedRequest(null);

      Swal.fire({
        icon: "success",
        title: "Terhapus",
        text: "Pengajuan berhasil dihapus.",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: err.message || "Terjadi kesalahan saat menghapus pengajuan.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteStockOpname = async (so) => {
    const result = await Swal.fire({
      title: "Hapus Laporan Stock Opname?",
      html: `Anda akan menghapus laporan stock opname <b>${so.barang?.nama || 'Barang'}</b> oleh <b>${so.user?.name || 'User'}</b>.<br>Tindakan ini tidak dapat dibatalkan.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      setDeletingSoId(so.id);
      const res = await fetch(`${API_BASE}/stock-opname/${so.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        throw new Error(data.message || "Gagal menghapus laporan stock opname");
      }

      setStockOpnames((prev) => prev.filter((s) => s.id !== so.id));

      Swal.fire({
        icon: "success",
        title: "Terhapus",
        text: "Laporan stock opname berhasil dihapus.",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: err.message || "Terjadi kesalahan saat menghapus laporan stock opname.",
      });
    } finally {
      setDeletingSoId(null);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "diajukan":
      case "pending":
        return "badge-warning";
      case "diverifikasi_admin":
      case "verified":
        return "badge-info";
      case "disetujui":
      case "approved":
        return "badge-success";
      case "ditolak_admin":
      case "ditolak":
      case "rejected":
        return "badge-danger";
      case "direvisi":
        return "badge-secondary";
      default:
        return "badge-primary";
    }
  };

  const formatStatus = (status) => {
    if (!status) return "-";
    return status.replace(/_/g, " ").toUpperCase();
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const matchSearch =
        (req.nama_pemohon || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.unit || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.jabatan || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "all" || req.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [requests, searchTerm, statusFilter]);

  const filteredStockOpnames = useMemo(() => {
    return stockOpnames.filter((so) => {
      const userName = so.user?.name || "";
      const barangName = so.barang?.nama || "";
      const matchSearch =
        userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        barangName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "all" || so.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [stockOpnames, searchTerm, statusFilter]);

  const uniqueStatuses = useMemo(() => {
    const statuses = [...requests.map((r) => r.status), ...stockOpnames.map((s) => s.status)];
    return ["all", ...new Set(statuses)];
  }, [requests, stockOpnames]);

  const formatRupiah = (number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(number);
  };

  
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);

  return (
    <div className="layout">
      <DesktopSidebarToggle isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      {/* ===================== SIDEBAR ===================== */}
      {isSidebarOpen && (
        <div 
          className="sidebar-overlay open" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}
      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div>
          <div className="sidebar-logo">Sistem Pengajuan ATK</div>
          <div className="sidebar-subtitle">Universitas Yarsi</div>
        </div>

        <nav className="sidebar-menu">
          {sidebarMenus.map((m) => {
            const isActive = m.active || location.pathname === m.to;
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
              </div>
            );
          })}
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

      {/* ===================== MAIN ===================== */}
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
            <div className="topbar-title">Monitoring Pengajuan & Aktivitas User</div>
            <div className="topbar-sub">
              Selamat datang: {currentUser?.name || "Super Admin"}
            </div>
          </div>
          </div>
          <div className="topbar-right">
            <span>Role: </span>
            <RoleSwitcher />
          </div>
        </header>

        <section className="main-content">
          {/* CARD PENGAJUAN ATK USER */}
          <div className="card">
            <div className="card-title">Daftar Pengajuan ATK User</div>
            <p style={{ marginBottom: 16 }}>
              Halaman ini memantau seluruh usulan ATK yang diajukan oleh user beserta status verifikasinya.
            </p>

            {/* Filter controls */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Cari pemohon, unit, atau barang..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  flex: "1",
                  minWidth: "200px",
                  fontSize: "13.5px"
                }}
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  minWidth: "150px",
                  fontSize: "13.5px"
                }}
              >
                {uniqueStatuses.map((st) => (
                  <option key={st} value={st}>
                    {st === "all" ? "Semua Status" : formatStatus(st)}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <p>Sedang memuat data pengajuan...</p>
            ) : filteredRequests.length === 0 ? (
              <p style={{ color: "#64748b", fontStyle: "italic" }}>Tidak ada data pengajuan ATK user yang ditemukan.</p>
            ) : (
              <div className="table-wrapper">
                <table>
                   <thead>
                     <tr>
                       <th style={{ width: "60px" }}>No</th>
                       <th>Pemohon</th>
                       <th>Unit / Fakultas</th>
                       <th>Jabatan</th>
                       <th>Tahun Akademik</th>
                       <th>Total Nilai</th>
                       <th>Status</th>
                       <th style={{ width: "120px" }}>Detail</th>
                       <th style={{ width: "80px" }}>Aksi</th>
                     </tr>
                   </thead>
                   <tbody>
                     {filteredRequests.map((req, index) => (
                       <tr key={req.id}>
                         <td>{index + 1}</td>
                         <td>
                           <strong>{req.nama_pemohon}</strong>
                           <div style={{ fontSize: "11px", color: "#64748b" }}>{req.user?.email}</div>
                         </td>
                         <td>{req.unit}</td>
                         <td>{req.jabatan}</td>
                         <td>{req.tahun_akademik}</td>
                         <td>
                           <strong>{formatRupiah(req.total_nilai || 0)}</strong>
                           <div style={{ fontSize: "11px", color: "#64748b" }}>
                             {req.total_jumlah_diajukan} item diajukan
                           </div>
                         </td>
                         <td>
                           <span className={`badge ${getStatusBadgeClass(req.status)}`}>
                             {formatStatus(req.status)}
                           </span>
                         </td>
                         <td>
                           <button
                             onClick={() => setSelectedRequest(req)}
                             style={{
                               padding: "4px 8px",
                               background: "#0ea5e9",
                               color: "#fff",
                               border: "none",
                               borderRadius: "4px",
                               cursor: "pointer",
                               fontSize: "12px",
                               fontWeight: "600"
                             }}
                           >
                             Lihat Item
                           </button>
                         </td>
                         <td>
                           <button
                             onClick={() => handleDeleteRequest(req)}
                             disabled={deletingId === req.id}
                             style={{
                               padding: "4px 8px",
                               background: deletingId === req.id ? "#94a3b8" : "#dc2626",
                               color: "#fff",
                               border: "none",
                               borderRadius: "4px",
                               cursor: deletingId === req.id ? "not-allowed" : "pointer",
                               fontSize: "12px",
                               fontWeight: "600"
                             }}
                           >
                             {deletingId === req.id ? "..." : "Hapus"}
                           </button>
                         </td>
                       </tr>
                     ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* CARD STOCK OPNAME USER */}
          <div className="card" style={{ marginTop: "24px" }}>
            <div className="card-title">Daftar Laporan Stock Opname User</div>
            <p style={{ marginBottom: 16 }}>
              Halaman ini memantau seluruh input laporan Stock Opname fisik barang yang dimasukkan oleh user.
            </p>

            {loading ? (
              <p>Sedang memuat data stock opname...</p>
            ) : filteredStockOpnames.length === 0 ? (
              <p style={{ color: "#64748b", fontStyle: "italic" }}>Tidak ada data laporan stock opname user yang ditemukan.</p>
            ) : (
              <div className="table-wrapper">
                <table>
                   <thead>
                    <tr>
                      <th style={{ width: "60px" }}>No</th>
                      <th>Pemohon / User</th>
                      <th>Barang</th>
                      <th>Stok Fisik</th>
                      <th>Stok Sistem</th>
                      <th>Selisih</th>
                      <th>Keterangan</th>
                      <th>Status</th>
                      <th>Waktu Input</th>
                      <th style={{ width: "80px" }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStockOpnames.map((so, index) => (
                      <tr key={so.id}>
                        <td>{index + 1}</td>
                        <td>
                          <strong>{so.user?.name || "User"}</strong>
                          <div style={{ fontSize: "11px", color: "#64748b" }}>{so.user?.email}</div>
                        </td>
                        <td><strong>{so.barang?.nama || "Barang"}</strong></td>
                        <td>{so.stok_fisik}</td>
                        <td>{so.stok_sistem}</td>
                        <td>
                          <span style={{ color: so.selisih < 0 ? "#dc2626" : "#16a34a", fontWeight: "700" }}>
                            {so.selisih}
                          </span>
                        </td>
                        <td>{so.keterangan || "-"}</td>
                        <td>
                          <span className={`badge ${getStatusBadgeClass(so.status)}`}>
                            {formatStatus(so.status)}
                          </span>
                        </td>
                        <td style={{ fontSize: "12px", color: "#64748b" }}>
                          {so.created_at ? new Date(so.created_at).toLocaleString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          }) : "-"}
                        </td>
                        <td>
                          <button
                            onClick={() => handleDeleteStockOpname(so)}
                            disabled={deletingSoId === so.id}
                            style={{
                              padding: "4px 8px",
                              background: deletingSoId === so.id ? "#94a3b8" : "#dc2626",
                              color: "#fff",
                              border: "none",
                              borderRadius: "4px",
                              cursor: deletingSoId === so.id ? "not-allowed" : "pointer",
                              fontSize: "12px",
                              fontWeight: "600"
                            }}
                          >
                            {deletingSoId === so.id ? "..." : "Hapus"}
                          </button>
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

      {/* Items Detail Modal */}
      {selectedRequest && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "24px",
              borderRadius: "8px",
              width: "90%",
              maxWidth: "800px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h3 style={{ marginTop: 0, borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
              Detail Item Pengajuan #{selectedRequest.id}
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px", fontSize: "13px" }}>
              <div><strong>Pemohon:</strong> {selectedRequest.nama_pemohon}</div>
              <div><strong>Status:</strong> {formatStatus(selectedRequest.status)}</div>
              <div><strong>Unit:</strong> {selectedRequest.unit}</div>
              <div><strong>Tahun Akademik:</strong> {selectedRequest.tahun_akademik}</div>
            </div>

            <div className="table-wrapper">
              <table style={{ minWidth: "100%" }}>
                <thead>
                  <tr>
                    <th>Nama Barang</th>
                    <th>Keb. Total</th>
                    <th>Sisa Stok</th>
                    <th>Diajukan</th>
                    <th>Disetujui</th>
                    <th>Harga Satuan</th>
                    <th>Subtotal</th>
                    <th>Catatan Revisi</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedRequest.items || []).map((item) => (
                    <tr key={item.id}>
                      <td>{item.barang?.nama || "Barang Terhapus"}</td>
                      <td>{item.kebutuhan_total}</td>
                      <td>{item.sisa_stok}</td>
                      <td><strong>{item.jumlah_diajukan}</strong></td>
                      <td>
                        {item.jumlah_disetujui !== null ? (
                          <strong style={{ color: "#16a34a" }}>{item.jumlah_disetujui}</strong>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>-</span>
                        )}
                      </td>
                      <td>{formatRupiah(item.harga_satuan)}</td>
                      <td><strong>{formatRupiah(item.subtotal)}</strong></td>
                      <td>
                        {item.catatan_revisi ? (
                          <span style={{ color: "#dc2626", fontSize: "12px" }}>{item.catatan_revisi}</span>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "12px" }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ textAlign: "right", marginTop: "16px" }}>
              <button
                onClick={() => setSelectedRequest(null)}
                style={{
                  padding: "8px 16px",
                  background: "#64748b",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600"
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 700;
          text-align: center;
        }
        .badge-warning { background-color: #fef3c7; color: #d97706; }
        .badge-info { background-color: #eff6ff; color: #2563eb; }
        .badge-success { background-color: #f0fdf4; color: #16a34a; }
        .badge-danger { background-color: #fef2f2; color: #dc2626; }
        .badge-secondary { background-color: #f1f5f9; color: #475569; }
      `}</style>
    </div>
  );
}