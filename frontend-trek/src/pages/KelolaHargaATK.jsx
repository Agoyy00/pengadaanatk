import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/Pengajuan.css";

const API_BASE = "http://127.0.0.1:8000/api";

const normalizeRole = (role) =>
  String(role || "")
    .toLowerCase()
    .replace(/[\s_]+/g, "");

export default function KelolaHargaATK() {
  const navigate = useNavigate();

  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const role = normalizeRole(currentUser?.role);

  // ✅ safety: kalau tidak ada user -> balik ke home
  useEffect(() => {
    if (!currentUser?.id) navigate("/", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [barangs, setBarangs] = useState([]);

  const [selected, setSelected] = useState(null);
  const [hargaInput, setHargaInput] = useState("");
  const [errorHarga, setErrorHarga] = useState("");

  const isSuperAdmin = useMemo(() => role === "superadmin", [role]);

  const sidebarMenus = useMemo(() => {
    if (isSuperAdmin) {
      return [
        { label: "Dashboard Super Admin", to: "/approval" },
        { label: "Tambah User", to: "/tambahuser" },
        { label: "Kelola Barang ATK", to: "/kelola-barang" }, // ✅ tambah menu barang
        { label: "Kelola Harga ATK", to: "/kelola-harga", active: true },
      ];
    }
    return [
      { label: "Dashboard Admin", to: "/dashboardadmin" },
      { label: "Verifikasi", to: "/verifikasi" },
      { label: "Atur Periode", to: "/periode" },
      { label: "Kelola Barang ATK", to: "/kelola-barang" }, // ✅ tambah menu barang
      { label: "Kelola Harga ATK", to: "/kelola-harga", active: true },
    ];
  }, [isSuperAdmin]);

  async function loadBarangs(keyword = "") {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/barang?q=${encodeURIComponent(keyword)}`
      );
      const data = await res.json();
      setBarangs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setBarangs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBarangs("");
  }, []);

  const validateHarga = (val) => {
    if (val === "" || val === null || typeof val === "undefined") {
      return "Harga wajib diisi.";
    }
    const num = Number(val);
    if (Number.isNaN(num)) return "Harga harus berupa angka.";
    if (!Number.isFinite(num)) return "Harga tidak valid.";
    if (num < 0) return "Harga tidak boleh negatif.";
    if (num > 1000000000) return "Harga terlalu besar.";
    if (!Number.isInteger(num)) return "Harga harus bilangan bulat (tanpa koma).";
    return "";
  };

  const onSelectBarang = (b) => {
    setSelected(b);
    setHargaInput(String(b.harga_satuan ?? 0));
    setErrorHarga("");
  };

  const onSave = async () => {
    if (!selected) return;

    if (!currentUser?.id) {
      alert("User login tidak terbaca. Silakan login ulang.");
      localStorage.removeItem("user");
      window.location.href = "/";
      return;
    }

    const err = validateHarga(hargaInput);
    setErrorHarga(err);
    if (err) return;

    setLoading(true);
    try {
      // ✅ kirim actor_user_id untuk audit log
      const res = await fetch(`${API_BASE}/barang/${selected.id}/harga`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actor_user_id: currentUser.id,
          harga_satuan: Number(hargaInput),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        alert(data?.message || "Gagal update harga.");
        return;
      }

      alert("Harga berhasil diperbarui ✅");
      setSelected(null);
      setHargaInput("");
      setErrorHarga("");
      loadBarangs(q);
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan server.");
    } finally {
      setLoading(false);
    }
  };

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
                if (!m.active) navigate(m.to);
              }}
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

      {/* MAIN */}
      <main className="main">
        {/* TOPBAR */}
        <header className="topbar">
          <div>
            <div className="topbar-title">Kelola Harga ATK</div>
            <div className="topbar-sub">
              Selamat datang: {currentUser?.name || "User"}
            </div>
          </div>
          <div className="topbar-right">
            <span>Role: {currentUser?.role || "-"}</span>
            <span className="role-pill">{currentUser?.role || "-"}</span>
          </div>
        </header>

        {/* CONTENT */}
        <section className="main-content">
          <div className="card">
            <div className="card-title">Daftar Barang</div>

            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <input
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #ddd",
                }}
                placeholder="Cari barang (nama / kode)..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button
                onClick={() => loadBarangs(q)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  background: "#1f6feb",
                  color: "white",
                  fontWeight: 600,
                }}
              >
                Cari
              </button>
            </div>

            {loading && <p>Loading...</p>}

            {!loading && barangs.length === 0 && <p>Tidak ada barang ditemukan.</p>}

            {!loading && barangs.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    marginTop: 8,
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>
                        Nama
                      </th>
                      <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>
                        Kode
                      </th>
                      <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>
                        Satuan
                      </th>
                      <th style={{ textAlign: "right", padding: 10, borderBottom: "1px solid #eee" }}>
                        Harga Satuan
                      </th>
                      <th style={{ padding: 10, borderBottom: "1px solid #eee" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {barangs.map((b) => (
                      <tr key={b.id}>
                        <td style={{ padding: 10, borderBottom: "1px solid #f3f3f3" }}>{b.nama}</td>
                        <td style={{ padding: 10, borderBottom: "1px solid #f3f3f3" }}>{b.kode}</td>
                        <td style={{ padding: 10, borderBottom: "1px solid #f3f3f3" }}>{b.satuan}</td>
                        <td style={{ padding: 10, borderBottom: "1px solid #f3f3f3", textAlign: "right" }}>
                          {Number(b.harga_satuan ?? 0).toLocaleString("id-ID")}
                        </td>
                        <td style={{ padding: 10, borderBottom: "1px solid #f3f3f3", textAlign: "right" }}>
                          <button
                            onClick={() => onSelectBarang(b)}
                            style={{
                              padding: "8px 12px",
                              borderRadius: 8,
                              border: "none",
                              cursor: "pointer",
                              background: "#0ea5e9",
                              color: "white",
                              fontWeight: 600,
                            }}
                          >
                            Edit Harga
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* MODAL EDIT */}
          {selected && (
            <div className="modal-overlay">
              <div className="modal-box-small" style={{ width: 520 }}>
                <button
                  className="close-btn-small"
                  onClick={() => {
                    setSelected(null);
                    setHargaInput("");
                    setErrorHarga("");
                  }}
                >
                  ✖
                </button>

                <div style={{ padding: 16 }}>
                  <h2 style={{ marginTop: 0 }}>Edit Harga</h2>

                  <p style={{ marginBottom: 6 }}>
                    <b>{selected.nama}</b> ({selected.kode})
                  </p>

                  <label style={{ display: "block", marginTop: 12, marginBottom: 6 }}>
                    Harga Satuan (Rp)
                  </label>
                  <input
                    style={{
                      width: "100%",
                      padding: 10,
                      borderRadius: 8,
                      border: `1px solid ${errorHarga ? "#ef4444" : "#ddd"}`,
                    }}
                    value={hargaInput}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!/^\d*$/.test(v)) return;
                      setHargaInput(v);
                      setErrorHarga("");
                    }}
                    placeholder="contoh: 15000"
                  />
                  {errorHarga && (
                    <div style={{ color: "#ef4444", marginTop: 8 }}>{errorHarga}</div>
                  )}

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                    <button
                      onClick={() => {
                        setSelected(null);
                        setHargaInput("");
                        setErrorHarga("");
                      }}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 8,
                        border: "1px solid #ddd",
                        cursor: "pointer",
                        background: "white",
                        fontWeight: 600,
                      }}
                    >
                      Batal
                    </button>

                    <button
                      onClick={onSave}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 8,
                        border: "none",
                        cursor: "pointer",
                        background: "#16a34a",
                        color: "white",
                        fontWeight: 700,
                      }}
                    >
                      Simpan
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
