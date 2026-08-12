<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Barang;
use App\Models\Periode;
use App\Models\Pengajuan;
use App\Models\PengajuanItem;
use App\Models\StockOpname;
use Carbon\Carbon;

class SampleDataSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Ambil atau Buat User
        $user1 = User::firstOrCreate(
            ['email' => 'user@atk.test'],
            [
                'name' => 'User ATK',
                'password' => bcrypt('password123'),
                'role_id' => 3,
                'unit' => 'Fakultas Kedokteran',
                'unit_tahun_akademik' => '2025/2026'
            ]
        );

        $user2 = User::firstOrCreate(
            ['email' => 'user2@atk.test'],
            [
                'name' => 'Dr. Ahmad Hidayat',
                'password' => bcrypt('password123'),
                'role_id' => 3,
                'unit' => 'Fakultas Teknologi Informasi',
                'unit_tahun_akademik' => '2025/2026'
            ]
        );

        $user3 = User::firstOrCreate(
            ['email' => 'staff@yarsi.ac.id'],
            [
                'name' => 'Siti Rahmah',
                'password' => bcrypt('password123'),
                'role_id' => 3,
                'unit' => 'Fakultas Ekonomi & Bisnis',
                'unit_tahun_akademik' => '2025/2026'
            ]
        );

        $admin = User::firstOrCreate(
            ['email' => 'admin@atk.test'],
            [
                'name' => 'Admin ATK',
                'password' => bcrypt('password123'),
                'role_id' => 2,
            ]
        );

        // 2. Ambil Barang
        $barangs = Barang::all();
        if ($barangs->isEmpty()) {
            $this->call(BarangSeeder::class);
            $barangs = Barang::all();
        }

        $b1 = $barangs->first() ?? Barang::create(['kode' => 'ATK-001', 'nama' => 'Buku Tulis A4', 'satuan' => 'pcs', 'harga_satuan' => 10000]);
        $b2 = $barangs->skip(1)->first() ?? Barang::create(['kode' => 'ATK-002', 'nama' => 'Pulpen Gel Hitam 0.5mm', 'satuan' => 'pcs', 'harga_satuan' => 15000]);
        $b3 = $barangs->skip(2)->first() ?? Barang::create(['kode' => 'ATK-003', 'nama' => 'Spidol Whiteboard', 'satuan' => 'pcs', 'harga_satuan' => 12000]);

        // 3. Buat Periode
        $now = Carbon::now('Asia/Jakarta');
        
        Periode::updateOrCreate(
            ['jenis_periode' => 'Periode Pengajuan', 'tahun_akademik' => '2025/2026'],
            [
                'mulai' => $now->copy()->subDays(2),
                'selesai' => $now->copy()->addDays(5),
                'is_open' => true
            ]
        );

        Periode::updateOrCreate(
            ['jenis_periode' => 'Periode Stock Opname', 'tahun_akademik' => '2025/2026'],
            [
                'mulai' => $now->copy()->subDays(1),
                'selesai' => $now->copy()->addDays(3),
                'is_open' => true
            ]
        );

        // 4. Buat Sample Pengajuan ATK User
        $p1 = Pengajuan::create([
            'user_id' => $user1->id,
            'nama_pemohon' => $user1->name,
            'jabatan' => 'Dosen / Staf Pengajar',
            'unit' => 'Fakultas Kedokteran',
            'tahun_akademik' => '2025/2026',
            'status' => 'diverifikasi_admin',
            'total_nilai' => 140000,
            'total_jumlah_diajukan' => 12,
            'verified_by' => $admin->id,
            'verified_at' => $now->copy()->subHours(5),
            'catatan_admin' => 'Jumlah barang disetujui sesuai kuota fakultas.'
        ]);

        PengajuanItem::create([
            'pengajuan_id' => $p1->id,
            'barang_id' => $b1->id,
            'kebutuhan_total' => 10,
            'sisa_stok' => 2,
            'jumlah_diajukan' => 8,
            'jumlah_disetujui' => 8,
            'harga_satuan' => 10000,
            'subtotal' => 80000
        ]);

        PengajuanItem::create([
            'pengajuan_id' => $p1->id,
            'barang_id' => $b2->id,
            'kebutuhan_total' => 5,
            'sisa_stok' => 1,
            'jumlah_diajukan' => 4,
            'jumlah_disetujui' => 4,
            'harga_satuan' => 15000,
            'subtotal' => 60000
        ]);

        $p2 = Pengajuan::create([
            'user_id' => $user2->id,
            'nama_pemohon' => $user2->name,
            'jabatan' => 'Kepala Laboratorium',
            'unit' => 'Fakultas Teknologi Informasi',
            'tahun_akademik' => '2025/2026',
            'status' => 'diajukan',
            'total_nilai' => 90000,
            'total_jumlah_diajukan' => 6,
        ]);

        PengajuanItem::create([
            'pengajuan_id' => $p2->id,
            'barang_id' => $b3->id,
            'kebutuhan_total' => 8,
            'sisa_stok' => 2,
            'jumlah_diajukan' => 6,
            'harga_satuan' => 15000,
            'subtotal' => 90000
        ]);

        $p3 = Pengajuan::create([
            'user_id' => $user3->id,
            'nama_pemohon' => $user3->name,
            'jabatan' => 'Sekretaris Program Studi',
            'unit' => 'Fakultas Ekonomi & Bisnis',
            'tahun_akademik' => '2025/2026',
            'status' => 'disetujui',
            'total_nilai' => 150000,
            'total_jumlah_diajukan' => 15,
            'verified_by' => $admin->id,
            'verified_at' => $now->copy()->subDays(1),
            'approved_at' => $now->copy()->subHours(2),
        ]);

        PengajuanItem::create([
            'pengajuan_id' => $p3->id,
            'barang_id' => $b1->id,
            'kebutuhan_total' => 20,
            'sisa_stok' => 5,
            'jumlah_diajukan' => 15,
            'jumlah_disetujui' => 15,
            'harga_satuan' => 10000,
            'subtotal' => 150000
        ]);

        // 5. Buat Sample Stock Opname User
        StockOpname::create([
            'barang_id' => $b1->id,
            'user_id' => $user1->id,
            'unit' => 'Fakultas Kedokteran',
            'stok_sistem' => 25,
            'stok_fisik' => 24,
            'selisih' => -1,
            'status' => 'diverifikasi_admin',
            'hasil_verifikasi' => 'Sesuai catatan admin'
        ]);

        StockOpname::create([
            'barang_id' => $b2->id,
            'user_id' => $user2->id,
            'unit' => 'Fakultas Teknologi Informasi',
            'stok_sistem' => 10,
            'stok_fisik' => 10,
            'selisih' => 0,
            'status' => 'diajukan',
        ]);

        StockOpname::create([
            'barang_id' => $b3->id,
            'user_id' => $user3->id,
            'unit' => 'Fakultas Ekonomi & Bisnis',
            'stok_sistem' => 15,
            'stok_fisik' => 12,
            'selisih' => -3,
            'status' => 'disetujui',
        ]);

        // 6. Buat Sample Admin Activity Logs
        \Illuminate\Support\Facades\DB::table('admin_activity_logs')->insert([
            [
                'user_id' => $admin->id,
                'action' => 'verifikasi_pengajuan',
                'description' => "Memverifikasi Pengajuan #{$p1->id} oleh {$user1->name}",
                'details' => json_encode(['pengajuan_id' => $p1->id, 'status' => 'diverifikasi_admin']),
                'created_at' => $now->copy()->subHours(5),
                'updated_at' => $now->copy()->subHours(5),
            ],
            [
                'user_id' => $admin->id,
                'action' => 'stock_opname_verify',
                'description' => "Memverifikasi Stock Opname Barang {$b1->nama} oleh {$user1->name}",
                'details' => json_encode(['stock_opname_id' => 1]),
                'created_at' => $now->copy()->subHours(3),
                'updated_at' => $now->copy()->subHours(3),
            ],
            [
                'user_id' => $admin->id,
                'action' => 'barang_create',
                'description' => "Menambahkan barang baru: {$b1->nama} ({$b1->kode})",
                'details' => json_encode(['barang_id' => $b1->id]),
                'created_at' => $now->copy()->subDays(1),
                'updated_at' => $now->copy()->subDays(1),
            ],
            [
                'user_id' => $admin->id,
                'action' => 'atur_periode',
                'description' => "Mengatur Periode Pengajuan 2025/2026",
                'details' => json_encode(['periode' => '2025/2026']),
                'created_at' => $now->copy()->subDays(2),
                'updated_at' => $now->copy()->subDays(2),
            ],
        ]);
    }
}
