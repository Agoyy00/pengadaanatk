import DesktopSidebarToggle from '../../components/DesktopSidebarToggle';
import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../../css/DashboardUser.css";
import "../../css/layout.css";
import RoleSwitcher from "../../components/RoleSwitcher";
import PeriodeTimer from "../../components/PeriodeTimer";
import Swal from "sweetalert2";

const API_BASE = import.meta.env.VITE_API_BASE;
const token = localStorage.getItem("token");

import SidebarLogo from "../../components/SidebarLogo";
import useSupportUnread from "../../hooks/useSupportUnread";

export default function DashboardUser() {
  const navigate = useNavigate();
  const location = useLocation();
  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const user = currentUser;
  const userId = user?.id;
  const normalizeRole = (r) => String(r || "").toLowerCase().replace(/[\s_]+/g, "");
  const activeRole = normalizeRole(currentUser?.role);
  const { supportUnreadCount } = useSupportUnread(activeRole);

  const [loading, setLoading] = useState(true);
  const [latestPengajuan, setLatestPengajuan] = useState(null);
  const [statusText, setStatusText] = useState("");
  const [notifText, setNotifText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [periodeOpen, setPeriodeOpen] = useState(false);
  const [periodeMessage, setPeriodeMessage] = useState("");
  const [hasStockOpname, setHasStockOpname] = useState(false);

  useEffect(() => {
    async function loadDashboardData(showNotification = false) {
      if (!userId) {
        setErrorMsg("User belum login.");
        setLoading(false);
        return;
      }

      try {
        const [resPeriode, resPengajuan] = await Promise.all([
          fetch(`${API_BASE}/periode/active`),
          fetch(`${API_BASE}/pengajuan?user_id=${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        if (resPeriode.ok) {
          const pData = await resPeriode.json();
          const isOpen = pData.is_open === true || pData.is_open === 1 || pData.is_open === "1" || pData.is_open === "open";
          setPeriodeOpen(isOpen);
          setPeriodeMessage(pData.message || "");

          if (isOpen) {
            const tahun = pData.periode?.tahun_akademik || "";
            fetch(`${API_BASE}/pengajuan/check/${userId}?tahun=${encodeURIComponent(tahun)}`, {
              headers: { Authorization: `Bearer ${token}` }
            })
              .then((res) => (res.ok ? res.json() : null))
              .then((checkData) => {
                if (checkData) setHasStockOpname(checkData.has_stock_opname === true);
              })
              .catch(console.error);
          }
        }

        if (resPengajuan.ok) {
          const data = await resPengajuan.json();
          if (!Array.isArray(data) || data.length === 0) {
            setLatestPengajuan(null);
            setStatusText("Anda belum pernah mengajukan ATK pada periode ini.");
          } else {
            const latest = data[0];
            setLatestPengajuan(latest);

            let statusLabel = "";
            switch (latest.status) {
              case "pending":
                statusLabel = "Pengajuan Anda sudah dikirim dan menunggu verifikasi admin.";
                break;
              case "diverifikasi":
                statusLabel = "Pengajuan Anda telah diverifikasi oleh admin dan menunggu persetujuan super admin.";
                break;
              case "ditolak":
                statusLabel = "Pengajuan Anda DITOLAK. Silakan hubungi admin untuk informasi lebih lanjut.";
                break;
              case "disetujui":
                statusLabel = "Pengajuan Anda DISETUJUI. Proses pengadaan akan dilanjutkan.";
                break;
              default:
                statusLabel = `Status pengajuan Anda: ${latest.status}`;
            }
            setStatusText(statusLabel);

            const storageKey = `pengajuan_status_${latest.id}`;
            const prevStatus = localStorage.getItem(storageKey);

            if (showNotification && prevStatus && prevStatus !== latest.status) {
              setNotifText(`Status pengajuan Anda telah berubah menjadi "${latest.status.toUpperCase()}".`);
            }

            localStorage.setItem(storageKey, latest.status);
          }
        }
      } catch (err) {
        console.error("Gagal mengambil dashboard data:", err);
        setErrorMsg("Terjadi kesalahan jaringan.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData(false);
    const intervalId = setInterval(() => {
      loadDashboardData(true);
    }, 30000);
    return () => clearInterval(intervalId);
  }, [userId]);

  const revisedItems =
    latestPengajuan?.items?.filter(
      (item) =>
        item.jumlah_disetujui !== null &&
        item.jumlah_disetujui !== item.jumlah_diajukan
    ) || [];

  const sidebarMenus = useMemo(() => {
    return [
      { label: "Dashboard User", to: "/dashboarduser", active: true },
      { label: "Stock Opname Barang", to: "/stock-opname" },
      { label: "Buat Pengajuan Baru", to: "/pengajuan" },
      { label: "Riwayat Pengajuan", to: "/riwayat" },
      { label: "Template Dokumen", to: "/template-dokumen" },
      { label: "Support", to: "/support" },
    ];
  }, []);

  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);

  const handleQuickAction = (action) => {
    if (action === "stock-opname") {
      navigate("/stock-opname");
    } else if (action === "pengajuan-manual") {
      navigate("/pengajuan");
    } else if (action === "riwayat") {
      navigate("/riwayat");
    } else if (action === "template") {
      navigate("/template-dokumen");
    }
  };

  return (
    <div className="layout">
      <DesktopSidebarToggle isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
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
                <span>{m.label}</span>
                {isSupport && supportUnreadCount > 0 && (
                  <span className="support-badge">{supportUnreadCount}</span>
                )}
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
            <PeriodeTimer typeFilter="pengajuan" />
            <PeriodeTimer typeFilter="stock_opname" />
            <span>Role: </span>
            <RoleSwitcher />
          </div>
        </header>

        {/* CONTENT */}
        <section className="main-content">
          {/* PERIODE CLOSED WARNING */}
          {!periodeOpen && (
            <div
              style={{
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: 12,
                padding: "16px 20px",
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div>
                <h4 style={{ margin: 0, color: "#92400e", fontSize: 16, fontWeight: 700 }}>
                  Periode Pengajuan Tertutup
                </h4>
                <p style={{ margin: "4px 0 0", color: "#a16207", fontSize: 14 }}>
                  {periodeMessage || "Saat ini pengajuan ATK belum dibuka. Silakan tunggu hingga periode dibuka oleh admin."}
                </p>
              </div>
            </div>
          )}

          {/* STEP PROGRESS */}
          {periodeOpen && (
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: "16px 20px",
                marginBottom: 20,
              }}
            >
              <h4 style={{ margin: "0 0 12px 0", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                Langkah Pengajuan ATK
              </h4>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { step: 1, label: "Periode Dibuka", done: periodeOpen },
                  { step: 2, label: "Stock Opname", done: hasStockOpname },
                  { step: 3, label: "Buat Pengajuan", done: !!latestPengajuan },
                  { step: 4, label: "Verifikasi & Approval", done: latestPengajuan?.status === "disetujui" },
                ].map((item) => (
                  <div
                    key={item.step}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 12px",
                      borderRadius: 8,
                      background: item.done ? "#f0fdf4" : "#f8fafc",
                      border: `1px solid ${item.done ? "#bbf7d0" : "#e2e8f0"}`,
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: item.done ? "#16a34a" : "#94a3b8",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {item.done ? "✓" : item.step}
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: item.done ? "#15803d" : "#64748b",
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              {!hasStockOpname && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "8px 12px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: 8,
                    fontSize: 13,
                    color: "#991b1b",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span>
                    <b>Langkah selanjutnya:</b> lakukan Stock Opname Barang terlebih dahulu agar Anda dapat membuat pengajuan ATK.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ACTION CARDS */}
          {periodeOpen && !latestPengajuan && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
                marginBottom: 20,
              }}
            >
              {/* Stock Opname Card */}
              {!hasStockOpname && (
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #fca5a5",
                    borderRadius: 12,
                    padding: "16px 20px",
                    cursor: "pointer",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  }}
                  onClick={() => handleQuickAction("stock-opname")}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 8px 16px rgba(220,38,38,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <h5 style={{ margin: "0 0 4px 0", fontSize: 15, fontWeight: 700, color: "#991b1b" }}>
                    Stock Opname Barang
                  </h5>
                  <p style={{ margin: 0, fontSize: 13, color: "#7f1d1d" }}>
                    Lakukan stock opname terlebih dahulu sebelum membuat pengajuan.
                  </p>
                  <button
                    type="button"
                    style={{
                      marginTop: 12,
                      background: "#dc2626",
                      color: "#fff",
                      border: "none",
                      padding: "8px 14px",
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Mulai Stock Opname
                  </button>
                </div>
              )}

              {/* Pengajuan Manual Card */}
              {hasStockOpname && !latestPengajuan && (
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #bfdbfe",
                    borderRadius: 12,
                    padding: "16px 20px",
                    cursor: "pointer",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  }}
                  onClick={() => handleQuickAction("pengajuan-manual")}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 8px 16px rgba(37,99,235,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <h5 style={{ margin: "0 0 4px 0", fontSize: 15, fontWeight: 700, color: "#1e40af" }}>
                    Buat Pengajuan Manual
                  </h5>
                  <p style={{ margin: 0, fontSize: 13, color: "#1e3a8a" }}>
                    Isi pengajuan ATK secara manual langkah demi langkah.
                  </p>
                  <button
                    type="button"
                    style={{
                      marginTop: 12,
                      background: "#2563eb",
                      color: "#fff",
                      border: "none",
                      padding: "8px 14px",
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Buat Pengajuan Manual
                  </button>
                </div>
              )}

              {/* Import CSV Card */}
              {hasStockOpname && !latestPengajuan && (
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #bbf7d0",
                    borderRadius: 12,
                    padding: "16px 20px",
                    cursor: "pointer",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  }}
                  onClick={() => handleQuickAction("pengajuan-manual")}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 8px 16px rgba(22,163,74,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <h5 style={{ margin: "0 0 4px 0", fontSize: 15, fontWeight: 700, color: "#166534" }}>
                    Import dari CSV
                  </h5>
                  <p style={{ margin: 0, fontSize: 13, color: "#14532d" }}>
                    Unduh template CSV, isi data, lalu impor untuk pengajuan cepat.
                  </p>
                  <button
                    type="button"
                    style={{
                      marginTop: 12,
                      background: "#16a34a",
                      color: "#fff",
                      border: "none",
                      padding: "8px 14px",
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Import CSV di Halaman Pengajuan
                  </button>
                </div>
              )}
            </div>
          )}

          {/* NOTIFICATION BANNER */}
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

          {/* PENGajuan STATUS CARD */}
          <div className="card">
            <div className="card-title">Status Pengajuan Anda</div>

            <div className="info-banner">
              Pengajuan ATK hanya dapat dilakukan{" "}
              <b>1 kali dalam 1 periode tahun akademik</b>. Pastikan data yang
              Anda isi sudah benar sebelum mengirim.
            </div>

            {loading ? (
              <p>Sedang memuat data pengajuan...</p>
            ) : errorMsg ? (
              <p className="error-text">{errorMsg}</p>
            ) : latestPengajuan ? (
              <div className="status-card">
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    marginBottom: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      padding: "10px 14px",
                      flex: 1,
                      minWidth: 140,
                    }}
                  >
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 2 }}>
                      Tahun Akademik
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>
                      {latestPengajuan.tahun_akademik}
                    </div>
                  </div>
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      padding: "10px 14px",
                      flex: 1,
                      minWidth: 140,
                    }}
                  >
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 2 }}>
                      Status
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>
                      <span
                        className={`badge-status status-${latestPengajuan.status}`}
                        style={{ marginRight: 6 }}
                      >
                        {latestPengajuan.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <p style={{ margin: "0 0 12px 0", fontSize: 14, color: "#334155" }}>
                  {statusText}
                </p>

                {/* Progress timeline */}
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    marginBottom: 16,
                    flexWrap: "wrap",
                  }}
                >
                  {[
                    { label: "Diajukan", status: "diajukan", done: ["diverifikasi", "disetujui"].includes(latestPengajuan.status) },
                    { label: "Diverifikasi Admin", status: "diverifikasi", done: ["disetujui"].includes(latestPengajuan.status) },
                    { label: "Disetujui", status: "disetujui", done: latestPengajuan.status === "disetujui" },
                  ].map((s, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 10px",
                        borderRadius: 6,
                        background: s.done ? "#f0fdf4" : "#f8fafc",
                        border: `1px solid ${s.done ? "#bbf7d0" : "#e2e8f0"}`,
                      }}
                    >
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: s.done ? "#16a34a" : "#94a3b8",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        {s.done ? "✓" : idx + 1}
                      </div>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: s.done ? "#15803d" : "#64748b",
                        }}
                      >
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>

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
                  style={{ marginTop: 12 }}
                >
                  Lihat Detail Pengajuan
                </button>
              </div>
            ) : (
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px dashed #cbd5e1",
                  borderRadius: 10,
                  padding: "16px 20px",
                  textAlign: "center",
                }}
              >
                <p style={{ margin: "0 0 12px 0", fontSize: 14, color: "#475569" }}>
                  Anda belum memiliki pengajuan ATK pada periode ini.
                </p>
                {hasStockOpname && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => navigate("/pengajuan")}
                  >
                    Buat Pengajuan Pertama
                  </button>
                )}
              </div>
            )}
          </div>

          {/* QUICK LINKS */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginTop: 20,
            }}
          >
            {[
              { label: "Stock Opname", to: "/stock-opname", color: "#dc2626" },
              { label: "Buat Pengajuan", to: "/pengajuan", color: "#2563eb" },
              { label: "Riwayat Pengajuan", to: "/riwayat", color: "#9333ea" },
              { label: "Template Dokumen", to: "/template-dokumen", color: "#ea580c" },
            ].map((item) => (
              <div
                key={item.label}
                onClick={() => navigate(item.to)}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "12px 16px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: item.color }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
