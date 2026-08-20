# PRD — Sistem Pengajuan & Pengambilan Barang
**Versi:** 1.0
**Status:** Ready for Development
**Terakhir diperbarui:** 20 Agustus 2026

---

## 1. Latar Belakang & Tujuan

Sistem pengajuan barang saat ini belum mendukung: (a) pengunduhan kembali data yang diunggah pengguna, (b) pencatatan serah-terima fisik barang, (c) template pengajuan yang otomatis tersinkron dengan stok terkini, (d) pengelolaan item/pengajuan dalam status draft, dan (e) sarana admin/superadmin untuk mengirim pengumuman satu arah ke user. Dokumen ini merinci lima fitur tersebut agar siap diimplementasikan langsung oleh tim engineering (frontend, backend, dan database).

**Tujuan:**
- Mengurangi kesalahan input manual dengan auto-fill stok real-time.
- Memberi jejak audit penuh atas dokumen pendukung dan proses serah-terima.
- Memberi pengguna kontrol untuk mengoreksi pengajuan sebelum diproses lebih lanjut.

**Di luar cakupan (Out of Scope):** approval workflow multi-level, notifikasi email/WA, integrasi dengan sistem akuntansi eksternal.

---

## 2. Aktor & Peran

| Peran | Deskripsi | Akses |
|---|---|---|
| **Pemohon (User)** | Membuat & mengelola pengajuan miliknya | CRUD pengajuan draft, download template, download upload sendiri |
| **Petugas Gudang** | Memproses pengambilan barang | Isi Form Pengambilan Barang, lihat semua pengajuan approved |
| **Admin/Approver** | Memverifikasi & menyetujui pengajuan | Lihat & download semua data, approve/reject |
| **Admin/Superadmin** | Mengelola sistem & komunikasi ke user | Semua akses Admin, ditambah: buat/edit/hapus Pengumuman |

---

## 3. Rincian Fitur

### 3.1 Download Data Upload

**User Story:** Sebagai pemohon/admin, saya ingin mengunduh kembali berkas yang pernah saya unggah agar bisa diverifikasi atau diarsipkan.

**Fungsional:**
- Tombol **"Download Data Upload"** muncul di halaman detail pengajuan, per-berkas (bukan hanya satu tombol untuk semua file).
- Mendukung format: PDF, XLSX/XLS, JPG/PNG (maks. 10MB per file — sesuaikan dengan kebijakan existing).
- File disimpan di object storage (S3/MinIO/GCS) dengan path terstruktur: `submissions/{submission_id}/uploads/{file_id}_{original_filename}`.
- Endpoint download menghasilkan **signed URL** bermasa berlaku singkat (mis. 5 menit) — bukan public URL permanen.
- Log setiap aktivitas download (siapa, kapan, file mana) untuk keperluan audit.

**Acceptance Criteria:**
- [ ] File yang diunggah tetap dapat diunduh meski pengajuan sudah berubah status (draft → submitted → approved/rejected).
- [ ] User hanya bisa download file miliknya sendiri; admin bisa download semua.
- [ ] Jika file rusak/hilang di storage, sistem menampilkan pesan error yang jelas, bukan 500 generik.
- [ ] Nama file hasil unduhan sesuai nama asli saat diunggah.

**API (contoh):**
```
GET /api/submissions/{submission_id}/attachments
GET /api/submissions/{submission_id}/attachments/{attachment_id}/download
```

---

### 3.2 Form Pengambilan Barang (Item Handover)

**User Story:** Sebagai petugas gudang, saya ingin mencatat serah-terima barang secara fisik saat pemohon mengambil barang yang telah disetujui.

**Trigger:** Muncul/aktif hanya setelah status pengajuan = `APPROVED`.

