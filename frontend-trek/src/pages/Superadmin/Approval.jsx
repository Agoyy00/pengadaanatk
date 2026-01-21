import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../../css/layout.css";
import "../../css/tabel.css";


const API_BASE = "http://127.0.0.1:8000/api";
const token = localStorage.getItem("token");

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
        { label: "Analisis Dan Grafik", to: "/superadmin/grafik-belanja" },
      ];
    }, []);

  useEffect(() => {
    fetchPengajuan();
  }, []);

  const fetchPengajuan = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/pengajuan` , {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
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
          "Accept": "application/json", "Authorization": `Bearer ${token}`,
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
  console.log(currentUser.role); // harus superadmin
console.log(token); // harus ada


 const handleDownloadPdf = async (id) => {
  try {
    const res = await fetch(`${API_BASE}/superadmin/pengajuan/pdf/${id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/pdf",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Gagal download PDF:", text);
      alert("Gagal download PDF, cek console");
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Approval-ATK-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

  } catch (err) {
    console.error("Fetch error:", err);
    alert("Kesalahan jaringan");
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
                          <button
                            onClick={() => handleDownloadPdf(p.id)}
                            style={{
                              padding: "6px 10px",
                              fontSize: "13px",
                              cursor: "pointer",
                            }}
                          >
                            Download PDF
                          </button>
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
