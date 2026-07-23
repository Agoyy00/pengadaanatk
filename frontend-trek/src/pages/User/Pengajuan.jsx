import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import "../../css/Pengajuan.css";
import "../../css/layout.css";
import RoleSwitcher from "../../components/RoleSwitcher";
import PeriodeTimer from "../../components/PeriodeTimer";

function Pengajuan() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(1);

  const STORAGE_URL = `${import.meta.env.VITE_BACKEND_BASE}/storage/barang`;
  const token = localStorage.getItem("token");


  // STEP 1 – data pengajuan
  const [tahunAkademik, setTahunAkademik] = useState("");
  const [namaPemohon, setNamaPemohon] = useState("");
  const [jabatan, setJabatan] = useState("Staf");
  const [unit, setUnit] = useState("Direktorat");
  const [limitChecked, setLimitChecked] = useState(false);

  // Dynamic Options (Jabatan & Unit)
  const [jabatanOptions, setJabatanOptions] = useState([]);
  const [unitOptions, setUnitOptions] = useState([]);

  const loadJabatanOptions = async () => {
    try {
      const res = await fetch(`${API_BASE}/options/jabatan`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setJabatanOptions(json.data);
      }
    } catch (err) {
      console.error("Gagal load opsi jabatan:", err);
    }
  };

  const loadUnitOptions = async () => {
    try {
      const res = await fetch(`${API_BASE}/options/unit`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setUnitOptions(json.data);
      }
    } catch (err) {
      console.error("Gagal load opsi unit:", err);
    }
  };

  useEffect(() => {
    loadJabatanOptions();
    loadUnitOptions();
  }, []);

  const handleManageOptions = async (type, titleName, optionsList, refreshFn, setFn) => {
    const optionsHtml = optionsList.map(opt => `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding:6px 12px; background:#f8fafc; border-radius:6px; border:1px solid #e2e8f0;">
        <span style="font-weight:600; color:#334155;">${opt.value}</span>
        <button type="button" class="swal-del-opt-btn" data-id="${opt.id}" data-val="${opt.value}" style="padding:4px 10px; font-size:12px; border-radius:4px; background:#ef4444; color:#fff; border:none; cursor:pointer;">Hapus</button>
      </div>
    `).join('');

    const res = await Swal.fire({
      title: `Kelola Opsi ${titleName}`,
      html: `
        <div style="text-align:left; max-height:220px; overflow-y:auto; margin-bottom:12px; padding-right:4px;">
          ${optionsHtml || '<p style="color:#64748b; text-align:center;">Belum ada opsi.</p>'}
        </div>
        <input id="swal-new-option" class="swal2-input" placeholder="Tambah ${titleName} baru..." style="margin: 0 auto; width: 90%;">
      `,
      showCancelButton: true,
      confirmButtonText: "+ Tambah Baru",
      cancelButtonText: "Selesai / Tutup",
      confirmButtonColor: "#2563eb",
      didOpen: () => {
        const popup = Swal.getPopup();
        popup.querySelectorAll('.swal-del-opt-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.getAttribute('data-val');
            try {
              const delRes = await fetch(`${API_BASE}/options/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
              });
              const delJson = await delRes.json();
              if (delJson.success) {
                Swal.close();
                await refreshFn();
                Swal.fire({ icon: "success", title: "Dihapus", text: `Opsi "${val}" telah dihapus`, timer: 1200, showConfirmButton: false });
              }
            } catch (err) {
              console.error(err);
            }
          });
        });
      },
      preConfirm: () => {
        const newVal = document.getElementById('swal-new-option').value;
        if (!newVal || !newVal.trim()) {
          Swal.showValidationMessage('Nama opsi tidak boleh kosong');
          return false;
        }
        return newVal.trim();
      }
    });

    if (res.isConfirmed && res.value) {
      try {
        const addRes = await fetch(`${API_BASE}/options/${type}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ value: res.value })
        });
        const addJson = await addRes.json();
        if (addJson.success) {
          await refreshFn();
          setFn(res.value);
          Swal.fire({ icon: "success", title: "Berhasil", text: `Opsi "${res.value}" berhasil ditambahkan`, timer: 1200, showConfirmButton: false });
        }
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Gagal menambah opsi", "error");
      }
    }
  };


  // Error step 1
  const [errorsStep1, setErrorsStep1] = useState({});
  const [limitError, setLimitError] = useState("CHECKING"); // ❗ pesan "hanya 1x per periode"

  // STEP 2 – pencarian & item
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [items, setItems] = useState([]);
  const [step2Error, setStep2Error] = useState("");
  const [openUsulan, setOpenUsulan] = useState(false);
  const [usulan, setUsulan] = useState({
    nama: "",
  });
  const [loadingSubmit, setLoadingSubmit] = useState(false); // opsional spinner
  const [showVerifyPanel, setShowVerifyPanel] = useState(false);
  const [verifyChecked, setVerifyChecked] = useState(false);
  const [showItemDetail, setShowItemDetail] = useState(false);




  // preview foto besar
  const [previewImage, setPreviewImage] = useState(null);

  // STATUS PERIODE
  const [periodeLoading, setPeriodeLoading] = useState(true);
  const [periodeOpen, setPeriodeOpen] = useState(false); // null = belum tahu
  const [periodeMessage, setPeriodeMessage] = useState("");

  const API_BASE = import.meta.env.VITE_API_BASE;
  const BACKEND_BASE = import.meta.env.VITE_API_BASE;

  // ambil user login dari localStorage
  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const userId = currentUser?.id;
  const normalizeRole = (r) => String(r || "").toLowerCase().replace(/[\s_]+/g, "");
  const activeRole = normalizeRole(currentUser?.role);
  const baseRole = normalizeRole(currentUser?.baseRole);
  const userEmail = (currentUser?.email || "").toLowerCase();
  const isSuperAdmin =
    baseRole === "superadmin" ||
    activeRole === "superadmin" ||
    currentUser?.role_id === 1 ||
    userEmail.startsWith("superadmin");
  const [confirmId, setConfirmId] = useState(null);
  const formatRole = (role) => {
    if (!role) return "-";

    return role
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };
  const getStepperLabel = () =>
    "Stepper: Data Pengajuan → Input Barang → Konfirmasi";

  // ====== CEK PERIODE PENGAJUAN ======
  useEffect(() => {
    async function fetchPeriode() {
      try {
        setPeriodeLoading(true);

        const res = await fetch(`${API_BASE}/periode/active`);

        if (!res.ok) {
          setPeriodeOpen(isOpen === true);
          setPeriodeMessage("");
          return;
        }

        const data = await res.json();

        const isOpen =
          data.is_open === true ||
          data.is_open === 1 ||
          data.is_open === "1" ||
          data.is_open === "open";

        setPeriodeOpen(isOpen);
        setPeriodeMessage(data.message || "");

        // 🔥 AUTO-SET TAHUN AKADEMIK DARI PERIODE AKTIF
        if (data.periode?.tahun_akademik) {
          setTahunAkademik(data.periode.tahun_akademik);
        }

      } catch (err) {
        console.error("Gagal cek periode:", err);
        setPeriodeOpen(true);
        setPeriodeMessage("");
      } finally {
        setPeriodeLoading(false);
      }
    }

    fetchPeriode();
  }, []);


  // ====== CEK: user sudah pernah mengajukan di tahun akademik ini? ======
  useEffect(() => {
    if (!tahunAkademik || !userId) {
      setLimitError(null);
      setLimitChecked(true);
      return;
    }

    async function checkLimit() {
      try {
        const res = await fetch(
          `${API_BASE}/pengajuan/check/${userId}?tahun=${encodeURIComponent(tahunAkademik)}`,
          {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) return;

        const data = await res.json();

        if (data.already) {
          setLimitError(
            "Anda sudah pernah mengajukan ATK pada periode ini. Pengajuan hanya boleh 1 kali."
          );
        } else {
          setLimitError(null);
        }
      } catch (err) {
        console.error(err);
        setLimitError("null");
      } finally {
        setLimitChecked(true); // 🔥 PENTING
      }
    }

    checkLimit();
  }, [tahunAkademik, userId]);


  // ====== AUTO-SUGGEST BARANG ======
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setLoadingSearch(true);

        const res = await fetch(
          `${API_BASE}/barang?q=${encodeURIComponent(query)}`,
          {
            headers: {
              "Accept": "application/json",
              "Authorization": `Bearer ${token}`,
            },
          }
        );

        const data = await res.json(); // ✅ data DIDEFINISIKAN DI SINI

        const keyword = query.trim().toLowerCase();

        const filtered = data.filter((item) =>
          item.nama?.toLowerCase().startsWith(keyword)
        );

        setSearchResults(filtered);

        // 🔥 TRIGGER FITUR USULAN
        if (filtered.length === 0 && query.trim().length >= 3) {
          setUsulan((prev) => ({ ...prev, nama: query }));
        }
      } catch (err) {
        console.error("Gagal mencari barang", err);
      } finally {
        setLoadingSearch(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);


  // tambah barang ke daftar item
  const handleAddItem = (barang) => {
    const exists = items.some((i) => i.id === barang.id);
    if (exists) return;

    setItems((prev) => [
      ...prev,
      {
        id: barang.id,
        nama: barang.nama,
        satuan: barang.satuan,
        kebutuhanTotal: 0,
        sisaStok: 0,
        jumlahDiajukan: 0,
        estimasiNilai: barang.harga_satuan,
        foto: barang.foto || null,
      },
    ]);

    setQuery("");
    setSearchResults([]);
    setStep2Error("");
  };

  // ====== IMPORT CSV ======
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
        const res = await fetch(`${API_BASE}/barang`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const masterDataRes = await res.json();
        const masterData = Array.isArray(masterDataRes) ? masterDataRes : (masterDataRes.data || []);

        const newItems = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
          // index: 0(no), 1(nama), 2(satuan), 3(kebutuhan), 4(total), 5(sisa), 6(jumlah diajukan)
          if (cols.length >= 2) {
            const namaCSV = cols[1].toLowerCase();
            const kebutuhan = parseInt(cols[3]) || 0;
            const sisa = parseInt(cols[5]) || 0;

            const matchedBarang = masterData.find(b => b.nama.toLowerCase() === namaCSV || b.id.toString() === cols[0]);

            if (matchedBarang) {
              const exists = items.some(it => it.id === matchedBarang.id) || newItems.some(it => it.id === matchedBarang.id);
              if (!exists) {
                const jumlahDiajukan = Math.max(kebutuhan - sisa, 0);
                newItems.push({
                  id: matchedBarang.id,
                  nama: matchedBarang.nama,
                  satuan: matchedBarang.satuan,
                  kebutuhanTotal: kebutuhan,
                  sisaStok: sisa,
                  jumlahDiajukan: jumlahDiajukan,
                  estimasiNilai: matchedBarang.harga_satuan,
                  foto: matchedBarang.foto || null,
                });
              }
            }
          }
        }

        if (newItems.length > 0) {
          setItems(prev => [...prev, ...newItems]);
          Swal.fire("Berhasil", `${newItems.length} barang berhasil diimport dari CSV`, "success");
        } else {
          Swal.fire("Info", "Tidak ada barang yang cocok dari CSV atau semua sudah ada di daftar", "info");
        }
      } catch (err) {
        console.error("Gagal import CSV", err);
        Swal.fire("Error", "Gagal mengambil data barang dari server", "error");
      }

      e.target.value = null;
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    console.log("ITEMS:", items);
  }, [items]);


  // hanya boleh angka (0–9) di keyboard
  const handleNumericKeyDown = (e) => {
    const allowedKeys = ["Backspace", "Tab", "ArrowLeft", "ArrowRight", "Delete"];
    if (allowedKeys.includes(e.key)) return;
    if (!/^[0-9]$/.test(e.key)) e.preventDefault();
  };

  // kebutuhan total berubah → jumlah diajukan = kebutuhan - sisa
  const handleChangeKebutuhan = (id, value) => {
    // ⛔ tidak boleh minus
    const num = Math.max(0, Number(value) || 0);
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const sisa = item.sisaStok || 0;
        const jumlahDiajukan = Math.max(num - sisa, 0);
        return { ...item, kebutuhanTotal: num, jumlahDiajukan };
      })
    );
  };

  const [usulanStatus, setUsulanStatus] = useState(null); // { type: "success"|"error", message: "" }
  const submitUsulan = async () => {
    if (!usulan.nama.trim()) {
      setUsulanStatus({ type: "error", message: "Nama barang tidak boleh kosong" });
      return;
    }

    if (usulan.nama.trim().length < 3) {
      setUsulanStatus({ type: "error", message: "Nama barang minimal 3 karakter" });
      return;
    }

    try {
      setLoadingSubmit(true);
      setUsulanStatus(null);

      const res = await fetch(`${API_BASE}/barang-usulan`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, },
        body: JSON.stringify({ nama_barang: usulan.nama, user_id: userId }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) throw new Error(data.message || "Gagal mengirim usulan");

      setOpenUsulan(false);          // tutup modal
      setUsulan({ nama: "" });       // reset input
      setUsulanStatus({ type: "success", message: "Usulan barang berhasil dikirim!" });

    } catch (err) {
      setUsulanStatus({ type: "error", message: err.message || "Gagal mengirim usulan" });
    } finally {
      setLoadingSubmit(false);
    }
  };


  // sisa stok berubah → jumlah diajukan = kebutuhan - sisa
  const handleChangeSisaStok = (id, value) => {
    // ⛔ tidak boleh minus
    const num = Math.max(0, Number(value) || 0);
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const kebutuhan = item.kebutuhanTotal || 0;
        const jumlahDiajukan = Math.max(kebutuhan - num, 0);
        return { ...item, sisaStok: num, jumlahDiajukan };
      })
    );
  };

  const handleRemoveItem = (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setConfirmId(null);
  };

  // total nilai semua item
  const totalNilai = items.reduce(
    (sum, item) => sum + item.jumlahDiajukan * item.estimasiNilai,
    0
  );

  // total jumlah diajukan
  const totalJumlahDiajukan = items.reduce(
    (sum, item) => sum + item.jumlahDiajukan,
    0
  );

  // validasi STEP 1
  const handleNextFromStep1 = () => {
    // ❗ Kalau sudah pernah mengajukan → stop di sini
    if (limitError) {
      Swal.fire({
        icon: "warning",
        title: "Perhatian",
        text: limitError,
        confirmButtonColor: "#3b82f6",
      });
      return;
    }

    const errors = {};

    if (!tahunAkademik.trim()) {
      errors.tahunAkademik = "Tahun akademik wajib dipilih.";
    } else if (!/^\d{4}\/\d{4}$/.test(tahunAkademik.trim())) {
      errors.tahunAkademik = "Format tahun akademik tidak valid.";
    }

    if (!namaPemohon.trim()) {
      errors.namaPemohon = "Nama pemohon wajib diisi.";
    } else if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\s'.-]+$/.test(namaPemohon.trim())) {
      errors.namaPemohon = "Nama pemohon hanya boleh huruf (tanpa angka).";
    }

    if (!jabatan) errors.jabatan = "Jabatan wajib dipilih.";
    if (!unit) errors.unit = "Unit/Bagian wajib dipilih.";

    if (Object.keys(errors).length > 0) {
      setErrorsStep1(errors);
      return;
    }

    setErrorsStep1({});
    setCurrentStep(2);
  };

  // validasi STEP 2
  const handleNextFromStep2 = () => {
    if (items.length === 0) {
      setStep2Error("Tambahkan minimal satu barang sebelum melanjutkan.");
      return;
    }

    const adaJumlahKosong = items.some(
      (i) => !i.jumlahDiajukan || i.jumlahDiajukan <= 0
    );
    if (adaJumlahKosong) {
      setStep2Error(
        "Jumlah diajukan harus lebih dari 0. Isi kebutuhan total & sisa stok dengan benar."
      );
      return;
    }

    setStep2Error("");
    setCurrentStep(3);
  };

  // kirim pengajuan ke backend
  async function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    if (!userId) {
      Swal.fire({
        icon: "warning",
        title: "Belum Login",
        text: "User belum login. Silakan login terlebih dahulu.",
        confirmButtonColor: "#3b82f6",
      });
      return;
    }

    setLoadingSubmit(true);
    setShowVerifyPanel(false);

    const payload = {
      tahun_akademik: tahunAkademik,
      nama_pemohon: namaPemohon,
      jabatan,
      unit,
      user_id: userId,
      items: items.map((i) => ({
        id: i.id,
        kebutuhanTotal: Number(i.kebutuhanTotal),
        sisaStok: Number(i.sisaStokSaatIni ?? i.sisaStok ?? 0),
        jumlahDiajukan: Number(i.jumlahDiajukan),
        estimasiNilai: Number(i.estimasiNilai),
      })),
    };

    try {
      const res = await fetch(`${API_BASE}/pengajuan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        let msg = data.message;
        if (data.errors) {
          msg = Object.values(data.errors).flat().join("\n");
        }
        Swal.fire({
          icon: "error",
          title: "Pengajuan Gagal",
          text: msg || "Gagal mengirim pengajuan",
          confirmButtonColor: "#ef4444",
        });
        console.error("Error pengajuan:", data);
        return;
      }

      Swal.fire({
        icon: "success",
        title: "Pengajuan Berhasil!",
        text: "Pengajuan ATK Anda telah sukses dikirim ke sistem.",
        confirmButtonColor: "#10b981",
        confirmButtonText: "Lihat Riwayat",
      }).then(() => {
        window.location.href = "/riwayat";
      });
    } catch (err) {
      console.error("Error jaringan:", err);
      Swal.fire({
        icon: "error",
        title: "Kesalahan Jaringan",
        text: "Terjadi kesalahan saat terhubung ke server.",
        confirmButtonColor: "#ef4444",
      });
    } finally {
      setLoadingSubmit(false);
    }
  }

  useEffect(() => {
    if (currentUser?.name) {
      setNamaPemohon(currentUser.name);
    }
  }, [currentUser]);


  const sidebarMenus = useMemo(() => {
    return [
      { label: "Dashboard User", to: "/dashboarduser" },
      { label: "Buat Pengajuan Baru", to: "/pengajuan", active: true },
      { label: "Riwayat Pengajuan", to: "/riwayat" },
      { label: "Stock Opname Barang", to: "/stock-opname" },
      { label: "Template Dokumen", to: "/template-dokumen" },
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
            <div className="topbar-title">Buat Pengajuan Baru</div>
            <div className="topbar-sub">
              Selamat datang: {currentUser?.name || "Nama Kamu"}
            </div>
          </div>
          <div className="topbar-right">
            <PeriodeTimer />
            <span>Role: </span>
            <RoleSwitcher />
          </div>
        </header>

        {/* MAIN CONTENT */}
        <section className="main-content">
          {/* 1. MASIH CEK PERIODE */}
          {periodeLoading || periodeOpen === null || !limitChecked ? (
            // ⏳ MASIH LOADING
            <div className="card">
              <div className="card-subtitle">
                Memeriksa status pengajuan...
              </div>
            </div>
          ) : !periodeOpen ? (
            // 🚫 PERIODE TUTUP
            <div className="card periode-closed-card">
              <div className="card-title">Pengajuan ATK tidak tersedia</div>
              <p>Saat ini pengajuan belum dibuka atau sudah ditutup.</p>
              {periodeMessage && <p>{periodeMessage}</p>}

              <button
                type="button"
                className="btn btn-back-dashboard"
                onClick={() => navigate("/dashboarduser")}
              >
                Kembali ke Dashboard
              </button>
            </div>
          ) : limitError ? (
            // 🚫 SUDAH PERNAH MENGAJUKAN
            <div className="card periode-closed-card">
              <div className="card-title">Pengajuan Tidak Dapat Dilanjutkan</div>
              <p>{limitError}</p>

              <button
                type="button"
                className="btn btn-back-dashboard"
                onClick={() => navigate("/riwayat")}
              >
                Lihat Riwayat Pengajuan
              </button>
            </div>
          ) : (
            // ✅ BOLEH MENGAJUKAN → FORM + STEPPER
            <>

              <div className="card">
                <div className="card-title">
                  Form Pengajuan (langkah 1 sampai 3)
                </div>
                <div id="stepper-label" className="card-subtitle">
                  {getStepperLabel()}
                </div>

                <div className="stepper">
                  <div className="step">
                    <div
                      className={`step-circle ${currentStep === 1 ? "active" : ""
                        }`}
                    >
                      1
                    </div>
                  </div>
                  <div className="step-line"></div>
                  <div className="step">
                    <div
                      className={`step-circle ${currentStep === 2 ? "active" : ""
                        }`}
                    >
                      2
                    </div>
                  </div>
                  <div className="step-line"></div>
                  <div className="step">
                    <div
                      className={`step-circle ${currentStep === 3 ? "active" : ""
                        }`}
                    >
                      3
                    </div>
                  </div>
                </div>
              </div>

              {/* FORM SEMUA STEP */}
              <form onSubmit={handleSubmit}>
                {/* STEP 1 */}
                {currentStep === 1 && (
                  <div className="step-pane active">
                    <div className="form-card">
                      <div className="form-card-header">
                        <h3>Data Pengajuan</h3>
                        <p>Lengkapi informasi pemohon sebelum melanjutkan</p>
                      </div>

                      <div className="form-grid-pro">
                        {/* Tahun Akademik */}
                        <div className="form-group-pro">
                          <label>
                            Tahun Akademik <span className="required">*</span>
                          </label>
                          <input
                            type="text"
                            className="input-pro"
                            value={tahunAkademik}
                            disabled
                          />
                          {errorsStep1.tahunAkademik && (
                            <div className="error-text">
                              {errorsStep1.tahunAkademik}
                            </div>
                          )}

                          {limitError && (
                            <div className="error-text danger">
                              {limitError}
                            </div>
                          )}
                        </div>

                        {/* Nama Pemohon */}
                        <div className="form-group-pro">
                          <label>
                            Nama Pemohon <span className="required">*</span>
                          </label>
                          <input
                            type="text"
                            className="input-pro"
                            value={namaPemohon}
                            onChange={(e) => setNamaPemohon(e.target.value)}
                          />
                          {errorsStep1.namaPemohon && (
                            <div className="error-text">
                              {errorsStep1.namaPemohon}
                            </div>
                          )}
                        </div>

                        {/* Jabatan */}
                        <div className="form-group-pro">
                          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>Jabatan <span className="required">*</span></span>
                            {isSuperAdmin && (
                              <button
                                type="button"
                                onClick={() => handleManageOptions('jabatan', 'Jabatan', jabatanOptions, loadJabatanOptions, setJabatan)}
                                title="Kelola Opsi Jabatan"
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', padding: '0 4px', color: '#2563eb', fontWeight: 600 }}
                              >
                                ✏️ Kelola
                              </button>
                            )}
                          </label>
                          <select
                            className="input-pro"
                            value={jabatan}
                            onChange={(e) => setJabatan(e.target.value)}
                          >
                            {jabatanOptions.map((opt) => (
                              <option key={opt.id || opt.value} value={opt.value}>
                                {opt.value}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Unit */}
                        <div className="form-group-pro">
                          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>Unit / Bagian <span className="required">*</span></span>
                            {isSuperAdmin && (
                              <button
                                type="button"
                                onClick={() => handleManageOptions('unit', 'Unit / Bagian', unitOptions, loadUnitOptions, setUnit)}
                                title="Kelola Opsi Unit / Bagian"
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', padding: '0 4px', color: '#2563eb', fontWeight: 600 }}
                              >
                                ✏️ Kelola
                              </button>
                            )}
                          </label>
                          <select
                            className="input-pro"
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                          >
                            {unitOptions.map((opt) => (
                              <option key={opt.id || opt.value} value={opt.value}>
                                {opt.value}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="actions">
                      <span />
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleNextFromStep1}
                      >
                        Selanjutnya: Input Barang
                      </button>
                    </div>
                  </div>
                )}


                {/* STEP 2 */}
                {currentStep === 2 && (
                  <div className="step-pane active">
                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ margin: 0 }}>Cari Barang</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn"
                            style={{ padding: '6px 14px', fontSize: '13px', cursor: 'pointer', borderRadius: '6px', margin: 0, background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}
                            onClick={() => {
                              Swal.fire("Info", "Template CSV akan segera tersedia.", "info");
                            }}
                          >
                            📄 Download Template
                          </button>
                          <label className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '13px', cursor: 'pointer', borderRadius: '6px', margin: 0 }}>
                            📥 Import CSV
                            <input
                              type="file"
                              accept=".csv"
                              style={{ display: 'none' }}
                              onChange={handleImportCSV}
                            />
                          </label>
                        </div>
                      </div>
                      <div className="search-wrapper">
                        <input
                          type="text"
                          className="input-text"
                          placeholder="Ketik nama barang..."
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                        {!loadingSearch &&
                          query.trim().length >= 3 &&
                          searchResults.length === 0 && (
                            <div className="usulan-box">
                              <p>
                                Barang <strong>"{query}"</strong> tidak ditemukan
                              </p>
                              <button
                                type="button"
                                className="btn-usulan"
                                onClick={() => setOpenUsulan(true)}
                              >
                                + Ajukan Barang Baru
                              </button>
                            </div>
                          )}
                        {searchResults.length > 0 && (
                          <ul className="search-dropdown">
                            {searchResults.map((b) => (
                              <li
                                key={b.id}
                                className="search-item"
                                onClick={() => handleAddItem(b)}
                              >
                                <div className="search-item-row">
                                  {b.foto && (
                                    <img
                                      src={`${BACKEND_BASE}${b.foto}`}
                                      alt={b.nama}
                                      className="barang-thumb"
                                    />
                                  )}
                                  <div>
                                    <div>{b.nama}</div>
                                    <div className="search-item-meta">
                                      {b.kode} · Stok gudang: {b.stok} ·{" "}
                                      {b.satuan}
                                    </div>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {usulanStatus && (<div className={`toast ${usulanStatus.type}`}>{usulanStatus.message}</div>)}
                      {openUsulan && (
                        <div className="modal-overlay">
                          <div className="modal-card">
                            <h3>Ajukan Barang Baru</h3>
                            <input
                              type="text"
                              className="input-pro"
                              value={usulan.nama}
                              onChange={(e) => setUsulan({ nama: e.target.value })}
                              placeholder="Contoh: Tinta Printer Epson 003"
                              autoFocus
                            />
                            <div className="modal-actions">
                              <button type="button" onClick={() => setOpenUsulan(false)}>Batal</button>
                              <button
                                type="button"
                                className="btn btn-primary"
                                disabled={!usulan.nama.trim() || loadingSubmit}
                                onClick={submitUsulan}
                              >
                                {loadingSubmit ? "Mengirim..." : "Kirim Usulan"}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="table-title">Item yang diajukan</div>

                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Barang</th>
                            <th>Satuan</th>
                            <th>Harga Satuan</th>
                            <th>Kebutuhan Total</th>
                            <th>Sisa stok saat ini</th>
                            <th>Jumlah Diajukan</th>
                            <th>Harga Total</th>
                            <th style={{
                              borderBottom: "1px solid #eee", textAlign: "center",
                            }}>Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.length === 0 && (
                            <tr>
                              <td colSpan="8">Belum ada item.</td>
                            </tr>
                          )}

                          {items.map((item) => (
                            <tr key={item.id}>
                              {/* BARANG + FOTO */}
                              <td>
                                <div className="barang-cell">
                                  {console.log("FOTO:", item.foto)}
                                  {item.foto ? (
                                    <img
                                      src={`${BACKEND_BASE}${item.foto}`}
                                      alt={item.nama}
                                      className="barang-thumb barang-thumb-clickable"
                                      onClick={() => setPreviewImage(`${BACKEND_BASE}${item.foto}`)}
                                    />
                                  ) : (
                                    <div className="barang-thumb placeholder" />)}
                                  <span>{item.nama}</span>
                                </div>
                              </td>
                              <td>{item.satuan}</td>
                              <td>
                                Rp {item.estimasiNilai.toLocaleString("id-ID")}
                              </td>

                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  inputMode="numeric"
                                  onKeyDown={handleNumericKeyDown}
                                  className="input-number"
                                  value={item.kebutuhanTotal}
                                  onChange={(e) =>
                                    handleChangeKebutuhan(item.id, e.target.value)
                                  }
                                />
                              </td>

                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  inputMode="numeric"
                                  onKeyDown={handleNumericKeyDown}
                                  className="input-number"
                                  value={item.sisaStok}
                                  onChange={(e) =>
                                    handleChangeSisaStok(item.id, e.target.value)
                                  }
                                />
                              </td>

                              <td>{item.jumlahDiajukan}</td>

                              <td>
                                Rp{" "}
                                {(item.jumlahDiajukan * item.estimasiNilai).toLocaleString("id-ID")}
                              </td>

                              <td>
                                {confirmId === item.id ? (
                                  <div style={{ display: "flex", gap: 8 }}>
                                    <button
                                      className="aksi-hapus"
                                      onClick={() => handleRemoveItem(item.id)}
                                    >
                                      Ya, hapus
                                    </button>

                                    <button
                                      onClick={() => setConfirmId(null)}
                                      style={{
                                        padding: "6px 12px",
                                        borderRadius: 999,
                                        border: "1px solid #ddd",
                                        cursor: "pointer",
                                        fontWeight: 600,
                                      }}
                                    >
                                      Batal
                                    </button>
                                  </div>
                                ) : (
                                  <span
                                    className="aksi-hapus"
                                    onClick={() => setConfirmId(item.id)}
                                  >
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <polyline points="3 6 5 6 21 6" />
                                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                      <path d="M10 11v6" />
                                      <path d="M14 11v6" />
                                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                    </svg>
                                    Hapus
                                  </span>
                                )}
                              </td>

                            </tr>
                          ))}

                        </tbody>
                      </table>
                    </div>

                    <div className="total-nilai">
                      Total nilai pengajuan:{" "}
                      <strong>
                        Rp {totalNilai.toLocaleString("id-ID")}
                      </strong>
                    </div>

                    {step2Error && (
                      <div className="error-text" style={{ marginTop: 8 }}>
                        {step2Error}
                      </div>
                    )}

                    <div className="actions">
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setCurrentStep(1)}
                      >
                        Kembali
                      </button>

                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleNextFromStep2}
                      >
                        Selanjutnya: Konfirmasi
                      </button>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="step-pane active confirm-pane">
                    <div className="confirm-card">
                      <h3 className="confirm-title">Konfirmasi Pengajuan</h3>
                      <p className="confirm-subtitle">
                        Mohon periksa kembali data sebelum pengajuan dikirim
                      </p>

                      {/* DATA PEMOHON */}
                      <div className="confirm-section">
                        <h4>Data Pemohon</h4>
                        <div className="confirm-grid">
                          <div><span>Tahun Akademik</span><strong>{tahunAkademik}</strong></div>
                          <div><span>Nama Pemohon</span><strong>{namaPemohon}</strong></div>
                          <div><span>Jabatan</span><strong>{jabatan}</strong></div>
                          <div><span>Unit</span><strong>{unit}</strong></div>
                        </div>
                      </div>

                      {/* ITEM */}
                      <div className="confirm-section">
                        <h4>Item yang Diajukan</h4>

                        {items.length === 0 ? (
                          <p className="empty-text">Tidak ada item.</p>
                        ) : (
                          <ul className="confirm-item-list">
                            {items.map((i) => (
                              <li key={i.id}>
                                <span className="item-name">{i.nama}</span>
                                <span className="item-meta">
                                  Diajukan <strong>{i.jumlahDiajukan}</strong> {i.satuan}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* RINGKASAN */}
                      <div className="confirm-summary">
                        <div>
                          <span>Total Jumlah</span>
                          <strong>{totalJumlahDiajukan}</strong>
                        </div>
                        <div>
                          <span>Total Nilai</span>
                          <strong>Rp {totalNilai.toLocaleString("id-ID")}</strong>
                        </div>
                      </div>

                      {/* ACTION */}
                      <div className="actions confirm-actions">
                        <button
                          type="button"
                          className="btn"
                          onClick={() => setCurrentStep(2)}
                        >
                          Kembali
                        </button>

                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => {
                            setVerifyChecked(false);
                            setShowVerifyPanel(true);
                          }}
                        >
                          Kirim Pengajuan
                        </button>
                      </div>

                      {/* ===== PANEL VERIFIKASI PENGAJUAN ===== */}
                      {showVerifyPanel && (
                        <div className="verify-overlay" onClick={() => setShowVerifyPanel(false)}>
                          <div className="verify-panel" onClick={(e) => e.stopPropagation()}>
                            {/* Header */}
                            <div className="verify-panel-header">
                              <div className="verify-icon">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M9 11l3 3L22 4" />
                                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                                </svg>
                              </div>
                              <h3>Verifikasi Pengajuan</h3>
                              <p>Pastikan semua data sudah benar sebelum mengirim pengajuan Anda</p>
                            </div>

                            {/* Ringkasan data */}
                            <div className="verify-summary-box">
                              <div className="verify-summary-row">
                                <span>Pemohon</span>
                                <strong>{namaPemohon}</strong>
                              </div>
                              <div className="verify-summary-row">
                                <span>Jabatan / Unit</span>
                                <strong>{jabatan} — {unit}</strong>
                              </div>
                              <div className="verify-summary-row">
                                <span>Tahun Akademik</span>
                                <strong>{tahunAkademik}</strong>
                              </div>
                              <div className="verify-summary-row">
                                <span>Jumlah Item</span>
                                <div className="verify-item-count">
                                  <strong>{items.length} barang</strong>
                                  <button
                                    type="button"
                                    className={`verify-info-btn ${showItemDetail ? 'active' : ''}`}
                                    onClick={() => setShowItemDetail(true)}
                                    title="Lihat detail barang"
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <circle cx="12" cy="12" r="10" />
                                      <line x1="12" y1="16" x2="12" y2="12" />
                                      <line x1="12" y1="8" x2="12.01" y2="8" />
                                    </svg>
                                  </button>
                                </div>
                              </div>

                              {/* Panel Detail Item (modal terpisah di atas verify panel) */}
                              {showItemDetail && (
                                <div className="detail-overlay" onClick={() => setShowItemDetail(false)}>
                                  <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
                                    <div className="detail-panel-header">
                                      <div>
                                        <h3>Detail Barang Pengajuan</h3>
                                        <p>{items.length} barang yang akan diajukan</p>
                                      </div>
                                      <button
                                        type="button"
                                        className="detail-close-btn"
                                        onClick={() => setShowItemDetail(false)}
                                      >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                          <line x1="18" y1="6" x2="6" y2="18" />
                                          <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                      </button>
                                    </div>

                                    <div className="detail-table-wrapper">
                                      <table className="detail-table">
                                        <thead>
                                          <tr>
                                            <th>No</th>
                                            <th>Nama Barang</th>
                                            <th>Jumlah</th>
                                            <th>Harga Satuan</th>
                                            <th>Subtotal</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {items.map((item, idx) => (
                                            <tr key={item.id}>
                                              <td className="detail-td-no">{idx + 1}</td>
                                              <td className="detail-td-nama">{item.nama}</td>
                                              <td className="detail-td-qty">{item.jumlahDiajukan} {item.satuan}</td>
                                              <td className="detail-td-harga">Rp {item.estimasiNilai.toLocaleString("id-ID")}</td>
                                              <td className="detail-td-subtotal">Rp {(item.jumlahDiajukan * item.estimasiNilai).toLocaleString("id-ID")}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                        <tfoot>
                                          <tr>
                                            <td colSpan="2" className="detail-footer-label">Total</td>
                                            <td className="detail-footer-qty">{totalJumlahDiajukan}</td>
                                            <td></td>
                                            <td className="detail-footer-total">Rp {totalNilai.toLocaleString("id-ID")}</td>
                                          </tr>
                                        </tfoot>
                                      </table>
                                    </div>

                                    <div className="detail-panel-footer">
                                      <button
                                        type="button"
                                        className="btn btn-primary detail-close-action"
                                        onClick={() => setShowItemDetail(false)}
                                      >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                          <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        Sudah Sesuai, Tutup
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                              <div className="verify-summary-row highlight">
                                <span>Total Nilai Pengajuan</span>
                                <strong>Rp {totalNilai.toLocaleString("id-ID")}</strong>
                              </div>
                            </div>

                            {/* Checkbox persetujuan */}
                            <label className="verify-checkbox-label">
                              <input
                                type="checkbox"
                                checked={verifyChecked}
                                onChange={(e) => setVerifyChecked(e.target.checked)}
                              />
                              <span className="verify-checkmark"></span>
                              <span className="verify-checkbox-text">
                                Dengan ini saya menyatakan bahwa item yang saya ajukan telah diketahui dan disetujui oleh pimpinan di unit saya.
                              </span>
                            </label>

                            {/* Tombol aksi */}
                            <div className="verify-panel-actions">
                              <button
                                type="button"
                                className="btn verify-btn-cancel"
                                onClick={() => setShowVerifyPanel(false)}
                              >
                                Kembali
                              </button>
                              <button
                                type="button"
                                className={`btn btn-primary verify-btn-submit ${!verifyChecked || loadingSubmit ? 'disabled' : ''}`}
                                disabled={!verifyChecked || loadingSubmit}
                                onClick={handleSubmit}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M22 2L11 13" />
                                  <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                                </svg>
                                {loadingSubmit ? "Mengirim..." : "Kirim Pengajuan Sekarang"}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </form>
            </>
          )}
        </section>
      </main>

      {/* MODAL PREVIEW FOTO */}
      {previewImage && (
        <div
          className="img-modal-overlay"
          onClick={() => setPreviewImage(null)}
        >
          <div className="img-modal" onClick={(e) => e.stopPropagation()}>
            <img src={previewImage} alt="Preview barang" />
          </div>
        </div>
      )}
    </div>
  );
}

export default Pengajuan;
