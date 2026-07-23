import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../css/layout.css";
import "../../css/tabel.css";
import RoleSwitcher from "../../components/RoleSwitcher";

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

  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;

  const sidebarMenus = useMemo(() => {
    return [
      { label: "Dashboard Super Admin", to: "/dashboardsuperadmin" },
      { label: "Monitoring Admin", to: "/superadmin/monitoring-admin" },
      { label: "Monitoring User", to: "/superadmin/monitoring-user", active: true },
      { label: "Approval Pengajuan", to: "/approval" },
      { label: "Tambah & Kelola User", to: "/tambahuser" },
      { label: "Atur Periode", to: "/periode" },
      { label: "Daftar Barang ATK", to: "/superadmin/daftar-barang" },
      { label: "Grafik Belanja", to: "/superadmin/grafik-belanja" },
      { label: "Stock Opname Barang", to: "/stock-opname" },
      { label: "Template Dokumen", to: "/template-dokumen" },
    ];
  }, []);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/monitoring/user`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
      });
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error("Gagal memuat pengajuan user:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "diajukan":
        return "badge-warning";
      case "diverifikasi_admin":
        return "badge-info";
      case "disetujui":
        return "badge-success";
      case "ditolak_admin":
      case "ditolak":
        return "badge-danger";
      case "direvisi":
        return "badge-secondary";
      default:
        return "badge-primary";
    }
  };

  const formatStatus = (status) => {
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

  const uniqueStatuses = useMemo(() => {
    const statuses = requests.map((req) => req.status);
    return ["all", ...new Set(statuses)];
  }, [requests]);

  const formatRupiah = (number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(number);
  };

  return (
    <div className="layout">
      {/* ===================== SIDEBAR ===================== */}
      <aside className="sidebar">
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
      <main className="main">
        <header className="topbar">
          <div>
            <div className="topbar-title">Monitoring Pengajuan User</div>
            <div className="topbar-sub">
              Selamat datang: {currentUser?.name || "Super Admin"}
            </div>
          </div>
          <div className="topbar-right">
            <span>Role: </span>
            <RoleSwitcher />
          </div>
        </header>

        <section className="main-content">
          <div className="card">
            <div className="card-title">Daftar Pengajuan ATK User</div>
            <p style={{ marginBottom: 16 }}>
              Halaman ini memantau seluruh usulan ATK yang diajukan oleh user beserta status verifikasinya.
            </p>

            {/* Filter controls */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Cari pemohon, unit, atau jabatan..."
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
              <p>Tidak ada data pengajuan user yang ditemukan.</p>
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
