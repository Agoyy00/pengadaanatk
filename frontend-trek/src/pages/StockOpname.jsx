import DesktopSidebarToggle from '../components/DesktopSidebarToggle';
import React, { useState, useEffect, useMemo, useRef } from "react";


import { useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import "../css/layout.css";
import "../css/Barang.css";
import RoleSwitcher from "../components/RoleSwitcher";
import PeriodeTimer from "../components/PeriodeTimer";

const API_BASE = import.meta.env.VITE_API_BASE;
const token = localStorage.getItem("token");

const normalizeRole = (role) =>
  String(role || "")
    .toLowerCase()
    .replace(/[\s_]+/g, "");

import SidebarLogo from "../components/SidebarLogo";
import useSupportUnread from "../hooks/useSupportUnread";

export default function StockOpname() {
  const navigate = useNavigate();
  const location = useLocation();

  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const role = normalizeRole(currentUser?.role);
  const { supportUnreadCount } = useSupportUnread(role);
  const userId = currentUser?.id;

  // Safety Redirect
  useEffect(() => {
    if (!currentUser?.id) {
      navigate("/", { replace: true });
    }
  }, [currentUser, navigate]);

  const [opnames, setOpnames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [barangs, setBarangs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [lockedBarangIds, setLockedBarangIds] = useState([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");

  // Unit options
  const [unitOptions, setUnitOptions] = useState([]);
  const [activeTahunAkademik, setActiveTahunAkademik] = useState(null);
  const getInitialUnit = () => {
    const userUnit = currentUser?.unit;
    const savedUnit = localStorage.getItem("selectedUnit");
    return userUnit || savedUnit || "";
  };
  const [unit, setUnit] = useState(getInitialUnit);

  // Unit terkunci hanya jika: user sudah punya unit DAN unit_tahun_akademik === periode aktif
  const unitLocked = !!(
    currentUser?.unit &&
    currentUser?.unit_tahun_akademik &&
    activeTahunAkademik &&
    currentUser.unit_tahun_akademik === activeTahunAkademik
  );

  const [isStockOpnameOpen, setIsStockOpnameOpen] = useState(true);
  const [stockOpnameMessage, setStockOpnameMessage] = useState("");

  // Fetch periode aktif stock opname untuk menentukan tahun akademik & status buka/tutup
  useEffect(() => {
    async function fetchPeriodeAktif() {
      try {
        const res = await fetch(`${API_BASE}/periode/active?jenis=stock_opname`);
        if (!res.ok) {
          setIsStockOpnameOpen(false);
          setStockOpnameMessage("Periode Stock Opname saat ini belum dibuka.");
          return;
        }
        const data = await res.json();
        const isOpen =
          data.is_open === true ||
          data.is_open === 1 ||
          data.is_open === "1" ||
          data.is_open === "open";

        setIsStockOpnameOpen(isOpen);
        if (!isOpen) {
          setStockOpnameMessage(data.message || "Periode Stock Opname saat ini belum dibuka.");
        }

        if (data.periode?.tahun_akademik) {
          setActiveTahunAkademik(data.periode.tahun_akademik);

          // Jika periode berbeda dari unit_tahun_akademik user → reset unit di local
          if (currentUser?.unit_tahun_akademik !== data.periode.tahun_akademik) {
            setUnit("");
            setImportUnit("");
            localStorage.removeItem("selectedUnit");
          }
        }
      } catch (err) {
        console.error("Gagal cek periode aktif stock opname:", err);
        setIsStockOpnameOpen(false);
        setStockOpnameMessage("Gagal memuat status Periode Stock Opname.");
      }
    }
    fetchPeriodeAktif();
  }, []);

  const loadUserUnit = async () => {
    if (!userId) return;
    // Jangan auto-load unit lama kalau periode sudah berbeda
    if (currentUser?.unit && currentUser?.unit_tahun_akademik === activeTahunAkademik) {
      setUnit(currentUser.unit);
      setImportUnit(currentUser.unit);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/pengajuan?user_id=${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (Array.isArray(json) && json.length > 0) {
        const latestUnit = json[0]?.unit;
        if (latestUnit) {
          setUnit(latestUnit);
          setImportUnit(latestUnit);
        }
      }
    } catch (err) {
      console.error("Gagal load unit pengajuan:", err);
    }
  };

  useEffect(() => {
    loadUnitOptions();
    if (activeTahunAkademik !== null) {
      loadUserUnit();
    }
  }, [activeTahunAkademik]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBarang, setSelectedBarang] = useState(null);
  const [stokFisik, setStokFisik] = useState("");
  const [queryBarang, setQueryBarang] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [formError, setFormError] = useState("");

  // Verify Modal state
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [selectedVerifyOpname, setSelectedVerifyOpname] = useState(null);
  const [verifyStokFisik, setVerifyStokFisik] = useState("");
  const [verifyFormError, setVerifyFormError] = useState("");

  // CSV Import states
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importUnit, setImportUnit] = useState(getInitialUnit);

  const formatRole = (role) => {
    if (!role) return "-";
    return role
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Sidebar Menu depending on Role
  const sidebarMenus = useMemo(() => {
    if (role === "superadmin") {
      return [
        { label: "Dashboard Super Admin", to: "/dashboardsuperadmin" },
        { label: "Monitoring Admin & User", to: "/superadmin/monitoring" },
        { label: "Grafik Barang", to: "/superadmin/grafik-barang" },
        { label: "Grafik Belanja", to: "/superadmin/grafik-belanja" },
        { label: "Approval Pengajuan", to: "/approval" },
        { label: "Tambah & Kelola User", to: "/tambahuser" },
        { label: "Atur Periode", to: "/periode" },
        { label: "Daftar Barang ATK", to: "/superadmin/daftar-barang" },
        { label: "Stock Opname Barang", to: "/stock-opname", active: true },
        { label: "Support", to: "/support" },
      ];
    } else if (role === "admin") {
      return [
        { label: "Dashboard Admin", to: "/dashboardadmin" },
        { label: "Verifikasi Pengajuan", to: "/verifikasi" },
        { label: "Kelola Barang ATK", to: "/kelola-barang" },
        { label: "Grafik Usulan Barang", to: "/grafik-usulan-barang" },
        { label: "Stock Opname Barang", to: "/stock-opname", active: true },
        { label: "Support", to: "/support" },
      ];
    } else {
      return [
        { label: "Dashboard User", to: "/dashboarduser" },
        { label: "Stock Opname Barang", to: "/stock-opname", active: true },
        { label: "Buat Pengajuan Baru", to: "/pengajuan" },
        { label: "Riwayat Pengajuan", to: "/riwayat" },
        { label: "Template Dokumen", to: "/template-dokumen" },
        { label: "Support", to: "/support" },
      ];
    }
  }, [role]);

  // Load Laporan Stock Opname
  const loadOpnames = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/stock-opname`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
      });
      const data = await res.json();
      if (data.success) {
        const list = data.data || [];
        setOpnames(list);
        const locked = list
          .filter((o) => ['pending', 'verified'].includes(o.status))
          .map((o) => o.barang_id)
          .filter(Boolean);
        setLockedBarangIds(locked);
      }
    } catch (e) {
      console.error("Gagal memuat stock opname:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOpnames();
  }, []);

  const loadUnitOptions = async () => {
    try {
      const res = await fetch(`${API_BASE}/options/unit`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        // API returns objects {id, type, value} — extract only the value string
        const values = json.data.map((item) =>
          typeof item === "string" ? item : item.value
        );
        setUnitOptions(values);
      }
    } catch (err) {
      console.error("Gagal load opsi unit:", err);
    }
  };

  // Search barang inside modal (debounce)
  useEffect(() => {
    if (!queryBarang.trim()) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setLoadingSearch(true);
        const res = await fetch(`${API_BASE}/barang?q=${encodeURIComponent(queryBarang)}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json",
          },
        });
        const data = await res.json();
        const results = Array.isArray(data) ? data : [];
        const filtered = results.filter((b) => !lockedBarangIds.includes(b.id));
        setSearchResults(filtered);
      } catch (err) {
        console.error("Gagal memuat barang:", err);
      } finally {
        setLoadingSearch(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [queryBarang]);

  const openCreate = () => {
    setSelectedBarang(null);
    setStokFisik("");
    const defaultUnit = currentUser?.unit || localStorage.getItem("selectedUnit") || "";
    setUnit(defaultUnit);
    setQueryBarang("");
    setSearchResults([]);
    setFormError("");
    setModalOpen(true);
  };

  // ====== DOWNLOAD TEMPLATE CSV STOCK OPNAME (DINAMIS) ======
  const handleDownloadTemplateCSV = async () => {
    try {
      setImportLoading(true);
      const res = await fetch(`${API_BASE}/barang`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const masterDataRes = await res.json();
      const masterData = Array.isArray(masterDataRes) ? masterDataRes : (masterDataRes.data || []);

      if (masterData.length === 0) {
        Swal.fire("Info", "Belum ada data barang di sistem.", "info");
        return;
      }

      const header = "kode_barang;nama_barang;stok_sistem;stok_fisik";
      const rows = masterData.map((b) =>
        `${b.kode};${b.nama};${b.stok};`
      );
      const csvContent = [header, ...rows].join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "Template_Stock_Opname.csv";
      link.click();
      URL.revokeObjectURL(url);

      Swal.fire({
        icon: "success",
        title: "Template Diunduh",
        text: `Template berisi ${masterData.length} barang. Isi kolom Stok Fisik, lalu import kembali.`,
        confirmButtonColor: "#2563eb",
      });
    } catch (err) {
      console.error("Gagal download template:", err);
      Swal.fire("Error", "Gagal mengambil data barang dari server", "error");
    } finally {
      setImportLoading(false);
    }
  };

  // ====== IMPORT CSV STOCK OPNAME (DENGAN PREVIEW) ======
  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
      if (lines.length < 2) {
        Swal.fire("Error", "File CSV kosong atau format salah", "error");
        return;
      }

      const delimiter = lines[0].includes(";") ? ";" : ",";

      try {
        setImportLoading(true);
        const res = await fetch(`${API_BASE}/barang`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const masterDataRes = await res.json();
        const masterData = Array.isArray(masterDataRes) ? masterDataRes : (masterDataRes.data || []);

        const previewItems = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
          // Format: Kode Barang;Nama Barang;Stok Sistem;Stok Fisik
          if (cols.length >= 4) {
            const kodeCSV = cols[0]?.toLowerCase() || "";
            const namaCSV = cols[1]?.toLowerCase() || "";
            const stokFisikVal = parseInt(cols[3]);

            // Skip baris yang stok fisik tidak diisi
            if (isNaN(stokFisikVal)) continue;

            const matchedBarang = masterData.find(b =>
              b.kode?.toLowerCase() === kodeCSV || b.nama?.toLowerCase() === namaCSV
            );

            if (matchedBarang) {
              const exists = previewItems.some(it => it.barang_id === matchedBarang.id);
              if (!exists) {
                const selisih = stokFisikVal - (matchedBarang.stok || 0);
                previewItems.push({
                  barang_id: matchedBarang.id,
                  kode: matchedBarang.kode,
                  nama: matchedBarang.nama,
                  satuan: matchedBarang.satuan,
                  stok_sistem: matchedBarang.stok || 0,
                  stok_fisik: stokFisikVal,
                  selisih: selisih,
                });
              }
            }
          }
        }

        if (previewItems.length > 0) {
          const filtered = previewItems.filter((item) => !lockedBarangIds.includes(item.barang_id));
          const skipped = previewItems.length - filtered.length;
          setImportPreviewData(filtered);
          setShowImportPreview(true);
          if (skipped > 0) {
            Swal.fire({
              icon: "info",
              title: "Beberapa barang dilewati",
              text: `${skipped} barang sudah memiliki laporan stock opname yang belum selesai dan tidak ditampilkan.`,
              confirmButtonColor: "#2563eb",
            });
          }
        } else {
          Swal.fire("Info", "Tidak ada barang yang cocok dari CSV, atau kolom Stok Fisik belum diisi.", "info");
        }
      } catch (err) {
        console.error("Gagal import CSV", err);
        Swal.fire("Error", "Gagal mengambil data barang dari server", "error");
      } finally {
        setImportLoading(false);
      }

      e.target.value = null;
    };
    reader.readAsText(file);
  };

  // ====== BULK SUBMIT STOCK OPNAME ======
  const handleBulkSubmit = async () => {
    if (!importUnit) {
      Swal.fire("Error", "Pilih Unit / Bagian terlebih dahulu.", "error");
      return;
    }

    try {
      setImportLoading(true);
      const payload = {
        items: importPreviewData.map(item => ({
          barang_id: item.barang_id,
          stok_fisik: item.stok_fisik,
          unit: importUnit,
        })),
      };

      const res = await fetch(`${API_BASE}/stock-opname/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem("selectedUnit", importUnit);
        const stored = localStorage.getItem("user");
        if (stored) {
          try {
            const userObj = JSON.parse(stored);
            userObj.unit = importUnit;
            userObj.unit_tahun_akademik = activeTahunAkademik;
            localStorage.setItem("user", JSON.stringify(userObj));
          } catch { }
        }
        setShowImportPreview(false);
        setImportPreviewData([]);
        loadOpnames();
        Swal.fire({
          icon: "success",
          title: "Import Berhasil",
          text: data.message || `${importPreviewData.length} laporan stock opname berhasil dikirim.`,
          confirmButtonColor: "#10b981",
        });
      } else {
        Swal.fire("Error", data.message || "Gagal mengirim laporan bulk.", "error");
      }
    } catch (err) {
      console.error("Gagal bulk submit:", err);
      Swal.fire("Error", "Terjadi kesalahan saat mengirim data ke server.", "error");
    } finally {
      setImportLoading(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const selectBarangItem = (b) => {
    setSelectedBarang(b);
    setQueryBarang("");
    setSearchResults([]);
  };

  // Submit stock opname
  const onSubmit = async () => {
    if (!selectedBarang) {
      setFormError("Pilih barang terlebih dahulu.");
      return;
    }
    if (stokFisik === "" || stokFisik === null) {
      setFormError("Stok fisik wajib diisi.");
      return;
    }
    if (!unit) {
      setFormError("Unit / Bagian wajib dipilih.");
      return;
    }
    if (Number(stokFisik) < 0) {
      setFormError("Stok fisik tidak boleh negatif.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/stock-opname`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
        body: JSON.stringify({
          barang_id: selectedBarang.id,
          stok_fisik: Number(stokFisik),
          unit: unit,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem("selectedUnit", unit);
        const stored = localStorage.getItem("user");
        if (stored) {
          try {
            const userObj = JSON.parse(stored);
            userObj.unit = unit;
            userObj.unit_tahun_akademik = activeTahunAkademik;
            localStorage.setItem("user", JSON.stringify(userObj));
          } catch { }
        }
        closeModal();
        loadOpnames();
        Swal.fire({
          icon: "success",
          title: "Laporan Berhasil Dikirim!",
          text: "Laporan Stock Opname Anda telah sukses dikirim ke sistem.",
          confirmButtonColor: "#10b981",
          confirmButtonText: "OK",
        });
      } else {
        setFormError(data.message || "Gagal mengirim laporan.");
      }
    } catch (err) {
      console.error(err);
      setFormError("Terjadi kesalahan server.");
    } finally {
      setLoading(false);
    }
  };

  const openVerifyModal = (opname) => {
    setSelectedVerifyOpname(opname);
    setVerifyStokFisik(opname.stok_fisik);
    setVerifyFormError("");
    setVerifyModalOpen(true);
  };

  const closeVerifyModal = () => {
    setVerifyModalOpen(false);
    setSelectedVerifyOpname(null);
  };

  const onSubmitVerify = async () => {
    if (!selectedVerifyOpname) return;

    if (verifyStokFisik === "" || verifyStokFisik === null) {
      setVerifyFormError("Stok fisik wajib diisi.");
      return;
    }
    if (Number(verifyStokFisik) < 0) {
      setVerifyFormError("Stok fisik tidak boleh negatif.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/stock-opname/${selectedVerifyOpname.id}/verify`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
        body: JSON.stringify({
          stok_fisik: Number(verifyStokFisik),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        closeVerifyModal();
        loadOpnames();
        Swal.fire({
          icon: "success",
          title: "Verifikasi Berhasil!",
          text: "Laporan stock opname telah berhasil diverifikasi admin.",
          confirmButtonColor: "#10b981",
        });
      } else {
        setVerifyFormError(data.message || "Gagal memverifikasi laporan.");
      }
    } catch (err) {
      console.error(err);
      setVerifyFormError("Terjadi kesalahan server.");
    } finally {
      setLoading(false);
    }
  };

  // Superadmin approves a report (which updates inventory stock)
  const handleApprove = async (id) => {
    const result = await Swal.fire({
      title: "Setujui Laporan?",
      text: "Tindakan ini akan memperbarui stok barang di inventaris secara otomatis.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Setujui",
      cancelButtonText: "Batal",
    });
    if (!result.isConfirmed) return;

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/stock-opname/${id}/approve`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: "success",
          title: "Laporan Disetujui!",
          text: "Laporan disetujui dan stok inventaris telah diperbarui.",
          confirmButtonColor: "#16a34a",
        });
        loadOpnames();
      } else {
        Swal.fire({
          icon: "error",
          title: "Gagal",
          text: data.message || "Gagal menyetujui laporan.",
          confirmButtonColor: "#ef4444",
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Kesalahan Server",
        text: "Terjadi kesalahan pada server.",
        confirmButtonColor: "#ef4444",
      });
    } finally {
      setLoading(false);
    }
  };

  // Admin/Superadmin rejects a report
  const handleReject = async (id) => {
    const result = await Swal.fire({
      title: "Tolak Laporan?",
      text: "Apakah Anda yakin ingin menolak laporan stock opname ini?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Tolak",
      cancelButtonText: "Batal",
    });
    if (!result.isConfirmed) return;

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/stock-opname/${id}/reject`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: "success",
          title: "Laporan Ditolak",
          text: "Laporan stock opname telah ditolak.",
          confirmButtonColor: "#10b981",
        });
        loadOpnames();
      } else {
        Swal.fire({
          icon: "error",
          title: "Gagal",
          text: data.message || "Gagal menolak laporan.",
          confirmButtonColor: "#ef4444",
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Kesalahan Server",
        text: "Terjadi kesalahan pada server.",
        confirmButtonColor: "#ef4444",
      });
    } finally {
      setLoading(false);
    }
  };

  // Delete pending report
  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Hapus Laporan?",
      text: "Apakah Anda yakin ingin menghapus laporan stock opname pending ini?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });
    if (!result.isConfirmed) return;

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/stock-opname/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: "success",
          title: "Laporan Dihapus",
          text: "Laporan stock opname berhasil dihapus.",
          confirmButtonColor: "#10b981",
        });
        loadOpnames();
      } else {
        Swal.fire({
          icon: "error",
          title: "Gagal",
          text: data.message || "Gagal menghapus laporan.",
          confirmButtonColor: "#ef4444",
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Kesalahan Server",
        text: "Terjadi kesalahan pada server.",
        confirmButtonColor: "#ef4444",
      });
    } finally {
      setLoading(false);
    }
  };

  const [activeUnitView, setActiveUnitView] = useState(null);

  // Filter local state list
  const filteredOpnames = useMemo(() => {
    if (statusFilter === "all") return opnames;
    return opnames.filter((o) => o.status === statusFilter);
  }, [opnames, statusFilter]);

  // Unit Summary List (Grouped by Unit)
  const unitSummaryList = useMemo(() => {
    const unitMap = {};
    filteredOpnames.forEach((o) => {
      const uName = o.unit || o.user?.unit || "Unit Lainnya";
      if (!unitMap[uName]) {
        unitMap[uName] = {
          unit: uName,
          totalItems: 0,
          pendingCount: 0,
          verifiedCount: 0,
          approvedCount: 0,
          rejectedCount: 0,
        };
      }
      unitMap[uName].totalItems += 1;
      if (o.status === "pending") unitMap[uName].pendingCount += 1;
      if (o.status === "verified") unitMap[uName].verifiedCount += 1;
      if (o.status === "approved") unitMap[uName].approvedCount += 1;
      if (o.status === "rejected") unitMap[uName].rejectedCount += 1;
    });
    return Object.values(unitMap);
  }, [filteredOpnames]);

  // Status Pill Styling
  const getStatusPill = (status) => {
    let bg = "#f3f4f6";
    let text = "#374151";
    let label = "Pending";
    let border = "1px solid #e5e7eb";

    if (status === "verified") {
      bg = "#fefce8";
      text = "#a16207";
      border = "1px solid #fef08a";
      label = "Diverifikasi Admin";
    } else if (status === "approved") {
      bg = "#f0fdf4";
      text = "#15803d";
      border = "1px solid #bbf7d0";
      label = "Disetujui Superadmin";
    } else if (status === "rejected") {
      bg = "#fef2f2";
      text = "#b91c1c";
      border = "1px solid #fecaca";
      label = "Ditolak";
    }

    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "5px 12px",
          borderRadius: "999px",
          fontSize: "12px",
          fontWeight: 700,
          backgroundColor: bg,
          color: text,
          border: border,
          whiteSpace: "nowrap",
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
        }}
      >
        {label}
      </span>
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
            const isActive = location.pathname === m.to || m.active;
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

        <div
          className="logout"
          onClick={() => {
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            window.location.href = "/";
          }}
          style={{ cursor: "pointer" }}
        >
          Log Out
        </div>
      </aside>

      {/* MAIN CONTAINER */}
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
              <div className="topbar-title">Stock Opname Barang</div>
              <div className="topbar-sub">
                Sistem pencatatan dan penyesuaian stok fisik ATK
              </div>
            </div>
          </div>
          <div className="topbar-right" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/LogoYarsiFull.jpeg" alt="Logo Universitas YARSI" className="topbar-logo-full" />
            <PeriodeTimer typeFilter="pengajuan" />
            <PeriodeTimer typeFilter="stock_opname" />
            <span style={{ marginRight: 8 }}>Pengguna: <b>{currentUser?.name}</b></span>
            <RoleSwitcher />
          </div>
        </header>

        {/* CONTENT */}
        <section className="main-content">
          {!isStockOpnameOpen && role === "user" ? (
            <div className="card" style={{ textAlign: "center", padding: "50px 20px" }}>
              <div style={{ fontSize: "54px", marginBottom: "16px" }}>🔒</div>
              <h3 style={{ fontSize: "22px", fontWeight: "700", color: "#111827", marginBottom: "8px" }}>
                Periode Stock Opname Belum Dibuka
              </h3>
              <p style={{ fontSize: "14px", color: "#4b5563", maxWidth: "520px", margin: "0 auto 24px auto", lineHeight: "1.6" }}>
                {stockOpnameMessage || "Saat ini Periode Stock Opname Barang belum dibuka oleh Super Admin. Silakan tunggu hingga periode pencatatan dibuka."}
              </p>
              <button
                className="btn btn-primary"
                onClick={() => navigate("/dashboarduser")}
                style={{ minWidth: "180px", padding: "10px 24px", fontSize: "14px" }}
              >
                Kembali ke Dashboard
              </button>
            </div>
          ) : (
            <div className="card">

            {/* ========== VIEW 1: DAFTAR UNIT STOCK OPNAME ========== */}
            {!activeUnitView && (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18 }}>Daftar Stock Opname per Unit</h3>
                    <p style={{ margin: "4px 0 0 0", color: "#6b7280", fontSize: 14 }}>
                      Pilih unit untuk melihat detail laporan pencocokan stok fisik dengan sistem.
                    </p>
                  </div>

                  {/* Action Buttons for User */}
                  {role === "user" && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <button
                        onClick={handleDownloadTemplateCSV}
                        disabled={importLoading}
                        style={{
                          padding: "10px 16px",
                          borderRadius: 10,
                          border: "1px solid #cbd5e1",
                          background: "#f8fafc",
                          color: "#334155",
                          fontWeight: 600,
                          cursor: importLoading ? "not-allowed" : "pointer",
                          fontSize: 13,
                          opacity: importLoading ? 0.6 : 1,
                        }}
                      >
                        {importLoading ? "Memuat..." : "Download Template"}
                      </button>
                      <label
                        className="btn btn-primary"
                        style={{
                          padding: "8px 16px",
                          fontSize: "13px",
                          fontWeight: "700",
                          borderRadius: "8px",
                          margin: 0,
                          cursor: importLoading ? "not-allowed" : "pointer",
                          opacity: importLoading ? 0.6 : 1,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                      >
                        Import CSV
                        <input
                          type="file"
                          accept=".csv"
                          style={{ display: "none" }}
                          onChange={handleImportCSV}
                          disabled={importLoading}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={openCreate}
                        style={{
                          padding: "8px 16px",
                          fontSize: "13px",
                          fontWeight: "700",
                          borderRadius: "8px",
                          margin: 0,
                          cursor: "pointer",
                          background: "linear-gradient(135deg, #10b981, #059669)",
                          color: "#fff",
                          border: "none",
                          boxShadow: "0 2px 6px rgba(16, 185, 129, 0.25)"
                        }}
                      >
                        Buat Laporan Manual
                      </button>
                    </div>
                  )}
                </div>

                {/* Filter Tabs */}
                <div style={{ display: "flex", gap: 10, marginBottom: 16, overflowX: "auto", paddingBottom: 6 }}>
                  {[
                    { value: "all", label: "Semua Laporan" },
                    { value: "pending", label: "Pending" },
                    { value: "verified", label: "Terverifikasi Admin" },
                    { value: "approved", label: "Disetujui Superadmin" },
                    { value: "rejected", label: "Ditolak" },
                  ].map((tab) => (
                    <button
                      key={tab.value}
                      onClick={() => setStatusFilter(tab.value)}
                      onMouseEnter={(e) => {
                        if (statusFilter === tab.value) e.currentTarget.style.background = "#16a34a";
                      }}
                      onMouseLeave={(e) => {
                        if (statusFilter === tab.value) e.currentTarget.style.background = "#005826";
                      }}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 8,
                        border: statusFilter === tab.value ? "none" : "1px solid #ddd",
                        background: statusFilter === tab.value ? "#005826" : "white",
                        color: statusFilter === tab.value ? "white" : "#4b5563",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontSize: 13,
                        transition: "all 0.2s ease",
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {loading && <p>Memuat data laporan...</p>}

                {!loading && unitSummaryList.length === 0 && (
                  <div style={{ padding: "40px 0", textAlign: "center", color: "#9ca3af" }}>
                    Tidak ada laporan stock opname yang sesuai filter.
                  </div>
                )}

                {!loading && unitSummaryList.length > 0 && (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid #e5e7eb", background: "#f9fafb" }}>
                          <th style={{ padding: "12px 16px" }}>No</th>
                          <th style={{ padding: "12px 16px" }}>Nama Unit</th>
                          <th style={{ padding: "12px 16px", textAlign: "center" }}>Total Barang</th>
                          <th style={{ padding: "12px 16px", textAlign: "center" }}>Pending</th>
                          <th style={{ padding: "12px 16px", textAlign: "center" }}>Diverifikasi Admin</th>
                          <th style={{ padding: "12px 16px", textAlign: "center" }}>Disetujui Superadmin</th>
                          <th style={{ padding: "12px 16px", textAlign: "center" }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unitSummaryList.map((u, idx) => (
                          <tr
                            key={u.unit}
                            style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer", transition: "background 0.2s" }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f0f9ff")}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
                            onClick={() => setActiveUnitView(u.unit)}
                          >
                            <td style={{ padding: "14px 16px", fontWeight: 600, color: "#64748b" }}>{idx + 1}</td>
                            <td style={{ padding: "14px 16px" }}>
                              <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "14px" }}>
                                {u.unit}
                              </span>
                            </td>
                            <td style={{ padding: "14px 16px", textAlign: "center" }}>
                              <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "4px 10px", borderRadius: "12px", fontWeight: 600, fontSize: "12px" }}>
                                {u.totalItems} Barang
                              </span>
                            </td>
                            <td style={{ padding: "14px 16px", textAlign: "center" }}>
                              <span style={{ background: "#fef3c7", color: "#b45309", padding: "4px 10px", borderRadius: "12px", fontWeight: 600, fontSize: "12px" }}>
                                {u.pendingCount}
                              </span>
                            </td>
                            <td style={{ padding: "14px 16px", textAlign: "center" }}>
                              <span style={{ background: "#dbeafe", color: "#1d4ed8", padding: "4px 10px", borderRadius: "12px", fontWeight: 600, fontSize: "12px" }}>
                                {u.verifiedCount}
                              </span>
                            </td>
                            <td style={{ padding: "14px 16px", textAlign: "center" }}>
                              <span style={{ background: "#d1fae5", color: "#047857", padding: "4px 10px", borderRadius: "12px", fontWeight: 600, fontSize: "12px" }}>
                                {u.approvedCount}
                              </span>
                            </td>
                            <td style={{ padding: "14px 16px", textAlign: "center" }}>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setActiveUnitView(u.unit); }}
                                style={{
                                  background: "#005826",
                                  color: "#ffffff",
                                  padding: "8px 16px",
                                  borderRadius: "8px",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  border: "none",
                                  boxShadow: "0 2px 6px rgba(2, 132, 199, 0.25)"
                                }}
                              >
                                Lihat Detail
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* ========== VIEW 2: DETAIL STOCK OPNAME PER UNIT ========== */}
            {activeUnitView && (() => {
              const unitOpnames = filteredOpnames.filter(
                (o) => (o.unit || o.user?.unit || "Unit Lainnya") === activeUnitView
              );

              return (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => setActiveUnitView(null)}
                      style={{
                        background: "linear-gradient(135deg, #64748b, #475569)",
                        color: "#fff",
                        padding: "8px 16px",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                        border: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      ← Kembali
                    </button>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>{activeUnitView}</div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        Detail laporan stock opname ({unitOpnames.length} barang)
                      </div>
                    </div>

                    {role === "user" && (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={openCreate}
                          style={{
                            padding: "8px 16px",
                            fontSize: "13px",
                            fontWeight: "700",
                            borderRadius: "8px",
                            margin: 0,
                            cursor: "pointer",
                            background: "linear-gradient(135deg, #10b981, #059669)",
                            color: "#fff",
                            border: "none",
                            boxShadow: "0 2px 6px rgba(16, 185, 129, 0.25)"
                          }}
                        >
                          Buat Laporan Manual
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Filter Tabs inside detail view */}
                  <div style={{ display: "flex", gap: 10, marginBottom: 16, overflowX: "auto", paddingBottom: 6 }}>
                    {[
                      { value: "all", label: "Semua Laporan" },
                      { value: "pending", label: "Pending" },
                      { value: "verified", label: "Terverifikasi Admin" },
                      { value: "approved", label: "Disetujui Superadmin" },
                      { value: "rejected", label: "Ditolak" },
                    ].map((tab) => (
                      <button
                        key={tab.value}
                        onClick={() => setStatusFilter(tab.value)}
                        onMouseEnter={(e) => {
                          if (statusFilter === tab.value) e.currentTarget.style.background = "#16a34a";
                        }}
                        onMouseLeave={(e) => {
                          if (statusFilter === tab.value) e.currentTarget.style.background = "#005826";
                        }}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 8,
                          border: statusFilter === tab.value ? "none" : "1px solid #ddd",
                          background: statusFilter === tab.value ? "#005826" : "white",
                          color: statusFilter === tab.value ? "white" : "#4b5563",
                          fontWeight: 600,
                          cursor: "pointer",
                          fontSize: 13,
                          transition: "all 0.2s ease",
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {unitOpnames.length === 0 ? (
                    <div style={{ padding: "30px 0", textAlign: "center", color: "#9ca3af" }}>
                      Tidak ada laporan stock opname untuk unit ini pada filter {statusFilter}.
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                        <thead>
                          <tr style={{ borderBottom: "2px solid #e5e7eb", background: "#f9fafb" }}>
                            <th style={{ padding: "12px 16px" }}>Tanggal</th>
                            <th style={{ padding: "12px 16px" }}>Pemohon</th>
                            <th style={{ padding: "12px 16px" }}>Nama Barang</th>
                            <th style={{ padding: "12px 16px", textAlign: "center" }}>Jumlah Barang</th>
                            <th style={{ padding: "12px 16px", textAlign: "center" }}>Hasil Verifikasi</th>
                            {role !== "user" && <th style={{ padding: "12px 16px", textAlign: "center" }}>Selisih</th>}
                            <th style={{ padding: "12px 16px" }}>Status</th>
                            <th style={{ padding: "12px 16px", textAlign: "right" }}>Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {unitOpnames.map((o) => {
                            const date = new Date(o.created_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            });
                            const hasHasilVerifikasi = o.hasil_verifikasi !== null && o.hasil_verifikasi !== undefined;
                            const selisihLabel = hasHasilVerifikasi ? Math.abs(o.stok_fisik - o.hasil_verifikasi) : "-";
                            const selisihColor = !hasHasilVerifikasi || selisihLabel === 0 ? "#374151" : "#dc2626";

                            return (
                              <tr key={o.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                <td style={{ padding: "14px 16px", fontSize: 14 }}>{date}</td>
                                <td style={{ padding: "14px 16px", fontSize: 14 }}>
                                  <div><b>{o.user?.name}</b></div>
                                  <div style={{ fontSize: 12, color: "#6b7280" }}>{o.user?.fakultas || "Fakultas Yarsi"}</div>
                                </td>
                                <td style={{ padding: "14px 16px", fontSize: 14 }}>
                                  <div><b>{o.barang?.nama || "Barang Terhapus"}</b></div>
                                  <div style={{ fontSize: 12, color: "#9ca3af" }}>Kode: {o.barang?.kode}</div>
                                </td>
                                <td style={{ padding: "14px 16px", textAlign: "center", fontSize: 14 }}>
                                  {o.stok_fisik}
                                </td>
                                <td style={{ padding: "14px 16px", textAlign: "center", fontSize: 14 }}>
                                  {o.hasil_verifikasi !== null && o.hasil_verifikasi !== undefined ? o.hasil_verifikasi : "-"}
                                </td>
                                {role !== "user" && (
                                  <td
                                    style={{
                                      padding: "14px 16px",
                                      textAlign: "center",
                                      fontWeight: 700,
                                      color: selisihColor,
                                      fontSize: 14,
                                    }}
                                  >
                                    {selisihLabel}
                                  </td>
                                )}
                                <td style={{ padding: "14px 16px" }}>{getStatusPill(o.status)}</td>
                                <td style={{ padding: "14px 16px", textAlign: "right" }}>
                                  {/* User actions */}
                                  {role === "user" && o.status === "pending" && (
                                    <button
                                      onClick={() => handleDelete(o.id)}
                                      style={{
                                        padding: "6px 10px",
                                        fontSize: 12,
                                        borderRadius: 8,
                                        border: "1px solid #dc2626",
                                        background: "transparent",
                                        color: "#dc2626",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                      }}
                                    >
                                      Hapus
                                    </button>
                                  )}

                                  {/* Admin & Superadmin Verifikasi action ONLY (no quick approve/reject) */}
                                  {(role === "admin" || role === "superadmin") && o.status === "pending" && (
                                    <button
                                      onClick={() => openVerifyModal(o)}
                                      style={{
                                        padding: "6px 14px",
                                        fontSize: 12,
                                        borderRadius: 8,
                                        border: "none",
                                        background: "#2563eb",
                                        color: "white",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                      }}
                                    >
                                      Verifikasi
                                    </button>
                                  )}

                                  {/* Superadmin Approve/Reject for verified items */}
                                  {role === "superadmin" && o.status === "verified" && (
                                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                      <button
                                        onClick={() => handleApprove(o.id)}
                                        style={{
                                          padding: "6px 10px",
                                          fontSize: 12,
                                          borderRadius: 8,
                                          border: "none",
                                          background: "#16a34a",
                                          color: "white",
                                          fontWeight: 600,
                                          cursor: "pointer",
                                        }}
                                      >
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => handleReject(o.id)}
                                        style={{
                                          padding: "6px 10px",
                                          fontSize: 12,
                                          borderRadius: 8,
                                          border: "1px solid #dc2626",
                                          background: "transparent",
                                          color: "#dc2626",
                                          fontWeight: 600,
                                          cursor: "pointer",
                                        }}
                                      >
                                        Tolak
                                      </button>
                                    </div>
                                  )}

                                  {o.status !== "pending" && (role !== "superadmin" || o.status !== "verified") && (
                                    <span style={{ fontSize: 12, color: "#9ca3af" }}>Selesai</span>
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
              );
            })()}
          </div>
          )}
        </section>
      </main>

      {/* CREATE MODAL */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-box-small" style={{ width: 560 }}>
            <button className="close-btn-small" onClick={closeModal}>
              ✖
            </button>

            <div style={{ padding: 16 }}>
              <h2 style={{ marginTop: 0 }}>Buat Laporan Stock Opname</h2>

              <label style={{ display: "block", marginTop: 10, marginBottom: 6 }}>
                <b>Nama Barang ATK</b>
              </label>

              <div style={{ display: "flex", gap: 8 }}>
                <input
                  style={{
                    flex: 1,
                    padding: 10,
                    borderRadius: 10,
                    border: "1px solid #ddd",
                  }}
                  value={queryBarang}
                  onChange={(e) => setQueryBarang(e.target.value)}
                  placeholder="Ketik nama barang untuk mencari..."
                />
              </div>

              {/* Search Suggestions */}
              {loadingSearch && <p style={{ fontSize: 12, margin: "6px 0" }}>Mencari barang...</p>}

              {searchResults.length === 0 && queryBarang.trim() && !loadingSearch && (
                <p style={{ fontSize: 12, margin: "6px 0", color: "#6b7280" }}>
                  {lockedBarangIds.length > 0 ? "Semua hasil pencarian sudah di-stok opname." : "Barang tidak ditemukan."}
                </p>
              )}

              {searchResults.length > 0 && (
                <div
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    maxHeight: 180,
                    overflowY: "auto",
                    marginTop: 6,
                    background: "white",
                  }}
                >
                  {searchResults.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => selectBarangItem(b)}
                      style={{
                        padding: "10px 12px",
                        cursor: "pointer",
                        borderBottom: "1px solid #f3f3f3",
                        fontSize: 14,
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) => (e.target.style.background = "#f3f4f6")}
                      onMouseLeave={(e) => (e.target.style.background = "white")}
                    >
                      <div><b>{b.nama}</b> (Kode: {b.kode})</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>
                        Stok Sistem: {b.stok} {b.satuan} | Rp {Number(b.harga_satuan).toLocaleString("id-ID")}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected Barang Info */}
              {selectedBarang && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 8,
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                  }}
                >
                  <div style={{ fontSize: 13, color: "#1e40af" }}>Barang Terpilih:</div>
                  <h4 style={{ margin: "4px 0" }}>{selectedBarang.nama}</h4>
                  <div style={{ display: "flex", gap: 20, marginTop: 6, fontSize: 13 }}>
                    <div>Kode: <b>{selectedBarang.kode}</b></div>
                    <div>Stok Terdaftar: <b>{selectedBarang.stok} {selectedBarang.satuan}</b></div>
                  </div>
                </div>
              )}

              {/* Unit */}
              <div style={{ marginTop: 16 }}>
                <label style={{ display: "block", marginBottom: 6 }}>
                  <b>Unit / Bagian</b>
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  disabled={unitLocked}
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    fontSize: 14,
                    background: unitLocked ? "#f3f4f6" : "#fff",
                    opacity: unitLocked ? 0.8 : 1,
                    cursor: unitLocked ? "not-allowed" : "default",
                  }}
                >
                  {!unit && <option value="">-- Pilih Unit / Bagian --</option>}
                  {unit && !unitOptions.includes(unit) && (
                    <option value={unit}>{unit}</option>
                  )}
                  {unitOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                {unitLocked && (
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                    Unit Anda sudah terdaftar ({unit || "terkunci"}) dan tidak dapat diubah.
                  </div>
                )}
              </div>

              {/* Stock count and discrepancy */}
              <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: 6 }}>
                    <b>Jumlah Barang</b>
                  </label>
                  <input
                    type="number"
                    style={{
                      width: "100%",
                      padding: 10,
                      borderRadius: 10,
                      border: "1px solid #ddd",
                    }}
                    value={stokFisik}
                    onChange={(e) => setStokFisik(e.target.value)}
                    placeholder="Contoh: 10"
                    min="0"
                  />
                </div>

                {role !== "user" && (
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", marginBottom: 6 }}>
                      <b>Selisih Perhitungan</b>
                    </label>
                    <div
                      style={{
                        padding: 10,
                        borderRadius: 10,
                        border: "1px solid #ddd",
                        background: "#f9fafb",
                        fontWeight: 700,
                        color:
                          selectedBarang && stokFisik !== ""
                            ? Number(stokFisik) - selectedBarang.stok === 0
                              ? "#374151"
                              : Number(stokFisik) - selectedBarang.stok > 0
                                ? "#16a34a"
                                : "#dc2626"
                            : "#9ca3af",
                      }}
                    >
                      {selectedBarang && stokFisik !== ""
                        ? Math.abs(Number(stokFisik) - selectedBarang.stok)
                        : "Pilih barang & isi stok fisik"}
                    </div>
                  </div>
                )}
              </div>

              {formError && (
                <div style={{ color: "#ef4444", marginTop: 10, fontSize: 14 }}>
                  <b>⚠️ {formError}</b>
                </div>
              )}

              {/* Actions */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 20,
                }}
              >
                <button
                  onClick={closeModal}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid #ef4444",
                    background: "transparent",
                    color: "#ef4444",
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
                  Kirim Laporan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VERIFY MODAL */}
      {verifyModalOpen && selectedVerifyOpname && (
        <div className="modal-overlay">
          <div className="modal-box-small" style={{ width: 560 }}>
            <button className="close-btn-small" onClick={closeVerifyModal}>
              ✖
            </button>

            <div style={{ padding: 16 }}>
              <h2 style={{ marginTop: 0 }}>Verifikasi Laporan Stock Opname</h2>

              {/* Selected Barang Info */}
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 8,
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                }}
              >
                <div style={{ fontSize: 13, color: "#1e40af" }}>Barang yang Diverifikasi:</div>
                <h4 style={{ margin: "4px 0" }}>{selectedVerifyOpname.barang?.nama || "Barang Terhapus"}</h4>
                <div style={{ display: "flex", gap: 20, marginTop: 6, fontSize: 13 }}>
                  <div>Kode: <b>{selectedVerifyOpname.barang?.kode}</b></div>
                  <div>Stok Sistem: <b>{selectedVerifyOpname.stok_sistem}</b></div>
                  <div>Stok Fisik Diajukan User: <b>{selectedVerifyOpname.stok_fisik}</b></div>
                </div>
              </div>

              {/* Stock count and discrepancy */}
              <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: 6 }}>
                    <b>Jumlah Barang</b>
                  </label>
                  <input
                    type="number"
                    style={{
                      width: "100%",
                      padding: 10,
                      borderRadius: 10,
                      border: "1px solid #ddd",
                    }}
                    value={verifyStokFisik}
                    onChange={(e) => setVerifyStokFisik(e.target.value)}
                    placeholder="Contoh: 10"
                    min="0"
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: 6 }}>
                    <b>Selisih Perhitungan</b>
                  </label>
                  <div
                    style={{
                      padding: 10,
                      borderRadius: 10,
                      border: "1px solid #ddd",
                      background: "#f9fafb",
                      fontWeight: 700,
                      color:
                        verifyStokFisik !== ""
                          ? Math.abs(selectedVerifyOpname.stok_fisik - Number(verifyStokFisik)) === 0
                            ? "#374151"
                            : "#dc2626"
                          : "#9ca3af",
                    }}
                  >
                    {verifyStokFisik !== ""
                      ? Math.abs(selectedVerifyOpname.stok_fisik - Number(verifyStokFisik))
                      : "Isi jumlah barang"}
                  </div>
                </div>
              </div>

              {/* Keterangan / Alasan */}
              {verifyFormError && (
                <div style={{ color: "#ef4444", marginTop: 10, fontSize: 14 }}>
                  <b>⚠️ {verifyFormError}</b>
                </div>
              )}

              {/* Actions */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 20,
                }}
              >
                <button
                  onClick={closeVerifyModal}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid #ef4444",
                    background: "transparent",
                    color: "#ef4444",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  Batal
                </button>

                <button
                  onClick={onSubmitVerify}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "none",
                    cursor: "pointer",
                    background: "#2563eb",
                    color: "white",
                    fontWeight: 800,
                  }}
                >
                  Verifikasi Laporan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW IMPORT CSV STOCK OPNAME */}
      {showImportPreview && (
        <div className="modal-overlay" onClick={() => setShowImportPreview(false)}>
          <div
            className="modal-box-small"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "90%",
              maxWidth: 900,
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <button className="close-btn-small" onClick={() => setShowImportPreview(false)}>
              ✖
            </button>

            <div style={{ padding: 20 }}>
              <h2 style={{ marginTop: 0, marginBottom: 4 }}>Verifikasi Import CSV Stock Opname</h2>
              <p style={{ color: "#6b7280", margin: "0 0 16px 0", fontSize: 14 }}>
                {importPreviewData.length} barang ditemukan dari file CSV. Periksa data sebelum mengirim laporan.
              </p>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 6 }}>
                  <b>Unit / Bagian</b>
                </label>
                <select
                  value={importUnit}
                  onChange={(e) => setImportUnit(e.target.value)}
                  disabled={unitLocked}
                  style={{
                    width: "100%",
                    maxWidth: 400,
                    padding: 10,
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    fontSize: 14,
                    background: unitLocked ? "#f3f4f6" : "#fff",
                    opacity: unitLocked ? 0.8 : 1,
                    cursor: unitLocked ? "not-allowed" : "default",
                  }}
                >
                  {!importUnit && <option value="">-- Pilih Unit / Bagian --</option>}
                  {importUnit && !unitOptions.includes(importUnit) && (
                    <option value={importUnit}>{importUnit}</option>
                  )}
                  {unitOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                {unitLocked && (
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                    Unit Anda sudah terdaftar ({importUnit || "terkunci"}) dan tidak dapat diubah.
                  </div>
                )}
              </div>

              <div style={{ overflowX: "auto", maxHeight: "50vh", overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb", background: "#f9fafb", position: "sticky", top: 0 }}>
                      <th style={{ padding: "10px 12px" }}>No</th>
                      <th style={{ padding: "10px 12px" }}>Kode</th>
                      <th style={{ padding: "10px 12px" }}>Nama Barang</th>
                      <th style={{ padding: "10px 12px", textAlign: "center" }}>Stok Sistem</th>
                      <th style={{ padding: "10px 12px", textAlign: "center" }}>Stok Fisik</th>
                      <th style={{ padding: "10px 12px", textAlign: "center" }}>Selisih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreviewData.map((item, idx) => {
                      const selisihColor = item.selisih === 0 ? "#374151" : item.selisih > 0 ? "#16a34a" : "#dc2626";
                      const selisihLabel = Math.abs(item.selisih);
                      return (
                        <tr key={item.barang_id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "10px 12px", color: "#9ca3af" }}>{idx + 1}</td>
                          <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: 13 }}>{item.kode}</td>
                          <td style={{ padding: "10px 12px", fontWeight: 600 }}>{item.nama}</td>
                          <td style={{ padding: "10px 12px", textAlign: "center" }}>{item.stok_sistem}</td>
                          <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600 }}>{item.stok_fisik}</td>
                          <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: selisihColor }}>
                            {selisihLabel}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div
                style={{
                  marginTop: 16,
                  padding: "12px 16px",
                  background: "#f0fdf4",
                  borderRadius: 10,
                  border: "1px solid #bbf7d0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 14, color: "#166534" }}>
                  <strong>{importPreviewData.length}</strong> laporan siap dikirim
                </div>
                <div style={{ fontSize: 13, color: "#4b5563" }}>
                  Selisih positif: <strong style={{ color: "#16a34a" }}>{importPreviewData.filter(i => i.selisih > 0).length}</strong> ·
                  Cocok: <strong>{importPreviewData.filter(i => i.selisih === 0).length}</strong> ·
                  Selisih negatif: <strong style={{ color: "#dc2626" }}>{importPreviewData.filter(i => i.selisih < 0).length}</strong>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button
                  onClick={() => setShowImportPreview(false)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 10,
                    border: "1px solid #ef4444",
                    background: "transparent",
                    color: "#ef4444",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  Batal
                </button>
                <button
                  onClick={handleBulkSubmit}
                  disabled={importLoading}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 10,
                    border: "none",
                    cursor: importLoading ? "not-allowed" : "pointer",
                    background: importLoading ? "#9ca3af" : "#16a34a",
                    color: "white",
                    fontWeight: 700,
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {importLoading ? "⏳ Mengirim..." : `✅ Kirim ${importPreviewData.length} Laporan`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}