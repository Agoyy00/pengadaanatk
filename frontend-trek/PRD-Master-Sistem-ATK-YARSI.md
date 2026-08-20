# PRD MASTER — Sistem Pengajuan ATK (YARSI ATK System)
**Versi:** 3.0 (Consolidated — gabungan seluruh task & revisi)
**Status:** Ready for Development / Ready for AI Agent Execution
**Terakhir diperbarui:** 20 Agustus 2026

> Dokumen ini menggabungkan **seluruh task** yang telah dibahas: PRD inti pengajuan ATK, revisi struktur kolom Excel, perbaikan UX input angka, modul pengambilan barang, manajemen pengajuan, penggabungan halaman Pengumuman ke Support, dan perbaikan layout modal Verifikasi Import CSV Stock Opname. Disusun agar bisa langsung dieksekusi oleh AI coding agent (Antigravity) tanpa perlu merujuk ke dokumen terpisah.

---

## 0. Daftar Modul dalam Dokumen Ini

| # | Modul | Ringkasan |
|---|---|---|
| 1 | Excel Template & Import Dinamis | Template Master vs Template Dinamis (berbasis stock opname), struktur kolom baru, proteksi server-side |
| 2 | UX Input Angka | Field angka bisa dikosongkan via backspace, placeholder "0" pudar |
| 3 | Form Pengambilan Barang | Serah-terima fisik barang setelah pengajuan disetujui |
| 4 | Akses Unduh Berkas Manual | Download kembali dokumen pendukung yang diunggah user |
| 5 | Manajemen Pengajuan | Hapus item, batal, simpan revisi |
| 6 | Penggabungan Support & Pengumuman | Halaman Pengumuman digabung ke halaman Support via Tab Navigation |
| 7 | Fix Modal Verifikasi Import CSV Stock Opname | Tombol Batal/Kirim Laporan dibuat sticky/fixed di bawah modal |

---

## 1. Latar Belakang & Tujuan

Sistem pengajuan ATK perlu disempurnakan pada beberapa area: pemisahan template Excel master vs dinamis, proteksi data stok agar tidak bisa dimanipulasi dari sisi client/Excel, perbaikan UX input angka, modul serah-terima fisik barang, manajemen draft pengajuan, penyederhanaan navigasi (Support + Pengumuman jadi satu halaman), dan perbaikan layout modal stock opname agar tombol aksi selalu terlihat.

**Tujuan:**
- Data stok yang dipakai untuk kalkulasi pengajuan selalu berasal dari sumber resmi (database), bukan dari input Excel yang bisa dimanipulasi.
- Menghilangkan friksi UX pada input angka dan pada modal verifikasi stock opname.
- Menyediakan jejak audit penuh untuk stock opname, upload dokumen, dan proses serah-terima barang.
- Menyederhanakan navigasi aplikasi agar tidak menambah halaman baru yang tidak perlu.

**Di luar cakupan:** approval workflow multi-level bertingkat, notifikasi email/WA eksternal, integrasi sistem akuntansi/ERP eksternal, modul stock opname itu sendiri (diasumsikan sudah berjalan sebagai sumber data).

---

## 2. Aktor & Peran

| Peran | Deskripsi | Akses |
|---|---|---|
| **Pemohon (User)** | Membuat & mengelola pengajuan ATK miliknya | Download template master & dinamis, upload/import Excel, edit draft, hapus item, batal, download berkas sendiri, lihat pengumuman (read-only) |
| **Petugas Gudang** | Memproses serah-terima fisik barang | Isi Form Pengambilan Barang, lihat pengajuan berstatus `APPROVED` |
| **Admin/Approver** | Memverifikasi, menyetujui/menolak pengajuan | Lihat & download semua data, approve/reject, lihat log override stok, kelola tiket support |
| **Superadmin** | Mengelola master data, konfigurasi sistem & pengumuman | Semua akses Admin + kelola Template Master, kelola periode stock opname, buat/edit/hapus Pengumuman |

