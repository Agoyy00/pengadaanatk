import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../css/Pengajuan.css";

const API_BASE = "http://127.0.0.1:8000/api";

export default function DashboardSuperAdmin() {
  const navigate = useNavigate();

  // =========================
  // USER (localStorage)
  // =========================
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user?.id;
  const userRole = (user?.role || "").toLowerCase();

  // =========================
  // SECURITY GUARD
  // =========================
  useEffect(() => {
    // kalau belum login
    if (!userId) {
      navigate("/", { replace: true });
      return;
    }

    // kalau bukan superadmin, jangan boleh masuk
    if (userRole !== "superadmin") {
      alert("Akses ditolak. Halaman ini khusus SuperAdmin.");
      navigate("/", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =========================
  // NOTIFIKASI STATE
  // =========================
  const [notifications, setNotifications] = useState([]);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const [errorNotif, setErrorNotif] = useState("");

  // =========================
  // LOAD NOTIFIKASI
  // =========================
  useEffect(() => {
    if (!userId) return;

    async function loadNotif() {
      setLoadingNotif(true);
      setErrorNotif("");

      try {
        const res = await fetch(`${API_BASE}/notifications?user_id=${userId}`);
        const data = await res.json();

        // response yang diharapkan: { success: true, notifications: [] }
        setNotifications(data.notifications || []);
      } catch (err) {
        console.log("Gagal load notifikasi:", err);
        setErrorNotif("Gagal memuat notifikasi.");
      } finally {
        setLoadingNotif(false);
      }
    }

    loadNotif();
  }, [userId]);

  // =========================
  // MARK AS READ
  // =========================
  async function markAsRead(notifId) {
    try {
      await fetch(`${API_BASE}/notifications/${notifId}/read`, {
        method: "PATCH",
      });

      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.log("Gagal mark as read:", err);
    }
  }

  // =========================
  // Refresh manual
  // =========================
  async function refreshNotif() {
    if (!userId) return;

    setLoadingNotif(true);
    setErrorNotif("");

    try {
      const res = await fetch(`${API_BASE}/notifications?user_id=${userId}`);
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.log(err);
      setErrorNotif("Gagal memuat notifikasi.");
    } finally {
      setLoadingNotif(false);
    }
  }

  // Hitung jumlah unread
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // =========================
  // MENU SIDEBAR (RAPI)
  // =========================
  const sidebarMenus = useMemo(() => {
    return [
      { label: "Dashboard Super Admin", to: "/dashboardsuperadmin", active: true },

      { label: "Approval", to: "/approval" },
      { label: "Tambah User", to: "/tambahuser" },
      { label: "Atur Periode", to: "/periode" },

      // ✅ MENU BARU SUPERADMIN
      { label: "Daftar Barang ATK", to: "/superadmin/daftar-barang" },
      { label: "Grafik Belanja Unit", to: "/superadmin/grafik-belanja" },

      // menu lama (kalau masih dipakai)
      { label: "Grafik & Analisis Data", to: "/grafik" },
    ];
  }, []);

  return (
    <div className="layout">
      {/* ===================== SIDEBAR ===================== */}
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
            window.location.href = "/";
          }}
          style={{ cursor: "pointer" }}
        >
          Log Out
        </div>
      </aside>

      {/* ===================== MAIN ===================== */}
      <main className="main">
        {/* TOPBAR */}
        <header className="topbar">
          <div>
            <div className="topbar-title">Dashboard Super Admin</div>
            <div className="topbar-sub">
              Selamat datang: {user?.name || "Super Admin"}
            </div>
          </div>

          <div className="topbar-right">
            <span>Role:</span>
            <span className="role-pill">
              {user?.role ? String(user.role).toUpperCase() : "UNKNOWN"}
            </span>
          </div>
        </header>

        {/* CONTENT */}
        <section className="main-content">
          {/* Ringkasan */}
          <div className="card">
            <div className="card-title">Ringkasan</div>
            <p>
              Super Admin dapat mengelola user, mengatur periode pengajuan, dan
              memantau aktivitas sistem.
            </p>
          </div>

          {/* NOTIFIKASI */}
          <div className="card" style={{ marginTop: 16 }}>
            <div
              className="card-title"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <span>
                Notifikasi{" "}
                {unreadCount > 0 ? `(Belum dibaca: ${unreadCount})` : ""}
              </span>

              <button
                onClick={refreshNotif}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #ccc",
                  cursor: "pointer",
                }}
              >
                Refresh
              </button>
            </div>

            {!userId && (
              <p style={{ color: "maroon" }}>
                User belum terdeteksi. Pastikan setelah login menyimpan data user
                ke localStorage dengan key <b>"user"</b>.
              </p>
            )}

            {loadingNotif && <p>Memuat notifikasi...</p>}
            {errorNotif && <p style={{ color: "maroon" }}>{errorNotif}</p>}

            {!loadingNotif && !errorNotif && (
              <>
                {notifications.length === 0 ? (
                  <p>Tidak ada notifikasi.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        style={{
                          padding: 12,
                          borderRadius: 10,
                          border: "1px solid #ddd",
                          background: n.is_read ? "#fff" : "#f6fbff",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <b>{n.title}</b>
                          <small>
                            {n.created_at
                              ? new Date(n.created_at).toLocaleString("id-ID")
                              : ""}
                          </small>
                        </div>

                        <div style={{ marginTop: 6 }}>{n.message}</div>

                        <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                          {!n.is_read && (
                            <button
                              onClick={() => markAsRead(n.id)}
                              style={{
                                padding: "7px 10px",
                                borderRadius: 8,
                                border: "1px solid #ccc",
                                cursor: "pointer",
                              }}
                            >
                              Tandai dibaca
                            </button>
                          )}

                          {n.pengajuan_id && (
                            <button
                              onClick={() => navigate(`/approval?pengajuan_id=${n.pengajuan_id}`)}
                              style={{
                                padding: "7px 10px",
                                borderRadius: 8,
                                border: "1px solid #ccc",
                                cursor: "pointer",
                              }}
                            >
                              Lihat Pengajuan
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