**Komponen Form:**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| Tanggal & Waktu Pengambilan | datetime, auto-filled (editable) | Ya | Default: waktu submit form |
| Nama Penerima | text / dropdown pegawai | Ya | Bisa berbeda dari pemohon (kuasakan) |
| Daftar Barang & Jumlah Diambil | tabel, per item dari pengajuan | Ya | Qty diambil ≤ qty disetujui |
| Status Pengambilan | enum: `PARTIAL` / `COMPLETE` | Ya | Auto-dihitung dari total qty diambil vs disetujui, override manual diperbolehkan dengan alasan |
| Tanda Tangan Digital | canvas signature / upload foto bukti | Opsional | Disimpan sebagai image di storage |
| Catatan | textarea | Opsional | Misal alasan partial |

**Logika Bisnis Penting:**
- Jika `status = PARTIAL`, sistem membuat **sisa pengambilan** yang bisa diproses ulang di kemudian hari (bukan menutup pengajuan).
- Setiap kali form disimpan, sistem membuat **record histori pengambilan baru** (append-only), bukan overwrite — supaya pengambilan bertahap (cicilan barang) tetap tercatat.
- Stok gudang berkurang otomatis sebesar qty yang benar-benar diambil (bukan qty yang diajukan/disetujui), pada saat form ini disimpan — bukan pada saat approval.
- Validasi: qty diambil tidak boleh melebihi sisa qty disetujui yang belum diambil.

**Acceptance Criteria:**
- [ ] Form tidak bisa diisi jika status pengajuan bukan `APPROVED` atau `PARTIALLY_TAKEN`.
- [ ] Total qty diambil (akumulasi seluruh histori) tidak pernah melebihi qty disetujui.
- [ ] Status pengajuan otomatis berubah menjadi `COMPLETED` ketika seluruh item sudah diambil penuh.
- [ ] Riwayat pengambilan (siapa, kapan, berapa) dapat dilihat kembali di halaman detail.

**API (contoh):**
```
POST /api/submissions/{submission_id}/handover
GET  /api/submissions/{submission_id}/handover-history
```

---

### 3.3 Template Pengajuan Auto-Fill Sisa Stok

**User Story:** Sebagai pemohon, saya ingin mengunduh template yang sudah terisi stok terkini agar saya tidak perlu mengecek stok secara manual sebelum mengisi pengajuan.

**Fungsional:**
- Tombol **"Download Template Pengajuan"** men-generate file Excel (.xlsx) on-the-fly (bukan file statis) menggunakan data terbaru dari database saat tombol diklik.
- Kolom template:

| Kode Barang | Nama Barang | Satuan | Stok Saat Ini | Kebutuhan Total | Jumlah Diajukan (rumus) |
|---|---|---|---|---|---|
| BRG001 | Kertas A4 | Rim | 12 | 50 | `=Kebutuhan Total - Stok Saat Ini` |

- Rumus `Jumlah Diajukan = Kebutuhan Total - Stok Saat Ini` ditanam sebagai **formula Excel asli** (bukan nilai statis), agar user bisa mengubah "Kebutuhan Total" dan hasil otomatis terupdate saat file dibuka di Excel.
- Jika hasil rumus negatif (stok mencukupi), tampilkan `0` dan beri highlight warna (mis. kuning) sebagai peringatan bahwa stok masih cukup.
- Kolom "Stok Saat Ini" dikunci (protected/read-only) agar tidak diubah manual oleh user, untuk menjaga integritas data saat file diunggah kembali.
- Saat file ini diunggah kembali ke sistem (re-upload untuk membuat pengajuan), sistem **memvalidasi ulang** stok saat ini terhadap database — jika sudah berbeda (karena ada transaksi lain), tampilkan warning kepada user sebelum submit final.

**Acceptance Criteria:**
- [ ] Data stok dalam template selalu real-time (tidak ada cache lebih dari beberapa menit).
- [ ] Template mencantumkan timestamp "Data stok per: {tanggal, jam}" di header file.
- [ ] Format file valid dibuka di Excel/Google Sheets tanpa error.
- [ ] Validasi ulang stok terjadi saat submit, bukan hanya saat download.