---

## 3. Modul 1 — Excel Template & Import Dinamis

### 3.1 Pemisahan Peruntukan Download Template

- **Menu Template Dokumen:** Satu-satunya tempat untuk mengunduh **Template Master Excel/CSV** umum (seluruh katalog barang standar). Dikelola hanya oleh Superadmin.
- **Halaman Buat Pengajuan Baru:** Tombol **"Download Template"** bersifat **dinamis** — hanya memuat barang yang sudah di-*stock opname* oleh user pada periode berjalan.
  - Filter data:
    ```sql
    SELECT * FROM stock_opname_items
    WHERE user_id = CURRENT_USER AND period_id = CURRENT_PERIOD
    ```
  - Contoh: jika user meng-opname 10 barang, maka Excel yang diunduh hanya berisi 10 barang tersebut.
  - Jika user belum melakukan stock opname pada periode berjalan, tombol **nonaktif** dengan pesan: *"Anda belum melakukan stock opname pada periode ini. Silakan lakukan stock opname terlebih dahulu."*

### 3.2 Struktur Kolom Excel (REVISI TERBARU — menggantikan struktur versi sebelumnya)

**Perubahan yang diminta:**
- Kolom `Kode Barang` **dihapus dari tampilan Excel** (lihat catatan risiko di bawah).
- Kolom `Keterangan` **dihapus**.
- Urutan kolom final:

| Urutan | Kolom | Sumber | Sifat |
|---|---|---|---|
| A | `Nama Barang` | Master barang | Read-only |
| B | `Satuan` | Master barang | Read-only |
| C | `Kebutuhan Total` | Diisi user | **Editable — input utama** |
| D | `Sisa Stok Saat Ini` | Hasil stock opname periode berjalan | Read-only reference (ditampilkan sebagai acuan, tapi **dikunci secara logic** — lihat 3.3) |
| E | `Jumlah Diajukan` | Hasil kalkulasi sistem | Read-only / formula |

> **Catatan risiko (perlu perhatian dev):** Menghapus `Kode Barang` dari tampilan Excel berarti sistem mengidentifikasi baris berdasarkan **nama barang** saat proses import. Jika ada dua barang berbeda dengan nama yang sama atau mirip (misal "Pulpen Biru" dari dua kategori berbeda), proses matching bisa ambigu. **Rekomendasi teknis:** `Kode Barang` tetap disimpan sebagai kolom **tersembunyi** (hidden column, bukan dihapus dari struktur file) atau sebagai metadata di luar tabel visible, supaya sistem tetap punya identifier unik yang presisi saat parsing, sementara user tidak melihatnya secara visual. Jika requirement-nya benar-benar "kode barang tidak boleh ada sama sekali di file", maka wajib dipastikan `Nama Barang` unik per user per periode stock opname sebelum fitur ini di-deploy.

### 3.3 Logic Import & Overriding Data (Proteksi Server-Side)

Saat file diunggah kembali:

1. Sistem membaca kolom `Nama Barang` (sebagai identifier/matching key) dan `Kebutuhan Total` dari file.
2. Sistem mengambil ulang `Sisa Stok Saat Ini` langsung dari database (data resmi hasil stock opname), **mengabaikan sepenuhnya** nilai apa pun yang ditulis/diubah user di kolom `Sisa Stok Saat Ini` pada file — meskipun user mengubahnya jadi `0` atau angka lain, nilai itu tidak dipakai.
3. **Rumus kalkulasi (dihitung ulang di server):**
   ```
   Jumlah Diajukan = MAX(0, Kebutuhan Total (dari file) − Sisa Stok Saat Ini (dari database))
   ```
