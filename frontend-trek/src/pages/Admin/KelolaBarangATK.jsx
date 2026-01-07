import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../css/Pengajuan.css";
const API_BASE = "http://127.0.0.1:8000/api";

const normalizeRole = (role) =>
  String(role || "")
    .toLowerCase()
    .replace(/[\s_]+/g, "");

export default function KelolaBarangATK() {
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
  const [barangs, setBarangs] = useState([]);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState("create"); // create | edit
  const [selected, setSelected] = useState(null);
  const [gambar, setGambar] = useState(null);
  const [excelFile, setExcelFile] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const [form, setForm] = useState({
    nama: "",
    kode: "",
    satuan: "",
    harga_satuan: "",
  });

  const formatRole = (role) => {
    if (!role) return "-";

    return role
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const generateKodeATK = () => {
  const atkItems = barangs.filter(
    (b) => typeof b.kode === "string" && b.kode.startsWith("ATK-")
  );

  let max = 0;

  atkItems.forEach((b) => {
    const num = parseInt(b.kode.replace("ATK-", ""), 10);
    if (!Number.isNaN(num) && num > max) max = num;
  });

  const next = String(max + 1).padStart(3, "0");
  return `ATK-${next}`;
};

const [errors, setErrors] = useState({});

 const sidebarMenus = useMemo(() => {
  return [
    { label: "Dashboard Admin", to: "/dashboardadmin" },
    { label: "Verifikasi", to: "/verifikasi" },
    { label: "Kelola Barang ATK", to: "/kelola-barang", active: true },
    { label: "Grafik Usulan Barang", to: "/grafik-usulan-barang" },
  ];
}, []);


  const loadBarang = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/barang?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setBarangs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setBarangs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBarang();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==========================
  // Validasi frontend
  // ==========================
  const validate = (payload) => {
    const e = {};

    const nama = (payload.nama || "").trim();
    const kode = (payload.kode || "").trim();
    const satuan = (payload.satuan || "").trim();
    const harga = payload.harga_satuan;

    if (!nama) e.nama = "Nama barang wajib diisi.";
    if (nama.length > 255) e.nama = "Nama terlalu panjang (maks 255).";

    if (!kode) e.kode = "Kode barang wajib diisi.";
    if (kode.length > 50) e.kode = "Kode terlalu panjang (maks 50).";
    if (kode && !/^[a-zA-Z0-9\-_]+$/.test(kode)) {
      e.kode = "Kode hanya boleh huruf/angka, '-' atau '_' (tanpa spasi).";
    }

    if (!satuan) e.satuan = "Satuan wajib diisi.";
    if (satuan.length > 50) e.satuan = "Satuan terlalu panjang (maks 50).";

    if (harga === "" || harga === null || typeof harga === "undefined") {
      e.harga_satuan = "Harga wajib diisi.";
    } else {
      const num = Number(harga);
      if (Number.isNaN(num)) e.harga_satuan = "Harga harus angka.";
      else if (!Number.isInteger(num))
        e.harga_satuan = "Harga harus bilangan bulat.";
      else if (num < 0) e.harga_satuan = "Harga tidak boleh negatif.";
      else if (num > 1000000000) e.harga_satuan = "Harga terlalu besar.";
    }

    return e;
  };

  const openCreate = () => {
  setMode("create");
  setSelected(null);
  setForm({
    nama: "",
    kode: generateKodeATK(), // ⬅️ auto
    satuan: "",
    harga_satuan: "",
  });
  setErrors({});
  setModalOpen(true);
};


  const openEdit = (item) => {
    setMode("edit");
    setSelected(item);
    setForm({
      nama: item.nama ?? "",
      kode: item.kode ?? "",
      satuan: item.satuan ?? "",
      harga_satuan: String(item.harga_satuan ?? 0),
    });
    setErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelected(null);
    setErrors({});
  };

  const onSubmit = async () => {
  const e = validate(form);
  setErrors(e);
  if (Object.keys(e).length > 0) return;

  if (!currentUser?.id) {
    alert("User login tidak terbaca.");
    return;
  }

  const formData = new FormData();
  formData.append("actor_user_id", currentUser.id);
  formData.append("nama", form.nama.trim());
  formData.append("kode", form.kode.trim());
  formData.append("satuan", form.satuan.trim());
  formData.append("harga_satuan", Number(form.harga_satuan));

  if (gambar) {
    formData.append("gambar", gambar);
  }

  setLoading(true);
  try {
    let url = `${API_BASE}/barang`;
    let method = "POST";

    if (mode === "edit" && selected?.id) {
      url = `${API_BASE}/barang/${selected.id}`;
      method = "POST"; // ⚠️ PATCH + FormData kadang bermasalah
      formData.append("_method", "PATCH");
    }

    const res = await fetch(url, {
      method,
      body: formData,
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(data.message || "Gagal menyimpan data.");
      return;
    }

    alert("Barang berhasil disimpan ✅");
    closeModal();
    setGambar(null);
    await loadBarang();
  } catch (err) {
    console.error(err);
    alert("Terjadi kesalahan server.");
  } finally {
    setLoading(false);
  }
};


  const onDelete = async (item) => {
    const ok = window.confirm(`Hapus barang "${item.nama}"?`);
    if (!ok) return;

    if (!currentUser?.id) {
      alert("User login tidak terbaca. Silakan login ulang.");
      localStorage.removeItem("user");
      window.location.href = "/";
      return;
    }

    setLoading(true);
    try {
      // ✅ DELETE pakai body untuk actor_user_id
      const res = await fetch(`${API_BASE}/barang/${item.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor_user_id: currentUser.id }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || "Gagal menghapus barang.");
        return;
      }

      alert("Barang berhasil dihapus ✅");
      await loadBarang();
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan server.");
    } finally {
      setLoading(false);
    }
  };

  const handleImportExcel = async () => {
  if (!excelFile) {
    alert("Pilih file Excel terlebih dahulu");
    return;
  }

  const formData = new FormData();
  formData.append("file", excelFile);
  formData.append("actor_user_id", currentUser.id);

  setLoading(true);
  try {
    const res = await fetch(`${API_BASE}/barang/import`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(data.message || "Import gagal");
      return;
    }

    alert("Import Excel berhasil ✅");
    setExcelFile(null);
    await loadBarang();
  } catch (err) {
    console.error(err);
    alert("Terjadi kesalahan saat import");
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
              onClick={() => !m.active && navigate(m.to)}
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
        <header className="topbar">
          <div>
            <div className="topbar-title">Kelola Barang ATK</div>
            <div className="topbar-sub">Daftar barang agar konsisten & rapi</div>
          </div>
         <div className="topbar-right">
          <span>Role: </span>
          <span className="role-pill">{formatRole(currentUser?.role)}</span>
        </div>
        </header>

        <section className="main-content">
          <div className="card">
            <div
            className="card-title"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span>Daftar Barang</span>
            <div className="excel-wrapper">
            <div style={{ display: "flex", gap: 8 }}>
              <button
              onClick={() => setImportOpen(true)}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                background: "#0ea5e9",
                color: "white",
                fontWeight: 700,
              }}
            >
              📤 Import Excel
            </button>
</div>
              <button
                onClick={openCreate}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "none",
                  cursor: "pointer",
                  background: "#16a34a",
                  color: "white",
                  fontWeight: 700,
                }}
              >
                + Tambah Barang
              </button>
            </div>
          </div>

            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
              <input
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid #ddd",
                }}
                placeholder="Cari nama / kode / satuan..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button
                onClick={loadBarang}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "none",
                  cursor: "pointer",
                  background: "#1f6feb",
                  color: "white",
                  fontWeight: 700,
                }}
              >
                Cari
              </button>
            </div>

            {loading && <p style={{ marginTop: 12 }}>Loading...</p>}

            {!loading && barangs.length === 0 && (
              <p style={{ marginTop: 12 }}>Tidak ada data.</p>
            )}

            {!loading && barangs.length > 0 && (
              <div style={{ overflowX: "auto", marginTop: 12 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th
                        style={{
                          textAlign: "left",
                          padding: 10,
                          borderBottom: "1px solid #eee",
                        }}
                      >
                        Nama
                      </th>
                      <th
                        style={{
                          textAlign: "left",
                          padding: 10,
                          borderBottom: "1px solid #eee",
                        }}
                      >
                        Kode
                      </th>
                      <th
                        style={{
                          textAlign: "left",
                          padding: 10,
                          borderBottom: "1px solid #eee",
                        }}
                      >
                        Satuan
                      </th>
                      <th
                        style={{
                          textAlign: "right",
                          padding: 10,
                          borderBottom: "1px solid #eee",
                        }}
                      >
                        Harga
                      </th>
                      <th style={{ padding: 10, borderBottom: "1px solid #eee" }} />
                    </tr>
                  </thead>
                  <tbody>
                    {barangs.map((b) => (
                      <tr key={b.id}>
                        <td
                          style={{
                            padding: 10,
                            borderBottom: "1px solid #f3f3f3",
                          }}
                        >
                          {b.nama}
                        </td>
                        <td
                          style={{
                            padding: 10,
                            borderBottom: "1px solid #f3f3f3",
                          }}
                        >
                          {b.kode}
                        </td>
                        <td
                          style={{
                            padding: 10,
                            borderBottom: "1px solid #f3f3f3",
                          }}
                        >
                          {b.satuan}
                        </td>
                        <td
                          style={{
                            padding: 10,
                            borderBottom: "1px solid #f3f3f3",
                            textAlign: "right",
                          }}
                        >
                          {Number(b.harga_satuan ?? 0).toLocaleString("id-ID")}
                        </td>
                        <td
                          style={{
                            padding: 10,
                            borderBottom: "1px solid #f3f3f3",
                            textAlign: "right",
                          }}
                        >
                          <button
                            onClick={() => openEdit(b)}
                            style={{
                              padding: "8px 12px",
                              borderRadius: 10,
                              border: "none",
                              cursor: "pointer",
                              background: "#0ea5e9",
                              color: "white",
                              fontWeight: 700,
                              marginRight: 8,
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onDelete(b)}
                            style={{
                              padding: "8px 12px",
                              borderRadius: 10,
                              border: "none",
                              cursor: "pointer",
                              background: "#ef4444",
                              color: "white",
                              fontWeight: 700,
                            }}
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* MODAL */}
          {modalOpen && (
            <div className="modal-overlay">
              <div className="modal-box-small" style={{ width: 560 }}>
                <button className="close-btn-small" onClick={closeModal}>
                  ✖
                </button>

                <div style={{ padding: 16 }}>
                  <h2 style={{ marginTop: 0 }}>
                    {mode === "create" ? "Tambah Barang" : "Edit Barang"}
                  </h2>

                  <label style={{ display: "block", marginTop: 10, marginBottom: 6 }}>
                    Nama
                  </label>
                  <input
                    style={{
                      width: "100%",
                      padding: 10,
                      borderRadius: 10,
                      border: `1px solid ${errors.nama ? "#ef4444" : "#ddd"}`,
                    }}
                    value={form.nama}
                    onChange={(e) => setForm((p) => ({ ...p, nama: e.target.value }))}
                    placeholder="Contoh: Kertas A4 80gsm"
                  />
                  {errors.nama && (
                    <div style={{ color: "#ef4444", marginTop: 6 }}>{errors.nama}</div>
                  )}

                  <label style={{ display: "block", marginTop: 10, marginBottom: 6 }}>
                    Kode
                  </label>
                  <input
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 10,      // abu2 biar keliatan readonly
                    border: `1px solid ${errors.kode ? "#ef4444" : "#ddd"}`,
                    cursor: "not-allowed",
                  }}
                  value={form.kode}
                  readOnly
                />
                  {errors.kode && (
                    <div style={{ color: "#ef4444", marginTop: 6 }}>{errors.kode}</div>
                  )}

                  <label style={{ display: "block", marginTop: 10, marginBottom: 6 }}>
                    Satuan
                  </label>
                  <select
                    style={{
                      width: "100%",
                      padding: 10,
                      borderRadius: 10,
                      border: `1px solid ${errors.satuan ? "#ef4444" : "#ddd"}`,
                      cursor: "pointer",
                    }}
                    value={form.satuan}
                    onChange={(e) => setForm((p) => ({ ...p, satuan: e.target.value }))}
                  >
                    <option value="rim">Rim</option>
                    <option value="pcs">Pcs</option>
                    <option value="dus">Dus</option>
                  </select>

                  {errors.satuan && (
                    <div style={{ color: "#ef4444", marginTop: 6 }}>{errors.satuan}</div>
                  )}

                  <label style={{ display: "block", marginTop: 10, marginBottom: 6 }}>
                    Harga Satuan (Rp)
                  </label>
                  <input
                    style={{
                      width: "100%",
                      padding: 10,
                      borderRadius: 10,
                      border: `1px solid ${errors.harga_satuan ? "#ef4444" : "#ddd"}`,
                    }}
                    value={form.harga_satuan}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!/^\d*$/.test(v)) return;
                      setForm((p) => ({ ...p, harga_satuan: v }));
                    }}
                    placeholder="Contoh: 15000"
                  />
                  {errors.harga_satuan && (
                    <div style={{ color: "#ef4444", marginTop: 6 }}>
                      {errors.harga_satuan}
                    </div>
                  )}

                   <label style={{ display: "block", marginTop: 10, marginBottom: 6 }}>
                    Gambar Barang
                  </label>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;

                      // validasi ukuran max 2MB
                      if (file.size > 2 * 1024 * 1024) {
                        alert("Ukuran gambar maksimal 2MB");
                        return;
                      }

                      setGambar(file);
                    }}
                  />

                  {gambar && (
                    <img
                      src={URL.createObjectURL(gambar)}
                      alt="preview"
                      style={{
                        marginTop: 10,
                        maxWidth: 120,
                        borderRadius: 8,
                        border: "1px solid #ddd",
                      }}
                    />
                  )}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 10,
                      marginTop: 16,
                    }}
                  >
                    <button
                      onClick={closeModal}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1px solid #ddd",
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      Batal
                    </button>

                    <button
                      onClick={onSubmit}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "none",
                        cursor: "pointer",
                        background: "#16a34a",
                        color: "white",
                        fontWeight: 800,
                      }}
                    >
                      Simpan
                    </button>
                  </div>

                  <div style={{ marginTop: 10, fontSize: 12, color: "#555" }}>
                    <b>Catatan konsistensi:</b> Kode akan dinormalisasi (huruf besar & tanpa spasi) dan sistem
                    menolak duplikasi kode / nama+satuan yang sama.
                  </div>
                </div>
              </div>
            </div>
          )}
          {importOpen && (
          <div className="modal-overlay">
            <div className="modal-box-small" style={{ width: 480 }}>
              <button
                className="close-btn-small"
                onClick={() => {
                  setImportOpen(false);
                  setExcelFile(null);
                }}
              >
                ✖
              </button>

              <div style={{ padding: 16 }}>
                <h2 style={{ marginTop: 0 }}>Import Barang via Excel</h2>

                <p style={{ fontSize: 14, color: "#555" }}>
                  Format Excel: <b>nama | satuan | harga_satuan</b><br />
                  Satuan akan diset otomatis ke <b>dus</b> jika berbeda.
                </p>

                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setExcelFile(e.target.files[0])}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 10,
                    marginTop: 20,
                  }}
                >
                  <button
                    onClick={() => {
                      setImportOpen(false);
                      setExcelFile(null);
                    }}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid #ddd",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    Batal
                  </button>

                  <button
                    onClick={handleImportExcel}
                    disabled={loading}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "none",
                      cursor: "pointer",
                      background: "#16a34a",
                      color: "white",
                      fontWeight: 800,
                    }}
                  >
                    {loading ? "Mengimpor..." : "Submit Import"}
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
