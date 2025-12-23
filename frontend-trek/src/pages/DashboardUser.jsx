import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../css/DashboardUser.css";
import "../css/layout.css";

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

  // Ambil pengajuan terbaru user
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
