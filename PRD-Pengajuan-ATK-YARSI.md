# PRD — Sistem Pengajuan ATK (YARSI ATK System)
**Versi:** 2.0
**Status:** Ready for Development
**Terakhir diperbarui:** 20 Agustus 2026

---

## 1. Latar Belakang & Tujuan

Sistem pengajuan ATK saat ini perlu disempurnakan pada lima area: (a) pemisahan template Excel master vs template dinamis berbasis stock opname, (b) proteksi data stok agar tidak bisa dimanipulasi dari sisi client/Excel, (c) perbaikan UX input angka pada tabel pengajuan, (d) modul serah-terima fisik barang, dan (e) manajemen draft pengajuan (hapus item, batal, unduh berkas). Dokumen ini merinci seluruh kebutuhan tersebut agar siap diimplementasikan langsung oleh tim engineering (frontend, backend, database).

**Tujuan:**
- Memastikan data stok yang dipakai untuk kalkulasi pengajuan selalu berasal dari sumber resmi (database), bukan dari input Excel yang bisa dimanipulasi.
- Menghilangkan friksi UX pada input angka di tabel pengajuan.
- Menyediakan jejak audit penuh untuk stock opname, upload dokumen, dan proses serah-terima barang.
- Memberi pengguna kontrol penuh atas draft pengajuan sebelum disubmit.

**Di luar cakupan (Out of Scope):** approval workflow multi-level bertingkat, notifikasi email/WA eksternal, integrasi sistem akuntansi/ERP eksternal, modul stock opname itu sendiri (diasumsikan sudah ada sebagai sistem terpisah yang menjadi sumber data).

---

## 2. Aktor & Peran

| Peran | Deskripsi | Akses |
|---|---|---|
| **Pemohon (User)** | Membuat & mengelola pengajuan ATK miliknya | Download template master & dinamis, upload/import Excel, edit draft, hapus item, batal, download berkas sendiri |
| **Petugas Gudang** | Memproses serah-terima fisik barang | Isi Form Pengambilan Barang, lihat pengajuan berstatus `APPROVED` |
| **Admin/Approver** | Memverifikasi, menyetujui/menolak pengajuan | Lihat & download semua data, approve/reject, lihat log override stok |
| **Superadmin** | Mengelola master data & konfigurasi sistem | Semua akses Admin + kelola Template Master, kelola periode stock opname |

---

## 3. Rincian Spesifikasi Fitur

### 3.1 Modul Excel Download & Import Dinamis

**User Story:** Sebagai pemohon, saya ingin mengunduh template yang hanya berisi barang yang sudah saya stock opname pada periode berjalan, mengisi kebutuhan saya, lalu mengunggahnya kembali tanpa khawatir data stok saya keliru atau bisa saya ubah sembarangan.

#### 3.1.1 Menu Template Dokumen (Template Master)
- Berisi **katalog barang standar lengkap** (seluruh kode barang aktif di sistem), tidak difilter per user/periode.
- Digunakan sebagai referensi umum, bukan untuk langsung diisi dan diupload sebagai pengajuan.
- Dikelola (upload/replace) hanya oleh **Superadmin** melalui menu terpisah.

#### 3.1.2 Menu Buat Pengajuan Baru (Template Dinamis)
- **Trigger:** Klik tombol **"Download Template"** di halaman Buat Pengajuan Baru.
- **Filter data:**
  ```sql
  SELECT * FROM stock_opname_items
  WHERE user_id = CURRENT_USER AND period_id = CURRENT_PERIOD
  ```
- Jika user belum melakukan stock opname pada periode berjalan, tombol **nonaktif** dan tampilkan pesan: *"Anda belum melakukan stock opname pada periode ini. Silakan lakukan stock opname terlebih dahulu."*
- **Struktur Kolom Excel:**

| Kolom | Sumber | Sifat |
|---|---|---|
| Kode Barang | Master barang | Read-only |
| Nama Barang | Master barang | Read-only |
| Satuan | Master barang | Read-only |
| Harga Satuan | Master barang / harga terkini | Read-only |
| Kebutuhan Total | Diisi user | **Editable** |
| Sisa Stok Saat Ini | Hasil stock opname periode berjalan | Read-only reference (di-lock via sheet protection) |

