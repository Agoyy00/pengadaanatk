import React, { useState } from "react";
import "./Pengajuan.css";

export default function PengajuanForm() {
    const [currentStep, setCurrentStep] = useState(1);

    const showStep = (step) => {
        setCurrentStep(step);
    };

    const getStepperLabel = () => {
        if (currentStep === 1)
            return "Stepper: Data Pengajuan → Input Barang → Konfirmasi";
        if (currentStep === 2)
            return "Stepper: Data Pengajuan → Input Barang → Konfirmasi";
        return "Stepper: Data Pengajuan → Input Barang → Konfirmasi";
    };

    return (
        <div className="app-wrapper">
            <aside className="sidebar">
                <div>
                    <div className="sidebar-logo">Sistem pengajuan ATK</div>
                    <div className="sidebar-subtitle">Universitas Yarsi</div>
                </div>

                <nav className="sidebar-menu">
                    <div className="menu-item">Dashboard</div>
                    <div className="menu-item disabled">Buat Pengajuan Baru</div>
                    <div className="menu-item">Riwayat pengajuan</div>
                </nav>

                <div className="logout">Log Out</div>
            </aside>

            <main className="main">
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

                <section className="main-content">
                    <div className="card">
                        <div className="card-title">Form Pengajuan (langkah 1 sampai 3)</div>
                        <div id="stepper-label" className="card-subtitle">
                            {getStepperLabel()}
                        </div>

                        <div className="stepper">
                            <div className="step">
                                <div className={`step-circle ${currentStep === 1 ? "active" : ""}`}>1</div>
                            </div>
                            <div className="step-line"></div>
                            <div className="step">
                                <div className={`step-circle ${currentStep === 2 ? "active" : ""}`}>2</div>
                            </div>
                            <div className="step-line"></div>
                            <div className="step">
                                <div className={`step-circle ${currentStep === 3 ? "active" : ""}`}>3</div>
                            </div>
                        </div>

                        <form>
                            {currentStep === 1 && (
                                <div className="step-pane active">
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label>Tahun Akademik</label>
                                            <input type="text" className="input-text" />
                                        </div>

                                        <div className="form-group">
                                            <label>Nama Pemohon</label>
                                            <input type="text" className="input-text" />
                                        </div>

                                        <div className="form-group">
                                            <label>Jabatan</label>
                                            <select className="select-input">
                                                <option>Staf</option>
                                                <option>Dosen</option>
                                                <option>Mahasiswa</option>
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label>Unit/Bagian</label>
                                            <select className="select-input">
                                                <option>Direktorat</option>
                                                <option>DPJJ</option>
                                                <option>PDJAMA</option>
                                                <option>Pascasarjana</option>
                                                <option>Fakultas Teknologi Informasi</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="actions">
                                        <span></span>
                                        <button type="button" className="btn btn-primary"
                                            onClick={() => showStep(2)}>
                                            Selanjutnya: Input barang
                                        </button>
                                    </div>
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className="step-pane active">
                                    <div className="form-group">
                                        <label>Cari Barang</label>
                                        <div style={{ display: "flex", gap: 16, maxWidth: 720 }}>
                                            <input type="text" className="input-text" placeholder="Cari nama barang" />
                                            <button className="btn btn-outline" type="button">+ Tambah Contoh Item</button>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: 22, fontSize: 14, fontWeight: 600 }}>
                                        Item yang diajukan
                                    </div>

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
                                            <tr>
                                                <td>Kertas A4</td>
                                                <td>Rim</td>
                                                <td>10</td>
                                                <td>3</td>
                                                <td>7</td>
                                                <td>Rp 350.000</td>
                                                <td><span className="aksi-hapus">Hapus</span></td>
                                            </tr>
                                        </tbody>
                                    </table>

                                    <div className="actions">
                                        <button type="button" className="btn"
                                            onClick={() => showStep(1)}>
                                            Kembali
                                        </button>

                                        <button type="button" className="btn btn-primary"
                                            onClick={() => showStep(3)}>
                                            Selanjutnya: Konfirmasi
                                        </button>
                                    </div>
                                </div>
                            )}

                            {currentStep === 3 && (
                                <div className="step-pane active">
                                    <p>Ringkasan pengajuan akan muncul di sini.</p>

                                    <div className="actions">
                                        <button type="button" className="btn"
                                            onClick={() => showStep(2)}>
                                            Kembali
                                        </button>

                                        <button type="submit" className="btn btn-primary">
                                            Kirim Pengajuan
                                        </button>
                                    </div>
                                </div>
                            )}

                        </form>
                    </div>
                </section>
            </main>
        </div>
    );
}
