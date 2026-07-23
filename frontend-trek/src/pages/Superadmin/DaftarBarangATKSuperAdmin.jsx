import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import "../../css/layout.css";
import "../../css/Barang.css";
import ImportExcelBarang from "../../components/ImportExcelBarang";
import RoleSwitcher from "../../components/RoleSwitcher";

const API_BASE = import.meta.env.VITE_API_BASE;
const token = localStorage.getItem("token");

const normalizeRole = (role) =>
  String(role || "")
    .toLowerCase()
    .replace(/[\s_]+/g, "");

// Helper Title Case for Satuan (e.g., "dus" -> "Dus", "rim" -> "Rim")
const toTitleCase = (str) => {
  if (!str) return "";
  return String(str)
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

const DEFAULT_SATUAN_LIST = [
  "Dus",
  "Rim",
  "Pcs",
  "Box",
  "Pack",
  "Roll",
  "Botol",
  "Buku",
  "Set",
  "Lembars",
  "Tube",
  "Pad",
];

export default function DaftarBarangATKSuperAdmin() {
  const navigate = useNavigate();
  const location = useLocation();

  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const role = normalizeRole(currentUser?.role);
  const [checkedIds, setCheckedIds] = useState([]);

  const isChecked = (id) => checkedIds.includes(id);

  const toggleCheck = (id) => {
    setCheckedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  const toggleCheckAll = () => {
    if (checkedIds.length === barangs.length) {
      setCheckedIds([]);
    } else {
      setCheckedIds(barangs.map((b) => b.id));
    }
  };

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

  // Satuan Options State (Backend Persisted)
  const [satuanList, setSatuanList] = useState([]);

  const [form, setForm] = useState({
    nama: "",
    kode: "",
    satuan: "Dus",
    harga_satuan: "",
  });

  const loadSatuanOptions = async () => {
    try {
      const res = await fetch(`${API_BASE}/options/satuan`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setSatuanList(json.data);
      }
    } catch (err) {
      console.error("Gagal load satuan options:", err);
    }
  };

  useEffect(() => {
    loadSatuanOptions();
  }, []);

  const handleTambahSatuan = async () => {
    const { value: inputSatuan } = await Swal.fire({
      title: "Tambah Satuan Barang Baru",
      input: "text",
      inputLabel: "Masukkan nama satuan (contoh: Rim, Roll, Pack, Botol)",
      inputPlaceholder: "Contoh: Rim",
      showCancelButton: true,
      confirmButtonText: "Lanjut Konfirmasi",
      cancelButtonText: "Batal",
      confirmButtonColor: "#2563eb",
      inputValidator: (val) => {
        if (!val || !val.trim()) {
          return "Nama satuan tidak boleh kosong!";
        }
      },
    });

    if (inputSatuan) {
      const formatted = toTitleCase(inputSatuan);

      // Verifikasi cegah typo
      const confirmResult = await Swal.fire({
        title: "Konfirmasi Satuan Baru",
        html: `Apakah nama satuan <strong>"${formatted}"</strong> sudah benar dan bebas typo?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Ya, Benar",
        cancelButtonText: "Perbaiki",
        confirmButtonColor: "#16a34a",
        cancelButtonColor: "#64748b",
      });

      if (confirmResult.isConfirmed) {
        try {
          const res = await fetch(`${API_BASE}/options/satuan`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ value: formatted }),
          });
          const json = await res.json();
          if (json.success) {
            await loadSatuanOptions();
            setForm((prev) => ({ ...prev, satuan: formatted }));
            Swal.fire({
              icon: "success",
              title: "Satuan Ditambahkan",
              text: `Satuan "${formatted}" berhasil disimpan ke database.`,
              timer: 1500,
              showConfirmButton: false,
            });
          }
        } catch (err) {
          console.error(err);
          Swal.fire("Error", "Gagal menyimpan satuan", "error");
        }
      }
    }
  };

  const handleHapusSatuan = async () => {
    const currentSatuan = form.satuan;
    if (!currentSatuan) return;

    const targetOpt = satuanList.find(
      (s) => toTitleCase(s.value) === toTitleCase(currentSatuan)
    );

    if (!targetOpt) {
      Swal.fire("Info", "Satuan tidak ditemukan di database", "info");
      return;
    }

    const confirmResult = await Swal.fire({
      title: "Hapus Satuan?",
      html: `Apakah Anda yakin ingin menghapus satuan <strong>"${targetOpt.value}"</strong> dari database?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus Satuan",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
    });

    if (confirmResult.isConfirmed) {
      try {
        const res = await fetch(`${API_BASE}/options/${targetOpt.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.success) {
          const updated = satuanList.filter((s) => s.id !== targetOpt.id);
          setSatuanList(updated);
          setForm((prev) => ({ ...prev, satuan: updated[0]?.value || "" }));

          Swal.fire({
            icon: "success",
            title: "Satuan Dihapus",
            text: `Satuan "${targetOpt.value}" berhasil dihapus dari database.`,
            timer: 1500,
            showConfirmButton: false,
          });
        }
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Gagal menghapus satuan", "error");
      }
    }
  };

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
      { label: "Dashboard Super Admin", to: "/dashboardsuperadmin" },
      { label: "Monitoring Admin", to: "/superadmin/monitoring-admin" },
      { label: "Monitoring User", to: "/superadmin/monitoring-user" },
      { label: "Approval Pengajuan", to: "/approval" },
      { label: "Tambah & Kelola User", to: "/tambahuser" },
      { label: "Atur Periode", to: "/periode" },
      { label: "Daftar Barang ATK", to: "/superadmin/daftar-barang", active: true },
      { label: "Grafik Belanja", to: "/superadmin/grafik-belanja" },
      { label: "Stock Opname Barang", to: "/stock-opname" },
      { label: "Template Dokumen", to: "/template-dokumen" },
    ];
  }, []);

  const loadBarang = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/barang?q=${encodeURIComponent(q)}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
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
      kode: generateKodeATK(),
      satuan: satuanList[0]?.value || "Dus",
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
      satuan: toTitleCase(item.satuan ?? "Dus"),
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
    formData.append("satuan", toTitleCase(form.satuan));
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
      headers: { "Authorization": `Bearer ${token}` },
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

  setLoading(true);
  try {
    const res = await fetch(
      `${API_BASE}/barang/${item.id}`,
        {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json", "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          actor_user_id: currentUser.id,
        }),
      }
    );

    // ⛑️ SAFETY CHECK
    const text = await res.text();

    if (!text.startsWith("{")) {
      console.error("Bukan JSON:", text);
      alert("Server mengembalikan response tidak valid (HTML)");
      return;
    }

    const data = JSON.parse(text);

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

const onDeleteSelected = async () => {
  if (checkedIds.length === 0) return;

  const ok = window.confirm(
    `Hapus ${checkedIds.length} barang terpilih?`
  );
  if (!ok) return;

  setLoading(true);
  try {
    const res = await fetch(`${API_BASE}/barang/bulk/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        ids: checkedIds,
        actor_user_id: currentUser.id,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(data.message || "Gagal menghapus barang");
      return;
    }

    alert("Barang berhasil dihapus ✅");
    setCheckedIds([]);
    await loadBarang();
  } catch (err) {
    console.error(err);
    alert("Terjadi kesalahan server");
  } finally {
    setLoading(false);
  }
};



  const handleImportExcel = async () => {
  if (!excelFile) {
    alert("Pilih file Excel terlebih dahulu");
    return;
  }

  console.log("Token:", token);
  const formData = new FormData();
  formData.append("file", excelFile);
  formData.append("actor_user_id", currentUser.id);

  try {
    const res = await fetch(`${API_BASE}/barang/import-excel`, {
      method: "POST",
      body: formData,
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    
    
    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(data.message || "Import gagal");
      return;
    }

    // ✅ INI YANG KURANG
    alert("Import berhasil ✅");
    setImportOpen(false);   // tutup modal
    setExcelFile(null);     // reset file
    await loadBarang();     // refresh tabel

  } catch (err) {
    console.error(err);
    alert("Terjadi kesalahan server");
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
          {sidebarMenus.map((m) => {
            const isActive = location.pathname === m.to;
            return (
              <div
                key={m.label}
                className={`menu-item ${isActive ? "active" : ""}`}
                style={{ cursor: isActive ? "default" : "pointer" }}
                onClick={() => !isActive && navigate(m.to)}
              >
                {m.label}
              </div>
            );
          })}
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
            <RoleSwitcher />
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
            <div className="action-buttons" style={{ display: "flex", gap: 8 }}>
            <button
              className="btn-import"
              onClick={() => setImportOpen(true)}
            >
              📤 Import Excel
            </button>

            <button
              className="btn-add"
              onClick={openCreate}
            >
              + Tambah Barang
            </button>
            <button
            disabled={checkedIds.length === 0}
            onClick={onDeleteSelected}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "none",
              cursor: checkedIds.length === 0 ? "not-allowed" : "pointer",
              background: checkedIds.length === 0 ? "#e5e7eb" : "#dc2626",
              color: checkedIds.length === 0 ? "#6b7280" : "white",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            🗑 Hapus Terpilih
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
                    <th style={{ padding: 10 }}>
                      <input
                        type="checkbox"
                        checked={
                          barangs.length > 0 &&
                          checkedIds.length === barangs.length
                        }
                        onChange={toggleCheckAll}
                      />
                    </th>
                    <th>Nama</th>
                    <th>Kode</th>
                    <th>Satuan</th>
                    <th style={{ textAlign: "right" }}>Harga</th>
                    <th />
                  </tr>
                </thead>

                  <tbody>
  {barangs.map((b) => (
    <tr key={b.id}>
      {/* CHECKBOX PER BARIS */}
      <td
        style={{
          padding: 10,
          borderBottom: "1px solid #f3f3f3",
          textAlign: "center",
        }}
      >
        <input
          type="checkbox"
          checked={isChecked(b.id)}
          onChange={() => toggleCheck(b.id)}
        />
      </td>

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
          }}
        >
          Edit
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
                    borderRadius: 10,
                    border: `1px solid ${errors.kode ? "#ef4444" : "#ddd"}`,
                    cursor: "not-allowed",
                  }}
                  value={form.kode}
                  readOnly
                />
                  {errors.kode && (
                    <div style={{ color: "#ef4444", marginTop: 6 }}>{errors.kode}</div>
                  )}

                  <label style={{ display: "block", marginTop: 10, marginBottom: 6, fontWeight: 600 }}>
                    Satuan Barang
                  </label>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <select
                      style={{
                        flex: 1,
                        padding: 10,
                        borderRadius: 10,
                        border: `1px solid ${errors.satuan ? "#ef4444" : "#ddd"}`,
                        background: "#ffffff",
                        fontSize: 14,
                      }}
                      value={form.satuan}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, satuan: toTitleCase(e.target.value) }))
                      }
                    >
                      {satuanList.map((s) => (
                        <option key={s.id || s.value} value={s.value}>
                          {s.value}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleTambahSatuan}
                      title="Tambah Satuan Barang Baru"
                      style={{
                        padding: "9px 12px",
                        borderRadius: 10,
                        border: "1px solid #3b82f6",
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        fontWeight: 700,
                        cursor: "pointer",
                        fontSize: 13,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        whiteSpace: "nowrap",
                      }}
                    >
                      ➕ Tambah
                    </button>

                    <button
                      type="button"
                      onClick={handleHapusSatuan}
                      title={`Hapus satuan "${form.satuan}"`}
                      style={{
                        padding: "9px 12px",
                        borderRadius: 10,
                        border: "1px solid #fecaca",
                        background: "#fef2f2",
                        color: "#dc2626",
                        fontWeight: 700,
                        cursor: "pointer",
                        fontSize: 13,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        whiteSpace: "nowrap",
                      }}
                    >
                      🗑️ Hapus
                    </button>
                  </div>

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
          <ImportExcelBarang
          open={importOpen}
          onClose={() => setImportOpen(false)}
          loading={loading}
          excelFile={excelFile}
          setExcelFile={setExcelFile}
          onSubmit={handleImportExcel}
        />
        )}
        </section>
      </main>
    </div>
  );
}