- Header file mencantumkan: nama periode stock opname, tanggal generate, dan nama user — untuk mencegah kekeliruan pakai file periode lama.

#### 3.1.3 Logic Import & Overriding Data (Proteksi Server-Side)

Saat file diunggah kembali:

1. Sistem membaca **hanya** kolom `Kode Barang` dan `Kebutuhan Total` dari file yang diunggah — kolom lain (termasuk `Sisa Stok Saat Ini` dan `Harga Satuan`) **diabaikan sepenuhnya**, meskipun user mengubahnya di Excel.
2. Sistem mengambil ulang `Sisa Stok Saat Ini` dan `Harga Satuan` langsung dari database berdasarkan `Kode Barang` + periode stock opname user yang bersangkutan (bukan dari isi file).
3. **Rumus kalkulasi (dihitung ulang di server, bukan trust dari client):**
   ```
   Jumlah Diajukan = MAX(0, Kebutuhan Total (dari file) − Sisa Stok Saat Ini (dari database))
   Harga Total     = Jumlah Diajukan × Harga Satuan (dari database)
   ```
4. Jika ada baris dengan `Kode Barang` yang tidak ditemukan di data stock opname user pada periode tersebut (misal user menambah baris manual di Excel), baris tersebut **ditolak** dan dilaporkan ke user sebagai error — tidak diproses diam-diam.
5. Jika `Kebutuhan Total` kosong atau non-numerik, baris di-skip dan dicatat sebagai warning pada hasil import.

**Acceptance Criteria:**
- [ ] Perubahan manual pada kolom `Sisa Stok Saat Ini` di file Excel tidak berpengaruh sama sekali terhadap hasil kalkulasi backend.
- [ ] Template dinamis hanya memuat item hasil stock opname user aktif pada periode berjalan — tidak ada item dari user lain atau periode lain.
- [ ] Hasil import menampilkan ringkasan: jumlah baris berhasil diproses, jumlah baris error/warning beserta alasannya.
- [ ] Proses import berjalan dalam satu transaksi — jika gagal di tengah jalan, tidak ada data parsial yang tersimpan.
- [ ] Log audit mencatat setiap kali sistem "mengabaikan" nilai override dari file (untuk mendeteksi percobaan manipulasi berulang oleh user tertentu).

**API (contoh):**
```
GET  /api/templates/master/download                          (Superadmin kelola, semua bisa download)
GET  /api/submissions/new/template/download                  (template dinamis, by CURRENT_USER + CURRENT_PERIOD)
POST /api/submissions/new/import                              (upload file, return preview + errors)
POST /api/submissions/new/import/confirm                      (finalisasi jadi draft submission)
```

---

### 3.2 Standardisasi UX Field Input Angka (Tabel Pengajuan)

**Masalah:** Input `type="number"` yang di-binding langsung ke tipe numerik memaksa nilai kembali ke `0` begitu user menekan backspace hingga kolom kosong, memaksa user melakukan select-all manual untuk mengganti angka.

**Solusi — ubah state binding dari numeric-strict menjadi string/nullable:**

| Event | Logic State | Tampilan UI |
|---|---|---|
| Backspace hingga habis | `value = ""` (string kosong, bukan `0` atau `null`) | Kolom kosong + placeholder `"0"` warna abu-abu pudar (`#9CA3AF` atau setara) |
| User mengetik angka | `value` di-append sebagai string, divalidasi hanya menerima digit (dan opsional titik/koma untuk desimal jika field harga) | Angka tampil normal, placeholder hilang |
| User paste teks non-angka | Ditolak/di-strip karakter non-digit sebelum masuk state | Tidak ada karakter aneh masuk ke field |
| `onBlur` / sebelum submit | Jika `value === ""` → fallback ke `0` untuk keperluan kalkulasi & payload ke backend | Field menampilkan `0` (bukan lagi placeholder) setelah blur, agar user sadar nilainya sudah final |
| Field readonly (`Sisa Stok Saat Ini`) | Tidak menerima input apa pun, styling visual berbeda (background abu muda) agar user tahu tidak bisa diedit | — |

