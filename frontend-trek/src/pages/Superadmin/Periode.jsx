import DesktopSidebarToggle from '../../components/DesktopSidebarToggle';
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../css/layout.css";
import RoleSwitcher from "../../components/RoleSwitcher";



const API_BASE = import.meta.env.VITE_API_BASE;
const token = localStorage.getItem("token");

import SidebarLogo from "../../components/SidebarLogo";

export default function Periode() {
  const navigate = useNavigate();
  const location = useLocation();

  const [tahunAkademik, setTahunAkademik] = useState(getTahunAkademikOtomatis());
  const [mulai, setMulai] = useState("");
  const [selesai, setSelesai] = useState("");
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [activePeriodeId, setActivePeriodeId] = useState(null);
  const [periodes, setPeriodes] = useState([]);
  const [loading, setLoading] = useState(false);

  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;

  const formatRole = (role) => {
    if (!role) return "-";

    return role
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const daftarTahunAkademik = useMemo(() => {
    const baseYear = new Date().getFullYear();
    return [
      `${baseYear - 1}/${baseYear}`,
      `${baseYear}/${baseYear + 1}`,
      `${baseYear + 1}/${baseYear + 2}`,
    ];
  }, []);

  function getTahunAkademikOtomatis() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12

    // Jika bulan >= Juli, tahun akademik baru
    if (month >= 7) {
      return `${year}/${year + 1}`;
    } else {
      return `${year - 1}/${year}`;
    }
  }

  // Load periode aktif dan daftar semua periode
  const loadData = async () => {
    setLoading(true);
    const freshToken = localStorage.getItem("token");
    try {
      // 1. Ambil periode aktif
      const resActive = await fetch(`${API_BASE}/periode/active`);
      const dataActive = await resActive.json();

      if (dataActive.periode) {
        const p = dataActive.periode;
        setActivePeriodeId(p.id);
        setTahunAkademik(p.tahun_akademik || getTahunAkademikOtomatis());
        setMulai(p.mulai?.slice(0, 16) || "");
        setSelesai(p.selesai?.slice(0, 16) || "");
      }

      // 2. Ambil daftar semua periode untuk Super Admin
      const resAll = await fetch(`${API_BASE}/periode`, {
        headers: { Authorization: `Bearer ${freshToken}` },
      });
      const dataAll = await resAll.json();
      if (Array.isArray(dataAll.data)) {
        setPeriodes(dataAll.data);
      } else if (Array.isArray(dataAll)) {
        setPeriodes(dataAll);
      }
    } catch (err) {
      console.error("Gagal load periode:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  async function handleSimpan(e) {
    e.preventDefault();
    setMessage("");
    setErrorMsg("");
    const freshToken = localStorage.getItem("token");

    if (!mulai || !selesai) {
      setErrorMsg("Tanggal mulai dan selesai wajib diisi.");
      return;
    }

    const payload = {
      tahun_akademik: tahunAkademik,
      mulai,
      selesai,
    };

    try {
      const res = await fetch(`${API_BASE}/periode`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          Authorization: `Bearer ${freshToken}`,
        },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await res.json();

        if (!res.ok) {
          console.error("Gagal simpan periode HTTP Error:", data);
          if (data.errors) {
             const firstError = Object.values(data.errors)[0][0];
             setErrorMsg(firstError);
          } else {
             setErrorMsg(data.message || "Terjadi kesalahan saat menyimpan periode.");
          }
          return;
        }
        
        if (!data.success) {
          console.error("Gagal simpan periode:", data);
          setErrorMsg(data.message || "Terjadi kesalahan saat menyimpan periode.");
          return;
        }

        setActivePeriodeId(data.periode.id);
        setMessage(
          `Periode ${data.periode.tahun_akademik} berhasil disimpan.`
        );
        loadData();
      } else {
        const textData = await res.text();
        console.error("Gagal simpan periode (Bukan JSON):", textData);
        setErrorMsg("Terjadi kesalahan pada server.");
      }
    } catch (err) {
      console.error("Error jaringan:", err);
      setErrorMsg("Terjadi kesalahan jaringan atau koneksi terputus.");
    }
  }

  async function handleHapusPeriode(id) {
    const yakin = window.confirm("Yakin ingin menghapus periode ini?");
    if (!yakin) return;

    setMessage("");
    setErrorMsg("");
    const freshToken = localStorage.getItem("token");

    try {
      const res = await fetch(`${API_BASE}/periode/${id}`, {
        headers: { Authorization: `Bearer ${freshToken}` },
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        console.error("Gagal hapus periode:", data);
        setErrorMsg(data.message || "Terjadi kesalahan saat menghapus periode.");
        return;
      }

      setMessage("Periode berhasil dihapus");
      if (id === activePeriodeId) {
        setActivePeriodeId(null);
        setMulai("");
        setSelesai("");
      }
      loadData();
    } catch (err) {
      console.error("Error jaringan:", err);
      setErrorMsg("Terjadi kesalahan jaringan.");
    }
  }

  const sidebarMenus = useMemo(() => {
    return [
      { label: "Dashboard Super Admin", to: "/dashboardsuperadmin" },
      { label: "Monitoring Admin", to: "/superadmin/monitoring-admin" },
      { label: "Monitoring User", to: "/superadmin/monitoring-user" },
      { label: "Grafik Barang", to: "/superadmin/grafik-barang" },
      { label: "Grafik Belanja", to: "/superadmin/grafik-belanja" },
      { label: "Approval Pengajuan", to: "/approval" },
      { label: "Tambah & Kelola User", to: "/tambahuser" },
      { label: "Atur Periode", to: "/periode", active: true },
      { label: "Daftar Barang ATK", to: "/superadmin/daftar-barang" },
      { label: "Stock Opname Barang", to: "/stock-opname" },
    ];
  }, []);

  const getStatusBadge = (p) => {
    const now = new Date();
    const start = new Date(p.mulai);
    const end = new Date(p.selesai);

    if (now >= start && now <= end) {
      return (
        <span
          style={{
            padding: "4px 10px",
            borderRadius: "9999px",
            fontSize: "12px",
            fontWeight: 600,
            backgroundColor: "#dcfce7",
            color: "#16a34a",
          }}
        >
          ● Sedang Buka
        </span>
      );
    } else if (now < start) {
      return (
        <span
          style={{
            padding: "4px 10px",
            borderRadius: "9999px",
            fontSize: "12px",
            fontWeight: 600,
            backgroundColor: "#dbeafe",
            color: "#2563eb",
          }}
        >
          Akan Datang
        </span>
      );
    } else {
      return (
        <span
          style={{
            padding: "4px 10px",
            borderRadius: "9999px",
            fontSize: "12px",
            fontWeight: 600,
            backgroundColor: "#fee2e2",
            color: "#dc2626",
          }}
        >
          Sudah Ditutup
        </span>
      );
    }
  };

  
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
        <SidebarLogo />

        <nav className="sidebar-menu">
          {sidebarMenus.map((m) => {
            const isActive = location.pathname === m.to;
            return (
              <div
                key={m.label}
                className={`menu-item ${isActive ? "active" : ""}`}
                style={{ cursor: isActive ? "default" : "pointer" }}
                onClick={() => {
                  if (!isActive) {
                    navigate(m.to);
                  }
                }}
              >
                {m.label}
              </div>
            );
          })}
        </nav>

        <div className="logout" onClick={() => navigate("/")}>
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
            <div className="topbar-title">Atur & Kelola Periode Pengajuan</div>
            <div className="topbar-sub">
              Super Admin dapat menambah, mengubah, dan menghapus periode pengajuan.
            </div>
          </div>
          </div>
          <div className="topbar-right">
            <span>Role: </span>
            <RoleSwitcher />
          </div>
        </header>

        <section className="main-content">
          {/* CARD FORM ATUR PERIODE */}
          <div className="card">
            <div className="card-title">Tambah / Update Periode</div>
            <div className="card-subtitle">
              Masukkan tahun akademik, tanggal & jam dimulainya pengajuan hingga batas akhirnya.
            </div>

            <form onSubmit={handleSimpan}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                  maxWidth: 420,
                }}
              >
                <div>
                  <label className="A">Tahun Akademik</label>
                  <select
                    className="input-text"
                    value={tahunAkademik}
                    onChange={(e) => setTahunAkademik(e.target.value)}
                  >
                    {daftarTahunAkademik.map((ta) => (
                      <option key={ta} value={ta}>
                        {ta}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="B">Mulai Pengajuan</label>
                  <input
                    type="datetime-local"
                    value={mulai}
                    className="input-text"
                    onChange={(e) => setMulai(e.target.value)}
                  />
                </div>

                <div>
                  <label className="C">Berakhir / Deadline</label>
                  <input
                    type="datetime-local"
                    value={selesai}
                    className="input-text"
                    onChange={(e) => setSelesai(e.target.value)}
                  />
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button type="submit" className="btn btn-primary">
                    Simpan Periode
                  </button>

                  {activePeriodeId && (
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => handleHapusPeriode(activePeriodeId)}
                    >
                      Hapus Periode Aktif
                    </button>
                  )}
                </div>

                {message && <p style={{ color: "green", fontWeight: 600 }}>{message}</p>}
                {errorMsg && <p className="error-text">{errorMsg}</p>}
              </div>
            </form>
          </div>

          {/* CARD DAFTAR PERIODE */}
          <div className="card" style={{ marginTop: 24 }}>
            <div className="card-title">Daftar Periode Pengajuan</div>
            <div className="card-subtitle" style={{ marginBottom: 16 }}>
              Daftar seluruh periode yang telah dibuat di sistem.
            </div>

            {loading ? (
              <p>Memuat data periode...</p>
            ) : periodes.length === 0 ? (
              <p style={{ color: "#6b7280" }}>Belum ada periode yang dibuat.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb", background: "#f9fafb" }}>
                      <th style={{ padding: "12px 16px" }}>Tahun Akademik</th>
                      <th style={{ padding: "12px 16px" }}>Mulai Pengajuan</th>
                      <th style={{ padding: "12px 16px" }}>Deadline</th>
                      <th style={{ padding: "12px 16px" }}>Status</th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodes.map((p) => {
                      const dateMulai = p.mulai
                        ? new Date(p.mulai).toLocaleString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-";
                      const dateSelesai = p.selesai
                        ? new Date(p.selesai).toLocaleString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-";

                      return (
                        <tr key={p.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "14px 16px", fontWeight: 600 }}>{p.tahun_akademik}</td>
                          <td style={{ padding: "14px 16px", fontSize: 14 }}>{dateMulai}</td>
                          <td style={{ padding: "14px 16px", fontSize: 14 }}>{dateSelesai}</td>
                          <td style={{ padding: "14px 16px" }}>{getStatusBadge(p)}</td>
                          <td style={{ padding: "14px 16px", textAlign: "right" }}>
                            <button
                              onClick={() => handleHapusPeriode(p.id)}
                              style={{
                                padding: "6px 12px",
                                fontSize: "12px",
                                borderRadius: "8px",
                                border: "none",
                                backgroundColor: "#ef4444",
                                color: "white",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              Hapus
                            </button>
                          </td>
                        </tr>
                      );
                    })}
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