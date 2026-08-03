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
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all"); // "all", "done", "pending"
  
  // Extra data for detail modal lookup
  const [allRequests, setAllRequests] = useState([]);
  const [allStockOpnames, setAllStockOpnames] = useState([]);
  const [selectedLogGroup, setSelectedLogGroup] = useState(null);

  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;

  const sidebarMenus = useMemo(() => {
    return [
      { label: "Dashboard Super Admin", to: "/dashboardsuperadmin" },
      { label: "Monitoring Admin", to: "/superadmin/monitoring-admin", active: true },
      { label: "Monitoring User", to: "/superadmin/monitoring-user" },
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

  // Helper function to format full date & time (e.g. "Senin, 03 Aug 2026 • 10:57 WIB")
  const formatDateTimeIndo = (dateObj) => {
    if (!dateObj) return "";
    const hari = dateObj.toLocaleDateString("id-ID", { weekday: "long" });
    const tgl = dateObj.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
    const jam = dateObj.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).replace(".", ":");
    return `${hari}, ${tgl} • ${jam} WIB`;
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(number);
  };

  const CORE_ADMIN_TASKS = [
    {
      key: "verifikasi_pengajuan",
      name: "Verifikasi Pengajuan",
    },
    {
      key: "barang_create",
      name: "Tambah Barang Baru",
    },
    {
      key: "atur_periode",
      name: "Atur Periode Pengajuan",
    },
    {
      key: "stock_opname_verify",
      name: "Verifikasi Stock Opname",
    }
  ];

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

      // 2. Fetch Logs (Tugas Admin)
      const resLogs = await fetch(`${API_BASE}/monitoring/admin`, {
        headers: {
          "Authorization": `Bearer ${freshToken}`,
          "Accept": "application/json",
        },
      });
      const dataLogs = await resLogs.json();
      const logsList = dataLogs.success ? dataLogs.logs || [] : [];

      // 3. Fetch User Requests for detail lookup
      const resUserReqs = await fetch(`${API_BASE}/monitoring/user`, {
        headers: {
          "Authorization": `Bearer ${freshToken}`,
          "Accept": "application/json",
        },
      });
      const dataUserReqs = await resUserReqs.json();
      const reqList = dataUserReqs.success ? dataUserReqs.requests || [] : [];
      setAllRequests(reqList);

      // 4. Fetch Stock Opnames for detail lookup
      const resSO = await fetch(`${API_BASE}/stock-opname`, {
        headers: {
          "Authorization": `Bearer ${freshToken}`,
          "Accept": "application/json",
        },
      });
      const dataSO = await resSO.json();
      const soList = dataSO.success ? dataSO.data || [] : [];
      setAllStockOpnames(soList);

      // 5. Map logs & pending core tasks to each admin user
      const adminsWithLogs = adminUsers.map((admin) => {
        const parsedLogs = logsList
          .filter((log) => log.user_id === admin.id)
          .map((log) => {
            const logDate = parseSafeDate(log.created_at);

            // Check if log details or description indicate a rejection
            let detailsObj = {};
            if (typeof log.details === "string") {
              try {
                detailsObj = JSON.parse(log.details);
              } catch (e) {}
            } else if (typeof log.details === "object" && log.details !== null) {
              detailsObj = log.details;
            }

            const isRejected =
              detailsObj.status === "ditolak_admin" ||
              log.action === "tolak_pengajuan" ||
              (log.description || "").toLowerCase().includes("ditolak") ||
              (log.description || "").toLowerCase().includes("menolak");

            const actualTask = isRejected ? "tolak_pengajuan" : log.action;

            // Extract target ID from description
            const matchReq = (log.description || "").match(/Pengajuan #(\d+)/i);
            const reqId = matchReq ? parseInt(matchReq[1]) : (detailsObj.pengajuan_id || null);

            const matchSO = (log.description || "").match(/Stock Opname #(\d+)/i);
            const soId = matchSO ? parseInt(matchSO[1]) : (detailsObj.stock_opname_id || null);

            return {
              logId: log.id,
              adminName: admin.name,
              adminEmail: admin.email,
              waktu: logDate,
              tugas: actualTask,
              isRejected: isRejected,
              rawAction: log.action,
              rawDescription: log.description,
              detailsObj: detailsObj,
              reqId: reqId,
              soId: soId,
              dateTimeStr: formatDateTimeIndo(logDate),
            };
          })
          .sort((a, b) => b.waktu - a.waktu);

        // Group logs by task type (e.g. verifikasi_pengajuan, tolak_pengajuan)
        const groupedMap = {};
        parsedLogs.forEach((logItem) => {
          if (!groupedMap[logItem.tugas]) {
            groupedMap[logItem.tugas] = {
              id: `group-${logItem.tugas}-${admin.id}`,
              adminName: admin.name,
              adminEmail: admin.email,
              tugas: logItem.tugas,
              isRejected: logItem.isRejected,
              latestWaktu: logItem.waktu,
              dateTimeStr: logItem.dateTimeStr,
              count: 0,
              logs: [],
            };
          }
          groupedMap[logItem.tugas].count += 1;
          groupedMap[logItem.tugas].logs.push(logItem);
        });

        const adminCompletedGrouped = Object.values(groupedMap);

        // Find core tasks not performed by this admin
        const unperformedTasks = CORE_ADMIN_TASKS.filter((taskDef) => {
          return !adminCompletedGrouped.some((grp) => grp.tugas === taskDef.key);
        }).map((taskDef) => ({
          id: `pending-${taskDef.key}-${admin.id}`,
          tugas: taskDef.key,
        }));

        return {
          ...admin,
          completedTasks: adminCompletedGrouped,
          pendingTasks: unperformedTasks,
        };
      });

      setAdmins(adminsWithLogs);
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
      case "tolak_pengajuan":
        return "Penolakan Pengajuan";
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

  // Filter admins list for completed tasks based on search term
  const filteredAdminsCompleted = useMemo(() => {
    return admins.filter((admin) => {
      if (!admin.completedTasks || admin.completedTasks.length === 0) {
        return false;
      }

      const matchName = (admin.name || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchEmail = (admin.email || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchTasks = admin.completedTasks.some(
        (t) => (formatTugasName(t.tugas) || "").toLowerCase().includes(searchTerm.toLowerCase())
      );

      return matchName || matchEmail || matchTasks;
    });
  }, [admins, searchTerm]);

  // Filter admins list for pending tasks based on search term
  const filteredAdminsPending = useMemo(() => {
    return admins.filter((admin) => {
      if (!admin.pendingTasks || admin.pendingTasks.length === 0) {
        return false;
      }

      const matchName = (admin.name || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchEmail = (admin.email || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchTasks = admin.pendingTasks.some(
        (t) => (formatTugasName(t.tugas) || "").toLowerCase().includes(searchTerm.toLowerCase())
      );

      return matchName || matchEmail || matchTasks;
    });
  }, [admins, searchTerm]);

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
              Menampilkan tugas yang sudah dilakukan oleh setiap admin beserta tugas admin yang belum dilakukan.
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
                <option value="all">Semua Aktivitas Admin</option>
                <option value="done">Aktivitas Sudah Dilakukan</option>
                <option value="pending">Aktivitas Belum Dilakukan</option>
              </select>
            </div>

            {loading ? (
              <p>Sedang memuat data...</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
                
                {/* 1. TABEL AKTIVITAS ADMIN (SUDAH DILAKUKAN) */}
                {(filterType === "all" || filterType === "done") && (
                  <div>
                    <h3 style={{ margin: "0 0 12px 0", color: "#0f172a", fontSize: "16px", fontWeight: "700", borderLeft: "4px solid #16a34a", paddingLeft: "8px" }}>
                      Aktivitas Admin (Sudah Dilakukan)
                    </h3>
                    
                    {filteredAdminsCompleted.length === 0 ? (
                      <p style={{ color: "#64748b", fontStyle: "italic", fontSize: "13.5px", marginLeft: "12px" }}>
                        Tidak ada aktivitas admin selesai yang ditemukan.
                      </p>
                    ) : (
                      <div className="table-wrapper" style={{ overflowX: "auto", border: "1px solid #cbd5e1", borderRadius: "12px" }}>
                        <table style={{ minWidth: "750px", borderCollapse: "separate", borderSpacing: "0" }}>
                          <thead>
                            <tr>
                              <th style={{ width: "60px", padding: "16px", textAlign: "center", borderBottom: "2px solid #cbd5e1" }}>NO</th>
                              <th style={{ width: "280px", padding: "16px", borderBottom: "2px solid #cbd5e1" }}>ADMIN</th>
                              <th style={{ padding: "16px", borderBottom: "2px solid #cbd5e1" }}>TUGAS SUDAH DILAKUKAN</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredAdminsCompleted.map((admin, index) => {
                              return (
                                <tr key={admin.id} style={{ verticalAlign: "middle", background: index % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                                  <td style={{ 
                                    padding: "16px", 
                                    textAlign: "center", 
                                    fontWeight: "700", 
                                    color: "#64748b",
                                    borderBottom: index === filteredAdminsCompleted.length - 1 ? "none" : "1px solid #cbd5e1" 
                                  }}>
                                    {index + 1}
                                  </td>
                                  <td style={{ 
                                    padding: "16px",
                                    borderBottom: index === filteredAdminsCompleted.length - 1 ? "none" : "1px solid #cbd5e1"
                                  }}>
                                    <div>
                                      <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "14px" }}>{admin.name}</div>
                                      <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "1px" }}>{admin.email}</div>
                                    </div>
                                  </td>
                                  
                                  <td style={{ 
                                    padding: "12px 16px",
                                    borderBottom: index === filteredAdminsCompleted.length - 1 ? "none" : "1px solid #cbd5e1"
                                  }}>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                      {admin.completedTasks.map((t, idx) => (
                                        <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
                                          <span className={`badge ${t.isRejected ? "badge-red-premium" : "badge-green-premium"}`}>
                                            {formatTugasName(t.tugas)} {t.count > 1 ? `(${t.count})` : ""}
                                          </span>
                                          
                                          <button
                                            onClick={() => setSelectedLogGroup(t)}
                                            style={{
                                              padding: "5px 12px",
                                              backgroundColor: "#0284c7",
                                              color: "#ffffff",
                                              border: "none",
                                              borderRadius: "6px",
                                              fontSize: "12px",
                                              fontWeight: "600",
                                              cursor: "pointer",
                                              boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                                            }}
                                          >
                                            Lihat Detail ({t.count})
                                          </button>
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

                {/* 2. TABEL AKTIVITAS ADMIN (BELUM DILAKUKAN) */}
                {(filterType === "all" || filterType === "pending") && (
                  <div style={{ marginTop: filterType === "all" ? "16px" : "0" }}>
                    <h3 style={{ margin: "0 0 12px 0", color: "#0f172a", fontSize: "16px", fontWeight: "700", borderLeft: "4px solid #ea580c", paddingLeft: "8px" }}>
                      Aktivitas Admin (Belum Dilakukan)
                    </h3>
                    
                    {filteredAdminsPending.length === 0 ? (
                      <p style={{ color: "#16a34a", fontWeight: "600", fontSize: "13.5px", marginLeft: "12px" }}>
                        Luar biasa! Seluruh tugas admin telah dilaksanakan.
                      </p>
                    ) : (
                      <div className="table-wrapper" style={{ overflowX: "auto", border: "1px solid #cbd5e1", borderRadius: "12px" }}>
                        <table style={{ minWidth: "750px", borderCollapse: "separate", borderSpacing: "0" }}>
                          <thead>
                            <tr>
                              <th style={{ width: "60px", padding: "16px", textAlign: "center", borderBottom: "2px solid #cbd5e1" }}>NO</th>
                              <th style={{ width: "280px", padding: "16px", borderBottom: "2px solid #cbd5e1" }}>ADMIN</th>
                              <th style={{ padding: "16px", borderBottom: "2px solid #cbd5e1" }}>TUGAS BELUM DILAKUKAN</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredAdminsPending.map((admin, index) => {
                              return (
                                <tr key={admin.id} style={{ verticalAlign: "middle", background: index % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                                  <td style={{ 
                                    padding: "16px", 
                                    textAlign: "center", 
                                    fontWeight: "700", 
                                    color: "#64748b",
                                    borderBottom: index === filteredAdminsPending.length - 1 ? "none" : "1px solid #cbd5e1" 
                                  }}>
                                    {index + 1}
                                  </td>
                                  <td style={{ 
                                    padding: "16px",
                                    borderBottom: index === filteredAdminsPending.length - 1 ? "none" : "1px solid #cbd5e1"
                                  }}>
                                    <div>
                                      <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "14px" }}>{admin.name}</div>
                                      <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "1px" }}>{admin.email}</div>
                                    </div>
                                  </td>
                                  
                                  <td style={{ 
                                    padding: "12px 16px",
                                    borderBottom: index === filteredAdminsPending.length - 1 ? "none" : "1px solid #cbd5e1"
                                  }}>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                      {admin.pendingTasks.map((t, idx) => (
                                        <div key={idx}>
                                          <span className="badge badge-orange-premium">
                                            {formatTugasName(t.tugas)}
                                          </span>
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

              </div>
            )}
          </div>
        </section>
      </main>

      {/* ===================== DETAIL MODAL ===================== */}
      {selectedLogGroup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px"
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "800px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid #e2e8f0"
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: "20px 24px",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#f8fafc",
              borderTopLeftRadius: "16px",
              borderTopRightRadius: "16px"
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "17px", color: "#0f172a", fontWeight: "700" }}>
                  Rincian Detail {formatTugasName(selectedLogGroup.tugas)} ({selectedLogGroup.count} Aktivitas)
                </h3>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                  Admin Pelaksana: <strong>{selectedLogGroup.adminName}</strong> ({selectedLogGroup.adminEmail})
                </div>
              </div>
              <button
                onClick={() => setSelectedLogGroup(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#64748b",
                  fontWeight: "700"
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Content - List of Cards */}
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
              {selectedLogGroup.logs.map((logItem, logIdx) => {
                const currentRelatedRequest = logItem.reqId ? allRequests.find((r) => r.id === logItem.reqId) : null;
                const currentRelatedSO = logItem.soId ? allStockOpnames.find((s) => s.id === logItem.soId) : null;

                return (
                  <div key={logItem.logId} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    
                    {/* Header item index if > 1 */}
                    {selectedLogGroup.count > 1 && (
                      <div style={{ fontSize: "13px", fontWeight: "700", color: "#0284c7" }}>
                        Aktivitas ke-{selectedLogGroup.count - logIdx} • Waktu: {logItem.dateTimeStr}
                      </div>
                    )}

                    {/* SECTION: VERIFIKASI / PENOLAKAN PENGAJUAN */}
                    {(selectedLogGroup.tugas === "verifikasi_pengajuan" || selectedLogGroup.tugas === "tolak_pengajuan") && (
                      <div>
                        {currentRelatedRequest ? (
                          <div style={{
                            background: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderLeft: `4px solid ${logItem.isRejected ? "#dc2626" : "#0284c7"}`,
                            borderRadius: "12px",
                            padding: "20px 24px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                          }}>
                            {/* Card Header */}
                            <div style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: "14px",
                              paddingBottom: "10px",
                              borderBottom: "1px solid #f1f5f9",
                              flexWrap: "wrap",
                              gap: "10px"
                            }}>
                              <div>
                                <div style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                                  👤 {currentRelatedRequest.nama_pemohon}
                                </div>
                                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                                  Jabatan: <b>{currentRelatedRequest.jabatan || "-"}</b> • Fakultas: <b>{currentRelatedRequest.unit || "-"}</b> • Tanggal: <b>{logItem.dateTimeStr}</b>
                                </div>
                              </div>

                              {/* Status Badge Pill */}
                              <span style={{
                                padding: "4px 14px",
                                borderRadius: "9999px",
                                fontSize: "12px",
                                fontWeight: "700",
                                backgroundColor: logItem.isRejected ? "#ef4444" : "#3b82f6",
                                color: "#ffffff",
                                boxShadow: "0 1px 2px rgba(0,0,0,0.1)"
                              }}>
                                {currentRelatedRequest.status.replace(/_/g, " ").toUpperCase()}
                              </span>
                            </div>

                            {/* Dark Blue Header Table */}
                            <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                              <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
                                <thead>
                                  <tr style={{ background: "linear-gradient(135deg, #0f3854, #1e3a5f)", color: "#ffffff" }}>
                                    <th style={{ padding: "10px 14px", textAlign: "left", fontSize: "12px", fontWeight: 700 }}>BARANG</th>
                                    <th style={{ padding: "10px 14px", textAlign: "left", fontSize: "12px", fontWeight: 700 }}>SATUAN</th>
                                    <th style={{ padding: "10px 14px", textAlign: "center", fontSize: "12px", fontWeight: 700 }}>KEBUTUHAN</th>
                                    <th style={{ padding: "10px 14px", textAlign: "center", fontSize: "12px", fontWeight: 700 }}>SISA STOK</th>
                                    <th style={{ padding: "10px 14px", textAlign: "center", fontSize: "12px", fontWeight: 700 }}>DIAJUKAN</th>
                                    <th style={{ padding: "10px 14px", textAlign: "center", fontSize: "12px", fontWeight: 700 }}>DISETUJUI</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(currentRelatedRequest.items || []).map((item, idx) => (
                                    <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                                      <td style={{ padding: "10px 14px", fontWeight: 600, color: "#0f172a" }}>{item.barang?.nama || "Barang"}</td>
                                      <td style={{ padding: "10px 14px", color: "#64748b" }}>{item.barang?.satuan || "pcs"}</td>
                                      <td style={{ padding: "10px 14px", textAlign: "center" }}>{item.kebutuhan_total}</td>
                                      <td style={{ padding: "10px 14px", textAlign: "center" }}>{item.sisa_stok}</td>
                                      <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 700, color: "#2563eb" }}>{item.jumlah_diajukan}</td>
                                      <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 700, color: item.jumlah_disetujui === 0 ? "#ef4444" : "#10b981" }}>
                                        {item.jumlah_disetujui ?? item.jumlah_diajukan}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Catatan Verifikasi Admin jika ada */}
                            {currentRelatedRequest.catatan_admin && (
                              <div style={{ marginTop: "14px", padding: "12px", background: logItem.isRejected ? "#fef2f2" : "#f0fdf4", border: logItem.isRejected ? "1px solid #fecaca" : "1px solid #bbf7d0", borderRadius: "8px", fontSize: "13px" }}>
                                <strong style={{ color: logItem.isRejected ? "#dc2626" : "#15803d" }}>Catatan Verifikasi Admin:</strong>
                                <p style={{ margin: "4px 0 0 0", color: "#334155" }}>{currentRelatedRequest.catatan_admin}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ padding: "16px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "13px", color: "#64748b" }}>
                            Log Aksi #{logItem.logId}: "{logItem.rawDescription}" • Waktu: {logItem.dateTimeStr}
                          </div>
                        )}
                      </div>
                    )}

                    {/* SECTION: VERIFIKASI STOCK OPNAME */}
                    {selectedLogGroup.tugas === "stock_opname_verify" && (
                      <div style={{ padding: "16px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                        {currentRelatedSO ? (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
                            <div><strong>Pelapor / User:</strong> {currentRelatedSO.user?.name} ({currentRelatedSO.user?.email})</div>
                            <div><strong>Barang:</strong> {currentRelatedSO.barang?.nama}</div>
                            <div><strong>Stok Fisik:</strong> {currentRelatedSO.stok_fisik}</div>
                            <div><strong>Stok Sistem:</strong> {currentRelatedSO.stok_sistem}</div>
                            <div>
                              <strong>Selisih Stok:</strong>{" "}
                              <span style={{ color: currentRelatedSO.selisih < 0 ? "#dc2626" : "#16a34a", fontWeight: "700" }}>
                                {currentRelatedSO.selisih}
                              </span>
                            </div>
                            <div><strong>Status Verifikasi:</strong> <span style={{ fontWeight: "700", color: "#16a34a" }}>{currentRelatedSO.status.toUpperCase()}</span></div>
                            <div><strong>Waktu:</strong> {logItem.dateTimeStr}</div>
                          </div>
                        ) : (
                          <div style={{ fontSize: "13px", color: "#64748b" }}>
                            Log Aksi #{logItem.logId}: "{logItem.rawDescription}" • Waktu: {logItem.dateTimeStr}
                          </div>
                        )}
                      </div>
                    )}

                    {/* SECTION: TAMBAH BARANG BARU */}
                    {selectedLogGroup.tugas === "barang_create" && (
                      <div style={{ padding: "16px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "13.5px" }}>
                        <strong>Aksi Tambah Barang:</strong> {logItem.rawDescription}
                        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>Waktu: {logItem.dateTimeStr}</div>
                      </div>
                    )}

                    {/* SECTION: ATUR PERIODE */}
                    {selectedLogGroup.tugas === "atur_periode" && (
                      <div style={{ padding: "16px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "13.5px" }}>
                        <strong>Aksi Atur Periode:</strong> {logItem.rawDescription}
                        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>Waktu: {logItem.dateTimeStr}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: "16px 24px",
              borderTop: "1px solid #e2e8f0",
              textAlign: "right",
              background: "#f8fafc",
              borderBottomLeftRadius: "16px",
              borderBottomRightRadius: "16px"
            }}>
              <button
                onClick={() => setSelectedLogGroup(null)}
                style={{
                  padding: "8px 18px",
                  background: "#64748b",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "600"
                }}
              >
                Tutup Modal
              </button>
            </div>
          </div>
        </div>
      )}

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
        .badge-red-premium {
          background-color: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
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
