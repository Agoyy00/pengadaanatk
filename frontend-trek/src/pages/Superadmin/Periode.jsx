import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../../css/layout.css";

const API_BASE = "http://127.0.0.1:8000/api";

export default function Periode() {
  const navigate = useNavigate();

  const [tahunAkademik, setTahunAkademik] = useState("2024/2025");
  const [mulai, setMulai] = useState("");
  const [selesai, setSelesai] = useState("");
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [activePeriodeId, setActivePeriodeId] = useState(null);

  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;

  const formatRole = (role) => {
    if (!role) return "-";

    return role
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Load periode aktif/akan-datang saat halaman dibuka
  useEffect(() => {
    async function loadPeriode() {
      try {
        const res = await fetch(`${API_BASE}/periode/active`);
        const data = await res.json();

        if (data.periode) {
          const p = data.periode;
          setActivePeriodeId(p.id);
          setTahunAkademik(p.tahun_akademik || "2024/2025");
          setMulai(p.mulai?.slice(0, 16) || "");
          setSelesai(p.selesai?.slice(0, 16) || "");
        }
      } catch (err) {
        console.error("Gagal load periode:", err);
      }
    }

    loadPeriode();
  }, []);

  async function handleSimpan(e) {
    e.preventDefault();
    setMessage("");
    setErrorMsg("");

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        console.error("Gagal simpan periode:", data);
        setErrorMsg("Terjadi kesalahan saat menyimpan periode.");
        return;
      }

      setActivePeriodeId(data.periode.id);
      setMessage(
        `Periode ${data.periode.tahun_akademik} disimpan dari ${mulai.replace(
          "T",
          " "
        )} sampai ${selesai.replace("T", " ")}.`
      );
    } catch (err) {
      console.error("Error jaringan:", err);
      setErrorMsg("Terjadi kesalahan jaringan.");
    }
  }

  async function handleHapus() {
    if (!activePeriodeId) return;
    const yakin = window.confirm("Yakin ingin menghapus periode ini?");
    if (!yakin) return;

    setMessage("");
    setErrorMsg("");

    try {
      const res = await fetch(`${API_BASE}/periode/${activePeriodeId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        console.error("Gagal hapus periode:", data);
        setErrorMsg("Terjadi kesalahan saat menghapus periode.");
        return;
      }

      setMessage("Periode berhasil dihapus.");
      setActivePeriodeId(null);
      setMulai("");
      setSelesai("");
    } catch (err) {
      console.error("Error jaringan:", err);
      setErrorMsg("Terjadi kesalahan jaringan.");
    }
  }

 const sidebarMenus = useMemo(() => {
    return [
      { label: "Dashboard Super Admin", to: "/dashboardsuperadmin"},
      { label: "Approval", to: "/approval" },
      { label: "Tambah User", to: "/tambahuser" },
      { label: "Atur Periode", to: "/periode", active: true },
      { label: "Daftar Barang ATK", to: "/superadmin/daftar-barang" },
      { label: "Grafik Belanja Unit", to: "/superadmin/grafik-belanja" },
    ];
  }, []);

  return (
    <div className="layout">
      {/* SIDEBAR */}
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
              if (!m.active) {
                navigate(m.to);
              }
            }}
          >
            {m.label}
          </div>
        ))}
      </nav>

        <div className="logout" onClick={() => navigate("/")}>
          Log Out
        </div>
      </aside>

      {/* MAIN */}
      <main className="main">
        <header className="topbar">
          <div>
            <div className="topbar-title">Atur Periode Pengajuan</div>
            <div className="topbar-sub">
              Admin dapat mengatur waktu buka & tutup pengajuan.
            </div>
          </div>
          <div className="topbar-right">
          <span>Role: </span>
          <span className="role-pill">{formatRole(currentUser?.role)}</span>
        </div>
        </header>

        <section className="main-content">
          <div className="card">
            <div className="card-title">Atur Periode</div>
            <div className="card-subtitle">
              Masukkan tahun akademik, tanggal & jam dimulainya pengajuan hingga
              batas akhirnya.
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
                    <option value="2023/2024">2023/2024</option>
                    <option value="2024/2025">2024/2025</option>
                    <option value="2025/2026">2025/2026</option>
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
                      onClick={handleHapus}
                    >
                      Hapus Periode
                    </button>
                  )}
                </div>

                {message && <p style={{ color: "green" }}>{message}</p>}
                {errorMsg && <p className="error-text">{errorMsg}</p>}
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
