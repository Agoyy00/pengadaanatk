import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Pengajuan.css";

function Pengajuan() {
  const [currentStep, setCurrentStep] = useState(1);

  // STEP 1 – data pengajuan
  const [tahunAkademik, setTahunAkademik] = useState("");
  const [namaPemohon, setNamaPemohon] = useState("");
  const [jabatan, setJabatan] = useState("Staf");
  const [unit, setUnit] = useState("Direktorat");

  // Error step 1
  const [errorsStep1, setErrorsStep1] = useState({});

  // STEP 2 – pencarian & item
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [items, setItems] = useState([]);
  const [step2Error, setStep2Error] = useState("");

  // preview foto besar
  const [previewImage, setPreviewImage] = useState(null);

  // STATUS PERIODE
  const [periodeLoading, setPeriodeLoading] = useState(true);
  const [periodeOpen, setPeriodeOpen] = useState(null); // null = belum tahu
  const [periodeMessage, setPeriodeMessage] = useState("");

  const API_BASE = "http://127.0.0.1:8000/api";
  const BACKEND_BASE = "http://127.0.0.1:8000";

  const navigate = useNavigate();

  // ambil user login dari localStorage
  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const userId = currentUser?.id;

  const getStepperLabel = () =>
    "Stepper: Data Pengajuan → Input Barang → Konfirmasi";

  // ====== CEK PERIODE PENGAJUAN ======
  useEffect(() => {
    async function fetchPeriode() {
      try {
        setPeriodeLoading(true);
        const res = await fetch(`${API_BASE}/periode/active`);

        if (!res.ok) {
          // kalau API error → jangan kunci form
          setPeriodeOpen(true);
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
          `${API_BASE}/barang?q=${encodeURIComponent(query)}`
        );
        const data = await res.json();
        setSearchResults(data);
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

  // hanya boleh angka di input number
  const handleNumericKeyDown = (e) => {
    const allowedKeys = ["Backspace", "Tab", "ArrowLeft", "ArrowRight", "Delete"];
    if (allowedKeys.includes(e.key)) return;
    if (!/^[0-9]$/.test(e.key)) e.preventDefault();
  };

  // kebutuhan total berubah → jumlah diajukan = kebutuhan - sisa
  const handleChangeKebutuhan = (id, value) => {
    const num = Number(value) || 0;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const sisa = item.sisaStok || 0;
        const jumlahDiajukan = Math.max(num - sisa, 0);
        return { ...item, kebutuhanTotal: num, jumlahDiajukan };
      })
    );
  };

  // sisa stok berubah → jumlah diajukan = kebutuhan - sisa
  const handleChangeSisaStok = (id, value) => {
    const num = Number(value) || 0;
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
    e.preventDefault();

    if (!userId) {
      alert("User belum login. Silakan login terlebih dahulu.");
      return;
    }

    const payload = {
      tahun_akademik: tahunAkademik,
      nama_pemohon: namaPemohon,
      jabatan,
      unit,
      user_id: userId,
      items: items.map((item) => ({
        id: item.id,
        kebutuhanTotal: Number(item.kebutuhanTotal),
        sisaStok: Number(item.sisaStok),
        jumlahDiajukan: Number(item.jumlahDiajukan),
        estimasiNilai: Number(item.estimasiNilai),
      })),
      total_nilai: totalNilai,
      total_jumlah_diajukan: totalJumlahDiajukan,
    };

    try {
      const res = await fetch(`${API_BASE}/pengajuan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert("Gagal mengirim pengajuan");
        console.error("Error pengajuan:", data);
        return;
      }

      alert("Pengajuan berhasil dikirim!");
      window.location.href = "/riwayat";
    } catch (err) {
      console.error("Error jaringan:", err);
      alert("Terjadi kesalahan jaringan.");
    }
  }

  return (
    <div className="layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-logo">Sistem Pengajuan ATK</div>
          <div className="sidebar-subtitle">Universitas Yarsi</div>
        </div>

        <nav className="sidebar-menu">
          <Link to="/dashboarduser" className="menu-item">
            Dashboard
          </Link>
          <div className="menu-item disabled">Buat Pengajuan Baru</div>
          <Link to="/riwayat" className="menu-item">
            Riwayat Pengajuan
          </Link>
        </nav>

        <div className="logout">Log Out</div>
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
            <span>Role: User</span>
            <span className="role-pill">User</span>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <section className="main-content">
          {/* 1. MASIH CEK PERIODE */}
          {periodeLoading || periodeOpen === null ? (
            <div className="card">
              <div className="card-subtitle">
                Memeriksa status periode pengajuan...
              </div>
            </div>
          ) : !periodeOpen ? (
            // 2. PERIODE DITUTUP / BELUM DIBUKA → HANYA TAMPIL PESAN MERAH
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
          ) : (
            // 3. PERIODE TERBUKA → TAMPILKAN FORM PENGAJUAN
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
                      className={`step-circle ${
                        currentStep === 1 ? "active" : ""
                      }`}
                    >
                      1
                    </div>
                  </div>
                  <div className="step-line"></div>
                  <div className="step">
                    <div
                      className={`step-circle ${
                        currentStep === 2 ? "active" : ""
                      }`}
                    >
                      2
                    </div>
                  </div>
                  <div className="step-line"></div>
                  <div className="step">
                    <div
                      className={`step-circle ${
                        currentStep === 3 ? "active" : ""
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
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Tahun Akademik</label>
                        <select
                          className="input-text"
                          value={tahunAkademik}
                          onChange={(e) => setTahunAkademik(e.target.value)}
                        >
                          <option value="">-- Pilih Tahun Akademik --</option>
                          <option value="2023/2024">2023/2024</option>
                          <option value="2024/2025">2024/2025</option>
                          <option value="2025/2026">2025/2026</option>
                        </select>
                        {errorsStep1.tahunAkademik && (
                          <div className="error-text">
                            {errorsStep1.tahunAkademik}
                          </div>
                        )}
                      </div>

                      <div className="form-group">
                        <label>Nama Pemohon</label>
                        <input
                          type="text"
                          className="input-text"
                          value={namaPemohon}
                          onChange={(e) => setNamaPemohon(e.target.value)}
                        />
                        {errorsStep1.namaPemohon && (
                          <div className="error-text">
                            {errorsStep1.namaPemohon}
                          </div>
                        )}
                      </div>

                      <div className="form-group">
                        <label>Jabatan</label>
                        <select
                          className="select-input"
                          value={jabatan}
                          onChange={(e) => setJabatan(e.target.value)}
                        >
                          <option>Staf</option>
                          <option>Dosen</option>
                          <option>Mahasiswa</option>
                        </select>
                        {errorsStep1.jabatan && (
                          <div className="error-text">
                            {errorsStep1.jabatan}
                          </div>
                        )}
                      </div>

                      <div className="form-group">
                        <label>Unit/Bagian</label>
                        <select
                          className="select-input"
                          value={unit}
                          onChange={(e) => setUnit(e.target.value)}
                        >
                          <option>Direktorat</option>
                          <option>DPJJ</option>
                          <option>PDJAMA</option>
                          <option>Pascasarjana</option>
                          <option>Fakultas Kedokteran</option>
                          <option>Fakultas Kedokteran Gigi</option>
                          <option>Fakultas Teknologi Informasi</option>
                          <option>Fakultas Hukum</option>
                          <option>Fakultas Psikologi</option>
                          <option>Fakultas Ekonomi</option>
                        </select>
                        {errorsStep1.unit && (
                          <div className="error-text">
                            {errorsStep1.unit}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="actions">
                      <span></span>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleNextFromStep1}
                      >
                        Selanjutnya: Input barang
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2 */}
                {currentStep === 2 && (
                  <div className="step-pane active">
                    <div className="form-group">
                      <label>Cari Barang</label>
                      <div className="search-wrapper">
                        <input
                          type="text"
                          className="input-text"
                          placeholder="Ketik nama barang..."
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                        {loadingSearch && (
                          <div className="search-loading">mencari...</div>
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
                            <th>Aksi</th>
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
                              <td>
                                <div className="barang-cell">
                                  {item.foto && (
                                    <img
                                      src={`${BACKEND_BASE}${item.foto}`}
                                      alt={item.nama}
                                      className="barang-thumb barang-thumb-clickable"
                                      onClick={() =>
                                        setPreviewImage(
                                          `${BACKEND_BASE}${item.foto}`
                                        )
                                      }
                                    />
                                  )}
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
                                  inputMode="numeric"
                                  onKeyDown={handleNumericKeyDown}
                                  className="input-number"
                                  value={item.kebutuhanTotal}
                                  onChange={(e) =>
                                    handleChangeKebutuhan(
                                      item.id,
                                      e.target.value
                                    )
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  onKeyDown={handleNumericKeyDown}
                                  className="input-number"
                                  value={item.sisaStok}
                                  onChange={(e) =>
                                    handleChangeSisaStok(
                                      item.id,
                                      e.target.value
                                    )
                                  }
                                />
                              </td>
                              <td>{item.jumlahDiajukan}</td>
                              <td>
                                Rp{" "}
                                {(
                                  item.jumlahDiajukan * item.estimasiNilai
                                ).toLocaleString("id-ID")}
                              </td>
                              <td>
                                <span
                                  className="aksi-hapus"
                                  onClick={() => handleRemoveItem(item.id)}
                                >
                                  Hapus
                                </span>
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

                {/* STEP 3 */}
                {currentStep === 3 && (
                  <div className="step-pane active">
                    <h4>Konfirmasi Pengajuan</h4>

                    <p>
                      <strong>Tahun Akademik:</strong> {tahunAkademik} <br />
                      <strong>Nama Pemohon:</strong> {namaPemohon} <br />
                      <strong>Jabatan:</strong> {jabatan} <br />
                      <strong>Unit:</strong> {unit}
                    </p>

                    <h5>Item yang diajukan:</h5>
                    {items.length === 0 ? (
                      <p>Tidak ada item.</p>
                    ) : (
                      <ul>
                        {items.map((i) => (
                          <li key={i.id}>
                            {i.nama} — kebutuhan {i.kebutuhanTotal}, sisa stok{" "}
                            {i.sisaStok},{" "}
                            <strong>diajukan {i.jumlahDiajukan}</strong>{" "}
                            {i.satuan}
                          </li>
                        ))}
                      </ul>
                    )}

                    <h5>Ringkasan jumlah & nilai:</h5>
                    <p>
                      Total jumlah diajukan:{" "}
                      <strong>{totalJumlahDiajukan}</strong>
                      <br />
                      Total nilai pengajuan:{" "}
                      <strong>
                        Rp {totalNilai.toLocaleString("id-ID")}
                      </strong>
                    </p>

                    <div className="actions">
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setCurrentStep(2)}
                      >
                        Kembali
                      </button>

                      <button type="submit" className="btn btn-primary">
                        Kirim Pengajuan
                      </button>
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