4. Jika ada baris dengan `Nama Barang` yang tidak ditemukan di data stock opname user pada periode tersebut, baris tersebut ditolak dan dilaporkan sebagai error ke user — tidak diproses diam-diam.
5. Jika `Kebutuhan Total` kosong/non-numerik, baris di-skip dan dicatat sebagai warning.

**Acceptance Criteria:**
- [ ] Perubahan manual pada kolom `Sisa Stok Saat Ini` di Excel tidak berpengaruh sama sekali pada hasil kalkulasi backend — nilai selalu diambil dari database.
- [ ] Template dinamis hanya memuat item hasil stock opname user aktif pada periode berjalan.
- [ ] Urutan & jumlah kolom Excel sesuai tabel di 3.2 (5 kolom: Nama Barang, Satuan, Kebutuhan Total, Sisa Stok Saat Ini, Jumlah Diajukan) — tidak ada kolom Kode Barang atau Keterangan yang tampil ke user.
- [ ] Hasil import menampilkan ringkasan: jumlah baris berhasil, jumlah baris error/warning beserta alasan.
- [ ] Log audit mencatat setiap kali sistem mengabaikan nilai override dari file (`override_attempt`).

**API (contoh):**
```
GET  /api/templates/master/download
GET  /api/submissions/new/template/download     (dinamis, by CURRENT_USER + CURRENT_PERIOD)
POST /api/submissions/new/import                 (upload file, return preview + errors)
POST /api/submissions/new/import/confirm         (finalisasi jadi draft submission)
```

---

## 4. Modul 2 — Standardisasi UX Field Input Angka

**Masalah:** Input `type="number"` yang di-binding langsung ke tipe numerik memaksa nilai kembali ke `0` begitu user menekan backspace hingga kolom kosong. User harus block/select teks dengan mouse untuk mengganti angka — membingungkan karena saat nilai sudah `0`, backspace terlihat "tidak melakukan apa-apa".

**Solusi — ubah state binding dari numeric-strict menjadi string/nullable:**

| Event | Logic State | Tampilan UI |
|---|---|---|
| Backspace hingga habis | `value = ""` (string kosong) | Kolom kosong + placeholder `"0"` warna abu-abu pudar — informasi halus bahwa kolom perlu diisi, tanpa mengganggu proses mengetik |
| User mengetik angka | `value` di-append sebagai string | Angka tampil jelas, placeholder hilang |
| `onBlur` / sebelum submit | Jika `value === ""` → fallback ke `0` | Field menampilkan `0` setelah blur, mencegah `NaN` di kalkulasi |

**Acceptance Criteria:**
- [ ] User bisa mengosongkan field angka dengan backspace saja, tanpa perlu block/select teks pakai mouse.
- [ ] Tidak ada kondisi field menampilkan `NaN` di UI maupun payload ke backend.
- [ ] Placeholder `"0"` hanya tampil saat field benar-benar kosong.
- [ ] Backend tetap menormalkan nilai kosong menjadi `0` sebagai safety net kedua.
- [ ] Berlaku konsisten di semua field angka editable pada tabel pengajuan (terutama `Kebutuhan Total`).

**Checklist Frontend:**
- [ ] Update event handler `onChange`, `onKeyDown`, dan `onBlur` pada input `Kebutuhan Total`.

---

## 5. Modul 3 — Form Pengambilan Barang & Modul 4 — Akses Unduh Berkas

### 5.1 Form Pengambilan Barang (Item Handover)

**Trigger:** Aktif hanya ketika status pengajuan = `APPROVED` (atau `PARTIALLY_TAKEN` untuk pengambilan sisa).

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| Tanggal & Waktu Pengambilan | datetime, auto-filled (editable) | Ya | Default: waktu submit form |
| Nama Pemohon / Penerima | text / dropdown pegawai | Ya | Bisa dikuasakan ke orang lain |
| Daftar Barang & Jumlah Diserahterimakan | tabel per item | Ya | Qty diambil ≤ sisa qty disetujui yang belum diambil |
| Status Pengambilan | enum `PARTIAL` / `COMPLETE` | Ya | Auto-dihitung dari total qty diambil vs disetujui |
| Bukti Serah Terima / Tanda Tangan Digital | canvas signature / upload foto | Opsional | Disimpan sebagai file di storage |