**API (contoh):**
```
GET /api/templates/pengajuan/download?kategori={opsional}
```

---

### 3.4 Aksi Hapus Item & Batal Pengajuan

**User Story:** Sebagai pemohon, saya ingin bisa menghapus item tertentu atau membatalkan seluruh pengajuan sebelum saya submit final.

**3.4.1 Hapus Item (per baris tabel)**
- Tombol "Hapus" di kolom Aksi, hanya aktif ketika status pengajuan `DRAFT` (atau `REVISION` jika dikembalikan admin).
- Klik "Hapus" memunculkan **konfirmasi dialog** ("Yakin ingin menghapus [Nama Barang] dari daftar?") — mencegah hapus tidak sengaja.
- Item terhapus dari list secara **client-side dulu (optimistic UI)**, baru di-persist ke server saat "Simpan Revisi" ditekan — atau, jika desain menghendaki auto-save, hapus langsung via API dan tampilkan toast undo selama beberapa detik.
- Minimal harus tersisa 1 item dalam pengajuan; jika user menghapus item terakhir, sistem meminta konfirmasi tambahan bahwa ini akan mengosongkan pengajuan.

**3.4.2 Batal Pengajuan**
- Tombol "Batal" di bagian bawah form.
- Perilaku tergantung konteks (perlu ditentukan salah satu, sarankan Opsi A untuk konsistensi):
  - **Opsi A — Discard perubahan:** Mengembalikan form ke data tersimpan terakhir (undo semua perubahan belum disimpan), pengajuan tetap ada sebagai draft.
  - **Opsi B — Batalkan seluruh pengajuan:** Mengubah status pengajuan menjadi `CANCELLED` dan tidak bisa diedit lagi (soft-delete, tetap tersimpan untuk audit).
- **Rekomendasi:** pisahkan dua tombol berbeda agar tidak ambigu — **"Batal"** = discard perubahan (Opsi A), **"Batalkan Pengajuan"** = Opsi B, dengan konfirmasi dialog eksplisit untuk Opsi B karena destruktif.

**3.4.3 Simpan Revisi**
- Tombol "Simpan Revisi Pengajuan" mem-persist seluruh perubahan (item dihapus, jumlah diajukan diubah, item baru ditambah) dalam satu transaksi.
- Sistem membuat **versi/riwayat revisi** (audit trail) setiap kali disimpan, agar histori perubahan dapat ditelusuri.
- Validasi sebelum simpan: minimal 1 item, semua qty > 0, semua field wajib terisi.

**Acceptance Criteria:**
- [ ] Hapus item & batal hanya bisa dilakukan saat status `DRAFT`/`REVISION`.
- [ ] Ada dialog konfirmasi untuk aksi Hapus Item dan Batalkan Pengajuan.
- [ ] Riwayat revisi tersimpan dan dapat dilihat admin.
- [ ] Setelah `CANCELLED`, semua tombol aksi edit non-aktif (read-only view).

**API (contoh):**
```
DELETE /api/submissions/{submission_id}/items/{item_id}
PUT    /api/submissions/{submission_id}          (simpan revisi, full payload)
PATCH  /api/submissions/{submission_id}/cancel    (batalkan pengajuan)
```

---

### 3.5 Fitur Pengumuman (Admin/Superadmin → User)

**User Story:** Sebagai admin/superadmin, saya ingin mengirim pengumuman ke seluruh user (atau grup user tertentu) agar mereka mendapat notifikasi penting. Sebagai user, saya ingin melihat pengumuman yang masuk sebagai notifikasi, tanpa bisa membalas, mengedit, atau menghapusnya — murni satu arah (read-only).

**Sifat Fitur:** Komunikasi **satu arah (broadcast)**. Tidak ada reply, komentar, reaksi, atau forward dari sisi user. User hanya bisa: melihat isi pengumuman & menandainya sebagai sudah dibaca (implicit saat dibuka).

**3.5.1 Sisi Admin/Superadmin**

