import DesktopSidebarToggle from '../../components/DesktopSidebarToggle';
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../css/layout.css";
import RoleSwitcher from "../../components/RoleSwitcher";

const API_BASE = import.meta.env.VITE_API_BASE;
const token = localStorage.getItem("token");

import SidebarLogo from "../../components/SidebarLogo";
import useSupportUnread from "../../hooks/useSupportUnread";

export default function Periode() {
  const navigate = useNavigate();
  const location = useLocation();
  const { supportUnreadCount } = useSupportUnread("superadmin");

  const [activeTab, setActiveTab] = useState("pengajuan"); // "pengajuan" | "stock_opname"

  // State Periode Pengajuan
  const [tahunAkademik, setTahunAkademik] = useState(getTahunAkademikOtomatis());
  const [mulai, setMulai] = useState("");
  const [selesai, setSelesai] = useState("");
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [activePeriodeId, setActivePeriodeId] = useState(null);
  const [periodes, setPeriodes] = useState([]);
  const [loading, setLoading] = useState(false);

  // State Periode Stock Opname
  const [soSubPeriode, setSoSubPeriode] = useState("Periode 1");
  const [soTahunAkademik, setSoTahunAkademik] = useState(getTahunAkademikOtomatis());
  const [soMulai, setSoMulai] = useState("");
  const [soSelesai, setSoSelesai] = useState("");
  const [soMessage, setSoMessage] = useState("");
  const [soErrorMsg, setSoErrorMsg] = useState("");

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

      if (resAll.status === 401) {
        alert("Sesi login Anda telah berakhir. Silakan login kembali.");
        localStorage.removeItem("token");
        navigate("/");
        return;
      }

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
      jenis_periode: "Periode Pengajuan",
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

      if (res.status === 401) {
        alert("Sesi login Anda telah berakhir. Silakan login kembali.");
        localStorage.removeItem("token");
        navigate("/");
        return;
      }

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

  async function handleSimpanStockOpname(e) {
    e.preventDefault();
    setSoMessage("");
    setSoErrorMsg("");
    const freshToken = localStorage.getItem("token");

    if (!soMulai || !soSelesai) {
      setSoErrorMsg("Mulai pencatatan dan batas akhir pencatatan wajib diisi.");
      return;
    }

    const payload = {
      tahun_akademik: soTahunAkademik,
      jenis_periode: `Stock Opname - ${soSubPeriode}`,
      mulai: soMulai,
      selesai: soSelesai,
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

      if (res.status === 401) {
        alert("Sesi login Anda telah berakhir. Silakan login kembali.");
        localStorage.removeItem("token");
        navigate("/");
        return;
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        setSoErrorMsg(data.message || "Terjadi kesalahan saat menyimpan periode Stock Opname.");
        return;
      }

      setSoMessage(`Periode ${data.periode.jenis_periode || "Stock Opname"} (${data.periode.tahun_akademik}) berhasil disimpan.`);
      loadData();
    } catch (err) {
      console.error("Error simpan Stock Opname:", err);
      setSoErrorMsg("Terjadi kesalahan jaringan.");
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

      if (res.status === 401) {
        alert("Sesi login Anda telah berakhir. Silakan login kembali.");
        localStorage.removeItem("token");
        navigate("/");
        return;
      }

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
      { label: "Monitoring Admin & User", to: "/superadmin/monitoring" },
      { label: "Grafik Barang", to: "/superadmin/grafik-barang" },
      { label: "Grafik Belanja", to: "/superadmin/grafik-belanja" },
      { label: "Approval Pengajuan", to: "/approval" },
      { label: "Tambah & Kelola User", to: "/tambahuser" },
      { label: "Atur Periode", to: "/periode", active: true},
      { label: "Daftar Barang ATK", to: "/superadmin/daftar-barang" },
      { label: "Stock Opname Barang", to: "/stock-opname" },
      { label: "Support", to: "/support" },
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
            const isSupport = m.label === "Support";
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
                {isSupport && supportUnreadCount > 0 && (
                  <span className="support-badge">{supportUnreadCount}</span>
                )}
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
            <div className="topbar-title">Atur & Kelola Periode</div>
            <div className="topbar-sub">
              Super Admin dapat menambah, mengubah, dan menghapus periode pengajuan dan stock opname.
            </div>
          </div>
          </div>
          <div className="topbar-right">
            <span>Role: </span>
            <RoleSwitcher />
          </div>
        </header>

        <section className="main-content">
          {/* CARD FORM ATUR PERIODE DENGAN NAVBAR TAB */}
          <div className="card">
            {/* SEGMENTED TAB SWITCH CONTROL */}
            <div
              style={{
                display: "inline-flex",
                backgroundColor: "#f3f4f6",
                padding: "4px",
                borderRadius: "12px",
                gap: "4px",
                marginBottom: "24px",
                border: "1px solid #e5e7eb",
                width: "fit-content",
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab("pengajuan")}
                style={{
                  padding: "9px 22px",
                  fontSize: "14px",
                  fontWeight: activeTab === "pengajuan" ? 700 : 600,
                  border: "none",
                  borderRadius: "9px",
                  cursor: "pointer",
                  background: activeTab === "pengajuan" ? "#005826" : "transparent",
                  color: activeTab === "pengajuan" ? "#ffffff" : "#64748b",
                  boxShadow: activeTab === "pengajuan" ? "0 4px 14px rgba(0, 88, 38, 0.35)" : "none",
                  borderLeft: activeTab === "pengajuan" ? "3.5px solid #d4af37" : "3.5px solid transparent",
                  transition: "all 0.2s ease-in-out",
                  outline: "none",
                }}
              >
                Periode Pengajuan
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("stock_opname")}
                style={{
                  padding: "9px 22px",
                  fontSize: "14px",
                  fontWeight: activeTab === "stock_opname" ? 700 : 600,
                  border: "none",
                  borderRadius: "9px",
                  cursor: "pointer",
                  background: activeTab === "stock_opname" ? "#005826" : "transparent",
                  color: activeTab === "stock_opname" ? "#ffffff" : "#64748b",
                  boxShadow: activeTab === "stock_opname" ? "0 4px 14px rgba(0, 88, 38, 0.35)" : "none",
                  borderLeft: activeTab === "stock_opname" ? "3.5px solid #d4af37" : "3.5px solid transparent",
                  transition: "all 0.2s ease-in-out",
                  outline: "none",
                }}
              >
                Periode Stock Opname
              </button>
            </div>

            {activeTab === "pengajuan" ? (
              /* TAB 1: PERIODE PENGAJUAN FORM */
              <>
                <div className="card-title">Tambah / Update Periode Pengajuan</div>
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
                      <button type="submit" className="btn btn-primary" style={{ minWidth: "160px" }}>
                        Simpan Periode
                      </button>
                    </div>

                    {message && <p style={{ color: "green", fontWeight: 600 }}>{message}</p>}
                    {errorMsg && <p className="error-text">{errorMsg}</p>}
                  </div>
                </form>
              </>
            ) : (
              /* TAB 2: PERIODE STOCK OPNAME FORM */
              <>
                <div className="card-title">Tambah / Update Periode Stock Opname</div>
                <div className="card-subtitle">
                  Atur periode pencatatan stock opname barang ATK (Periode 1, Periode 2, Periode 3).
                </div>

                <form onSubmit={handleSimpanStockOpname}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 20,
                      maxWidth: 420,
                    }}
                  >
                    <div>
                      <label className="A">Pilih Periode Stock Opname</label>
                      <select
                        className="input-text"
                        value={soSubPeriode}
                        onChange={(e) => setSoSubPeriode(e.target.value)}
                      >
                        <option value="Periode 1">Periode 1</option>
                        <option value="Periode 2">Periode 2</option>
                        <option value="Periode 3">Periode 3</option>
                      </select>
                    </div>

                    <div>
                      <label className="A">Tahun Akademik</label>
                      <select
                        className="input-text"
                        value={soTahunAkademik}
                        onChange={(e) => setSoTahunAkademik(e.target.value)}
                      >
                        {daftarTahunAkademik.map((ta) => (
                          <option key={ta} value={ta}>
                            {ta}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="B">Mulai Pencatatan</label>
                      <input
                        type="datetime-local"
                        value={soMulai}
                        className="input-text"
                        onChange={(e) => setSoMulai(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="C">Batas Akhir Pencatatan</label>
                      <input
                        type="datetime-local"
                        value={soSelesai}
                        className="input-text"
                        onChange={(e) => setSoSelesai(e.target.value)}
                      />
                    </div>

                    <div style={{ display: "flex", gap: 10 }}>
                      <button type="submit" className="btn btn-primary" style={{ minWidth: "160px" }}>
                        Simpan Periode
                      </button>
                    </div>

                    {soMessage && <p style={{ color: "green", fontWeight: 600 }}>{soMessage}</p>}
                    {soErrorMsg && <p className="error-text">{soErrorMsg}</p>}
                  </div>
                </form>
              </>
            )}
          </div>

          {/* CARD DAFTAR PERIODE */}
          <div className="card" style={{ marginTop: 24 }}>
            <div className="card-title">Daftar Seluruh Periode</div>
            <div className="card-subtitle" style={{ marginBottom: 16 }}>
              Daftar seluruh periode pengajuan dan periode stock opname yang telah dibuat di sistem.
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
                      <th style={{ padding: "12px 16px" }}>Jenis Periode</th>
                      <th style={{ padding: "12px 16px" }}>Mulai</th>
                      <th style={{ padding: "12px 16px" }}>Deadline / Batas Akhir</th>
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
                          <td style={{ padding: "14px 16px", fontSize: 14 }}>
                            <span
                              style={{
                                padding: "4px 10px",
                                borderRadius: "9999px",
                                fontSize: "12px",
                                fontWeight: 600,
                                backgroundColor: p.jenis_periode?.includes("Stock Opname") ? "#fef3c7" : "#e0f2fe",
                                color: p.jenis_periode?.includes("Stock Opname") ? "#d97706" : "#0369a1",
                              }}
                            >
                              {p.jenis_periode || "Periode Pengajuan"}
                            </span>
                          </td>
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