**Logika Bisnis:**
- Setiap penyimpanan form membuat **record histori baru** (append-only) — mendukung pengambilan bertahap.
- Stok gudang berkurang **saat form ini disimpan**, sebesar qty yang benar-benar diambil.
- Status pengajuan otomatis menjadi `COMPLETED` ketika seluruh item sudah diambil penuh.

**API:**
```
POST /api/submissions/{submission_id}/handover
GET  /api/submissions/{submission_id}/handover-history
```

### 5.2 Akses Unduh Berkas Manual

- Tombol **"Download Data Upload"** per-berkas di halaman detail pengajuan.
- Disimpan di object storage, diakses via **signed URL** bermasa berlaku singkat.
- User hanya bisa download berkas miliknya sendiri; Admin/Superadmin bisa download semua.

**API:**
```
GET /api/submissions/{submission_id}/attachments
GET /api/submissions/{submission_id}/attachments/{attachment_id}/download
```

---

## 6. Modul 5 — Manajemen Pengajuan (Hapus Item & Batal)

**Hapus Item (per baris):**
- Tombol "Hapus" di kolom Aksi, hanya aktif saat status `DRAFT`/`REVISION`.
- Konfirmasi dialog wajib sebelum item benar-benar dihapus.
- Minimal harus tersisa 1 item dalam pengajuan.

**Batal:**
- Tombol "Batal" membatalkan seluruh perubahan yang belum disimpan (discard, form kembali ke kondisi tersimpan terakhir).
- Aksi terpisah "Batalkan Pengajuan" (permanen, status `CANCELLED`) disediakan dengan konfirmasi eksplisit agar tidak tertukar dengan "Batal" biasa.

**Simpan Revisi:**
- Mem-persist seluruh perubahan dalam satu transaksi + membuat entri riwayat revisi.

**API:**
```
DELETE /api/submissions/{submission_id}/items/{item_id}
PUT    /api/submissions/{submission_id}
PATCH  /api/submissions/{submission_id}/cancel
```

---

## 7. Modul 6 — Penggabungan Halaman Support & Pengumuman

**Tujuan:** Menghindari penambahan halaman baru di sidebar. Fitur **Pengumuman** (dibuat Admin/Superadmin, dilihat read-only oleh user) digabung ke dalam halaman **Support** yang sudah ada, menggunakan **Tab Navigation**.

### 7.1 Struktur Navigasi

| Aspek | Sebelum | Sesudah |
|---|---|---|
| Sidebar Menu | Menu "Pengumuman" terpisah + Menu "Support" | Hanya satu menu: **"Support"** |
| Default View saat buka `/support` | — | **Tab "Daftar Tiket Support"** (default) |
| Tab lain | — | Tab "Pengumuman Aktif", Tab "Riwayat Pengumuman" |

**Alasan default ke tab Tiket Support:** agar user tidak bingung — halaman Support tetap terasa sebagai halaman bantuan/tiket seperti biasa, dengan Pengumuman sebagai tab tambahan, bukan tab utama.

### 7.2 Struktur UI

```
Support (halaman tunggal)
 ├── Tab 1: Daftar Tiket Support   [DEFAULT]
 ├── Tab 2: Pengumuman Aktif
 └── Tab 3: Riwayat Pengumuman
```