| Fungsi | Deskripsi |
|---|---|
| Buat Pengumuman | Form: Judul, Isi (rich text/markdown), Target Penerima (Semua User / Role tertentu / User tertentu), Prioritas (Normal/Penting), Tanggal mulai & berakhir tayang (opsional) |
| Edit Pengumuman | Hanya sebelum dipublikasikan (status `DRAFT`); pengumuman yang sudah `PUBLISHED` tidak bisa diedit isinya — sarankan buat versi baru agar histori tidak berubah setelah dibaca user |
| Hapus/Arsipkan Pengumuman | Soft-delete (arsip) — pengumuman yang sudah dibaca user tetap tersimpan untuk audit, tapi tidak lagi tampil di daftar notifikasi aktif user |
| Lihat Statistik Pembacaan | Daftar siapa saja yang sudah/belum membaca pengumuman (read receipt), berguna untuk memastikan info penting tersampaikan |
| Hak Akses | Hanya role `Admin` dan `Superadmin` yang bisa membuat/edit/hapus. `Petugas Gudang` dan `User` tidak punya akses ke menu ini sama sekali |

**3.5.2 Sisi User**

| Fungsi | Deskripsi |
|---|---|
| Notifikasi Masuk | Badge/counter notifikasi (mis. ikon lonceng) muncul saat ada pengumuman baru yang ditujukan ke user tersebut |
| Lihat Pengumuman | User membuka & membaca isi pengumuman secara **read-only** — tidak ada tombol reply, comment, react, edit, atau delete di sisi user |
| Tandai Terbaca | Otomatis tercatat sebagai "dibaca" ketika user membuka detail pengumuman (tidak perlu aksi eksplisit dari user) |
| Riwayat Pengumuman | User bisa melihat daftar pengumuman lama yang pernah ditujukan ke dirinya (arsip pribadi, read-only) |

**Batasan Eksplisit (Guardrail):**
- Tidak ada endpoint/tombol apa pun di sisi user untuk POST/PUT/DELETE terhadap data pengumuman — hanya GET.
- UI sisi user tidak menampilkan kontrol input apa pun pada halaman pengumuman selain tombol "Tutup"/"Kembali".
- Percobaan akses endpoint modifikasi pengumuman oleh role `User`/`Petugas Gudang` harus ditolak di level backend (403 Forbidden), bukan cuma disembunyikan di UI.

**Acceptance Criteria:**
- [ ] User dengan role selain Admin/Superadmin tidak bisa membuat, mengedit, atau menghapus pengumuman — baik lewat UI maupun API langsung.
- [ ] Notifikasi baru muncul realtime atau near-realtime (polling/websocket) setelah admin publish pengumuman.
- [ ] Status baca per-user tercatat dan bisa dilihat admin (read receipt).
- [ ] Pengumuman yang targetnya "Role tertentu" hanya tampil ke user dengan role tersebut.
- [ ] Pengumuman kedaluwarsa (melewati tanggal berakhir tayang) otomatis tidak muncul lagi di notifikasi aktif, namun tetap ada di riwayat.

**Model Data:**
```
Announcement
  id, title, body, priority (NORMAL/IMPORTANT), status (DRAFT/PUBLISHED/ARCHIVED),
  target_type (ALL/ROLE/SPECIFIC_USERS), target_value,
  created_by, published_at, expires_at, created_at, updated_at

AnnouncementRead
  id, announcement_id, user_id, read_at
```

**API (contoh):**
```
# Admin/Superadmin only
POST   /api/announcements
PUT    /api/announcements/{id}          (hanya jika status DRAFT)
DELETE /api/announcements/{id}          (soft-delete/arsip)
GET    /api/announcements/{id}/read-receipts

# User (read-only)
GET    /api/me/announcements              (daftar notifikasi aktif)
GET    /api/me/announcements/{id}         (detail, otomatis mark as read)
GET    /api/me/announcements/history      (arsip pribadi)
```

---

## 4. State Machine Status Pengajuan