**Acceptance Criteria:**
- [ ] User bisa mengosongkan field angka dengan backspace tanpa perlu block/select teks dengan mouse.
- [ ] Tidak ada kondisi field menampilkan `NaN` di UI maupun di payload yang dikirim ke backend.
- [ ] Placeholder `"0"` hanya tampil saat field benar-benar kosong, hilang begitu user mulai mengetik.
- [ ] Validasi backend tetap menolak/menormalkan nilai kosong menjadi `0` sebagai safety net kedua (tidak hanya mengandalkan frontend).
- [ ] Perilaku ini konsisten di semua field angka pada tabel: Kebutuhan Total, dan field angka lain yang editable.

---

### 3.3 Modul Form Pengambilan Barang & Akses Dokumen

#### 3.3.1 Form Pengambilan Barang (Item Handover / Pickup Form)

**Trigger:** Aktif hanya ketika status pengajuan = `APPROVED` (atau `PARTIALLY_TAKEN` untuk pengambilan sisa).

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| Tanggal & Waktu Pengambilan | datetime, auto-filled (editable) | Ya | Default: waktu submit form |
| Nama Pemohon / Penerima | text / dropdown pegawai | Ya | Bisa dikuasakan ke orang lain |
| Daftar Barang & Jumlah Diserahterimakan | tabel per item dari pengajuan | Ya | Qty diambil ≤ sisa qty disetujui yang belum diambil |
| Status Pengambilan | enum `PARTIAL` / `COMPLETE` | Ya | Auto-dihitung dari total qty diambil vs disetujui; override manual boleh dengan catatan wajib |
| Bukti Serah Terima / Tanda Tangan Digital | canvas signature / upload foto | Opsional | Disimpan sebagai file di storage |

**Logika Bisnis:**
- Setiap penyimpanan form membuat **record histori baru** (append-only) — mendukung pengambilan bertahap/cicilan.
- Stok gudang berkurang **saat form ini disimpan** (bukan saat approval), sebesar qty yang benar-benar diambil.
- Total qty diambil (akumulasi seluruh histori) tidak boleh melebihi qty yang disetujui.
- Status pengajuan otomatis menjadi `COMPLETED` ketika seluruh item sudah diambil penuh.

**Acceptance Criteria:**
- [ ] Form tidak bisa diakses/disubmit jika status pengajuan bukan `APPROVED`/`PARTIALLY_TAKEN`.
- [ ] Validasi qty diambil tidak pernah melebihi sisa yang disetujui (dicek server-side dengan locking untuk mencegah race condition dua petugas gudang input bersamaan).
- [ ] Riwayat pengambilan (siapa, kapan, berapa) dapat dilihat kembali di halaman detail pengajuan.

**API:**
```
POST /api/submissions/{submission_id}/handover
GET  /api/submissions/{submission_id}/handover-history
```

#### 3.3.2 Akses Unduh Berkas Manual

- Tombol **"Download Data Upload"** per-berkas di halaman detail pengajuan.
- Mendukung PDF, Excel, Gambar; disimpan di object storage dengan path terstruktur `submissions/{submission_id}/uploads/{file_id}_{filename}`.
- Diakses via **signed URL** bermasa berlaku singkat, bukan URL publik permanen.
- User hanya bisa download berkas miliknya sendiri; Admin/Superadmin bisa download semua.

**Acceptance Criteria:**
- [ ] Berkas tetap dapat diunduh meski status pengajuan sudah berubah (approved/rejected/completed).
- [ ] Setiap aktivitas download tercatat di activity log (siapa, kapan, berkas mana).

**API:**
```
GET /api/submissions/{submission_id}/attachments
GET /api/submissions/{submission_id}/attachments/{attachment_id}/download
```

#### 3.3.3 Manajemen Pengajuan (Hapus Item & Batal)

**Hapus Item (per baris):**
- Tombol "Hapus" di kolom Aksi, hanya aktif saat status `DRAFT`/`REVISION`.
- Konfirmasi dialog wajib sebelum item benar-benar dihapus.
- Minimal harus tersisa 1 item dalam pengajuan.

**Batal:**
- Tombol "Batal" membatalkan seluruh **perubahan yang belum disimpan** dan mengembalikan form ke kondisi tersimpan terakhir (discard, bukan menghapus pengajuan itu sendiri).
- Untuk membatalkan pengajuan secara permanen (soft-delete, status `CANCELLED`), disediakan aksi terpisah "Batalkan Pengajuan" dengan konfirmasi eksplisit, agar tidak tertukar dengan "Batal" (discard perubahan) yang sifatnya non-destruktif.