- **Tab "Daftar Tiket Support"**: fungsi existing, tidak berubah — user buat/lihat tiket bantuan.
- **Tab "Pengumuman Aktif"**: menampilkan komponen Pengumuman Aktif (lihat spesifikasi fitur Pengumuman — read-only bagi user, badge notifikasi tetap muncul di ikon Support jika ada pengumuman baru yang belum dibaca).
- **Tab "Riwayat Pengumuman"**: arsip pengumuman lama yang pernah ditujukan ke user (read-only).
- Untuk role **Admin/Superadmin**, di dalam tab Pengumuman ditambahkan kontrol kelola (buat/edit/arsip pengumuman) — user biasa tidak melihat kontrol ini sama sekali (bukan disembunyikan via CSS saja, tapi memang tidak dirender & endpoint modifikasi ditolak di backend untuk role selain Admin/Superadmin).

### 7.3 Logika Implementasi (State / Routing)

- **Default state:** saat route `/support` diakses tanpa parameter, `activeTab = 'tiket'`.
- **Deep link (opsional tapi disarankan):** user bisa langsung ke tab tertentu via query param, misal `/support?tab=pengumuman-aktif`, `/support?tab=pengumuman-riwayat`.
- **Persistensi saat refresh:** gunakan query param sebagai source of truth tab aktif (bukan hanya local state), supaya refresh halaman tidak mengembalikan user ke tab default secara tidak sengaja jika mereka sedang di tab lain.
- **Badge notifikasi:** ikon menu "Support" di sidebar menampilkan badge jumlah pengumuman belum dibaca (gabungan, tidak dipisah per tab), agar user tetap tahu ada info baru meskipun sedang di tab Tiket.

### 7.4 Referensi Style (Tab Component)

```css
.tab-navigation-wrapper {
  display: flex;
  gap: 12px;
  border-bottom: 2px solid #e5e7eb;
  margin-bottom: 24px;
  padding-bottom: 4px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  font-weight: 600;
  border-radius: 10px;
  border: none;
  background-color: transparent;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.tab-btn.active {
  background-color: #1e40af; /* sesuaikan brand color */
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(30, 64, 175, 0.2);
}

.tab-btn:hover:not(.active) {
  background-color: #f3f4f6;
  color: #111827;
}
```

**Acceptance Criteria:**
- [ ] Tidak ada lagi menu "Pengumuman" terpisah di sidebar.
- [ ] Saat mengakses `/support`, tab default yang tampil adalah "Daftar Tiket Support".
- [ ] User dengan role selain Admin/Superadmin tidak melihat kontrol kelola pengumuman apa pun di tab Pengumuman, dan endpoint modifikasi ditolak (403) jika diakses langsung.
- [ ] Badge notifikasi pengumuman baru tetap terlihat di sidebar meskipun user sedang membuka tab lain.
- [ ] Refresh halaman saat berada di tab Pengumuman tidak mengembalikan user ke tab Tiket secara tidak sengaja (jika deep link via query param diimplementasikan).

**Checklist Developer:**
- [ ] Hapus menu "Pengumuman" tersendiri dari komponen Sidebar.
- [ ] Implementasikan komponen Tab Bar di bagian atas halaman Support.
- [ ] Set "Daftar Tiket Support" sebagai tab default (`activeTab = 'tiket'`).
- [ ] Pindahkan komponen "Pengumuman Aktif" & "Riwayat Pengumuman" ke dalam tab masing-masing di halaman Support.
- [ ] Pastikan validasi role Admin/Superadmin tetap berlaku untuk kontrol kelola pengumuman meskipun sudah dipindah ke dalam tab.

---

## 8. Modul 7 — Fix Modal Verifikasi Import CSV Stock Opname (Sticky Action Bar)

### 8.1 Masalah

Saat jumlah barang hasil import CSV banyak (misal 13 barang), area tabel modal meluap secara vertikal. Tombol **"Batal"** dan **"Kirim Laporan"** ikut terdorong ke bawah dan **tidak terlihat** tanpa scroll halaman penuh pada zoom 100% — bukan scroll di dalam modal, sehingga user bingung cara mengirim laporan.

### 8.2 Solusi — Layout 3 Bagian (Flexbox)

