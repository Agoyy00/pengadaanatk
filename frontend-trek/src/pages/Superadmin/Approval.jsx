import DesktopSidebarToggle from '../../components/DesktopSidebarToggle';
import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import "../../css/layout.css";
import "../../css/tabel.css";
import RoleSwitcher from "../../components/RoleSwitcher";



const API_BASE = import.meta.env.VITE_API_BASE;
const token = localStorage.getItem("token");

import SidebarLogo from "../../components/SidebarLogo";
import useSupportUnread from "../../hooks/useSupportUnread";

export default function Approval() {
  const navigate = useNavigate();
  const location = useLocation();
  const { supportUnreadCount } = useSupportUnread("superadmin");
  const [pengajuan, setPengajuan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);

  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;

  const sidebarMenus = useMemo(() => {
    return [
      { label: "Dashboard Super Admin", to: "/dashboardsuperadmin" },
      { label: "Monitoring Admin & User", to: "/superadmin/monitoring"},
      { label: "Grafik Barang", to: "/superadmin/grafik-barang" },
      { label: "Grafik Belanja", to: "/superadmin/grafik-belanja" },
      { label: "Approval Pengajuan", to: "/approval", active: true},
      { label: "Tambah & Kelola User", to: "/tambahuser" },
      { label: "Atur Periode", to: "/periode" },
      { label: "Daftar Barang ATK", to: "/superadmin/daftar-barang" },
      { label: "Stock Opname Barang", to: "/stock-opname" },
      { label: "Support", to: "/support" },
    ];
  }, []);

  useEffect(() => {
    fetchPengajuan();
  }, []);

  const fetchPengajuan = async () => {
    try {
      setLoading(true);
      const freshToken = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/pengajuan` , {
        headers: {
          "Authorization": `Bearer ${freshToken}`,
        },
      });
      const json = await res.json();
      // Ambil semua pengajuan yang diverifikasi admin atau sudah disetujui/ditolak
      setPengajuan(json.filter(p => ["diverifikasi_admin", "disetujui", "ditolak_admin"].includes(p.status)));
    } catch (err) {
      console.error("Gagal memuat pengajuan:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatRole = (role) => {
    if (!role) return "-";

    return role
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const handleStatusUpdate = async (id, newStatus) => {
    if (!currentUser) {
  alert("User belum login");
  return;
}
    if (!window.confirm(`Ubah status pengajuan #${id} menjadi "${newStatus}"?`)) return;
    try {
      setProcessingId(id);

      const freshToken = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/pengajuan/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${freshToken}`,
        },
        body: JSON.stringify({
          status: newStatus,
          user_id: currentUser.id,
          role: currentUser.role, // ⬅️ INI JUGA WAJIB
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        Swal.fire({
          icon: "error",
          title: "Gagal Update",
          text: json.message || "Gagal update status",
          confirmButtonColor: "#ef4444",
        });
        return;
      }

      setPengajuan(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "Status pengajuan berhasil diubah.",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Kesalahan Jaringan",
        text: "Terjadi kesalahan saat mengupdate status.",
        confirmButtonColor: "#ef4444",
      });
    } finally {
      setProcessingId(null);
    }
  };
  console.log(currentUser.role); // harus superadmin
console.log(token); // harus ada


 const handleDownloadPdf = async (id) => {
  try {
    const res = await fetch(`${API_BASE}/superadmin/pengajuan/pdf/${id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/pdf",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Gagal download PDF:", text);
      Swal.fire({
        icon: "error",
        title: "Gagal Download",
        text: "Gagal mengunduh dokumen PDF.",
        confirmButtonColor: "#ef4444",
      });
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Approval-ATK-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

  } catch (err) {
    console.error("Fetch error:", err);
    Swal.fire({
      icon: "error",
      title: "Kesalahan Jaringan",
      text: "Terjadi kesalahan saat mendownload dokumen.",
      confirmButtonColor: "#ef4444",
    });
  }
};
  return (
    
    <div className="layout">
      <DesktopSidebarToggle isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      {/* SIDEBAR OVERLAY */}
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
            const isActive = location.pathname === m.to;
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
          onClick={() => {
            localStorage.removeItem("user");
            window.location.href = "/";
          }}
        >
          Log Out
        </div>
      </aside>

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
              <div className="topbar-title">Approval</div>
              <div className="topbar-sub">
                Selamat datang: {currentUser?.name || "Super Admin ATK"}
              </div>
            </div>
          </div>
          <div className="topbar-right">
            <span>Role: </span>
            <RoleSwitcher />
          </div>
        </header>

        <section className="main-content">
          <div className="card">
            <div className="card-title">Pengajuan Diverifikasi Admin</div>
            {loading && <p>Sedang memuat...</p>}
            {!loading && pengajuan.length === 0 && <p>Belum ada pengajuan.</p>}

            {!loading && pengajuan.length > 0 && (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Pemohon</th>
                      <th>Unit</th>
                      <th>Jabatan</th>
                      <th>Tahun</th>
                      <th>Total Jumlah</th>
                      <th>Status</th>
                      <th>Aksi</th>
                      <th>PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pengajuan.map((p) => (
                      <tr key={p.id}>
                        <td>{p.id}</td>
                        <td>{p.nama_pemohon}</td>
                        <td>{p.unit}</td>
                        <td>{p.jabatan}</td>
                        <td>{p.tahun_akademik}</td>
                        <td>{p.total_jumlah_diajukan}</td>
                        <td>{p.status}</td>
                        <td>
                          {p.status === "diverifikasi_admin" ? (
                            <>
                              <button
                                disabled={processingId === p.id}
                                onClick={() => handleStatusUpdate(p.id, "disetujui")}
                                style={{ backgroundColor: "#005826", color: "#ffffff", border: "none" }}
                              >
                                {processingId === p.id ? "Memproses..." : "Approve"}
                              </button>
                              <button
                                disabled={processingId === p.id}
                                onClick={() => handleStatusUpdate(p.id, "ditolak_admin")}
                                style={{ backgroundColor: "#dc2626", color: "#ffffff", border: "none", marginLeft: 6 }}
                              >
                                {processingId === p.id ? "Memproses..." : "Tolak"}
                              </button>
                            </>
                          ) : (
                            <span>Tidak ada aksi</span>
                          )}
                        </td>
                        <td>
                        {["disetujui", "ditolak_admin"].includes(p.status) && (
                          <button
                            onClick={() => handleDownloadPdf(p.id)}
                            style={{
                              backgroundColor: "#005826",
                              color: "#ffffff",
                              border: "none",
                              padding: "6px 12px",
                              fontSize: "13px",
                              cursor: "pointer",
                            }}
                          >
                            Download PDF
                          </button>
                        )}
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