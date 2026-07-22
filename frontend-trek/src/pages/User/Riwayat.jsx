import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import "../../css/Riwayat.css";
import "../../css/layout.css";
import RoleSwitcher from "../../components/RoleSwitcher";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function Riwayat() {
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Expand state for items in table row
  const [expandedRows, setExpandedRows] = useState({});

  // Modal Revisi State
  const [selectedPengajuan, setSelectedPengajuan] = useState(null); // pengajuan object
  const [revisiItems, setRevisiItems] = useState([]);               // items being edited
  const [searchFilter, setSearchFilter] = useState("");              // search bar inside modal
  const [savingRevisi, setSavingRevisi] = useState(false);

  // Master Barang List for adding new items
  const [masterBarang, setMasterBarang] = useState([]);
  const [showAddBarangModal, setShowAddBarangModal] = useState(false);
  const [addBarangQuery, setAddBarangQuery] = useState("");

  const sidebarMenus = useMemo(() => {
    return [
      { label: "Dashboard User", to: "/dashboarduser" },
      { label: "Buat Pengajuan Baru", to: "/pengajuan" },
      { label: "Riwayat Pengajuan", to: "/riwayat", active: true },
      { label: "Stock Opname Barang", to: "/stock-opname" },
      { label: "Template Dokumen", to: "/template-dokumen" },
    ];
  }, []);

  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const userId = currentUser?.id;
  const token = localStorage.getItem("token");

  async function loadRiwayat() {
    if (!userId) {
      setErrorMsg("User belum login.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/pengajuan?user_id=${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Gagal load riwayat:", err);
      setErrorMsg("Gagal memuat riwayat pengajuan.");
    } finally {
      setLoading(false);
    }
  }

  // Fetch Master Barang list for adding new item option
  async function loadMasterBarang() {
    try {
      const res = await fetch(`${API_BASE}/barang`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (Array.isArray(json)) {
        setMasterBarang(json);
      } else if (json.data && Array.isArray(json.data)) {
        setMasterBarang(json.data);
      }
    } catch (err) {
      console.error("Gagal load master barang:", err);
    }
  }

  useEffect(() => {
    loadRiwayat();
    loadMasterBarang();
  }, [userId]);

  const toggleExpandRow = (id) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderStatus = (status) => {
    if (status === "diajukan") {
      return <span className="status-badge status-diajukan">Diajukan</span>;
    }
    if (status === "diverifikasi" || status === "diverifikasi_admin") {
      return <span className="status-badge status-diverifikasi">Diverifikasi Admin</span>;
    }
    if (status === "disetujui" || status === "disetujui_admin") {
      return <span className="status-badge status-disetujui">Disetujui</span>;
    }
    if (status === "ditolak" || status === "ditolak_admin") {
      return <span className="status-badge status-ditolak">Ditolak</span>;
    }
    return <span className="status-badge">{status}</span>;
  };

  const canRevisi = (status) => {
    return !['verifikasi_admin', 'diverifikasi_admin', 'disetujui_admin', 'ditolak_admin', 'disetujui', 'ditolak', 'diverifikasi'].includes(status);
  };

  // ========== MODAL REVISI LOGIC ==========

  const openRevisiModal = (pengajuan) => {
    setSelectedPengajuan(pengajuan);
    setSearchFilter("");
    const editableItems = (pengajuan.items || []).map((item) => ({
      id: item.id,
      barang_id: item.barang_id || item.barang?.id,
      barang_nama: item.barang?.nama ?? "Barang",
      satuan: item.barang?.satuan ?? "Pcs",
      harga_satuan: item.harga_satuan ?? (item.barang?.harga_satuan || 0),
      kebutuhan_total: item.kebutuhan_total ?? 0,
      sisa_stok: item.sisa_stok ?? 0,
      jumlah_diajukan: Math.max(0, (item.kebutuhan_total ?? 0) - (item.sisa_stok ?? 0)),
    }));
    setRevisiItems(editableItems);
  };

  const closeRevisiModal = () => {
    setSelectedPengajuan(null);
    setRevisiItems([]);
    setSearchFilter("");
  };

  const handleRevisiItemChange = (targetItem, field, value) => {
    setRevisiItems((prev) => {
      return prev.map((item) => {
        if (item === targetItem) {
          const numVal = Math.max(0, parseInt(value) || 0);
          const updated = { ...item, [field]: numVal };
          const kebutuhan = field === "kebutuhan_total" ? numVal : updated.kebutuhan_total;
          const stok = field === "sisa_stok" ? numVal : updated.sisa_stok;
          updated.jumlah_diajukan = Math.max(0, kebutuhan - stok);
          return updated;
        }
        return item;
      });
    });
  };

  // Increment / Decrement helper
  const handleCounter = (targetItem, field, delta) => {
    setRevisiItems((prev) => {
      return prev.map((item) => {
        if (item === targetItem) {
          const currentVal = item[field] || 0;
          const newVal = Math.max(0, currentVal + delta);
          const updated = { ...item, [field]: newVal };
          const kebutuhan = field === "kebutuhan_total" ? newVal : updated.kebutuhan_total;
          const stok = field === "sisa_stok" ? newVal : updated.sisa_stok;
          updated.jumlah_diajukan = Math.max(0, kebutuhan - stok);
          return updated;
        }
        return item;
      });
    });
  };

  // Hapus barang dari daftar revisi
  const handleRemoveItem = (targetItem) => {
    if (revisiItems.length <= 1) {
      Swal.fire({
        icon: "warning",
        title: "Perhatian",
        text: "Pengajuan harus memiliki minimal 1 barang. Anda tidak dapat menghapus semua barang.",
        confirmButtonColor: "#f59e0b",
      });
      return;
    }
    setRevisiItems((prev) => prev.filter((item) => item !== targetItem));
  };

  // Tambah barang baru ke daftar revisi
  const handleSelectNewBarang = (b) => {
    const exists = revisiItems.some((item) => item.barang_id === b.id);
    if (exists) {
      Swal.fire({
        icon: "info",
        title: "Sudah Ada",
        text: `Barang "${b.nama}" sudah ada dalam daftar revisi.`,
        timer: 1800,
        showConfirmButton: false,
      });
      return;
    }

    const newItem = {
      id: null,
      barang_id: b.id,
      barang_nama: b.nama,
      satuan: b.satuan || "Pcs",
      harga_satuan: b.harga_satuan || 0,
      kebutuhan_total: 10,
      sisa_stok: 0,
      jumlah_diajukan: 10,
    };

    setRevisiItems((prev) => [...prev, newItem]);
    setShowAddBarangModal(false);
    setAddBarangQuery("");
  };

  // Filtered items based on search inside modal
  const filteredRevisiItems = useMemo(() => {
    if (!searchFilter.trim()) return revisiItems;
    const q = searchFilter.toLowerCase();
    return revisiItems.filter((item) =>
      item.barang_nama.toLowerCase().includes(q)
    );
  }, [revisiItems, searchFilter]);

  // Master barang filtered for selection
  const filteredMasterBarang = useMemo(() => {
    if (!addBarangQuery.trim()) return masterBarang;
    const q = addBarangQuery.toLowerCase();
    return masterBarang.filter(
      (b) =>
        b.nama?.toLowerCase().includes(q) ||
        b.kode?.toLowerCase().includes(q)
    );
  }, [masterBarang, addBarangQuery]);

  const submitRevisi = async () => {
    if (!selectedPengajuan) return;

    if (revisiItems.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Perhatian",
        text: "Daftar barang tidak boleh kosong.",
        confirmButtonColor: "#f59e0b",
      });
      return;
    }

    const hasItemsToOrder = revisiItems.some((item) => item.jumlah_diajukan > 0);
    if (!hasItemsToOrder) {
      Swal.fire({
        icon: "warning",
        title: "Perhatian",
        text: "Minimal ada 1 barang dengan jumlah pengajuan lebih dari 0.",
        confirmButtonColor: "#f59e0b",
      });
      return;
    }

    const confirmResult = await Swal.fire({
      title: "Simpan Revisi Pengajuan?",
      text: `Menyimpan ${revisiItems.length} barang pengajuan.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Simpan Revisi",
      cancelButtonText: "Batal",
      confirmButtonColor: "#d97706",
      cancelButtonColor: "#64748b",
    });

    if (!confirmResult.isConfirmed) return;

    setSavingRevisi(true);

    try {
      const payload = {
        items: revisiItems.map((item) => ({
          id: item.id || null,
          barang_id: item.barang_id,
          kebutuhan_total: item.kebutuhan_total,
          sisa_stok: item.sisa_stok,
        })),
      };

      const res = await fetch(`${API_BASE}/pengajuan/${selectedPengajuan.id}/user-revisi`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (json.success) {
        Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: "Revisi pengajuan berhasil disimpan.",
          timer: 2000,
          showConfirmButton: false,
        });
        closeRevisiModal();
        loadRiwayat();
      } else {
        Swal.fire({
          icon: "error",
          title: "Gagal",
          text: json.message || "Gagal menyimpan revisi.",
        });
      }
    } catch (err) {
      console.error("Error submit revisi:", err);
      Swal.fire({
        icon: "error",
        title: "Terjadi Kesalahan",
        text: "Tidak dapat terhubung ke server.",
      });
    } finally {
      setSavingRevisi(false);
    }
  };

  const totalEstimasi = revisiItems.reduce(
    (sum, item) => sum + item.jumlah_diajukan * item.harga_satuan,
    0
  );

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
                onClick={() => {
                  if (!isActive) navigate(m.to);
                }}
              >
                {m.label}
              </div>
            );
          })}
        </nav>

        <Link to="/" className="logout">
          Log Out
        </Link>
      </aside>

      {/* KANAN */}
      <main className="main">
        {/* TOPBAR */}
        <header className="topbar">
          <div>
            <div className="topbar-title">Riwayat Pengajuan ATK</div>
            <div className="topbar-sub">
              Selamat datang: {currentUser?.name || "Nama Kamu"}
            </div>
          </div>
          <div className="topbar-right">
            <span>Role: </span>
            <RoleSwitcher />
          </div>
        </header>

        {/* MAIN CONTENT */}
        <section className="main-content">
          <div className="card">
            <div className="card-title">Riwayat Pengajuan</div>
            <div className="card-subtitle">
              Semua pengajuan ATK yang pernah kamu lakukan.
            </div>

            {loading && <p className="loading-text">Sedang memuat data riwayat...</p>}
            {errorMsg && <p className="error-text">{errorMsg}</p>}

            {!loading && !errorMsg && (
              <>
                {data.length === 0 ? (
                  <div className="empty-state">Belum ada pengajuan ATK.</div>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Nama Pemohon</th>
                          <th>Tahun Akademik</th>
                          <th>Unit</th>
                          <th>Jabatan</th>
                          <th>Status</th>
                          <th>Tanggal</th>
                          <th>Barang yang diajukan</th>
                          <th>Aksi</th>
                        </tr>
                      </thead>

                      <tbody>
                        {data.map((p) => {
                          const itemsList = p.items || [];
                          const isExpanded = expandedRows[p.id];
                          const visibleItems = isExpanded
                            ? itemsList
                            : itemsList.slice(0, 2);
                          const hiddenCount = itemsList.length - 2;

                          return (
                            <tr key={p.id}>
                              <td className="font-semibold">#{p.id}</td>
                              <td>{p.nama_pemohon}</td>
                              <td>{p.tahun_akademik}</td>
                              <td>{p.unit}</td>
                              <td>{p.jabatan}</td>
                              <td>{renderStatus(p.status)}</td>
                              <td>
                                {p.created_at
                                  ? new Date(p.created_at).toLocaleString("id-ID")
                                  : "-"}
                              </td>

                              {/* BARANG YANG DIAJUKAN */}
                              <td>
                                {itemsList.length === 0 && <span>-</span>}

                                {itemsList.length > 0 && (
                                  <div className="barang-compact-wrapper">
                                    <ul className="barang-list">
                                      {visibleItems.map((item) => {
                                        const namaBarang = item.barang?.nama ?? "Barang";
                                        const satuan = item.barang?.satuan ?? "";
                                        const diajukan = item.jumlah_diajukan;
                                        const disetujui =
                                          item.jumlah_disetujui ?? item.jumlah_diajukan;
                                        const direvisi =
                                          item.jumlah_disetujui != null &&
                                          item.jumlah_disetujui !== item.jumlah_diajukan;

                                        return (
                                          <li key={item.id}>
                                            <span className="barang-name">{namaBarang}</span> — diajukan{" "}
                                            <strong className="qty-tag">
                                              {diajukan} {satuan}
                                            </strong>
                                            {direvisi && (
                                              <>
                                                {" , "}disetujui{" "}
                                                <strong className="qty-tag-disetujui">
                                                  {disetujui} {satuan}
                                                </strong>{" "}
                                                <span className="badge-revisi-tag">(direvisi)</span>
                                              </>
                                            )}
                                            {item.catatan_revisi && (
                                              <div className="revisi-note">
                                                Catatan: {item.catatan_revisi}
                                              </div>
                                            )}
                                          </li>
                                        );
                                      })}
                                    </ul>

                                    {itemsList.length > 2 && (
                                      <button
                                        type="button"
                                        className="btn-expand-items"
                                        onClick={() => toggleExpandRow(p.id)}
                                      >
                                        {isExpanded
                                          ? "▲ Sembunyikan"
                                          : `+ ${hiddenCount} barang lainnya...`}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* KOLOM AKSI */}
                              <td>
                                {canRevisi(p.status) && (
                                  <button
                                    className="btn-revisi"
                                    onClick={() => openRevisiModal(p)}
                                  >
                                    ✏️ Edit / Revisi
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      {/* ================= MODAL REVISI PENGAJUAN (NO HORIZONTAL SCROLL) ================= */}
      {selectedPengajuan && (
        <div className="modal-backdrop" onClick={closeRevisiModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            {/* Header Modal */}
            <div className="modal-header">
              <div className="modal-header-info">
                <div className="modal-icon-badge">✏️</div>
                <div>
                  <h3 className="modal-title">Revisi Pengajuan #{selectedPengajuan.id}</h3>
                  <p className="modal-subtitle">
                    {selectedPengajuan.nama_pemohon} • {selectedPengajuan.unit} ({selectedPengajuan.tahun_akademik})
                  </p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={closeRevisiModal}>
                &times;
              </button>
            </div>

            {/* Toolbar: Search Bar + Tambah Barang Button */}
            <div className="modal-toolbar">
              <div className="search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Cari barang dalam daftar revisi..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                />
                {searchFilter && (
                  <button
                    className="clear-search-btn"
                    onClick={() => setSearchFilter("")}
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="button"
                className="btn-add-item"
                onClick={() => setShowAddBarangModal(true)}
              >
                ➕ Tambah Barang Baru
              </button>
            </div>

            {/* Formula Hint Banner */}
            <div className="formula-banner">
              <span className="formula-title">💡 Formula:</span>
              <div className="formula-box">
                <span className="formula-chip chip-blue">Kebutuhan Total</span>
                <span className="formula-op">−</span>
                <span className="formula-chip chip-amber">Stok Saat Ini</span>
                <span className="formula-op">=</span>
                <span className="formula-chip chip-green">Jumlah Diajukan</span>
              </div>
              <span className="item-count-badge">
                {revisiItems.length} Barang
              </span>
            </div>

            {/* Modal Body / Table (STREAMLINED COLUMNS) */}
            <div className="modal-body">
              <div className="revisi-table-card">
                <table className="revisi-modal-table">
                  <thead>
                    <tr>
                      <th style={{ width: "35px" }} className="text-center">No</th>
                      <th>Nama Barang & Details</th>
                      <th className="th-highlight text-center" style={{ width: "125px" }}>Kebutuhan Total</th>
                      <th className="th-highlight text-center" style={{ width: "125px" }}>Stok Saat Ini</th>
                      <th className="th-result text-center" style={{ width: "135px" }}>Jumlah Diajukan</th>
                      <th className="text-right" style={{ width: "120px" }}>Subtotal</th>
                      <th style={{ width: "45px" }} className="text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRevisiItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-slate-500">
                          {searchFilter
                            ? `Tidak ada barang sesuai kata kunci "${searchFilter}"`
                            : "Belum ada barang. Klik '+ Tambah Barang Baru' di atas."}
                        </td>
                      </tr>
                    ) : (
                      filteredRevisiItems.map((item, idx) => (
                        <tr key={item.id || item.barang_id}>
                          <td className="text-center font-medium text-slate-500">{idx + 1}</td>
                          
                          {/* Nama Barang & Info Satuan/Harga gabung jadi 1 kolom biar gak makan tempat */}
                          <td>
                            <div className="item-primary-name">{item.barang_nama}</div>
                            <div className="item-sub-info">
                              Satuan: <strong>{item.satuan}</strong> • Rp {(item.harga_satuan || 0).toLocaleString("id-ID")}/satuan
                            </div>
                          </td>

                          {/* Input Kebutuhan Total */}
                          <td>
                            <div className="counter-group">
                              <button
                                type="button"
                                className="btn-counter"
                                onClick={() => handleCounter(item, "kebutuhan_total", -1)}
                              >
                                −
                              </button>
                              <input
                                type="number"
                                className="input-revisi"
                                min="0"
                                value={item.kebutuhan_total}
                                onChange={(e) =>
                                  handleRevisiItemChange(item, "kebutuhan_total", e.target.value)
                                }
                              />
                              <button
                                type="button"
                                className="btn-counter"
                                onClick={() => handleCounter(item, "kebutuhan_total", 1)}
                              >
                                +
                              </button>
                            </div>
                          </td>

                          {/* Input Stok Saat Ini */}
                          <td>
                            <div className="counter-group">
                              <button
                                type="button"
                                className="btn-counter btn-counter-amber"
                                onClick={() => handleCounter(item, "sisa_stok", -1)}
                              >
                                −
                              </button>
                              <input
                                type="number"
                                className="input-revisi input-amber"
                                min="0"
                                value={item.sisa_stok}
                                onChange={(e) =>
                                  handleRevisiItemChange(item, "sisa_stok", e.target.value)
                                }
                              />
                              <button
                                type="button"
                                className="btn-counter btn-counter-amber"
                                onClick={() => handleCounter(item, "sisa_stok", 1)}
                              >
                                +
                              </button>
                            </div>
                          </td>

                          {/* Hasil Auto Calculated Badge */}
                          <td className="text-center">
                            {item.jumlah_diajukan > 0 ? (
                              <span className="badge-diajukan badge-active">
                                {item.jumlah_diajukan} {item.satuan}
                              </span>
                            ) : (
                              <span className="badge-diajukan badge-zero">
                                Stok Cukup (0)
                              </span>
                            )}
                          </td>

                          {/* Subtotal */}
                          <td className="text-right font-semibold text-slate-700">
                            Rp {(item.jumlah_diajukan * item.harga_satuan).toLocaleString("id-ID")}
                          </td>

                          {/* Hapus Item */}
                          <td className="text-center">
                            <button
                              type="button"
                              className="btn-delete-item"
                              title="Hapus barang ini"
                              onClick={() => handleRemoveItem(item)}
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <div className="total-summary-card">
                <span className="total-label">Total Estimasi Biaya:</span>
                <span className="total-amount">
                  Rp {totalEstimasi.toLocaleString("id-ID")}
                </span>
              </div>

              <div className="modal-footer-btns">
                <button
                  type="button"
                  className="btn-modal-secondary"
                  onClick={closeRevisiModal}
                  disabled={savingRevisi}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="btn-modal-primary"
                  onClick={submitRevisi}
                  disabled={savingRevisi}
                >
                  {savingRevisi ? "Menyimpan..." : "💾 Simpan Revisi Pengajuan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUB MODAL TAMBAH BARANG BARU ================= */}
      {showAddBarangModal && (
        <div className="submodal-backdrop" onClick={() => setShowAddBarangModal(false)}>
          <div className="submodal-container" onClick={(e) => e.stopPropagation()}>
            <div className="submodal-header">
              <h4>➕ Tambah Barang ke Pengajuan</h4>
              <button
                className="modal-close-btn"
                onClick={() => setShowAddBarangModal(false)}
              >
                &times;
              </button>
            </div>

            <div className="submodal-body">
              <input
                type="text"
                className="search-input submodal-search"
                placeholder="Ketik nama atau kode barang ATK..."
                value={addBarangQuery}
                onChange={(e) => setAddBarangQuery(e.target.value)}
                autoFocus
              />

              <div className="master-barang-list">
                {filteredMasterBarang.length === 0 ? (
                  <p className="text-center text-slate-500 py-4">Barang tidak ditemukan.</p>
                ) : (
                  filteredMasterBarang.map((b) => {
                    const alreadyInList = revisiItems.some(
                      (item) => item.barang_id === b.id
                    );

                    return (
                      <div
                        key={b.id}
                        className={`master-barang-item ${
                          alreadyInList ? "item-disabled" : ""
                        }`}
                        onClick={() => !alreadyInList && handleSelectNewBarang(b)}
                      >
                        <div>
                          <div className="master-barang-title">
                            {b.nama} <span className="master-barang-code">({b.kode})</span>
                          </div>
                          <div className="master-barang-sub">
                            Satuan: {b.satuan} • Rp {(b.harga_satuan || 0).toLocaleString("id-ID")}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-select-barang"
                          disabled={alreadyInList}
                        >
                          {alreadyInList ? "Sudah Ada" : "+ Pilih"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