Modal dibagi jadi 3 bagian: **Header (fixed atas)** → **Body tabel (satu-satunya bagian yang scroll)** → **Footer (sticky bawah, selalu terlihat)**.

```css
.modal-content {
  display: flex;
  flex-direction: column;
  max-height: 85vh;   /* modal tidak pernah melebihi tinggi viewport */
  overflow: hidden;
}

.modal-header {
  flex-shrink: 0;      /* tidak ikut mengecil/scroll */
}

.modal-body-scrollable {
  flex: 1 1 auto;       /* mengisi sisa ruang */
  overflow-y: auto;     /* scroll HANYA di sini */
  min-height: 0;         /* WAJIB agar flexbox+overflow bekerja di semua browser */
}

.modal-body-scrollable table thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background-color: #065b32;
}

.modal-footer-fixed {
  flex-shrink: 0;       /* tidak ikut mengecil/scroll */
  border-top: 1px solid #e5e7eb;
  background-color: #ffffff;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.05);
}
```

**Struktur HTML/JSX:**
```html
<div class="modal-content">
  <div class="modal-header">
    <h2>Verifikasi Import CSV Stock Opname</h2>
    <p>13 barang ditemukan dari file CSV. Periksa data sebelum mengirim laporan.</p>
    <div class="form-group">
      <label>Unit / Bagian</label>
      <select disabled><option>Fakultas Teknologi Informasi</option></select>
    </div>
  </div>

  <div class="modal-body-scrollable">
    <table class="table">
      <thead>
        <tr><th>NO</th><th>KODE</th><th>NAMA BARANG</th><th>STOK SISTEM</th><th>STOK FISIK</th><th>SELISIH</th></tr>
      </thead>
      <tbody><!-- baris barang 1..N --></tbody>
    </table>
  </div>

  <div class="modal-footer-fixed">
    <div class="info-status-bar">
      <span>13 laporan siap dikirim</span>
      <span>Selisih positif: 13 · Cocok: 0 · Selisih negatif: 0</span>
    </div>
    <div class="modal-footer-actions">
      <button class="btn-batal">Batal</button>
      <button class="btn-kirim">✓ Kirim 13 Laporan</button>
    </div>
  </div>
</div>
```

### 8.3 Perilaku Tambahan

- Header tabel (`<thead>` hijau) dibuat **sticky di dalam area scroll tabel**, supaya nama kolom tetap terlihat saat user scroll ke baris bawah.
- Jika jumlah baris sedikit (tidak sampai memenuhi tinggi maksimal), tidak ada scrollbar yang muncul — tinggi menyesuaikan konten.
- Scroll di dalam modal tidak boleh ikut men-scroll halaman di belakangnya (`overscroll-behavior: contain;` pada `.modal-body-scrollable`).

**Acceptance Criteria:**
- [ ] Dengan 13 baris data (atau berapa pun jumlahnya), tombol "Batal" dan "Kirim Laporan" selalu terlihat penuh di layar pada zoom 100%, tanpa perlu scroll halaman.
- [ ] User bisa melihat semua baris dengan scroll di dalam area tabel modal saja.
- [ ] Header tabel tetap terlihat (sticky) saat scroll ke baris bawah.
- [ ] Banner ringkasan & tombol aksi tidak pernah tertutup/tertimpa konten tabel.
- [ ] Perilaku konsisten di berbagai ukuran layar & level zoom browser (90%–125%).

**Checklist Developer:**
- [ ] Bungkus `.modal-content` dengan `display: flex; flex-direction: column; max-height: 85vh;`.
- [ ] Pisahkan area tabel ke `.modal-body-scrollable` dengan `overflow-y: auto; min-height: 0;`.
- [ ] Set `position: sticky; top: 0;` pada `<thead>` tabel.
- [ ] Pastikan `.modal-footer-fixed` berada **di luar** elemen scrollable, sebagai sibling flex item dengan `flex-shrink: 0`.

