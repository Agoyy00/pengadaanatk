import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../css/layout.css";
import "../../css/tabel.css";
import RoleSwitcher from "../../components/RoleSwitcher";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function MonitoringAdmin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [admins, setAdmins] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pendingStockOpnames, setPendingStockOpnames] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all"); // "all", "done", "pending"

  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;

  const sidebarMenus = useMemo(() => {
    return [
      { label: "Dashboard Super Admin", to: "/dashboardsuperadmin" },
      { label: "Monitoring Admin", to: "/superadmin/monitoring-admin", active: true },
      { label: "Monitoring User", to: "/superadmin/monitoring-user" },
      { label: "Approval Pengajuan", to: "/approval" },
      { label: "Tambah & Kelola User", to: "/tambahuser" },
      { label: "Atur Periode", to: "/periode" },
      { label: "Daftar Barang ATK", to: "/superadmin/daftar-barang" },
      { label: "Grafik Belanja", to: "/superadmin/grafik-belanja" },
      { label: "Stock Opname Barang", to: "/stock-opname" },
      { label: "Template Dokumen", to: "/template-dokumen" },
    ];
  }, []);

  // Safe date parser to avoid browser-specific Invalid Date errors
  const parseSafeDate = (dateStr) => {
    if (!dateStr) return new Date();
    let formattedStr = dateStr;
    if (typeof dateStr === "string" && dateStr.includes(" ")) {
      formattedStr = dateStr.replace(" ", "T");
    }
    const date = new Date(formattedStr);
    return isNaN(date.getTime()) ? new Date() : date;
  };

  // Helper function to translate system descriptions to human-friendly language
  const formatHumanDescription = (desc, adminName) => {
    let formatted = desc;
    const name = adminName || "Admin";
    
    if (formatted.includes("Admin memproses Pengajuan")) {
      const match = formatted.match(/Pengajuan #(\d+)/);
      const id = match ? match[1] : "";
      formatted = `Telah memeriksa dan memverifikasi Pengajuan ATK #${id}`;
    } else if (formatted.includes("Admin melakukan aksi [CREATE] pada Barang")) {
      const barangName = formatted.split("Barang:")[1] || "";
      formatted = `Telah menambahkan barang baru "${barangName.trim()}" ke dalam sistem`;
    } else if (formatted.includes("Admin mengatur Periode Akademik")) {
      const match = formatted.match(/\[(.*?)\]/);
      const period = match ? match[1] : "";
      formatted = `Telah membuat dan membuka periode pengajuan baru (${period})`;
    } else if (formatted.includes("Admin memverifikasi Laporan Stock Opname")) {
      const match = formatted.match(/Stock Opname #(\d+)/);
      const id = match ? match[1] : "";
      formatted = `Telah memverifikasi laporan stock opname barang #${id}`;
    }
    
    return formatted;
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const freshToken = localStorage.getItem("token");

      // 1. Fetch Users to filter admins (role_id === 2)
      const resUsers = await fetch(`${API_BASE}/users`, {
        headers: {
          "Authorization": `Bearer ${freshToken}`,
          "Accept": "application/json",
        },
      });
      const dataUsers = await resUsers.json();
      const adminUsers = Array.isArray(dataUsers)
        ? dataUsers.filter((u) => u.role_id === 2 || (u.role && u.role.name === "admin"))
        : [];

      // 2. Fetch Logs (Tugas Sudah Dilakukan)
      const resLogs = await fetch(`${API_BASE}/monitoring/admin`, {
        headers: {
          "Authorization": `Bearer ${freshToken}`,
          "Accept": "application/json",
        },
      });
      const dataLogs = await resLogs.json();
      const logsList = dataLogs.success ? dataLogs.logs || [] : [];

      // Map logs to each admin user
      const adminsWithLogs = adminUsers.map((admin) => {
        const adminLogs = logsList
          .filter((log) => log.user_id === admin.id)
          .map((log) => ({
            id: log.id,
            waktu: parseSafeDate(log.created_at),
            tugas: log.action,
            deskripsi: formatHumanDescription(log.description, admin.name),
          }))
          .sort((a, b) => b.waktu - a.waktu);

        return {
          ...admin,
          completedTasks: adminLogs,
        };
      });

      setAdmins(adminsWithLogs);

      // 3. Fetch User Requests to filter 'diajukan' (Tugas Belum Dilakukan)
      const resUserReqs = await fetch(`${API_BASE}/monitoring/user`, {
        headers: {
          "Authorization": `Bearer ${freshToken}`,
          "Accept": "application/json",
        },
      });
      const dataUserReqs = await resUserReqs.json();
      const mappedRequests = dataUserReqs.success
        ? (dataUserReqs.requests || [])
            .filter((r) => r.status === "diajukan")
            .map((req) => ({
              id: `req-${req.id}`,
              waktu: parseSafeDate(req.created_at),
              tugas: "verifikasi_pengajuan",
              admin: "-",
              deskripsi: `Pengajuan ATK Baru #${req.id} dari pemohon "${req.nama_pemohon}" (${req.unit})`,
            }))
        : [];

      // 4. Fetch Stock Opnames to filter 'pending' (Tugas Belum Dilakukan)
      const resSO = await fetch(`${API_BASE}/stock-opname`, {
        headers: {
          "Authorization": `Bearer ${freshToken}`,
          "Accept": "application/json",
        },
      });
      const dataSO = await resSO.json();
      const mappedSOs = dataSO.success
        ? (dataSO.data || [])
            .filter((so) => so.status === "pending")
            .map((so) => ({
              id: `so-${so.id}`,
              waktu: parseSafeDate(so.created_at),
              tugas: "stock_opname_verify",
              admin: so.user?.name || "Staff",
              deskripsi: `Laporan Stock Opname #${so.id} barang "${so.barang?.nama || "Barang"}"`,
            }))
        : [];

      setPendingRequests(mappedRequests);
      setPendingStockOpnames(mappedSOs);
    } catch (err) {
      console.error("Gagal memuat data monitoring admin:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatTugasName = (tugas) => {
    if (!tugas) return "-";
    switch (tugas) {
      case "verifikasi_pengajuan":
        return "Verifikasi Pengajuan";
      case "barang_create":
        return "Tambah Barang Baru";
      case "atur_periode":
        return "Atur Periode Pengajuan";
      case "stock_opname_verify":
        return "Verifikasi Stock Opname";
      default:
        return tugas.replace(/_/g, " ").toUpperCase();
    }
  };

  // Filter admins list based on search term (always hide admins who have not done any tasks yet)
  const filteredAdmins = useMemo(() => {
    return admins.filter((admin) => {
      // Always hide admins with 0 completed tasks
      if (!admin.completedTasks || admin.completedTasks.length === 0) {
        return false;
      }

      const matchName = (admin.name || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchEmail = (admin.email || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchTasks = admin.completedTasks?.some(
        (t) =>
          (formatTugasName(t.tugas) || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (t.deskripsi || "").toLowerCase().includes(searchTerm.toLowerCase())
      );

      return matchName || matchEmail || matchTasks;
    });
  }, [admins, searchTerm]);

  // Combined list of all pending tasks in the system
  const allPendingTasks = useMemo(() => {
    return [...pendingRequests, ...pendingStockOpnames].sort((a, b) => b.waktu - a.waktu);
  }, [pendingRequests, pendingStockOpnames]);

  // Filter pending tasks based on search term
  const filteredPendingTasks = useMemo(() => {
    return allPendingTasks.filter((item) => {
      return (
        (item.deskripsi || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.admin || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (formatTugasName(item.tugas) || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [allPendingTasks, searchTerm]);

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
            <div className="topbar-title">Monitoring Tugas Admin</div>
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
            <div className="card-title">Tabel Pemantauan Kinerja Admin</div>
            <p className="card-subtitle">
              Menampilkan daftar tugas yang diselesaikan oleh setiap admin dan antrean tugas sistem yang perlu diproses.
            </p>

            {/* Filter controls */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Cari nama admin atau nama tugas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  width: "100%",
                  maxWidth: "400px",
                  fontSize: "13.5px",
                  boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                  outline: "none"
                }}
              />
              
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  minWidth: "220px",
                  fontSize: "13.5px",
                  boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                <option value="all">Semua Tugas</option>
                <option value="done">Tugas Sudah Dilakukan</option>
                <option value="pending">Tugas Belum Dilakukan</option>
              </select>
            </div>

            {loading ? (
              <p>Sedang memuat data...</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
                
                {/* 1. TABEL TUGAS SUDAH DILAKUKAN (PER ADMIN) */}
                {(filterType === "all" || filterType === "done") && (
                  <div>
                    <h3 style={{ margin: "0 0 12px 0", color: "#0f172a", fontSize: "16px", fontWeight: "700", borderLeft: "4px solid #16a34a", paddingLeft: "8px" }}>
                      Kinerja Admin (Tugas Sudah Dilakukan)
                    </h3>
                    
                    {filteredAdmins.length === 0 ? (
                      <p style={{ color: "#64748b", fontStyle: "italic", fontSize: "13.5px", marginLeft: "12px" }}>
                        Tidak ada data admin dengan tugas selesai.
                      </p>
                    ) : (
                      <div className="table-wrapper" style={{ overflowX: "auto", border: "1px solid #cbd5e1", borderRadius: "12px" }}>
                        <table style={{ minWidth: "1050px", borderCollapse: "separate", borderSpacing: "0" }}>
                          <thead>
                            <tr>
                              <th style={{ width: "60px", padding: "16px", textAlign: "center", borderBottom: "2px solid #cbd5e1" }}>NO</th>
                              <th style={{ width: "280px", padding: "16px", borderBottom: "2px solid #cbd5e1" }}>ADMIN</th>
                              <th style={{ width: "300px", padding: "16px", borderBottom: "2px solid #cbd5e1" }}>TUGAS YANG SUDAH DILAKUKAN</th>
                              <th style={{ padding: "16px", borderBottom: "2px solid #cbd5e1" }}>DESKRIPSI TUGAS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredAdmins.map((admin, index) => {
                              return (
                                <tr key={admin.id} style={{ verticalAlign: "middle", background: index % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                                  <td style={{ 
                                    padding: "16px", 
                                    textAlign: "center", 
                                    fontWeight: "700", 
                                    color: "#64748b",
                                    borderBottom: index === filteredAdmins.length - 1 ? "none" : "1px solid #cbd5e1" 
                                  }}>
                                    {index + 1}
                                  </td>
                                  <td style={{ 
                                    padding: "16px",
                                    borderBottom: index === filteredAdmins.length - 1 ? "none" : "1px solid #cbd5e1"
                                  }}>
                                    <div>
                                      <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "14px" }}>{admin.name}</div>
                                      <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "1px" }}>{admin.email}</div>
                                    </div>
                                  </td>
                                  
                                  {/* Spanned column containing clean horizontal divider lines between the completed task rows */}
                                  <td colSpan={2} style={{ 
                                    padding: "0 16px",
                                    borderBottom: index === filteredAdmins.length - 1 ? "none" : "1px solid #cbd5e1"
                                  }}>
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                      {admin.completedTasks.map((t, idx) => (
                                        <div key={idx} style={{ 
                                          display: "grid", 
                                          gridTemplateColumns: "300px 1fr", 
                                          alignItems: "center", 
                                          padding: "12px 0",
                                          borderBottom: idx === admin.completedTasks.length - 1 ? "none" : "1.5px solid #cbd5e1" 
                                        }}>
                                          <div>
                                            <span className="badge badge-green-premium">
                                              {formatTugasName(t.tugas)}
                                            </span>
                                          </div>
                                          <div style={{ fontSize: "13px", color: "#334155", paddingLeft: "16px" }}>
                                            {t.deskripsi}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. TABEL ANTREAN TUGAS BELUM DILAKUKAN (SISTEM) */}
                {(filterType === "all" || filterType === "pending") && (
                  <div style={{ marginTop: filterType === "all" ? "16px" : "0" }}>
                    <h3 style={{ margin: "0 0 12px 0", color: "#0f172a", fontSize: "16px", fontWeight: "700", borderLeft: "4px solid #ea580c", paddingLeft: "8px" }}>
                      Antrean Tugas Sistem (Tugas Belum Dilakukan)
                    </h3>
                    
                    {filteredPendingTasks.length === 0 ? (
                      <p style={{ color: "#16a34a", fontWeight: "600", fontSize: "13.5px", marginLeft: "12px" }}>
                        Semua selesai! Tidak ada antrean tugas tertunda.
                      </p>
                    ) : (
                      <div className="table-wrapper" style={{ overflowX: "auto", border: "1px solid #cbd5e1", borderRadius: "12px" }}>
                        <table style={{ minWidth: "750px", borderCollapse: "separate", borderSpacing: "0" }}>
                          <thead>
                            <tr>
                              <th style={{ width: "60px", padding: "16px", textAlign: "center", borderBottom: "2px solid #cbd5e1" }}>NO</th>
                              <th style={{ width: "240px", padding: "16px", borderBottom: "2px solid #cbd5e1" }}>ADMIN</th>
                              <th style={{ width: "280px", padding: "16px", borderBottom: "2px solid #cbd5e1" }}>TUGAS YANG BELUM DILAKUKAN</th>
                              <th style={{ padding: "16px", borderBottom: "2px solid #cbd5e1" }}>DESKRIPSI TUGAS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredPendingTasks.map((task, index) => (
                              <tr key={task.id || index} style={{ verticalAlign: "middle", background: index % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                                <td style={{ 
                                  padding: "16px", 
                                  textAlign: "center", 
                                  fontWeight: "700", 
                                  color: "#64748b",
                                  borderBottom: "1.5px solid #cbd5e1" 
                                }}>
                                  {index + 1}
                                </td>
                                <td style={{ 
                                  padding: "16px",
                                  borderBottom: "1.5px solid #cbd5e1",
                                  fontSize: "13.5px",
                                  fontWeight: "700",
                                  color: "#0f172a"
                                }}>
                                  {task.admin !== "-" ? (
                                    <span>{task.admin}</span>
                                  ) : (
                                    <span style={{ color: "#94a3b8", fontWeight: "normal", fontStyle: "italic" }}>Belum ditentukan</span>
                                  )}
                                </td>
                                <td style={{ 
                                  padding: "16px",
                                  borderBottom: "1.5px solid #cbd5e1"
                                }}>
                                  <span className="badge badge-orange-premium">
                                    {formatTugasName(task.tugas)}
                                  </span>
                                </td>
                                <td style={{ 
                                  padding: "16px",
                                  borderBottom: "1.5px solid #cbd5e1",
                                  fontSize: "13px",
                                  color: "#475569"
                                }}>
                                  {task.deskripsi}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}
          </div>
        </section>
      </main>

      <style>{`
        .badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          text-align: center;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }
        .badge-green-premium {
          background-color: #f0fdf4;
          color: #16a34a;
          border: 1px solid #bbf7d0;
        }
        .badge-orange-premium {
          background-color: #fff7ed;
          color: #ea580c;
          border: 1px solid #fed7aa;
        }
      `}</style>
    </div>
  );
}
