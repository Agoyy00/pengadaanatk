# 📋 Feature Task: Badge Notifikasi Real-time Halaman Support

## 📌 Context & Goal
Sistem Obrolan Support (User ↔ Admin/Superadmin) beserta status pengubahan (*Di Proses* & *Selesai*) sudah berjalan dengan baik. 

Tujuan dari tugas ini adalah menambahkan **Badge Notifikasi Angka** di samping menu/tulisan "Support" (di Navbar/Sidebar) untuk menampilkan jumlah pesan baru yang belum dibaca (*unread messages*), yang nilainya bertambah saat ada pesan masuk dan berkurang/hilang saat pesan dibaca oleh Admin/Superadmin.

---

## 🎯 Target Functional Requirements

1. **Badge Notifikasi Unread Count**:
   - Menampilkan angka di samping teks menu `Support` (contoh: `Support [ 3 ]`).
   - Berkurang atau reset menjadi `0` (badge tersembunyi) ketika Admin/Superadmin membuka/membaca pesan dari user tersebut.
   - Bertambah secara *real-time* saat ada pesan masuk baru dari user.

2. **State & Read Status Management**:
   - Menandai pesan/room percakapan sebagai `is_read = true` saat Admin/Superadmin memilih/membuka obrolan tersebut.

---

## 🛠️ Implementation Breakdown

### 1. Database & Model Update
- [ ] Pastikan tabel pesan (`support_messages` / `chats`) memiliki kolom status baca:
  - `is_read` (Boolean, default: `false`) atau `read_at` (Timestamp, nullable).

### 2. Backend Logic & API Endpoints
- [ ] **Endpoint Unread Count**:
  - Buat query untuk menghitung total pesan belum dibaca yang ditujukan ke Admin/Superadmin.
  - *Example Query Concept*: 
    `SELECT COUNT(*) FROM support_messages WHERE receiver_id = admin_id AND is_read = false`
- [ ] **Endpoint Mark as Read**:
  - Update kolom `is_read = true` ketika Admin/Superadmin menglik/membuka percakapan tertentu.

### 3. Frontend & UI Integration
- [ ] **Sidebar / Navbar Menu**:
  - Tambahkan komponen badge kecil di samping label "Support".
  - *Conditional Rendering*: Sembunyikan badge jika `unread_count === 0`.
- [ ] **Event Handler (Saat Chat Dibuka)**:
  - Panggil API *Mark as Read* saat Admin memilih percakapan.
  - Update state lokal/global agar angka badge langsung berkurang tanpa perlu *refresh* halaman.

### 4. Real-time Event (Optional / Recommended)
- [ ] Hubungkan event pesan baru (via WebSocket/Pusher/Socket.io) ke state badge agar angka bertambah secara live tanpa reload.

---

## 🧪 Testing Checklist

- [ ] **Pesan Baru Masuk**: Angka badge bertambah sesuai jumlah pesan baru.
- [ ] **Admin Membuka Chat**: Angka badge berkurang sesuai jumlah pesan yang dibaca di room tersebut.
- [ ] **Semua Dibaca**: Badge menghilang otomatis saat `unread_count = 0`.
- [ ] **Multiple Users**: Pastikan penghitungan agregat total unread dari seluruh user ke admin sudah akurat.