---

## 9. State Machine Status Pengajuan

```
DRAFT ──submit──▶ SUBMITTED ──review──▶ APPROVED ──ambil sebagian──▶ PARTIALLY_TAKEN ──ambil sisa──▶ COMPLETED
  │                    │
  │                    └──reject──▶ REJECTED ──revisi──▶ REVISION ──resubmit──▶ SUBMITTED
  │
  └──batal (permanen)──▶ CANCELLED
```

- `DRAFT`, `REVISION`: bisa diedit penuh (import ulang Excel, hapus item, ubah kebutuhan, batal).
- Status lain: read-only bagi pemohon, kecuali download berkas & handover sesuai status.

---

## 10. Model Data (Ringkas)

**StockOpnamePeriod**
```
id, name, start_date, end_date, is_active
```

**StockOpnameItem**
```
id, period_id, user_id, kode_barang (internal identifier), nama_barang, sisa_stok, recorded_at
```

**Submission**
```
id, user_id, period_id, status, created_at, updated_at, cancelled_at, cancelled_reason
```

**SubmissionItem**
```
id, submission_id, kode_barang (internal), nama_barang, satuan,
sisa_stok_snapshot, kebutuhan_total, jumlah_diajukan,
jumlah_disetujui, jumlah_diambil_kumulatif
```

**ImportLog**
```
id, submission_id, uploaded_file_name, rows_success, rows_error,
override_attempts, imported_at
```

**Attachment**
```
id, submission_id, uploaded_by, file_name, file_path, file_size, mime_type, uploaded_at
```

**HandoverRecord**
```
id, submission_id, taken_by, recipient_name, taken_at,
status (PARTIAL/COMPLETE), signature_url, notes, items[] (item_id, qty_taken)
```

**SubmissionRevisionLog**
```
id, submission_id, revised_by, revised_at, diff_json
```

**MasterTemplateFile**
```
id, file_path, uploaded_by, uploaded_at, is_current
```

**Announcement**
```
id, title, body, priority (NORMAL/IMPORTANT), status (DRAFT/PUBLISHED/ARCHIVED),
target_type (ALL/ROLE/SPECIFIC_USERS), target_value,
created_by, published_at, expires_at, created_at, updated_at
```

**AnnouncementRead**
```
id, announcement_id, user_id, read_at
```

---

## 11. Non-Fungsional

| Aspek | Requirement |
|---|---|
| Integritas data | `Jumlah Diajukan` wajib dihitung ulang di server saat import, tidak pernah dipercaya dari nilai di file client |
| Keamanan | Signed URL untuk semua download; validasi role di backend untuk kelola Template Master & Pengumuman (bukan hanya UI) |
| Konsistensi stok | Row lock/optimistic locking saat pengurangan stok di proses handover |
| Performa | Generate template dinamis < 2 detik untuk ≤ 500 item; import & validasi < 5 detik untuk ≤ 500 baris |
| Kompatibilitas | File Excel valid dibuka di Excel 2016+ dan Google Sheets |
| Audit | Semua aksi (download, import, override attempt, hapus item, batal, handover, kelola pengumuman) tercatat di activity log |

---

## 12. Edge Cases

1. Periode stock opname berakhir/berganti sebelum file diupload → validasi ulang saat import, tolak jika periode sudah tidak aktif.
2. User menambah baris manual di Excel (nama barang tidak ada di data stock opname-nya) → baris ditolak dengan pesan error spesifik per baris.
3. User mengganti angka di kolom `Sisa Stok Saat Ini` → diabaikan sepenuhnya di server, tercatat sebagai `override_attempt`.
4. Dua nama barang identik pada satu user/periode (risiko dari penghapusan Kode Barang di UI) → sistem butuh strategi disambiguasi (lihat catatan risiko di 3.2); minimal tampilkan error yang jelas jika ditemukan ambiguitas.
5. Dua petugas gudang input handover bersamaan → row lock agar total qty diambil tidak melebihi qty disetujui.
6. User menghapus seluruh item dari pengajuan → tetap wajib minimal 1 item, atau arahkan ke "Batalkan Pengajuan".
7. File Excel corrupt/bukan hasil template sistem → validasi struktur kolom sebelum parsing.
8. User mengakses `/support?tab=pengumuman-aktif` langsung tanpa pernah membuka tab tiket → tetap valid, tab yang diminta langsung aktif (bukan dipaksa ke default).

