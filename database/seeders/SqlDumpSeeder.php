<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class SqlDumpSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Roles
        $roles = [
            ['id' => 1, 'name' => 'superadmin'],
            ['id' => 2, 'name' => 'admin'],
            ['id' => 3, 'name' => 'user'],
        ];
        foreach ($roles as $r) {
            DB::table('roles')->updateOrInsert(['id' => $r['id']], $r);
        }

        // 2. Barangs
        $barangs = [
            ['id' => 1, 'kode' => 'ATK-001', 'nama' => 'Buku Tulis', 'satuan' => 'pcs', 'harga' => 0, 'stok' => 100, 'harga_satuan' => 10000, 'gambar' => 'dummy.jpeg', 'created_at' => '2025-12-27 08:15:22', 'updated_at' => '2025-12-27 08:48:40'],
            ['id' => 2, 'kode' => 'ATK-002', 'nama' => 'Pulpen', 'satuan' => 'pcs', 'harga' => 0, 'stok' => 150, 'harga_satuan' => 15000, 'gambar' => '1766873849_69505af9e71d4.jpeg', 'created_at' => '2025-12-27 22:17:29', 'updated_at' => '2025-12-27 22:17:31'],
            ['id' => 3, 'kode' => 'ATK-003', 'nama' => 'Kertas A4 80gr', 'satuan' => 'rim', 'harga' => 0, 'stok' => 50, 'harga_satuan' => 55000, 'gambar' => '1766875286_69506096ca1c3.jpeg', 'created_at' => '2025-12-27 22:41:26', 'updated_at' => '2025-12-27 22:41:26'],
            ['id' => 4, 'kode' => 'ATK-004', 'nama' => 'Spidol Boardmarker', 'satuan' => 'pcs', 'harga' => 0, 'stok' => 80, 'harga_satuan' => 15000, 'gambar' => '1766877679_695069ef89179.jpg', 'created_at' => '2025-12-27 23:21:19', 'updated_at' => '2025-12-27 23:21:19'],
            ['id' => 6, 'kode' => 'ATK-005', 'nama' => 'Map Snelhecter', 'satuan' => 'pcs', 'harga' => 0, 'stok' => 200, 'harga_satuan' => 10000, 'gambar' => '1766993790_69522f7e274b0.png', 'created_at' => '2025-12-29 07:36:30', 'updated_at' => '2025-12-29 07:36:31'],
        ];
        foreach ($barangs as $b) {
            DB::table('barangs')->updateOrInsert(['id' => $b['id']], $b);
        }

        // 3. Periodes
        $periodes = [
            ['id' => 1, 'tahun_akademik' => '2024/2025', 'mulai' => '2025-12-27 14:52:00', 'selesai' => '2026-12-31 23:59:59', 'is_open' => 1, 'created_at' => '2025-12-27 07:52:50', 'updated_at' => '2025-12-27 07:52:50']
        ];
        foreach ($periodes as $p) {
            DB::table('periodes')->updateOrInsert(['id' => $p['id']], $p);
        }

        // 4. Users
        $users = [
            ['id' => 1, 'name' => 'Super Admin ATK', 'email' => 'superadmin@atk.test', 'password' => Hash::make('password123'), 'is_ldap' => 0, 'role_id' => 1, 'created_at' => '2025-12-27 07:30:35', 'updated_at' => '2025-12-27 07:30:35'],
            ['id' => 2, 'name' => 'Super Admin YARSI', 'email' => 'superadmin@yarsi.ac.id', 'password' => Hash::make('password123'), 'is_ldap' => 0, 'role_id' => 1, 'created_at' => '2025-12-27 07:43:13', 'updated_at' => '2025-12-27 07:43:13'],
            ['id' => 3, 'name' => 'Admin ATK', 'email' => 'admin@atk.test', 'password' => Hash::make('password123'), 'is_ldap' => 0, 'role_id' => 2, 'created_at' => '2025-12-27 07:22:31', 'updated_at' => '2025-12-27 07:22:31'],
            ['id' => 4, 'name' => 'Admin YARSI', 'email' => 'admin@yarsi.ac.id', 'password' => Hash::make('password123'), 'is_ldap' => 0, 'role_id' => 2, 'created_at' => '2025-12-27 07:25:54', 'updated_at' => '2025-12-27 07:25:54'],
            ['id' => 5, 'name' => 'Alzkar', 'email' => 'alzkar@atk.test', 'password' => Hash::make('password123'), 'is_ldap' => 0, 'role_id' => 2, 'created_at' => '2025-12-27 07:51:10', 'updated_at' => '2025-12-27 07:51:10'],
            ['id' => 6, 'name' => 'Reichal', 'email' => 'reichal@atk.test', 'password' => Hash::make('password123'), 'is_ldap' => 0, 'role_id' => 1, 'created_at' => '2025-12-27 07:51:35', 'updated_at' => '2025-12-27 07:51:35'],
            ['id' => 7, 'name' => 'Agoy', 'email' => 'agoy@atk.test', 'password' => Hash::make('password123'), 'is_ldap' => 0, 'role_id' => 3, 'created_at' => '2025-12-27 07:51:50', 'updated_at' => '2025-12-27 07:51:50'],
            ['id' => 8, 'name' => 'User ATK', 'email' => 'user@atk.test', 'password' => Hash::make('password123'), 'is_ldap' => 0, 'role_id' => 3, 'created_at' => '2025-12-28 00:38:52', 'updated_at' => '2025-12-28 00:38:52'],
            ['id' => 9, 'name' => 'User YARSI', 'email' => 'user@yarsi.ac.id', 'password' => Hash::make('password123'), 'is_ldap' => 0, 'role_id' => 3, 'created_at' => '2025-12-28 00:38:52', 'updated_at' => '2025-12-28 00:38:52'],
        ];
        foreach ($users as $u) {
            DB::table('users')->updateOrInsert(['id' => $u['id']], $u);
        }

        // 5. Pengajuans
        $pengajuans = [
            ['id' => 1, 'user_id' => 7, 'tahun_akademik' => '2024/2025', 'nama_pemohon' => 'Agoy', 'jabatan' => 'Staf', 'unit' => 'Direktorat', 'status' => 'disetujui', 'total_nilai' => 90000, 'total_jumlah_diajukan' => 6, 'created_at' => '2025-12-27 23:50:22', 'updated_at' => '2025-12-28 13:16:02'],
            ['id' => 2, 'user_id' => 8, 'tahun_akademik' => '2024/2025', 'nama_pemohon' => 'User ATK', 'jabatan' => 'Staf', 'unit' => 'Fakultas Hukum', 'status' => 'disetujui', 'total_nilai' => 135000, 'total_jumlah_diajukan' => 9, 'created_at' => '2025-12-28 00:39:27', 'updated_at' => '2025-12-30 22:38:34'],
        ];
        foreach ($pengajuans as $p) {
            DB::table('pengajuans')->updateOrInsert(['id' => $p['id']], $p);
        }

        // 6. Pengajuan Items
        $items = [
            ['id' => 1, 'pengajuan_id' => 1, 'barang_id' => 3, 'kebutuhan_total' => 5, 'sisa_stok' => 2, 'jumlah_diajukan' => 6, 'jumlah_disetujui' => 6, 'catatan_revisi' => null, 'harga_satuan' => 15000, 'subtotal' => 90000, 'created_at' => '2025-12-27 23:50:22', 'updated_at' => '2025-12-28 00:16:22'],
            ['id' => 2, 'pengajuan_id' => 2, 'barang_id' => 3, 'kebutuhan_total' => 9, 'sisa_stok' => 1, 'jumlah_diajukan' => 8, 'jumlah_disetujui' => 9, 'catatan_revisi' => null, 'harga_satuan' => 15000, 'subtotal' => 135000, 'created_at' => '2025-12-28 00:39:27', 'updated_at' => '2025-12-30 22:31:54'],
        ];
        foreach ($items as $it) {
            DB::table('pengajuan_items')->updateOrInsert(['id' => $it['id']], $it);
        }
    }
}