**Simpan Revisi:**
- Mem-persist seluruh perubahan dalam satu transaksi dan membuat entri riwayat revisi (audit trail).
- Validasi sebelum simpan: minimal 1 item, semua `Kebutuhan Total` > 0, semua field wajib terisi.

**Acceptance Criteria:**
- [ ] Hapus item & batal hanya berlaku saat status `DRAFT`/`REVISION`; nonaktif untuk status lain.
- [ ] Ada dialog konfirmasi untuk aksi Hapus Item dan Batalkan Pengajuan.
- [ ] Riwayat revisi tersimpan dan bisa dilihat Admin.

**API:**
```
DELETE /api/submissions/{submission_id}/items/{item_id}
PUT    /api/submissions/{submission_id}              (simpan revisi, full payload)
PATCH  /api/submissions/{submission_id}/cancel        (batalkan pengajuan permanen)
```

---

## 4. State Machine Status Pengajuan

```
DRAFT ──submit──▶ SUBMITTED ──review──▶ APPROVED ──ambil sebagian──▶ PARTIALLY_TAKEN ──ambil sisa──▶ COMPLETED
  │                    │
  │                    └──reject──▶ REJECTED ──revisi──▶ REVISION ──resubmit──▶ SUBMITTED
  │
  └──batal (permanen)──▶ CANCELLED
```

- `DRAFT`, `REVISION`: bisa diedit penuh (import ulang Excel, hapus item, ubah kebutuhan, batal).
- `SUBMITTED`, `APPROVED`, `PARTIALLY_TAKEN`, `COMPLETED`, `CANCELLED`, `REJECTED`: read-only bagi pemohon, kecuali download berkas & handover sesuai status.

---

## 5. Model Data (Ringkas)

**StockOpnamePeriod**
```
id, name, start_date, end_date, is_active
```

**StockOpnameItem**
```
id, period_id, user_id, kode_barang, sisa_stok, recorded_at
```

**Submission**
```
id, user_id, period_id, status, created_at, updated_at, cancelled_at, cancelled_reason
```

**SubmissionItem**
```
id, submission_id, kode_barang, nama_barang, satuan, harga_satuan,
sisa_stok_snapshot, kebutuhan_total, jumlah_diajukan, harga_total,
jumlah_disetujui, jumlah_diambil_kumulatif
```

**ImportLog**
```
id, submission_id, uploaded_file_name, rows_success, rows_error,
override_attempts (jumlah baris di mana nilai dari file diabaikan), imported_at
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

---

## 6. Non-Fungsional

| Aspek | Requirement |
|---|---|
| Integritas data | Seluruh kalkulasi (`Jumlah Diajukan`, `Harga Total`) **wajib dihitung ulang di server** saat import, tidak pernah dipercaya dari nilai di file client |
| Keamanan | Signed URL untuk semua download; validasi role di backend (bukan hanya UI) untuk aksi kelola Template Master (Superadmin only) |
| Konsistensi stok | Transaksi DB dengan row lock/optimistic locking saat pengurangan stok di proses handover, untuk mencegah race condition antar petugas gudang |
| Performa | Generate template dinamis < 2 detik untuk ≤ 500 item per user; proses import & validasi < 5 detik untuk ≤ 500 baris |
| Kompatibilitas | File Excel harus valid dibuka di Excel 2016+ dan Google Sheets, termasuk sheet protection pada kolom read-only |
| Audit | Semua aksi (download template, import, override attempt, hapus item, batal, handover) tercatat di activity log dengan `user_id` & `timestamp` |

---

## 7. Edge Cases yang Perlu Ditangani

1. User mengunduh template dinamis, lalu periode stock opname berakhir/berganti sebelum file diupload → validasi ulang saat import: jika periode sudah tidak aktif, tolak import dan minta user download ulang template dari periode aktif.
2. User menambahkan baris baru secara manual di Excel (kode barang yang bukan hasil stock opname-nya) → baris ditolak dengan pesan error spesifik per baris, bukan gagal seluruh file.
3. User mengganti rumus/isi kolom `Sisa Stok Saat Ini` secara manual → diabaikan sepenuhnya di server, dan tercatat sebagai `override_attempt` di `ImportLog` untuk audit.
4. Dua petugas gudang input handover bersamaan untuk pengajuan yang sama → gunakan row lock agar total qty diambil tidak melebihi qty disetujui.
5. User menghapus seluruh item dari pengajuan → sistem tetap mewajibkan minimal 1 item, atau arahkan ke aksi "Batalkan Pengajuan".
6. File Excel yang diupload berformat rusak/corrupt atau bukan hasil template sistem → validasi struktur kolom sebelum parsing, tolak dengan pesan jelas jika format tidak sesuai.
7. `Harga Satuan` berubah di database antara saat template diunduh dan file diupload kembali → gunakan harga terbaru saat import (bukan harga snapshot di file), tampilkan notifikasi ke user jika ada perubahan harga signifikan.

---

## 8. Prioritas Implementasi (Sprint Saran)

| Sprint | Fitur |
|---|---|
| 1 | State machine dasar + Manajemen Pengajuan (Hapus Item, Batal, Simpan Revisi) |
| 2 | Modul Excel: Template Master + Template Dinamis (download) |
| 3 | Modul Excel: Import & Overriding Data (proteksi server-side, validasi baris) |
| 4 | Perbaikan UX Field Input Angka (backspace & placeholder) |
| 5 | Download Data Upload + Form Pengambilan Barang |

---

## 9. Alur Kerja Sistem (Workflow Lengkap)

```text
[ User Stock Opname ] ──> Data tersimpan di Database (StockOpnamePeriod, StockOpnameItem)
           │
           ▼