```
DRAFT ──submit──▶ SUBMITTED ──review──▶ APPROVED ──ambil sebagian──▶ PARTIALLY_TAKEN ──ambil sisa──▶ COMPLETED
  │                    │
  │                    └──reject──▶ REJECTED ──revisi──▶ REVISION ──resubmit──▶ SUBMITTED
  │
  └──batal──▶ CANCELLED
```

- `DRAFT`, `REVISION`: bisa diedit penuh (hapus item, ubah qty, batal).
- `SUBMITTED`, `APPROVED`, `PARTIALLY_TAKEN`, `COMPLETED`, `CANCELLED`, `REJECTED`: read-only untuk pemohon (kecuali download & handover sesuai status).

---

## 5. Model Data (Ringkas)

**Submission**
```
id, user_id, status, created_at, updated_at, cancelled_at, cancelled_reason
```

**SubmissionItem**
```
id, submission_id, kode_barang, nama_barang, satuan,
stok_saat_ini_snapshot, kebutuhan_total, jumlah_diajukan,
jumlah_disetujui, jumlah_diambil_kumulatif
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

---

## 6. Non-Fungsional

| Aspek | Requirement |
|---|---|
| Keamanan | Signed URL untuk semua download file, cek kepemilikan resource sebelum akses. Endpoint modifikasi Pengumuman wajib divalidasi role di backend (bukan hanya disembunyikan di frontend) |
| Konsistensi stok | Gunakan transaksi DB (row lock / optimistic locking) saat pengurangan stok di proses handover agar tidak race condition antar user |
| Audit | Semua aksi (upload, download, hapus item, batal, handover) tercatat di activity log dengan user_id & timestamp |
| Performa | Generate template Excel < 2 detik untuk ≤ 500 baris item |
| Kompatibilitas | Template Excel harus dapat dibuka di Excel 2016+ dan Google Sheets |

---

## 7. Edge Cases yang Perlu Ditangani

1. Stok berubah antara saat template di-download dan saat pengajuan disubmit → beri warning, minta konfirmasi ulang.
2. Dua petugas gudang input handover bersamaan untuk pengajuan yang sama → gunakan locking agar total qty diambil tidak melebihi qty disetujui.
3. User menghapus semua item dari pengajuan → wajib minimal 1 item, atau arahkan ke "Batalkan Pengajuan" saja.
4. File upload gagal di tengah proses (network terputus) → tampilkan status upload gagal, jangan simpan attachment kosong ke DB.
5. Pengajuan direjeksi lalu direvisi → riwayat versi sebelumnya tetap tersimpan untuk audit, bukan ditimpa.

---

## 8. Prioritas Implementasi (Sprint Saran)

| Sprint | Fitur |
|---|---|
| 1 | Download Data Upload + State Machine dasar |
| 2 | Hapus Item & Batal Pengajuan + Simpan Revisi |
| 3 | Template Auto-Fill Sisa Stok |
| 4 | Form Pengambilan Barang + integrasi pengurangan stok |
| 5 | Fitur Pengumuman (Admin/Superadmin) + notifikasi read-only untuk User |

---

## 9. Pertanyaan Terbuka (Perlu Klarifikasi Sebelum Dev)

- [ ] Apakah "Batal" dan "Batalkan Pengajuan" memang perlu dua tombol terpisah, atau cukup satu perilaku saja?
- [ ] Apakah tanda tangan digital wajib untuk validasi handover, atau cukup opsional selamanya?
- [ ] Siapa saja yang boleh menjadi "Nama Penerima" — harus pegawai terdaftar, atau bebas teks?
- [ ] Berapa lama signed URL download file sebaiknya berlaku?
- [ ] Apakah notifikasi pengumuman perlu realtime (websocket/push) atau cukup polling saat user buka aplikasi?
- [ ] Apakah pengumuman dengan target "User tertentu" perlu, atau cukup "Semua User" & "Role tertentu" saja untuk versi awal?