---

## 13. Prioritas Implementasi (Sprint Saran)

| Sprint | Fitur |
|---|---|
| 1 | State machine dasar + Manajemen Pengajuan (Hapus Item, Batal, Simpan Revisi) |
| 2 | Modul Excel: Template Master + Template Dinamis dengan struktur kolom baru (download) |
| 3 | Modul Excel: Import & Overriding Data (proteksi server-side, validasi baris) |
| 4 | Perbaikan UX Field Input Angka (backspace & placeholder) |
| 5 | Download Data Upload + Form Pengambilan Barang |
| 6 | Penggabungan Halaman Support & Pengumuman (Tab Navigation) |
| 7 | Fix Modal Verifikasi Import CSV Stock Opname (sticky footer) |

---

## 14. Pertanyaan Terbuka (Perlu Klarifikasi Sebelum Dev)

- [ ] Apakah `Nama Barang` dijamin unik per user per periode stock opname? Jika tidak, `Kode Barang` perlu tetap ada sebagai kolom tersembunyi di file Excel (lihat catatan risiko 3.2).
- [ ] Apakah user boleh mengunduh & mengimpor template dinamis berkali-kali (menimpa draft), atau hanya sekali per pengajuan?
- [ ] Berapa lama signed URL download berkas sebaiknya berlaku?
- [ ] Apakah kolom `Harga Satuan`/`Harga Total` benar-benar tidak diperlukan lagi di alur ini, atau dihitung/ditampilkan di tempat lain (di luar Excel)?
- [ ] Untuk halaman Support gabungan: apakah badge notifikasi pengumuman perlu dipisah per tab (misal angka merah khusus di tab "Pengumuman Aktif"), atau cukup satu badge gabungan di ikon sidebar?
- [ ] Siapa yang berwenang meng-update Template Master — hanya Superadmin, atau Admin juga?

---

## 15. Checklist Eksekusi Keseluruhan (Ringkasan Semua Modul)

- [ ] **Backend — Template Export:** Filter query Download Template agar hanya menarik barang dari stock opname user terkait, dengan struktur kolom baru (5 kolom, tanpa Kode Barang & Keterangan).
- [ ] **Backend — Import Handler:** Kalkulasi `Jumlah Diajukan` selalu membaca `Sisa Stok Saat Ini` dari database, mengabaikan manipulasi di Excel.
- [ ] **Frontend — Input UX:** Perbarui `onChange`/`onKeyDown`/`onBlur` pada input `Kebutuhan Total` untuk mendukung empty state + placeholder pudar.
- [ ] **Frontend — Form Control:** Tombol Hapus & Batal mengupdate state tabel pengajuan secara real-time, dengan konfirmasi dialog.
- [ ] **Module — Form Pengambilan:** Sediakan halaman/modal Form Pengambilan Barang setelah status `APPROVED`.
- [ ] **Module — Download Berkas:** Tombol download per-berkas di halaman detail pengajuan dengan signed URL.
- [ ] **Navigasi — Support & Pengumuman:** Hapus menu Pengumuman terpisah, gabung ke halaman Support via Tab Navigation dengan tab default "Daftar Tiket Support".
- [ ] **Frontend — Modal Stock Opname:** Terapkan layout 3 bagian (header fixed, body scroll, footer sticky) pada modal Verifikasi Import CSV Stock Opname.
