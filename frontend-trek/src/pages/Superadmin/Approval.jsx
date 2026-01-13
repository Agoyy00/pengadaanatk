import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../../css/layout.css";
import "../../css/tabel.css";


const API_BASE = "http://127.0.0.1:8000/api";

export default function Approval() {
  const navigate = useNavigate();
  const [pengajuan, setPengajuan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;

  const sidebarMenus = useMemo(() => {
      return [
        { label: "Dashboard Super Admin", to: "/dashboardsuperadmin"},
        { label: "Approval", to: "/approval", active: true },
        { label: "Tambah User", to: "/tambahuser" },
        { label: "Atur Periode", to: "/periode" },
        { label: "Daftar Barang ATK", to: "/superadmin/daftar-barang"},
        { label: "Grafik Belanja Unit", to: "/superadmin/grafik-belanja" },
      ];
    }, []);

  useEffect(() => {
    fetchPengajuan();
  }, []);

  const fetchPengajuan = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/pengajuan`);
      const json = await res.json();
      // Ambil semua pengajuan yang diverifikasi admin atau sudah disetujui/ditolak
      setPengajuan(json.filter(p => ["diverifikasi_admin", "disetujui", "ditolak_admin"].includes(p.status)));
    } catch (err) {
      console.error("Gagal memuat pengajuan:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatRole = (role) => {
    if (!role) return "-";

    return role
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const handleStatusUpdate = async (id, newStatus) => {
    if (!currentUser) {
  alert("User belum login");
  return;
}
    if (!window.confirm(`Ubah status pengajuan #${id} menjadi "${newStatus}"?`)) return;
    try {
      setProcessingId(id);

      const res = await fetch(`${API_BASE}/pengajuan/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
          user_id: currentUser.id,
          role: currentUser.role, // ⬅️ INI JUGA WAJIB
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        alert(json.message || "Gagal update status");
        return;
      }

      setPengajuan(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
      alert("Status berhasil diubah");
    } catch (err) {
      console.error(err);
      alert("Kesalahan jaringan");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    
    <div className="layout">
      <aside className= "sidebar">
          <div className="sidebar-logo">Sistem Pengajuan ATK</div>
          <div className="sidebar-subtitle">Universitas Yarsi</div>
       
        <nav className="sidebar-menu">
          {sidebarMenus.map((m) => (
            <div
              key={m.label}
              className={`menu-item ${m.active ? "disabled" : ""}`}
              style={{ cursor: m.active ? "default" : "pointer" }}
              onClick={() => { if (!m.active) navigate(m.to); }}
            >
              {m.label}
            </div>
          ))}
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

      <main className="main">
        <header className="topbar">
          <div>
            <div className="topbar-title">Approval</div>
            <div className="topbar-sub">
              Selamat datang: {currentUser?.name || "Super Admin ATK"}
            </div>
          </div>
          <div className="topbar-right">
          <span>Role: </span>
          <span className="role-pill">{formatRole(currentUser?.role)}</span>
        </div>
        </header>

        <section className="main-content">
          <div className="card">
            <div className="card-title">Pengajuan Diverifikasi Admin</div>
            {loading && <p>Sedang memuat...</p>}
            {!loading && pengajuan.length === 0 && <p>Belum ada pengajuan.</p>}

            {!loading && pengajuan.length > 0 && (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Pemohon</th>
                      <th>Unit</th>
                      <th>Jabatan</th>
                      <th>Tahun</th>
                      <th>Total Jumlah</th>
                      <th>Status</th>
                      <th>Aksi</th>
                      <th>PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pengajuan.map((p) => (
                      <tr key={p.id}>
                        <td>{p.id}</td>
                        <td>{p.nama_pemohon}</td>
                        <td>{p.unit}</td>
                        <td>{p.jabatan}</td>
                        <td>{p.tahun_akademik}</td>
                        <td>{p.total_jumlah_diajukan}</td>
                        <td>{p.status}</td>
                        <td>
                          {p.status === "diverifikasi_admin" ? (
                            <>
                              <button
                                disabled={processingId === p.id}
                                onClick={() => handleStatusUpdate(p.id, "disetujui")}
                              >
                                {processingId === p.id ? "Memproses..." : "Approve"}
                              </button>
                              <button
                                disabled={processingId === p.id}
                                onClick={() => handleStatusUpdate(p.id, "ditolak_admin")}
                                style={{ marginLeft: 6 }}
                              >
                                {processingId === p.id ? "Memproses..." : "Tolak"}
                              </button>
                            </>
                          ) : (
                            <span>Tidak ada aksi</span>
                          )}
                        </td>
                        <td>
                          {["disetujui", "ditolak_admin"].includes(p.status) && (
                            <a
                              href={`${API_BASE}/pengajuan/${p.id}/pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Download PDF
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
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
