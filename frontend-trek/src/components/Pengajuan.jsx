import React, { useState, useEffect } from "react";
import "./Pengajuan.css";
import { useNavigate } from "react-router-dom";

export default function PengajuanForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const navigate = useNavigate();


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

  const API_BASE = "http://127.0.0.1:8000/api"; // backend Laravel

  const showStep = (step) => setCurrentStep(step);

  const getStepperLabel = () => {
    if (currentStep === 1) {
      return "Stepper: Data Pengajuan → Input Barang → Konfirmasi";
    }
    if (currentStep === 2) {
      return "Stepper: Data Pengajuan → Input Barang → Konfirmasi";
    }
    return "Stepper: Data Pengajuan → Input Barang → Konfirmasi";
  };

  // 🔍 AUTO-SUGGEST barang
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

  const handleAddItem = (barang) => {
    const exists = items.some((i) => i.id === barang.id);
    if (exists) return;

    setItems([
      ...items,
      {
        id: barang.id,
        nama: barang.nama,
        satuan: barang.satuan,
        stok: barang.stok,
        kebutuhanTotal: 1,
        jumlahDiajukan: 1,
        estimasiNilai: barang.harga_satuan,
      },
    ]);

    setQuery("");
    setSearchResults([]);
    setStep2Error("");
  };

  const handleChangeItem = (id, field, value) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: Number(value) || 0 } : item
      )
    );
  };

  const handleRemoveItem = (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // 🔢 blok huruf di input angka (kebutuhanTotal & jumlahDiajukan)
  const handleNumericKeyDown = (e) => {
    const allowedKeys = [
      "Backspace",
      "Tab",
      "ArrowLeft",
      "ArrowRight",
      "Delete",
    ];
    if (allowedKeys.includes(e.key)) return;

    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  // ✅ Validasi STEP 1
  const handleNextFromStep1 = () => {
    const errors = {};

    if (!tahunAkademik.trim()) {
      errors.tahunAkademik = "Tahun akademik wajib diisi.";
    } else if (!/^[0-9]+$/.test(tahunAkademik.trim())) {
      errors.tahunAkademik = "Tahun akademik hanya boleh angka.";
    }

    if (!namaPemohon.trim()) {
      errors.namaPemohon = "Nama pemohon wajib diisi.";
    } else if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\s'.-]+$/.test(namaPemohon.trim())) {
      errors.namaPemohon = "Nama pemohon hanya boleh huruf (tanpa angka).";
    }

    if (!jabatan) {
      errors.jabatan = "Jabatan wajib dipilih.";
    }

    if (!unit) {
      errors.unit = "Unit/Bagian wajib dipilih.";
    }

    if (Object.keys(errors).length > 0) {
      setErrorsStep1(errors);
      return;
    }

    setErrorsStep1({});
    setCurrentStep(2);
  };

  // ✅ Validasi STEP 2 sebelum ke konfirmasi
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
        "Jumlah diajukan untuk setiap barang harus lebih dari 0."
      );
      return;
    }

    setStep2Error("");
    setCurrentStep(3);
  };

  function handleSubmit(e) {
    e.preventDefault();

    const payload = {
      tahun_akademik: tahunAkademik,
      nama_pemohon: namaPemohon,
      jabatan,
      unit,
      items,
    };

    console.log("Data siap dikirim ke backend:", payload);
    alert("(Dummy) Pengajuan dikirim! Lihat console.log untuk datanya.");

    // TODO: ganti dengan fetch POST ke Laravel
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
          <div className="menu-item" onClick={() => navigate("/dashboarduser")} style={{ cursor: "pointer" }}>Dashboard</div>
          <div className="menu-item disabled">Buat Pengajuan Baru</div>
          <div className="menu-item" onClick={() => navigate("/riwayat")} >Riwayat Pengajuan</div>
        </nav>

        <div className="logout" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>Log Out</div>
      </aside>

      {/* KANAN */}
      <main className="main">
        {/* TOPBAR */}
        <header className="topbar">
          <div>
            <div className="topbar-title">Buat Pengajuan Baru</div>
            <div className="topbar-sub">Selamat datang: Nama Kamu</div>
          </div>
          <div className="topbar-right">
            <span>Role: User</span>
            <span className="role-pill">User</span>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <section className="main-content">
          <div className="card">
            <div className="card-title">Form Pengajuan (langkah 1 sampai 3)</div>
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

          {/* FORM ALL STEP */}
          <form onSubmit={handleSubmit}>
            {/* STEP 1 */}
            {currentStep === 1 && (
              <div className="step-pane active">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Tahun Akademik</label>
                    <input
                      type="text"
                      className="input-text"
                      value={tahunAkademik}
                      onChange={(e) => setTahunAkademik(e.target.value)}
                    />
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
                {/* CARI BARANG */}
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
                      <div className="search-loading">
                        mencari...
                      </div>
                    )}

                    {/* DROPDOWN REKOMENDASI */}
                    {searchResults.length > 0 && (
                      <ul className="search-dropdown">
                        {searchResults.map((b) => (
                          <li
                            key={b.id}
                            className="search-item"
                            onClick={() => handleAddItem(b)}
                          >
                            <div>{b.nama}</div>
                            <div className="search-item-meta">
                              {b.kode} · Stok: {b.stok} · {b.satuan}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* TABEL ITEM */}
                <div className="table-title">
                  Item yang diajukan
                </div>

                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Barang</th>
                        <th>Satuan</th>
                        <th>Kebutuhan Total</th>
                        <th>Sisa stok</th>
                        <th>Jumlah Diajukan</th>
                        <th>Estimasi Nilai</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 && (
                        <tr>
                          <td colSpan="7">Belum ada item.</td>
                        </tr>
                      )}
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.nama}</td>
                          <td>{item.satuan}</td>
                          <td>
                            <input
                              type="number"
                              inputMode="numeric"
                              onKeyDown={handleNumericKeyDown}
                              className="input-number"
                              value={item.kebutuhanTotal}
                              onChange={(e) =>
                                handleChangeItem(
                                  item.id,
                                  "kebutuhanTotal",
                                  e.target.value
                                )
                              }
                            />
                          </td>
                          <td>{item.stok}</td>
                          <td>
                            <input
                              type="number"
                              inputMode="numeric"
                              onKeyDown={handleNumericKeyDown}
                              className="input-number"
                              value={item.jumlahDiajukan}
                              onChange={(e) =>
                                handleChangeItem(
                                  item.id,
                                  "jumlahDiajukan",
                                  e.target.value
                                )
                              }
                            />
                          </td>
                          <td>
                            Rp{" "}
                            {item.estimasiNilai.toLocaleString("id-ID")}
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

                {step2Error && (
                  <div className="error-text" style={{ marginTop: 8 }}>
                    {step2Error}
                  </div>
                )}

                <div className="actions">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => showStep(1)}
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
                        {i.nama} — {i.jumlahDiajukan} {i.satuan}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="actions">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => showStep(2)}
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
        </section>
      </main>
    </div>
  );
}