[ Halaman Pengajuan Baru ]
     ├─> [ Download Template Dinamis ] (hanya barang hasil stock opname periode berjalan)
     │            │
     │            ▼
     │   [ User isi kolom "Kebutuhan Total" di Excel ]
     │            │
     │            ▼
     └─> [ Upload / Import Excel ]
                  │
                  ▼
   [ Validasi Struktur & Baris ] ──❌──> Baris/file error dilaporkan ke user, tidak diproses
                  │ ✅
                  ▼
   [ System Override & Kalkulasi Server-Side ]
        (Sisa Stok & Harga Satuan diambil dari database, mengabaikan nilai di file)
                  │
                  ▼
   [ Draft Pengajuan Terbentuk ] ──> Field angka menggunakan UX fix: backspace empty state + placeholder "0"
                  │
        ┌─────────┼─────────┐
        ▼         ▼         ▼
   [ Hapus Item ] [ Batal ] [ Simpan Revisi ]
                              │
                              ▼
                   [ Submit Pengajuan ] ──▶ SUBMITTED
                              │
                              ▼
                 [ Approval Admin/Approver ]
                    │                 │
                 reject            approve
                    │                 │
                    ▼                 ▼
              REJECTED ──revisi──▶ APPROVED
                    │                 │
              REVISION            [ Download Data Upload ] (tersedia di semua tahap)
                    │                 │
                resubmit               ▼
                    │         [ Form Pengambilan Barang ]
                    ▼                 │
               SUBMITTED         partial / complete
                                       │
                                       ▼
                              PARTIALLY_TAKEN ──ambil sisa──▶ COMPLETED
```

---

## 10. Pertanyaan Terbuka (Perlu Klarifikasi Sebelum Dev)

- [ ] Apakah `Harga Satuan` bisa berubah di tengah periode stock opname? Jika ya, harga mana yang jadi acuan final: harga saat template diunduh, atau harga saat file diupload kembali? (Rekomendasi di dokumen ini: harga saat upload, lihat Edge Case #7 — mohon konfirmasi.)
- [ ] Apakah user boleh mengunduh & mengimpor template dinamis berkali-kali (menimpa draft yang ada), atau hanya sekali per pengajuan?
- [ ] Berapa lama signed URL download berkas sebaiknya berlaku?
- [ ] Apakah "Batal" (discard perubahan) dan "Batalkan Pengajuan" (permanen) memang perlu dua tombol/aksi terpisah seperti direkomendasikan, atau cukup satu perilaku saja sesuai desain awal?
- [ ] Siapa yang berwenang meng-update Template Master — apakah hanya Superadmin, atau Admin juga diberi akses?
