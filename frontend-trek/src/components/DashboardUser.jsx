import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Pengajuan.css";

const API_BASE = "http://127.0.0.1:8000/api";

export default function DashboardUser() {
  const navigate = useNavigate();

  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const userId = currentUser?.id;

  const [loading, setLoading] = useState(true);
  const [latestPengajuan, setLatestPengajuan] = useState(null);
  const [statusText, setStatusText] = useState("");
  const [notifText, setNotifText] = useState(""); // notifikasi kalau status berubah
  const [errorMsg, setErrorMsg] = useState("");

  // Fungsi untuk ambil pengajuan terbaru user
  async function fetchLatestPengajuan(showNotification = true) {
    if (!userId) {
      setErrorMsg("User belum login.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/pengajuan?user_id=${userId}`);
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

      // Karena backend sudah orderBy created_at desc, ambil index 0 saja
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
          statusLabel = "Pengajuan Anda DITOLAK. Silakan hubungi admin untuk informasi lebih lanjut.";
          break;
        case "disetujui":
          statusLabel = "Pengajuan Anda DISETUJUI. Proses pengadaan akan dilanjutkan.";
          break;
        default:
          statusLabel = `Status pengajuan Anda: ${latest.status}`;
      }
      setStatusText(statusLabel);

      // ====== LOGIKA NOTIFIKASI OTOMATIS ======
      // Simpan status terakhir di localStorage per id pengajuan
      const storageKey = `pengajuan_status_${latest.id}`;
      const prevStatus = localStorage.getItem(storageKey);

      // Kalau status berubah & kita mau menampilkan notifikasi (bukan pertama kali load)
      if (showNotification && prevStatus && prevStatus !== latest.status) {
        setNotifText(
          `Status pengajuan Anda telah berubah menjadi "${latest.status.toUpperCase()}" `
        );
      }

      // Update status terbaru ke localStorage
      localStorage.setItem(storageKey, latest.status);
    } catch (err) {
      console.error("Gagal mengambil pengajuan:", err);
      setErrorMsg("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  }

  // Load pertama & polling setiap 30 detik
  useEffect(() => {
    // pertama kali: jangan munculin notif (supaya tidak salah dikira "berubah")
    fetchLatestPengajuan(false);

    const intervalId = setInterval(() => {
      fetchLatestPengajuan(true);
    }, 30000); // 30 detik

    return () => clearInterval(intervalId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-logo">Sistem Pengajuan ATK</div>
          <div className="sidebar-subtitle">Universitas Yarsi</div>
        </div>

        <nav className="sidebar-menu">
          <div className="menu-item disabled">Dashboard</div>
          <Link to="/pengajuan" className="menu-item">
            Buat Pengajuan Baru
          </Link>
          <Link to="/riwayat" className="menu-item">
            Riwayat Pengajuan
          </Link>
        </nav>

        <Link to="/" className="logout">
          Log Out
        </Link>
      </aside>

      {/* MAIN */}
      <main className="main">
        {/* TOPBAR */}
        <header className="topbar">
          <div>
            <div className="topbar-title">Dashboard Pemohon</div>
            <div className="topbar-sub">
              Selamat datang: {currentUser?.name || "Nama Kamu"}
            </div>
          </div>
          <div className="topbar-right">
            <span>Role: User</span>
            <span className="role-pill">User</span>
          </div>
        </header>

        {/* CONTENT */}
        <section className="main-content">
          <div className="card">
            <div className="card-title">Notifikasi Pengajuan</div>

            {/* Banner info “hanya boleh 1x per periode” */}
            <div className="info-banner">
              Pengajuan ATK hanya dapat dilakukan <b>1 kali dalam 1 periode
              tahun akademik</b>. Pastikan data yang Anda isi sudah benar sebelum
              mengirim.
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
                  <span className={`badge-status status-${latestPengajuan.status}`}>
                    {latestPengajuan.status.toUpperCase()}
                  </span>
                </p>
                <p>{statusText}</p>

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
