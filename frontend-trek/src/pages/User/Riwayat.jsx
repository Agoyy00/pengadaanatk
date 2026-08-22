import DesktopSidebarToggle from '../../components/DesktopSidebarToggle';
import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import "../../css/Pengajuan.css";
import "../../css/Riwayat.css";
import "../../css/layout.css";
import RoleSwitcher from "../../components/RoleSwitcher";
import PeriodeTimer from "../../components/PeriodeTimer";
import FormPengambilanModal from "../../components/FormPengambilanModal";
import LampiranModal from "../../components/LampiranModal";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";



const API_BASE = import.meta.env.VITE_API_BASE;

const PIE_COLORS = [
  '#2563eb', '#16a34a', '#d97706', '#dc2626', '#9333ea',
  '#0891b2', '#db2777', '#65a30d',
];

import SidebarLogo from "../../components/SidebarLogo";
import useSupportUnread from "../../hooks/useSupportUnread";

export default function Riwayat() {
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const normalizeRole = (r) => String(r || "").toLowerCase().replace(/[\s_]+/g, "");
  const activeRole = normalizeRole(currentUser?.role);
  const { supportUnreadCount } = useSupportUnread(activeRole);

  // Chart & Filter State
  const [chartData, setChartData] = useState(null);
  const [chartLoading, setChartLoading] = useState(true);
  const [tahunFilter, setTahunFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal Detail Barang State
  const [detailPengajuan, setDetailPengajuan] = useState(null);

  // Modal Lampiran & Pengambilan State
  const [lampiranPengajuanId, setLampiranPengajuanId] = useState(null);
  const [pengambilanPengajuan, setPengambilanPengajuan] = useState(null);

  // Modal Revisi State
  const [selectedPengajuan, setSelectedPengajuan] = useState(null); // pengajuan object
  const [revisiItems, setRevisiItems] = useState([]);               // items being edited
  const [searchFilter, setSearchFilter] = useState("");              // search bar inside modal
  const [savingRevisi, setSavingRevisi] = useState(false);

  // Master Barang List for adding new items
  const [masterBarang, setMasterBarang] = useState([]);
  const [showAddBarangModal, setShowAddBarangModal] = useState(false);
  const [addBarangQuery, setAddBarangQuery] = useState("");

  const handleCancelPengajuan = async (p) => {
    const { value: alasan, isConfirmed } = await Swal.fire({
      title: "Batalkan Pengajuan?",
      html: `Masukkan alasan pembatalan pengajuan <b>#${p.id}</b> (${p.tahun_akademik}):`,
      input: "textarea",
      inputPlaceholder: "Tuliskan alasan pembatalan di sini...",
      inputAttributes: {
        "aria-label": "Alasan pembatalan",
      },
      showCancelButton: true,
      confirmButtonText: "Ya, Batalkan",
      cancelButtonText: "Kembali",
      confirmButtonColor: "#d97706",
      cancelButtonColor: "#64748b",
      inputValidator: (value) => {
        if (!value || value.trim().length < 3) {
          return "Alasan pembatalan wajib diisi (minimal 3 karakter).";
        }
      },
    });

    if (!isConfirmed || !alasan) return;

    try {
      const res = await fetch(`${API_BASE}/pengajuan/${p.id}/cancel`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({ alasan_pembatalan: alasan }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal membatalkan pengajuan.");
      }

      Swal.fire({
        icon: "success",
        title: "Dibatalkan",
        text: "Pengajuan Anda telah berhasil dibatalkan.",
        timer: 1800,
        showConfirmButton: false,
      });

      loadRiwayat();
    } catch (err) {
      Swal.fire("Error", err.message || "Terjadi kesalahan.", "error");
    }
  };

  const handleDeletePengajuan = async (p) => {
    const confirm = await Swal.fire({
      title: "Hapus Pengajuan?",
      html: `Anda akan menghapus pengajuan <b>#${p.id}</b> secara permanen dari daftar riwayat.<br>Lanjutkan?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`${API_BASE}/pengajuan/${p.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menghapus pengajuan.");
      }

      Swal.fire({
        icon: "success",
        title: "Terhapus",
        text: "Pengajuan berhasil dihapus.",
        timer: 1500,
        showConfirmButton: false,
      });

      loadRiwayat();
    } catch (err) {
      Swal.fire("Error", err.message || "Terjadi kesalahan.", "error");
    }
  };

  const sidebarMenus = useMemo(() => {
    return [
      { label: "Dashboard User", to: "/dashboarduser" },
      { label: "Stock Opname Barang", to: "/stock-opname" },
      { label: "Buat Pengajuan Baru", to: "/pengajuan" },
      { label: "Riwayat Pengajuan", to: "/riwayat", active: true },
      { label: "Template Dokumen", to: "/template-dokumen" },
      { label: "Support", to: "/support" },
    ];
  }, []);

  const userId = currentUser?.id;
  const token = localStorage.getItem("token");

  const handleDownloadBukti = async (p) => {
    try {
      const res = await fetch(`${API_BASE}/pengajuan/${p.id}/pdf/bukti`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Gagal mengunduh bukti pengajuan.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Bukti-Pengajuan-${p.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Gagal mengunduh bukti pengajuan.", "error");
    }
  };

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

  async function loadChartData() {
    if (!userId) return;
    try {
      setChartLoading(true);
      const params = new URLSearchParams({ user_id: userId });
      if (tahunFilter && tahunFilter !== 'all') params.append('tahun_akademik', tahunFilter);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`${API_BASE}/pengajuan/user-statistik?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setChartData(json);
      }
    } catch (err) {
      console.error("Gagal load data grafik:", err);
    } finally {
      setChartLoading(false);
    }
  }

  useEffect(() => {
    if (!userId) return;
    async function loadAllRiwayatData() {
      setLoading(true);
      setChartLoading(true);
      try {
        const params = new URLSearchParams({ user_id: userId });
        if (tahunFilter && tahunFilter !== 'all') params.append('tahun_akademik', tahunFilter);
        if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);

        const headers = { Authorization: `Bearer ${token}` };

        const [resRiwayat, resMaster, resChart] = await Promise.all([
          fetch(`${API_BASE}/pengajuan?user_id=${userId}`, { headers }),
          fetch(`${API_BASE}/barang`, { headers }),
          fetch(`${API_BASE}/pengajuan/user-statistik?${params}`, { headers }),
        ]);

        const [jsonRiwayat, jsonMaster, jsonChart] = await Promise.all([
          resRiwayat.json(),
          resMaster.json(),
          resChart.json(),
        ]);

        setData(Array.isArray(jsonRiwayat) ? jsonRiwayat : []);

        if (Array.isArray(jsonMaster)) {
          setMasterBarang(jsonMaster);
        } else if (jsonMaster?.data && Array.isArray(jsonMaster.data)) {
          setMasterBarang(jsonMaster.data);
        }

        if (jsonChart?.success) {
          setChartData(jsonChart);
        }
      } catch (err) {
        console.error("Gagal load data riwayat:", err);
      } finally {
        setLoading(false);
        setChartLoading(false);
      }
    }

    loadAllRiwayatData();
  }, [userId, tahunFilter, statusFilter]);

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

  const [isPeriodeActive, setIsPeriodeActive] = useState(false);

  useEffect(() => {
    async function checkPeriodeActive() {
      try {
        const res = await fetch(`${API_BASE}/periode/active`);
        if (res.ok) {
          const json = await res.json();
          const isOpen =
            json.is_open === true ||
            json.is_open === 1 ||
            json.is_open === "1" ||
            json.is_open === "open";

          if (isOpen && json.periode?.selesai) {
            const end = new Date(json.periode.selesai).getTime();
            const now = new Date().getTime();
            setIsPeriodeActive(end > now);
          } else {
            setIsPeriodeActive(isOpen);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    checkPeriodeActive();
  }, []);

  const canRevisi = (status) => {
    const isUnprocessed = !['verifikasi_admin', 'diverifikasi_admin', 'disetujui_admin', 'ditolak_admin', 'disetujui', 'ditolak', 'diverifikasi'].includes(status);
    return isUnprocessed && isPeriodeActive;
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

  const handleRevisiItemChange = (targetItem, field, numVal) => {
    const val = Math.max(0, numVal);
    setRevisiItems((prev) => {
      return prev.map((item) => {
        if (item === targetItem) {
          const updated = { ...item, [field]: val };
          const kebutuhan = field === "kebutuhan_total" ? val : updated.kebutuhan_total;
          const stok = field === "sisa_stok" ? val : updated.sisa_stok;
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

    // Peringatan Verifikasi Revisi
    const confirmResult = await Swal.fire({
      title: "Verifikasi Revisi Pengajuan",
      html: `
        <div style="text-align: left; font-size: 13.5px; color: #334155; line-height: 1.5;">
          <p style="margin-bottom: 10px;">Apakah Anda yakin ingin menyimpan perubahan revisi pengajuan ini?</p>
          <div style="background: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #d97706; padding: 10px 12px; border-radius: 6px; font-size: 12.5px; color: #92400e;">
            <strong>Peringatan Verifikasi:</strong><br/>
            Pastikan data barang (<strong>${revisiItems.length} item</strong>, Total <strong>Rp ${totalEstimasi.toLocaleString("id-ID")}</strong>) sudah sesuai sebelum disimpan ke sistem.
          </div>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Simpan Revisi",
      cancelButtonText: "Batal / Cek Lagi",
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

  const NumericInput = ({ value, onChange, placeholder = "0", disabled = false, className = "", readOnly = false }) => {
    const [display, setDisplay] = useState(() => {
      const v = value ?? 0;
      return v === 0 ? "" : String(v);
    });
    const justBlurred = React.useRef(false);

    useEffect(() => {
      if (justBlurred.current) {
        justBlurred.current = false;
        return;
      }
      const v = value ?? 0;
      setDisplay(v === 0 ? "" : String(v));
    }, [value]);

    const handleChange = (e) => {
      const raw = e.target.value;
      const cleaned = raw.replace(/[^0-9]/g, "");
      setDisplay(cleaned);
      const num = cleaned === "" ? 0 : parseInt(cleaned, 10) || 0;
      onChange(num);
    };

    const handleBlur = () => {
      if (display === "") {
        justBlurred.current = true;
        setDisplay("0");
        onChange(0);
      }
    };

    return (
      <input
        type="text"
        inputMode="numeric"
        className={`input-revisi ${className}`}
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
      />
    );
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
                  if (!isActive) navigate(m.to);
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

        <Link to="/" className="logout">
          Log Out
        </Link>
      </aside>

      {/* KANAN */}
      <main className={`main ${!isSidebarOpen ? 'expanded' : ''}`}>
        {/* TOPBAR */}
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
            <div className="topbar-title">Riwayat Pengajuan ATK</div>
            <div className="topbar-sub">
              Selamat datang: {currentUser?.name || "Nama Kamu"}
            </div>
          </div>
          </div>
          <div className="topbar-right" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/LogoYarsiFull.jpeg" alt="Logo Universitas YARSI" className="topbar-logo-full" />
            <PeriodeTimer typeFilter="pengajuan" />
            <PeriodeTimer typeFilter="stock_opname" />
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
                          const visibleItems = itemsList.slice(0, 3);
                          const hiddenCount = itemsList.length - 3;

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
                                        const disetujui = item.jumlah_disetujui;

                                        const hasRevisi =
                                          disetujui != null &&
                                          (disetujui !== diajukan || 
                                           item.kebutuhan_total_admin != null || 
                                           item.sisa_stok_admin != null);

                                        const isProcessed = ["diverifikasi_admin", "disetujui", "ditolak_admin"].includes(p.status);

                                        return (
                                          <li key={item.id} style={{ marginBottom: "8px" }}>
                                            <span className="barang-name">{namaBarang}</span>

                                            {isProcessed && disetujui != null ? (
                                              <div className="revisi-history-box">
                                                <div className="revisi-history-row" style={{ marginTop: "6px" }}>
                                                  <span className="revisi-label">Diajukan Awal:</span>
                                                  <span className={`revisi-value ${hasRevisi ? "revisi-value-old" : "revisi-value-same"}`}>
                                                    {diajukan} {satuan}
                                                  </span>
                                                </div>
                                                <div className="revisi-history-row">
                                                  <span className="revisi-label">Disetujui:</span>
                                                  <span className={`revisi-value ${hasRevisi ? (disetujui === 0 ? "revisi-value-rejected" : "revisi-value-new") : "revisi-value-same"}`}>
                                                    {disetujui} {satuan}
                                                  </span>
                                                  {hasRevisi && (
                                                    <span className="revisi-delta">
                                                      {disetujui > diajukan ? "lebih" : "kurang"} {Math.abs(disetujui - diajukan)}
                                                    </span>
                                                  )}
                                                </div>
                                                {hasRevisi && (
                                                  <div className="revisi-badge-changed">Direvisi Admin</div>
                                                )}
                                                {!hasRevisi && (
                                                  <div className="revisi-badge-unchanged">Sesuai Pengajuan</div>
                                                )}
                                                {item.catatan_revisi && (
                                                  <div className="revisi-note">
                                                    Catatan Admin: {item.catatan_revisi}
                                                  </div>
                                                )}
                                              </div>
                                            ) : (
                                              <div style={{ paddingLeft: "4px", marginTop: "2px", fontSize: "12px" }}>
                                                <strong className="qty-tag">{diajukan} {satuan}</strong>
                                              </div>
                                            )}
                                          </li>
                                        );
                                      })}
                                    </ul>

                                    {hiddenCount > 0 && (
                                      <button
                                        type="button"
                                        className="btn-expand-items"
                                        onClick={() => setDetailPengajuan(p)}
                                      >
                                        + {hiddenCount} barang lainnya...
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* KOLOM AKSI */}
                              <td>
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                  {canRevisi(p.status) && (
                                    <button
                                      className="btn-revisi"
                                      onClick={() => openRevisiModal(p)}
                                    >
                                      Edit / Revisi
                                    </button>
                                  )}

                                  {/* Tombol Lampiran */}
                                  <button
                                    type="button"
                                    onClick={() => setLampiranPengajuanId(p.id)}
                                    style={{
                                      padding: "4px 8px",
                                      background: "#f1f5f9",
                                      color: "#334155",
                                      border: "1px solid #cbd5e1",
                                      borderRadius: "4px",
                                      fontSize: "12px",
                                      fontWeight: "600",
                                      cursor: "pointer",
                                    }}
                                  >
                                    📎 Lampiran ({p.lampirans?.length || 0})
                                  </button>

                                  {/* Unduh Bukti Pengajuan (PDF) */}
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadBukti(p)}
                                    style={{
                                      padding: "4px 8px",
                                      background: "#eff6ff",
                                      color: "#2563eb",
                                      border: "1px solid #bfdbfe",
                                      borderRadius: "4px",
                                      fontSize: "12px",
                                      fontWeight: "600",
                                      cursor: "pointer",
                                    }}
                                  >
                                    ⬇️ Unduh Bukti
                                  </button>

                                  {/* Form Pengambilan Barang (Jika Disetujui / Selesai) */}
                                  {(p.status === "disetujui" || p.status === "selesai") && (
                                    <button
                                      type="button"
                                      onClick={() => setPengambilanPengajuan(p)}
                                      style={{
                                        padding: "4px 8px",
                                        background: p.status === "selesai" ? "#0284c7" : "#059669",
                                        color: "#ffffff",
                                        border: "none",
                                        borderRadius: "4px",
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                      }}
                                    >
                                      {p.status === "selesai" ? "📄 Berita Acara" : "📦 Serah Terima"}
                                    </button>
                                  )}

                                  {/* Tombol Batalkan Pengajuan (Status Diajukan) */}
                                  {(p.status === "diajukan" || p.status === "pending") && (
                                    <button
                                      type="button"
                                      onClick={() => handleCancelPengajuan(p)}
                                      style={{
                                        padding: "4px 8px",
                                        background: "#fffbeb",
                                        color: "#d97706",
                                        border: "1px solid #fde68a",
                                        borderRadius: "4px",
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                      }}
                                    >
                                      ❌ Batalkan
                                    </button>
                                  )}

                                  {/* Tombol Hapus (Status Dibatalkan / Ditolak) */}
                                  {(p.status === "dibatalkan" || p.status === "ditolak" || p.status === "ditolak_admin") && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeletePengajuan(p)}
                                      style={{
                                        padding: "4px 8px",
                                        background: "#fee2e2",
                                        color: "#dc2626",
                                        border: "1px solid #fecaca",
                                        borderRadius: "4px",
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                      }}
                                    >
                                      🗑️ Hapus
                                    </button>
                                  )}
                                </div>
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

          {/* ================= ANALISIS PENGAJUAN USER ================= */}
          <div className="card">
            <div className="card-title">Analisis Pengajuan Anda</div>
            <div className="card-subtitle">
              Grafik dan ringkasan untuk membantu Anda memahami pola penggunaan ATK dan dana.
            </div>

            {/* ================= FILTER BAR ================= */}
            <div className="chart-filter-bar">
              <div className="filter-group">
                <label>Tahun Akademik</label>
                <select
                  value={tahunFilter}
                  onChange={(e) => setTahunFilter(e.target.value)}
                >
                  <option value="all">Semua Tahun</option>
                  {chartData?.filters?.tahun_list?.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  {chartData?.filters?.status_list?.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="filter-actions">
                <button
                  type="button"
                  className="btn-filter-reset"
                  onClick={() => {
                    setTahunFilter('all');
                    setStatusFilter('all');
                  }}
                >
                  Reset Filter
                </button>
              </div>
            </div>

            {/* ================= STATISTIK RINGKASAN ================= */}
            {chartData && (
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Total Pengajuan</div>
                  <div className="stat-value">{chartData.summary.total_pengajuan}</div>
                  <div className="stat-desc">Periode terfilter</div>
                </div>
                <div className="stat-card stat-blue">
                  <div className="stat-label">Total Nilai Diajukan</div>
                  <div className="stat-value">
                    Rp {chartData.summary.total_nilai_diajukan.toLocaleString("id-ID")}
                  </div>
                  <div className="stat-desc">
                    {chartData.summary.total_qty_diajukan} barang diajukan
                  </div>
                </div>
                <div className="stat-card stat-green">
                  <div className="stat-label">Total Nilai Disetujui</div>
                  <div className="stat-value">
                    Rp {chartData.summary.total_nilai_disetujui.toLocaleString("id-ID")}
                  </div>
                  <div className="stat-desc">
                    {chartData.summary.total_qty_disetujui} barang disetujui
                  </div>
                </div>
                <div className={`stat-card ${chartData.summary.selisih_nilai >= 0 ? 'stat-amber' : 'stat-red'}`}>
                  <div className="stat-label">Selisih (Disetujui - Diajukan)</div>
                  <div className="stat-value">
                    {chartData.summary.selisih_nilai >= 0 ? '+' : ''}
                    Rp {chartData.summary.selisih_nilai.toLocaleString("id-ID")}
                  </div>
                  <div className="stat-desc">
                    {chartData.summary.selisih_nilai >= 0 ? 'Lebih dari pengajuan' : 'Kurang dari pengajuan'}
                  </div>
                </div>
              </div>
            )}

            {/* ================= CHARTS ================= */}
            {chartLoading ? (
              <p className="loading-text">Memuat data grafik...</p>
            ) : chartData && (
              <div className="charts-container">
                {/* Tren Pengeluaran per Tahun */}
                <div className="chart-card">
                  <div className="chart-title">Tren Pengeluaran per Tahun Akademik</div>
                  {chartData.tren_tahun.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={chartData.tren_tahun} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorDiajukan2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorDisetujui2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="tahun" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(v) => `Rp ${(v / 1000000).toFixed(1)}jt`} tick={{ fontSize: 12 }} />
                        <Tooltip
                          formatter={(value) => [`Rp ${value.toLocaleString("id-ID")}`, '']}
                          labelStyle={{ fontWeight: 700 }}
                        />
                        <Legend />
                        <Area type="monotone" dataKey="nilai_diajukan" stroke="#2563eb" fillOpacity={1} fill="url(#colorDiajukan2)" name="Diajukan" />
                        <Area type="monotone" dataKey="nilai_disetujui" stroke="#16a34a" fillOpacity={1} fill="url(#colorDisetujui2)" name="Disetujui" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="chart-empty">Belum ada data tren untuk filter ini.</div>
                  )}
                </div>

                {/* Perbandingan Jumlah Barang */}
                <div className="chart-card">
                  <div className="chart-title">Perbandingan Jumlah Barang: Diajukan vs Disetujui</div>
                  {chartData.perbandingan_barang.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={chartData.perbandingan_barang} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <XAxis dataKey="tahun" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                        <Legend />
                        <Bar dataKey="diajukan" fill="#2563eb" radius={[4, 4, 0, 0]} name="Diajukan" />
                        <Bar dataKey="disetujui" fill="#16a34a" radius={[4, 4, 0, 0]} name="Disetujui" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="chart-empty">Belum ada data perbandingan untuk filter ini.</div>
                  )}
                </div>

                {/* Komposisi Barang Disetujui */}
                <div className="chart-card chart-card-wide">
                  <div className="chart-title">Komposisi Barang Disetujui (Top 8)</div>
                  {chartData.komposisi_barang.length > 0 ? (
                    <ResponsiveContainer width="100%" height={320}>
                      <PieChart>
                        <Pie
                          data={chartData.komposisi_barang}
                          dataKey="nilai_disetujui"
                          nameKey="nama_barang"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ nama_barang, percent }) => `${nama_barang} (${(percent * 100).toFixed(0)}%)`}
                          labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                        >
                          {chartData.komposisi_barang.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => [`Rp ${value.toLocaleString("id-ID")}`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="chart-empty">Belum ada data komposisi untuk filter ini.</div>
                  )}
                </div>
              </div>
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
                Tambah Barang Baru
              </button>
            </div>

            {/* Formula Hint Banner */}
            <div className="formula-banner">
              <span className="formula-title">Formula:</span>
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
                              <NumericInput
                                value={item.kebutuhan_total}
                                onChange={(val) => handleRevisiItemChange(item, "kebutuhan_total", val)}
                                placeholder="0"
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
                              <NumericInput
                                value={item.sisa_stok}
                                onChange={(val) => handleRevisiItemChange(item, "sisa_stok", val)}
                                placeholder="0"
                                className="input-amber"
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
                              Hapus
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
                  {savingRevisi ? "Menyimpan..." : "Simpan Revisi Pengajuan"}
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
              <h4>Tambah Barang ke Pengajuan</h4>
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

      {/* ================= MODAL DETAIL BARANG PENGAJUAN ================= */}
      {detailPengajuan && (
        <div className="modal-backdrop" onClick={() => setDetailPengajuan(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Detail Barang - Pengajuan #{detailPengajuan.id}</div>
                <div className="modal-subtitle">
                  {detailPengajuan.nama_pemohon} • {detailPengajuan.unit} • {detailPengajuan.tahun_akademik}
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setDetailPengajuan(null)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-barang-table-wrapper">
                <table className="detail-barang-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Nama Barang</th>
                      <th>Satuan</th>
                      <th>Kebutuhan</th>
                      <th>Sisa Stok</th>
                      <th>Diajukan</th>
                      <th>Harga Satuan</th>
                      <th>Subtotal</th>
                      <th>Status Disetujui</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailPengajuan.items.map((item, idx) => {
                      const namaBarang = item.barang?.nama ?? "Barang";
                      const satuan = item.barang?.satuan ?? "";
                      const diajukan = item.jumlah_diajukan;
                      const disetujui = item.jumlah_disetujui;
                      const harga = item.harga_satuan ?? 0;
                      const subtotal = diajukan * harga;

                      const hasRevisi =
                        disetujui != null &&
                        (disetujui !== diajukan || 
                         item.kebutuhan_total_admin != null || 
                         item.sisa_stok_admin != null);

                      const isProcessed = ["diverifikasi_admin", "disetujui", "ditolak_admin"].includes(detailPengajuan.status);

                      return (
                        <tr key={item.id}>
                          <td className="text-center">{idx + 1}</td>
                          <td>
                            <div className="item-primary-name">{namaBarang}</div>
                            {isProcessed && disetujui != null && hasRevisi && item.catatan_revisi && (
                              <div className="revisi-note" style={{ marginTop: 4 }}>
                                {item.catatan_revisi}
                              </div>
                            )}
                          </td>
                          <td className="text-center">{satuan}</td>
                          <td className="text-center">{item.kebutuhan_total}</td>
                          <td className="text-center">{item.sisa_stok}</td>
                          <td className="text-center">
                            <strong>{diajukan}</strong>
                          </td>
                          <td className="text-right">Rp {(harga).toLocaleString("id-ID")}</td>
                          <td className="text-right font-semibold">Rp {subtotal.toLocaleString("id-ID")}</td>
                          <td className="text-center">
                            {isProcessed && disetujui != null ? (
                              <span className={`revisi-value ${hasRevisi ? (disetujui === 0 ? "revisi-value-rejected" : "revisi-value-new") : "revisi-value-same"}`}>
                                {disetujui} {satuan}
                              </span>
                            ) : (
                              <span className="text-slate-500">Menunggu</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <div className="total-summary-card">
                <span className="total-label">Total Barang:</span>
                <span className="total-amount">{detailPengajuan.items.length} item</span>
              </div>
              <div className="modal-footer-btns">
                <button
                  type="button"
                  className="btn-modal-secondary"
                  onClick={() => setDetailPengajuan(null)}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL LAMPIRAN DOKUMEN ================= */}
      {lampiranPengajuanId && (
        <LampiranModal
          isOpen={!!lampiranPengajuanId}
          onClose={() => setLampiranPengajuanId(null)}
          pengajuanId={lampiranPengajuanId}
          canUpload={true}
        />
      )}

      {/* ================= MODAL FORM PENGAMBILAN BARANG ================= */}
      {pengambilanPengajuan && (
        <FormPengambilanModal
          isOpen={!!pengambilanPengajuan}
          onClose={() => setPengambilanPengajuan(null)}
          pengajuan={pengambilanPengajuan}
          onSuccess={() => {
            loadRiwayat();
            setPengambilanPengajuan(null);
          }}
        />
      )}
    </div>
  );
}