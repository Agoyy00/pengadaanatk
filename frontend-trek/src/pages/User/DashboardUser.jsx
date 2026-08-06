import DesktopSidebarToggle from '../../components/DesktopSidebarToggle';
import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../../css/DashboardUser.css";
import "../../css/layout.css";
import RoleSwitcher from "../../components/RoleSwitcher";
import PeriodeTimer from "../../components/PeriodeTimer";



const API_BASE = import.meta.env.VITE_API_BASE;
const token = localStorage.getItem("token");

export default function DashboardUser() {
  const navigate = useNavigate();
  const location = useLocation();
  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const user = currentUser;
  const userId = user?.id;
  const formatRole = (role) => {
    if (!role) return "-";

    return role
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };


  const [loading, setLoading] = useState(true);
  const [latestPengajuan, setLatestPengajuan] = useState(null);
  const [statusText, setStatusText] = useState("");
  const [notifText, setNotifText] = useState(""); // notifikasi kalau status berubah
  const [errorMsg, setErrorMsg] = useState("");
  const [soNeedWarning, setSoNeedWarning] = useState(false);

  useEffect(() => {
    async function checkSoStatus() {
      if (!userId) return;
      try {
        const resPeriode = await fetch(`${API_BASE}/periode/active`);
        if (!resPeriode.ok) return;
        const pData = await resPeriode.json();

        const isOpen =
          pData.is_open === true ||
          pData.is_open === 1 ||
          pData.is_open === "1" ||
          pData.is_open === "open";

        if (isOpen) {
          const tahun = pData.periode?.tahun_akademik || "";
          const resCheck = await fetch(
            `${API_BASE}/pengajuan/check/${userId}?tahun=${encodeURIComponent(tahun)}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (resCheck.ok) {
            const checkData = await resCheck.json();
            if (checkData.has_stock_opname === false) {
              setSoNeedWarning(true);
            } else {
              setSoNeedWarning(false);
            }
          }
        }
      } catch (err) {
        console.error("Gagal cek status stock opname:", err);
      }
    }

    checkSoStatus();
  }, [userId]);

  // Ambil pengajuan terbaru user
  async function fetchLatestPengajuan(showNotification = true) {
    if (!userId) {
      setErrorMsg("User belum login.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/pengajuan?user_id=${userId}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        setErrorMsg("Gagal mengambil data pengajuan.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        setLatestPengajuan(null);
        setStatusText("Anda belum pernah mengajukan ATK pada periode apa pun.");
        setLoading(false);
        return;
      }

      // backend sudah orderBy created_at desc → ambil index 0
      const latest = data[0];
      setLatestPengajuan(latest);

      // Teks status di kartu
      let statusLabel = "";
      switch (latest.status) {
        case "diajukan":
          statusLabel = "Pengajuan Anda sudah dikirim dan menunggu verifikasi.";
          break;
        case "diverifikasi":
          statusLabel = "Pengajuan Anda telah diverifikasi oleh admin.";
          break;
        case "ditolak":
          statusLabel =
            "Pengajuan Anda DITOLAK. Silakan hubungi admin untuk informasi lebih lanjut.";
          break;
        case "disetujui":
          statusLabel =
            "Pengajuan Anda DISETUJUI. Proses pengadaan akan dilanjutkan.";
          break;
        default:
          statusLabel = `Status pengajuan Anda: ${latest.status}`;
      }
      setStatusText(statusLabel);

      // ====== NOTIFIKASI PERUBAHAN STATUS ======
      const storageKey = `pengajuan_status_${latest.id}`;
      const prevStatus = localStorage.getItem(storageKey);

      if (showNotification && prevStatus && prevStatus !== latest.status) {
        setNotifText(
          `Status pengajuan Anda telah berubah menjadi "${latest.status.toUpperCase()}".`
        );
      }

      localStorage.setItem(storageKey, latest.status);
    } catch (err) {
      console.error("Gagal mengambil pengajuan:", err);
      setErrorMsg("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  }

  // Load pertama & polling tiap 30 detik
  useEffect(() => {
    // pertama: jangan munculin notif (supaya tidak dikira perubahan)
    fetchLatestPengajuan(false);

    const intervalId = setInterval(() => {
      fetchLatestPengajuan(true);
    }, 30000);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cek apakah ada item yang direvisi (jumlah_disetujui != jumlah_diajukan)
  const revisedItems =
    latestPengajuan?.items?.filter(
      (item) =>
        item.jumlah_disetujui !== null &&
        item.jumlah_disetujui !== item.jumlah_diajukan
    ) || [];

  const sidebarMenus = useMemo(() => {
    return [
      { label: "Dashboard User", to: "/dashboarduser", active: true },
      { label: "Buat Pengajuan Baru", to: "/pengajuan" },
      { label: "Riwayat Pengajuan", to: "/riwayat" },
      { label: "Stock Opname Barang", to: "/stock-opname" },
      { label: "Template Dokumen", to: "/template-dokumen" },
    ];
  }, []);

  
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
        <div>
          <div className="sidebar-logo">Sistem Pengajuan ATK</div>
          <div className="sidebar-subtitle">Universitas Yarsi</div>
        </div>

        <nav className="sidebar-menu">
          {sidebarMenus.map((m) => {
            const isActive = location.pathname === m.to;
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

        <Link to="/" className="logout">
          Log Out
        </Link>
      </aside>

      {/* MAIN */}
      <main className={`main ${!isSidebarOpen ? 'expanded' : ''}`}>
        {/* TOPBAR */}
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
            <div className="topbar-title">Dashboard Pemohon</div>
            <div className="topbar-sub">
              Selamat datang: {currentUser?.name || "Nama Kamu"}
            </div>
          </div>
          </div>
          <div className="topbar-right">
            <PeriodeTimer />
            <span>Role: </span>
            <RoleSwitcher />
          </div>
        </header>

        {/* CONTENT */}
        <section className="main-content">
          {/* Banner Peringatan Stock Opname */}
          {soNeedWarning && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fca5a5",
                borderRadius: 12,
                padding: "16px 20px",
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                boxShadow: "0 2px 4px rgba(239,68,68,0.05)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 24 }}>⚠️</span>
                <div>
                  <h4 style={{ margin: 0, color: "#991b1b", fontSize: 16, fontWeight: 700 }}>
                    Pemberitahuan Wajib Stock Opname
                  </h4>
                  <p style={{ margin: "4px 0 0", color: "#7f1d1d", fontSize: 14 }}>
                    Periode pengajuan ATK telah dibuka! Anda <b>wajib melakukan Stock Opname Barang</b> terlebih dahulu sebelum dapat membuat pengajuan baru.
                  </p>
                </div>
              </div>
              <button
                type="button"
                style={{
                  background: "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  padding: "10px 16px",
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
                onClick={() => navigate("/stock-opname")}
              >
                Stock Opname Sekarang ➔
              </button>
            </div>
          )}

          <div className="card">
            <div className="card-title">Notifikasi Pengajuan</div>

            {/* Info 1x per periode */}
            <div className="info-banner">
              Pengajuan ATK hanya dapat dilakukan{" "}
              <b>1 kali dalam 1 periode tahun akademik</b>. Pastikan data yang
              Anda isi sudah benar sebelum mengirim.
            </div>

            {/* Banner notifikasi status berubah */}
            {notifText && (
              <div className="notif-banner">
                <span>{notifText}</span>
                <button
                  type="button"
                  className="notif-close"
                  onClick={() => setNotifText("")}
                >
                  ×
                </button>
              </div>
            )}

            {loading ? (
              <p>Sedang memuat data pengajuan...</p>
            ) : errorMsg ? (
              <p className="error-text">{errorMsg}</p>
            ) : latestPengajuan ? (
              <div className="status-card">
                <p>
                  <strong>Tahun Akademik:</strong>{" "}
                  {latestPengajuan.tahun_akademik}
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  <span
                    className={`badge-status status-${latestPengajuan.status}`}
                  >
                    {latestPengajuan.status.toUpperCase()}
                  </span>
                </p>
                <p>{statusText}</p>

                {/* Jika ada item direvisi, tampilkan ringkasannya */}
                {revisedItems.length > 0 && (
                  <div className="revisi-block">
                    <p style={{ marginTop: 12, marginBottom: 4 }}>
                      <strong>
                        Beberapa barang pada pengajuan ini telah direvisi oleh
                        admin:
                      </strong>
                    </p>
                    <ul style={{ paddingLeft: 20, marginTop: 0 }}>
                      {revisedItems.map((item) => {
                        const namaBarang = item.barang?.nama ?? "Barang";
                        const satuan = item.barang?.satuan ?? "";

                        return (
                          <li key={item.id}>
                            {namaBarang} — diajukan{" "}
                            <strong>
                              {item.jumlah_diajukan} {satuan}
                            </strong>
                            , disetujui{" "}
                            <strong>
                              {item.jumlah_disetujui} {satuan}
                            </strong>
                            {item.catatan_revisi && (
                              <div className="revisi-note">
                                Alasan revisi: {item.catatan_revisi}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => navigate("/riwayat")}
                >
                  Lihat Detail Pengajuan
                </button>
              </div>
            ) : (
              <div>
                <p>Anda belum memiliki pengajuan ATK.</p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => navigate("/pengajuan")}
                >
                  Buat Pengajuan Pertama
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}