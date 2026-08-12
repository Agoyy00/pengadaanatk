import DesktopSidebarToggle from '../../components/DesktopSidebarToggle';
import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../css/layout.css";
import "../../css/tabel.css";
import RoleSwitcher from "../../components/RoleSwitcher";
import SidebarLogo from "../../components/SidebarLogo";
import Swal from "sweetalert2";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function MonitoringAdminUser({ defaultTab }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Tab state: "admin" | "user"
  const [activeTab, setActiveTab] = useState(() => {
    if (defaultTab) return defaultTab;
    if (location.pathname.includes("monitoring-user")) return "user";
    if (location.pathname.includes("monitoring-admin")) return "admin";
    return "admin";
  });

  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const token = localStorage.getItem("token");

  const sidebarMenus = useMemo(() => {
    return [
      { label: "Dashboard Super Admin", to: "/dashboardsuperadmin" },
      { label: "Monitoring Admin & User", to: "/superadmin/monitoring", active: true },
      { label: "Grafik Barang", to: "/superadmin/grafik-barang" },
      { label: "Grafik Belanja", to: "/superadmin/grafik-belanja" },
      { label: "Approval Pengajuan", to: "/approval" },
      { label: "Tambah & Kelola User", to: "/tambahuser" },
      { label: "Atur Periode", to: "/periode" },
      { label: "Daftar Barang ATK", to: "/superadmin/daftar-barang" },
      { label: "Stock Opname Barang", to: "/stock-opname" },
      { label: "Support", to: "/support" },
    ];
  }, []);

  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);

  // =========================================================
  // 🔹 STATE UNTUK MONITORING ADMIN
  // =========================================================
  const [loadingAdmin, setLoadingAdmin] = useState(true);
  const [admins, setAdmins] = useState([]);
  const [searchTermAdmin, setSearchTermAdmin] = useState("");
  const [filterTypeAdmin, setFilterTypeAdmin] = useState("all"); // "all", "done", "pending"
  const [allRequestsAdmin, setAllRequestsAdmin] = useState([]);
  const [allStockOpnamesAdmin, setAllStockOpnamesAdmin] = useState([]);
  const [selectedLogGroup, setSelectedLogGroup] = useState(null);

  // =========================================================
  // 🔹 STATE UNTUK MONITORING USER
  // =========================================================
  const [loadingUser, setLoadingUser] = useState(true);
  const [userRequests, setUserRequests] = useState([]);
  const [userStockOpnames, setUserStockOpnames] = useState([]);
  const [searchTermUser, setSearchTermUser] = useState("");
  const [statusFilterUser, setStatusFilterUser] = useState("all");
  const [selectedUserRequest, setSelectedUserRequest] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingSoId, setDeletingSoId] = useState(null);
  const [resettingUserId, setResettingUserId] = useState(null);

  // Helper date parsing
  const parseSafeDate = (dateStr) => {
    if (!dateStr) return new Date();
    let formattedStr = dateStr;
    if (typeof dateStr === "string" && dateStr.includes(" ")) {
      formattedStr = dateStr.replace(" ", "T");
    }
    const date = new Date(formattedStr);
    return isNaN(date.getTime()) ? new Date() : date;
  };

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
    { key: "verifikasi_pengajuan", name: "Verifikasi Pengajuan" },
    { key: "barang_create", name: "Tambah Barang Baru" },
    { key: "atur_periode", name: "Atur Periode Pengajuan" },
    { key: "stock_opname_verify", name: "Verifikasi Stock Opname" }
  ];

  // Load Data Admin
  useEffect(() => {
    fetchAdminData();
    fetchUserData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoadingAdmin(true);
      const freshToken = localStorage.getItem("token");

      const resUsers = await fetch(`${API_BASE}/users`, {
        headers: { "Authorization": `Bearer ${freshToken}`, "Accept": "application/json" }
      });
      const dataUsers = await resUsers.json();
      const adminUsers = Array.isArray(dataUsers)
        ? dataUsers.filter((u) => u.role_id === 2 || (u.role && u.role.name === "admin"))
        : [];

      const resLogs = await fetch(`${API_BASE}/monitoring/admin`, {
        headers: { "Authorization": `Bearer ${freshToken}`, "Accept": "application/json" }
      });
      const dataLogs = await resLogs.json();
      const logsList = dataLogs.success ? dataLogs.logs || [] : [];

      const resUserReqs = await fetch(`${API_BASE}/monitoring/user`, {
        headers: { "Authorization": `Bearer ${freshToken}`, "Accept": "application/json" }
      });
      const dataUserReqs = await resUserReqs.json();
      const reqList = dataUserReqs.success ? dataUserReqs.requests || [] : [];
      setAllRequestsAdmin(reqList);

      const resSO = await fetch(`${API_BASE}/stock-opname`, {
        headers: { "Authorization": `Bearer ${freshToken}`, "Accept": "application/json" }
      });
      const dataSO = await resSO.json();
      const soList = dataSO.success ? dataSO.data || [] : [];
      setAllStockOpnamesAdmin(soList);

      const adminsWithLogs = adminUsers.map((admin) => {
        const parsedLogs = logsList
          .filter((log) => log.user_id === admin.id)
          .map((log) => {
            const logDate = parseSafeDate(log.created_at);
            let detailsObj = {};
            if (typeof log.details === "string") {
              try { detailsObj = JSON.parse(log.details); } catch (e) {}
            } else if (typeof log.details === "object" && log.details !== null) {
              detailsObj = log.details;
            }

            const isRejected =
              detailsObj.status === "ditolak_admin" ||
              log.action === "tolak_pengajuan" ||
              (log.description || "").toLowerCase().includes("ditolak") ||
              (log.description || "").toLowerCase().includes("menolak");

            const actualTask = isRejected ? "tolak_pengajuan" : log.action;
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
      setLoadingAdmin(false);
    }
  };

  const fetchUserData = async () => {
    try {
      setLoadingUser(true);
      const freshToken = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/monitoring/user`, {
        headers: { "Authorization": `Bearer ${freshToken}`, "Accept": "application/json" }
      });
      const data = await res.json();
      if (data.success) setUserRequests(data.requests || []);

      const resSO = await fetch(`${API_BASE}/stock-opname`, {
        headers: { "Authorization": `Bearer ${freshToken}`, "Accept": "application/json" }
      });
      const dataSO = await resSO.json();
      if (dataSO.success) setUserStockOpnames(dataSO.data || []);
    } catch (err) {
      console.error("Gagal memuat data monitoring user:", err);
    } finally {
      setLoadingUser(false);
    }
  };

  // Format Nama Tugas Admin
  const formatTugasName = (tugas) => {
    if (!tugas) return "-";
    switch (tugas) {
      case "verifikasi_pengajuan": return "Verifikasi Pengajuan";
      case "tolak_pengajuan": return "Penolakan Pengajuan";
      case "barang_create": return "Tambah Barang Baru";
      case "atur_periode": return "Atur Periode Pengajuan";
      case "stock_opname_verify": return "Verifikasi Stock Opname";
      default: return tugas.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
  };

  // Filter Completed & Pending Admin
  const filteredAdminsCompleted = useMemo(() => {
    return admins.filter((admin) => {
      if (!admin.completedTasks || admin.completedTasks.length === 0) return false;
      const matchName = (admin.name || "").toLowerCase().includes(searchTermAdmin.toLowerCase());
      const matchEmail = (admin.email || "").toLowerCase().includes(searchTermAdmin.toLowerCase());
      const matchTasks = admin.completedTasks.some(
        (t) => (formatTugasName(t.tugas) || "").toLowerCase().includes(searchTermAdmin.toLowerCase())
      );
      return matchName || matchEmail || matchTasks;
    });
  }, [admins, searchTermAdmin]);

  const filteredAdminsPending = useMemo(() => {
    return admins.filter((admin) => {
      if (!admin.pendingTasks || admin.pendingTasks.length === 0) return false;
      const matchName = (admin.name || "").toLowerCase().includes(searchTermAdmin.toLowerCase());
      const matchEmail = (admin.email || "").toLowerCase().includes(searchTermAdmin.toLowerCase());
      const matchTasks = admin.pendingTasks.some(
        (t) => (formatTugasName(t.tugas) || "").toLowerCase().includes(searchTermAdmin.toLowerCase())
      );
      return matchName || matchEmail || matchTasks;
    });
  }, [admins, searchTermAdmin]);

  // Handlers untuk User Actions
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
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.message || "Gagal menghapus pengajuan");
      }
      setUserRequests((prev) => prev.filter((r) => r.id !== req.id));
      setSelectedUserRequest(null);

      Swal.fire({
        icon: "success",
        title: "Terhapus",
        text: "Pengajuan berhasil dihapus.",
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Gagal", text: err.message || "Terjadi kesalahan." });
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
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.message || "Gagal menghapus laporan stock opname");
      }
      setUserStockOpnames((prev) => prev.filter((s) => s.id !== so.id));

      Swal.fire({
        icon: "success",
        title: "Terhapus",
        text: "Laporan stock opname berhasil dihapus.",
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Gagal", text: err.message || "Terjadi kesalahan." });
    } finally {
      setDeletingSoId(null);
    }
  };

  const handleResetUnit = async (req) => {
    const userId = req.user?.id;
    if (!userId) {
      Swal.fire("Error", "Data user tidak ditemukan.", "error");
      return;
    }

    const result = await Swal.fire({
      title: "Reset Unit User?",
      html: `Unit milik <b>${req.nama_pemohon}</b> akan direset.<br>User akan bisa memilih unit baru saat submit berikutnya.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Reset",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      setResettingUserId(userId);
      const res = await fetch(`${API_BASE}/users/${userId}/reset-unit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.message || "Gagal mereset unit user.");
      }

      Swal.fire({
        icon: "success",
        title: "Unit Direset",
        text: `Unit ${req.nama_pemohon} berhasil direset.`,
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Gagal", text: err.message || "Terjadi kesalahan." });
    } finally {
      setResettingUserId(null);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "diajukan": case "pending": return "badge-warning";
      case "diverifikasi_admin": case "verified": return "badge-info";
      case "disetujui": case "approved": return "badge-success";
      case "ditolak_admin": case "ditolak": case "rejected": return "badge-danger";
      case "direvisi": return "badge-secondary";
      default: return "badge-primary";
    }
  };

  const formatStatus = (status) => {
    if (!status) return "-";
    return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const filteredUserRequests = useMemo(() => {
    return userRequests.filter((req) => {
      const matchSearch =
        (req.nama_pemohon || "").toLowerCase().includes(searchTermUser.toLowerCase()) ||
        (req.unit || "").toLowerCase().includes(searchTermUser.toLowerCase()) ||
        (req.jabatan || "").toLowerCase().includes(searchTermUser.toLowerCase());
      const matchStatus = statusFilterUser === "all" || req.status === statusFilterUser;
      return matchSearch && matchStatus;
    });
  }, [userRequests, searchTermUser, statusFilterUser]);

  const filteredUserStockOpnames = useMemo(() => {
    return userStockOpnames.filter((so) => {
      const userName = so.user?.name || "";
      const barangName = so.barang?.nama || "";
      const matchSearch =
        userName.toLowerCase().includes(searchTermUser.toLowerCase()) ||
        barangName.toLowerCase().includes(searchTermUser.toLowerCase());
      const matchStatus = statusFilterUser === "all" || so.status === statusFilterUser;
      return matchSearch && matchStatus;
    });
  }, [userStockOpnames, searchTermUser, statusFilterUser]);

  const uniqueUserStatuses = useMemo(() => {
    const statuses = [...userRequests.map((r) => r.status), ...userStockOpnames.map((s) => s.status)];
    return ["all", ...new Set(statuses)];
  }, [userRequests, userStockOpnames]);

  return (
    <div className="layout">
      <DesktopSidebarToggle isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      
      {/* SIDEBAR */}
      {isSidebarOpen && (
        <div className="sidebar-overlay open" onClick={() => setIsSidebarOpen(false)} />
      )}
      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <SidebarLogo />

        <nav className="sidebar-menu">
          {sidebarMenus.map((m) => {
            const isActive = m.active || location.pathname === m.to;
            return (
              <div
                key={m.label}
                className={`menu-item ${isActive ? "active" : ""}`}
                style={{ cursor: isActive ? "default" : "pointer" }}
                onClick={() => { if (!isActive) navigate(m.to); }}
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
              <div className="topbar-title">Monitoring Admin & User</div>
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
          {/* SUB-NAVBAR TABS */}
          <div style={{
            display: "flex",
            gap: "8px",
            marginBottom: "24px",
            background: "#ffffff",
            padding: "8px",
            borderRadius: "12px",
            border: "1px solid #cbd5e1",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            width: "fit-content"
          }}>
            <button
              type="button"
              onClick={() => setActiveTab("admin")}
              style={{
                padding: "10px 22px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: activeTab === "admin" ? 700 : 600,
                border: "none",
                cursor: "pointer",
                display: "inline-block",
                transition: "all 0.2s ease",
                background: activeTab === "admin" ? "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)" : "transparent",
                color: activeTab === "admin" ? "#ffffff" : "#64748b",
                boxShadow: activeTab === "admin" ? "0 4px 14px rgba(2, 132, 199, 0.35)" : "none",
                borderLeft: activeTab === "admin" ? "3.5px solid #d4af37" : "3.5px solid transparent"
              }}
            >
              Monitoring Admin
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("user")}
              style={{
                padding: "10px 22px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: activeTab === "user" ? 700 : 600,
                border: "none",
                cursor: "pointer",
                display: "inline-block",
                transition: "all 0.2s ease",
                background: activeTab === "user" ? "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)" : "transparent",
                color: activeTab === "user" ? "#ffffff" : "#64748b",
                boxShadow: activeTab === "user" ? "0 4px 14px rgba(2, 132, 199, 0.35)" : "none",
                borderLeft: activeTab === "user" ? "3.5px solid #d4af37" : "3.5px solid transparent"
              }}
            >
              Monitoring User
            </button>
          </div>

          {/* =================================================== */}
          {/* TAB 1: MONITORING ADMIN */}
          {/* =================================================== */}
          {activeTab === "admin" && (
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
                  value={searchTermAdmin}
                  onChange={(e) => setSearchTermAdmin(e.target.value)}
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
                  value={filterTypeAdmin}
                  onChange={(e) => setFilterTypeAdmin(e.target.value)}
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

              {loadingAdmin ? (
                <p>Sedang memuat data admin...</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
                  {/* TABEL AKTIVITAS ADMIN (SUDAH DILAKUKAN) */}
                  {(filterTypeAdmin === "all" || filterTypeAdmin === "done") && (
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
                              {filteredAdminsCompleted.map((admin, index) => (
                                <tr key={admin.id} style={{ verticalAlign: "middle", background: index % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                                  <td style={{ padding: "16px", textAlign: "center", fontWeight: "700", color: "#64748b", borderBottom: index === filteredAdminsCompleted.length - 1 ? "none" : "1px solid #cbd5e1" }}>
                                    {index + 1}
                                  </td>
                                  <td style={{ padding: "16px", borderBottom: index === filteredAdminsCompleted.length - 1 ? "none" : "1px solid #cbd5e1" }}>
                                    <div>
                                      <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "14px" }}>{admin.name}</div>
                                      <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "1px" }}>{admin.email}</div>
                                    </div>
                                  </td>
                                  <td style={{ padding: "12px 16px", borderBottom: index === filteredAdminsCompleted.length - 1 ? "none" : "1px solid #cbd5e1" }}>
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
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TABEL AKTIVITAS ADMIN (BELUM DILAKUKAN) */}
                  {(filterTypeAdmin === "all" || filterTypeAdmin === "pending") && (
                    <div style={{ marginTop: filterTypeAdmin === "all" ? "16px" : "0" }}>
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
                              {filteredAdminsPending.map((admin, index) => (
                                <tr key={admin.id} style={{ verticalAlign: "middle", background: index % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                                  <td style={{ padding: "16px", textAlign: "center", fontWeight: "700", color: "#64748b", borderBottom: index === filteredAdminsPending.length - 1 ? "none" : "1px solid #cbd5e1" }}>
                                    {index + 1}
                                  </td>
                                  <td style={{ padding: "16px", borderBottom: index === filteredAdminsPending.length - 1 ? "none" : "1px solid #cbd5e1" }}>
                                    <div>
                                      <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "14px" }}>{admin.name}</div>
                                      <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "1px" }}>{admin.email}</div>
                                    </div>
                                  </td>
                                  <td style={{ padding: "12px 16px", borderBottom: index === filteredAdminsPending.length - 1 ? "none" : "1px solid #cbd5e1" }}>
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
          )}

          {/* =================================================== */}
          {/* TAB 2: MONITORING USER */}
          {/* =================================================== */}
          {activeTab === "user" && (
            <div>
              {/* CARD PENGAJUAN ATK USER */}
              <div className="card">
                <div className="card-title">Daftar Pengajuan ATK User</div>
                <p style={{ marginBottom: 16 }}>
                  Halaman ini memantau seluruh usulan ATK yang diajukan oleh user beserta status verifikasinya.
                </p>

                <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
                  <input
                    type="text"
                    placeholder="Cari pemohon, unit, atau barang..."
                    value={searchTermUser}
                    onChange={(e) => setSearchTermUser(e.target.value)}
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
                    value={statusFilterUser}
                    onChange={(e) => setStatusFilterUser(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      minWidth: "150px",
                      fontSize: "13.5px"
                    }}
                  >
                    {uniqueUserStatuses.map((st) => (
                      <option key={st} value={st}>
                        {st === "all" ? "Semua Status" : formatStatus(st)}
                      </option>
                    ))}
                  </select>
                </div>

                {loadingUser ? (
                  <p>Sedang memuat data pengajuan...</p>
                ) : filteredUserRequests.length === 0 ? (
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
                          <th style={{ width: "150px" }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUserRequests.map((req, index) => (
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
                                onClick={() => setSelectedUserRequest(req)}
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
                                onClick={() => handleResetUnit(req)}
                                disabled={resettingUserId === req.user?.id}
                                style={{
                                  padding: "4px 8px",
                                  background: resettingUserId === req.user?.id ? "#94a3b8" : "#d97706",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: "4px",
                                  cursor: resettingUserId === req.user?.id ? "not-allowed" : "pointer",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  marginRight: "6px"
                                }}
                              >
                                {resettingUserId === req.user?.id ? "..." : "Reset Unit"}
                              </button>
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

                {loadingUser ? (
                  <p>Sedang memuat data stock opname...</p>
                ) : filteredUserStockOpnames.length === 0 ? (
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
                          <th>Status</th>
                          <th>Waktu Input</th>
                          <th style={{ width: "80px" }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUserStockOpnames.map((so, index) => (
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
                            <td>
                              <span className={`badge ${getStatusBadgeClass(so.status)}`}>
                                {formatStatus(so.status)}
                              </span>
                            </td>
                            <td style={{ fontSize: "12px", color: "#64748b" }}>
                              {so.created_at ? new Date(so.created_at).toLocaleString("id-ID", {
                                day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
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
            </div>
          )}
        </section>
      </main>

      {/* ===================== MODAL DETAIL ADMIN ===================== */}
      {selectedLogGroup && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(15, 23, 42, 0.5)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "16px"
        }}>
          <div style={{
            background: "#ffffff", borderRadius: "16px", width: "100%", maxWidth: "800px",
            maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", border: "1px solid #e2e8f0"
          }}>
            <div style={{
              padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex",
              alignItems: "center", justifyContent: "space-between", background: "#f8fafc",
              borderTopLeftRadius: "16px", borderTopRightRadius: "16px"
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
                style={{ background: "transparent", border: "none", fontSize: "20px", cursor: "pointer", color: "#64748b", fontWeight: "700" }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
              {selectedLogGroup.logs.map((logItem, logIdx) => {
                const currentRelatedRequest = logItem.reqId ? allRequestsAdmin.find((r) => r.id === logItem.reqId) : null;
                const currentRelatedSO = logItem.soId ? allStockOpnamesAdmin.find((s) => s.id === logItem.soId) : null;

                return (
                  <div key={logItem.logId} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {selectedLogGroup.count > 1 && (
                      <div style={{ fontSize: "13px", fontWeight: "700", color: "#0284c7" }}>
                        Aktivitas ke-{selectedLogGroup.count - logIdx} • Waktu: {logItem.dateTimeStr}
                      </div>
                    )}

                    {(selectedLogGroup.tugas === "verifikasi_pengajuan" || selectedLogGroup.tugas === "tolak_pengajuan") && (
                      <div>
                        {currentRelatedRequest ? (
                          <div style={{
                            background: "#ffffff", border: "1px solid #e2e8f0",
                            borderLeft: `4px solid ${logItem.isRejected ? "#dc2626" : "#0284c7"}`,
                            borderRadius: "12px", padding: "20px 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", paddingBottom: "10px", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap", gap: "10px" }}>
                              <div>
                                <div style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>{currentRelatedRequest.nama_pemohon}</div>
                                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                                  Jabatan: <b>{currentRelatedRequest.jabatan || "-"}</b> • Fakultas: <b>{currentRelatedRequest.unit || "-"}</b> • Tanggal: <b>{logItem.dateTimeStr}</b>
                                </div>
                              </div>
                              <span style={{
                                padding: "4px 14px", borderRadius: "9999px", fontSize: "12px", fontWeight: "700",
                                backgroundColor: logItem.isRejected ? "#ef4444" : "#3b82f6", color: "#ffffff"
                              }}>
                                {currentRelatedRequest.status ? String(currentRelatedRequest.status).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "-"}
                              </span>
                            </div>

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
                              <span style={{ color: currentRelatedSO.selisih < 0 ? "#dc2626" : "#16a34a", fontWeight: "700" }}>{currentRelatedSO.selisih}</span>
                            </div>
                            <div><strong>Status Verifikasi:</strong> <span style={{ fontWeight: "700", color: "#16a34a" }}>{formatStatus(currentRelatedSO.status)}</span></div>
                            <div><strong>Waktu:</strong> {logItem.dateTimeStr}</div>
                          </div>
                        ) : (
                          <div style={{ fontSize: "13px", color: "#64748b" }}>Log Aksi #{logItem.logId}: "{logItem.rawDescription}" • Waktu: {logItem.dateTimeStr}</div>
                        )}
                      </div>
                    )}

                    {(selectedLogGroup.tugas === "barang_create" || selectedLogGroup.tugas === "atur_periode") && (
                      <div style={{ padding: "16px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "13.5px" }}>
                        <strong>Aksi:</strong> {logItem.rawDescription}
                        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>Waktu: {logItem.dateTimeStr}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", textAlign: "right", background: "#f8fafc", borderBottomLeftRadius: "16px", borderBottomRightRadius: "16px" }}>
              <button
                onClick={() => setSelectedLogGroup(null)}
                style={{ padding: "8px 18px", background: "#64748b", color: "#ffffff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}
              >
                Tutup Modal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL DETAIL USER ===================== */}
      {selectedUserRequest && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0, 0, 0, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
        }}>
          <div style={{
            background: "#fff", padding: "24px", borderRadius: "8px", width: "90%", maxWidth: "800px",
            maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
          }}>
            <h3 style={{ marginTop: 0, borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
              Detail Item Pengajuan #{selectedUserRequest.id}
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px", fontSize: "13px" }}>
              <div><strong>Pemohon:</strong> {selectedUserRequest.nama_pemohon}</div>
              <div><strong>Status:</strong> {formatStatus(selectedUserRequest.status)}</div>
              <div><strong>Unit:</strong> {selectedUserRequest.unit}</div>
              <div><strong>Tahun Akademik:</strong> {selectedUserRequest.tahun_akademik}</div>
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
                  {(selectedUserRequest.items || []).map((item) => (
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
                onClick={() => setSelectedUserRequest(null)}
                style={{ padding: "8px 16px", background: "#64748b", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
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
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          text-align: center;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }
        .badge-green-premium { background-color: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
        .badge-red-premium { background-color: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
        .badge-orange-premium { background-color: #fff7ed; color: #ea580c; border: 1px solid #fed7aa; }
        .badge-warning { background-color: #fef3c7; color: #d97706; }
        .badge-info { background-color: #eff6ff; color: #2563eb; }
        .badge-success { background-color: #f0fdf4; color: #16a34a; }
        .badge-danger { background-color: #fef2f2; color: #dc2626; }
        .badge-secondary { background-color: #f1f5f9; color: #475569; }
      `}</style>
    </div>
  );
}
