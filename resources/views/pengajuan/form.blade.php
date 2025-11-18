{{-- resources/views/pengajuan/form.blade.php --}}
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Sistem Pengajuan ATK</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <style>
        * {
            box-sizing: border-box;
            font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        }
        body {
            margin: 0;
            background: #e5e5e5;
        }
        .app-wrapper {
            min-height: 100vh;
            display: flex;
            background: #e5e5e5;
        }
        .sidebar {
            width: 260px;
            background: #23406a;
            color: #fff;
            display: flex;
            flex-direction: column;
            padding: 24px 20px;
        }
        .sidebar-logo {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 4px;
        }
        .sidebar-subtitle {
            font-size: 13px;
            opacity: 0.8;
            margin-bottom: 40px;
        }
        .sidebar-menu {
            display: flex;
            flex-direction: column;
            gap: 10px;
            flex: 1;
        }
        .menu-item {
            padding: 10px 14px;
            border-radius: 4px;
            font-size: 15px;
            cursor: pointer;
        }
        .menu-item.active {
            background: #f0f0f0;
            color: #23406a;
            font-weight: 600;
        }
        .menu-item.disabled {
            background: #b3c1d6;
            color: #fff;
            cursor: default;
        }
        .logout {
            margin-top: auto;
            padding-top: 30px;
            font-size: 18px;
            font-weight: 600;
        }
        .main {
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        .topbar {
            background: #2e6f8f;
            color: #fff;
            padding: 16px 28px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .topbar-title {
            font-size: 20px;
            font-weight: 600;
        }
        .topbar-sub {
            font-size: 13px;
            opacity: 0.9;
        }
        .topbar-right {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
        }
        .role-pill {
            background: #1c4c63;
            border-radius: 3px;
            padding: 4px 10px;
        }
        .main-content {
            padding: 24px 30px;
        }
        .card {
            background: #ffffff;
            border-radius: 2px;
            padding: 24px 32px;
            box-shadow: 0 0 2px rgba(0,0,0,0.08);
        }
        .card-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 4px;
        }
        .card-subtitle {
            font-size: 13px;
            margin-bottom: 24px;
        }
        .stepper {
            display: flex;
            align-items: center;
            gap: 24px;
            margin-bottom: 24px;
            font-size: 13px;
        }
        .step {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .step-circle {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            background: #d0d0d0;
            color: #555;
        }
        .step-circle.active {
            background: #25a34a;
            color: #fff;
        }
        .step-line {
            flex: 1;
            height: 2px;
            background: #d0d0d0;
        }
        .form-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 20px 32px;
            margin-top: 8px;
        }
        .form-group label {
            display: block;
            font-size: 13px;
            margin-bottom: 6px;
        }
        .input-text,
        .select-input {
            width: 100%;
            padding: 8px 10px;
            font-size: 14px;
            border: 1px solid #b0b0b0;
            border-radius: 2px;
            outline: none;
        }
        .input-text:focus,
        .select-input:focus {
            border-color: #2e6f8f;
            box-shadow: 0 0 0 1px rgba(46,111,143,0.1);
        }

        .actions {
            margin-top: 28px;
            display: flex;
            justify-content: space-between;
            gap: 12px;
        }
        .btn {
            border: 1px solid #777;
            padding: 8px 18px;
            font-size: 14px;
            cursor: pointer;
            border-radius: 2px;
            background: #f5f5f5;
        }
        .btn-primary {
            background: #1f9a3f;
            color: #fff;
            border-color: #1f9a3f;
            margin-left: auto;
        }
        .btn-primary:hover {
            filter: brightness(0.95);
        }

        .btn-outline {
            background: #f5f5f5;
        }

        /* pane tiap langkah */
        .step-pane { display: none; }
        .step-pane.active { display: block; }

        /* tabel langkah 2 */
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            margin-top: 16px;
        }
        th, td {
            padding: 6px 8px;
            border-bottom: 1px solid #ddd;
            text-align: left;
        }
        th {
            font-weight: 600;
        }
        .aksi-hapus {
            color: red;
            cursor: pointer;
            font-size: 12px;
        }

        @media (max-width: 900px) {
            .sidebar {
                display: none;
            }
            .form-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
<div class="app-wrapper">

    <aside class="sidebar">
        <div>
            <div class="sidebar-logo">Sistem pengajuan ATK</div>
            <div class="sidebar-subtitle">Universitas Yarsi</div>
        </div>

        <nav class="sidebar-menu">
            <div class="menu-item">Dashboard</div>
            <div class="menu-item disabled">Buat Pengajuan Baru</div>
            <div class="menu-item">Riwayat pengajuan</div>
        </nav>

        <div class="logout">Log Out</div>
    </aside>

    <main class="main">
        <header class="topbar">
            <div>
                <div class="topbar-title">Buat Pengajuan Baru</div>
                <div class="topbar-sub">Selamat datang: Nama kamu</div>
            </div>
            <div class="topbar-right">
                <span>Role: User</span>
                <span class="role-pill">User</span>
            </div>
        </header>

        <section class="main-content">
            <div class="card">
                <div class="card-title">Form Pengajuan (langkah 1 sampai 3)</div>
                <div id="stepper-label" class="card-subtitle">
                    Stepper: <strong>Data Pengajuan</strong> → Input Barang → Konfirmasi
                </div>

                {{-- STEPPER --}}
                <div class="stepper">
                    <div class="step">
                        <div class="step-circle active" data-step="1">1</div>
                    </div>
                    <div class="step-line"></div>
                    <div class="step">
                        <div class="step-circle" data-step="2">2</div>
                    </div>
                    <div class="step-line"></div>
                    <div class="step">
                        <div class="step-circle" data-step="3">3</div>
                    </div>
                </div>

                {{-- SATU FORM UNTUK SEMUA LANGKAH --}}
                <form id="form-pengajuan">
                    {{-- LANGKAH 1: DATA PENGAJUAN --}}
                    <div class="step-pane active" id="step-1">
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="tahun">Tahun Akademik</label>
                                <input id="tahun" name="tahun" type="text" class="input-text" placeholder="Tahun Akademik">
                            </div>

                            <div class="form-group">
                                <label for="nama">Nama Pemohon</label>
                                <input id="nama" name="nama" type="text" class="input-text" placeholder="Nama Kamu">
                            </div>

                            <div class="form-group">
                                <label for="jabatan">Jabatan</label>
                                <select id="jabatan" name="jabatan" class="select-input">
                                    <option>Staf</option>
                                    <option>Dosen</option>
                                    <option>Mahasiswa</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label for="unit">Unit/Bagian</label>
                                <select id="unit" name="unit" class="select-input">
                                    <option>Direktorat</option>
                                    <option>DPJJ</option>
                                    <option>PDJAMA</option>
                                    <option>Pascasarjana</option>
                                    <option>Fakultas Kedokteran</option>
                                    <option>Fakultas Kedokteran Gigi</option>
                                    <option>Fakultas Teknologi Informasi</option>
                                    <option>Fakultas Ekonomi dan Bisnis</option>
                                    <option>Fakultas Hukum</option>
                                    <option>Fakultas Psikologi</option>
                                </select>
                            </div>
                        </div>

                        <div class="actions">
                            <span></span>
                            <button type="button" class="btn btn-primary" id="btn-step-1-next">
                                Selanjutnya: Input barang
                            </button>
                        </div>
                    </div>

                    {{-- LANGKAH 2: INPUT BARANG --}}
                    <div class="step-pane" id="step-2">
                        <div class="form-group">
                            <label for="cari-barang">Cari Barang</label>
                            <div style="display:flex; gap:16px; max-width:720px;">
                                <input id="cari-barang" type="text" class="input-text" placeholder="Cari nama barang">
                                <button type="button" class="btn btn-outline">+ Tambah Contoh Item</button>
                            </div>
                        </div>

                        <div style="margin-top:22px; font-size:14px; font-weight:600;">
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
                            {{-- Contoh baris, nanti bisa diganti dinamis --}}
                            <tr>
                                <td>Kertas A4</td>
                                <td>Rim</td>
                                <td>10</td>
                                <td>3</td>
                                <td>7</td>
                                <td>Rp 350.000</td>
                                <td><span class="aksi-hapus">Hapus</span></td>
                            </tr>
                            </tbody>
                        </table>

                        <div class="actions">
                            <button type="button" class="btn" id="btn-step-2-prev">Kembali</button>
                            <button type="button" class="btn btn-primary" id="btn-step-2-next">
                                Selanjutnya: Konfirmasi
                            </button>
                        </div>
                    </div>

                    {{-- LANGKAH 3: KONFIRMASI (sementara placeholder) --}}
                    <div class="step-pane" id="step-3">
                        <p>Di sini nanti kamu bisa tampilkan ringkasan pengajuan sebelum dikirim.</p>

                        <div class="actions">
                            <button type="button" class="btn" id="btn-step-3-prev">Kembali</button>
                            <button type="submit" class="btn btn-primary">
                                Kirim Pengajuan
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </section>
    </main>

</div>

<script>
    let currentStep = 1;

    const stepperLabel = document.getElementById('stepper-label');
    const stepPanes = {
        1: document.getElementById('step-1'),
        2: document.getElementById('step-2'),
        3: document.getElementById('step-3'),
    };
    const stepCircles = document.querySelectorAll('.step-circle');

    function updateStepperLabel() {
        if (currentStep === 1) {
            stepperLabel.innerHTML = 'Stepper: <strong>Data Pengajuan</strong> → Input Barang → Konfirmasi';
        } else if (currentStep === 2) {
            stepperLabel.innerHTML = 'Stepper: Data Pengajuan → <strong>Input Barang</strong> → Konfirmasi';
        } else {
            stepperLabel.innerHTML = 'Stepper: Data Pengajuan → Input Barang → <strong>Konfirmasi</strong>';
        }
    }

    function showStep(step) {
        currentStep = step;

        Object.keys(stepPanes).forEach(function (key) {
            stepPanes[key].classList.toggle('active', Number(key) === step);
        });

        stepCircles.forEach(function (el) {
            const stepNum = Number(el.getAttribute('data-step'));
            el.classList.toggle('active', stepNum === step);
        });

        updateStepperLabel();
    }

    document.getElementById('btn-step-1-next').addEventListener('click', function () {
        showStep(2);
    });

    document.getElementById('btn-step-2-prev').addEventListener('click', function () {
        showStep(1);
    });

    document.getElementById('btn-step-2-next').addEventListener('click', function () {
        showStep(3);
    });

    document.getElementById('btn-step-3-prev').addEventListener('click', function () {
        showStep(2);
    });

    updateStepperLabel();
</script>
</body>
</html>
