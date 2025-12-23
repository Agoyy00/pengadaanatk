import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/Pengajuan.css";

const API_BASE = "http://127.0.0.1:8000/api";

export default function DashboardSuperAdmin() {
  const navigate = useNavigate();

  // =========================
  // NOTIFIKASI STATE
  // =========================
  const [notifications, setNotifications] = useState([]);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const [errorNotif, setErrorNotif] = useState("");

  // Ambil user dari localStorage (sesuaikan kalau formatmu beda)
  // Biasanya Login.jsx menyimpan: localStorage.setItem("user", JSON.stringify(user))
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user?.id;

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

        // bentuk response yang kita harapkan:
        // { success: true, notifications: [...] }
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
  // MARK AS READ (opsional)
  // =========================
  async function markAsRead(notifId) {
    try {
      await fetch(`${API_BASE}/notifications/${notifId}/read`, {
        method: "PATCH",
      });

      // update state lokal biar langsung berubah tanpa refresh
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.log("Gagal mark as read:", err);
    }
  }

  // Refresh manual
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

  return (
    <div className="layout">
      <aside className="sidebar">
        <div>
          <div className="sidebar-logo">Sistem Pengajuan ATK</div>
          <div className="sidebar-subtitle">Universitas Yarsi</div>
        </div>

        <nav className="sidebar-menu">
          <div className="menu-item disabled" style={{ cursor: "default" }}>
            Dashboard Super Admin
          </div>
          

          {/* Menu analisis data (sesuaikan route kamu) */}
          <div
            className="menu-item"
            onClick={() => navigate("/approval")}
            style={{ cursor: "pointer" }}
          >
            Analisis Data
          </div>


          {/* Menu tambah user */}
          <div
            className="menu-item"
            onClick={() => navigate("/tambahuser")}
            style={{ cursor: "pointer" }}
          >
            Tambah User
          </div>

          {/* Menu atur periode */}
          <div
            className="menu-item"
            onClick={() => navigate("/periode")}
            style={{ cursor: "pointer" }}
          >
            Atur Periode
          </div>

          {/* ✅ MENU BARU: Kelola Harga ATK */}
          <div
            className="menu-item"
            onClick={() => navigate("/kelola-harga")}
            style={{ cursor: "pointer" }}
          >
            Kelola Harga ATK
          </div>
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

      <main className="main">
        <header className="topbar">
          <div>
            <div className="topbar-title">Dashboard Super Admin</div>
            <div className="topbar-sub">
              Selamat datang: {user?.name || "Super Admin"}
            </div>
          </div>

          <div className="topbar-right">
            <span>Role: Admin</span>
            <span className="role-pill">Admin</span>
          </div>
          
        </header>

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
                User belum terdeteksi. Pastikan setelah login kamu menyimpan data
                user ke localStorage dengan key <b>"user"</b>.
              </p>
            )}

            {loadingNotif && <p>Memuat notifikasi...</p>}
            {errorNotif && <p style={{ color: "maroon" }}>{errorNotif}</p>}

            {!loadingNotif && !errorNotif && (
              <>
                {notifications.length === 0 ? (
                  <p>Tidak ada notifikasi.</p>
                ) : (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 12 }}
                  >
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
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <b>{n.title}</b>
                          <small>
                            {n.created_at
                              ? new Date(n.created_at).toLocaleString("id-ID")
                              : ""}
                          </small>
                        </div>

                        <div style={{ marginTop: 6 }}>{n.message}</div>

                        <div
                          style={{
                            marginTop: 10,
                            display: "flex",
                            gap: 10,
                          }}
                        >
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

                          {/* opsional: kalau mau langsung buka detail pengajuan */}
                          {n.pengajuan_id && (
                            <button
                              onClick={() =>
                                navigate(`/approval?pengajuan_id=${n.pengajuan_id}`)
                              }
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
