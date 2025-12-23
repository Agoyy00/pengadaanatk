<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Pengajuan;
use App\Models\PengajuanItem;
use App\Models\Periode;
use App\Models\Notification;
use App\Models\User;

use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class PengajuanController extends Controller
{
    /**
     * GET /api/pengajuan
     * User → hanya riwayat dirinya sendiri (pakai query ?user_id=)
     * Admin → semua pengajuan
     */
    public function index(Request $request)
    {
        $query = Pengajuan::with(['items.barang', 'user'])
            ->orderBy('created_at', 'desc');

        // Jika user_id ada → tampilkan hanya milik user itu
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        return response()->json($query->get());
    }

    /**
     * GET /api/pengajuan/check/{user}/{tahun}
     * Dipakai di STEP 1:
     * - Untuk menampilkan pesan "Anda sudah pernah mengajukan..."
     * - Hanya cek berdasarkan user_id + tahun_akademik
     */
    public function checkUserPengajuan($userId, $tahunAkademik)
    {
        $sudah = Pengajuan::where('user_id', $userId)
            ->where('tahun_akademik', $tahunAkademik)
            ->exists();

        return response()->json([
            'already' => $sudah,
        ]);
    }

    /**
     * POST /api/pengajuan
     * Simpan pengajuan baru milik user tertentu
     * + Hanya 1x per tahun akademik per user
     * + Hanya boleh kalau periode tahun akademik itu sedang dibuka
     */
    public function store(Request $request)
    {
        // Validasi data
        $validated = $request->validate([
            'tahun_akademik'          => 'required',
            'nama_pemohon'            => 'required',
            'jabatan'                 => 'required',
            'unit'                    => 'required',
            'user_id'                 => 'required|exists:users,id',
            'items'                   => 'required|array|min:1',

            'items.*.id'              => 'required|integer|exists:barangs,id',
            'items.*.kebutuhanTotal'  => 'required|numeric',
            'items.*.sisaStok'        => 'required|numeric',
            'items.*.jumlahDiajukan'  => 'required|numeric|min:1',
            'items.*.estimasiNilai'   => 'required|numeric',
        ]);

        $tahunAkademik = $validated['tahun_akademik'];
        $userId        = $validated['user_id'];
        $now           = Carbon::now('Asia/Jakarta');

        // 1. CEK PERIODE TAHUN AKADEMIK INI MASIH DIBUKA
        $periode = Periode::where('tahun_akademik', $tahunAkademik)
            ->where('mulai', '<=', $now)
            ->where('selesai', '>=', $now)
            ->first();

        if (!$periode) {
            return response()->json([
                'success' => false,
                'message' => 'Periode pengajuan untuk tahun akademik ini belum dibuka atau sudah ditutup.',
            ], 422);
        }

        if (!$now->between($periode->mulai, $periode->selesai) || !$periode->is_open) {
            return response()->json([
                'success' => false,
                'message' => 'Periode pengajuan saat ini tidak aktif.',
            ], 422);
        }

        // 2. CEK: USER SUDAH PERNAH MENGAJUKAN DI TAHUN INI?
        $sudahAda = Pengajuan::where('user_id', $userId)
            ->where('tahun_akademik', $tahunAkademik)
            ->exists();

        if ($sudahAda) {
            return response()->json([
                'success' => false,
                'message' => 'Anda sudah pernah mengajukan ATK pada tahun akademik ini. Pengajuan hanya diperbolehkan satu kali per periode.',
            ], 422);
        }

        // 3. HITUNG TOTAL NILAI & JUMLAH
        $totalNilai = 0;
        $totalJumlahDiajukan = 0;

        foreach ($validated['items'] as $item) {
            $subtotal = $item['jumlahDiajukan'] * $item['estimasiNilai'];
            $totalNilai += $subtotal;
            $totalJumlahDiajukan += $item['jumlahDiajukan'];
        }

        // 4. SIMPAN HEADER PENGAJUAN
        $pengajuan = Pengajuan::create([
            'tahun_akademik'         => $validated['tahun_akademik'],
            'nama_pemohon'           => $validated['nama_pemohon'],
            'jabatan'                => $validated['jabatan'],
            'unit'                   => $validated['unit'],
            'status'                 => 'diajukan',
            'total_nilai'            => $totalNilai,
            'total_jumlah_diajukan'  => $totalJumlahDiajukan,
            'user_id'                => $validated['user_id'],
        ]);

        // 5. SIMPAN DETAIL ITEM
        foreach ($validated['items'] as $item) {
            $subtotal = $item['jumlahDiajukan'] * $item['estimasiNilai'];

            PengajuanItem::create([
                'pengajuan_id'    => $pengajuan->id,
                'barang_id'       => $item['id'],
                'kebutuhan_total' => $item['kebutuhanTotal'],
                'sisa_stok'       => $item['sisaStok'],
                'jumlah_diajukan' => $item['jumlahDiajukan'],
                'harga_satuan'    => $item['estimasiNilai'],
                'subtotal'        => $subtotal,
            ]);
        }

        return response()->json([
            'success'   => true,
            'message'   => 'Pengajuan berhasil dibuat',
            'pengajuan' => $pengajuan->load('items.barang'),
        ]);
    }

    /**
     * PATCH /api/pengajuan/{pengajuan}/status
     * Admin → update status pengajuan (diajukan / diverifikasi / ditolak / disetujui)
     * ✅ Tambah: ketika status menjadi "diverifikasi" → buat notifikasi untuk semua SuperAdmin
     */
    public function updateStatus(Request $request, Pengajuan $pengajuan)
    {
        $request->validate([
            'status' => 'required|in:diajukan,diverifikasi,ditolak,disetujui',
        ]);

        if ($pengajuan->status !== 'diajukan') {
            return response()->json([
                'success' => false,
                'message' => 'Status tidak dapat diubah karena pengajuan sudah ' . $pengajuan->status,
            ], 422);
        }

        $pengajuan->status = $request->status;
        $pengajuan->save();

        // ✅ NOTIFIKASI SAAT DIVERIFIKASI
        if ($request->status === 'diverifikasi') {
            $superAdmins = User::where('role', 'superadmin')->get();

            foreach ($superAdmins as $sa) {
                Notification::create([
                    'user_id'     => $sa->id,
                    'pengajuan_id'=> $pengajuan->id,
                    'title'       => 'Pengajuan diverifikasi admin',
                    'message'     => 'Pengajuan dari ' . $pengajuan->nama_pemohon . ' (' . $pengajuan->unit . ') sudah diverifikasi.',
                    'is_read'     => false,
                ]);
            }
        }

        return response()->json([
            'success'   => true,
            'message'   => 'Status pengajuan berhasil diperbarui',
            'pengajuan' => $pengajuan,
        ]);
    }

    /**
     * GET /api/analisis-barang
     */
    public function analisisBarang(Request $request)
    {
        $request->validate([
            'barang_id'      => 'required|integer|exists:barangs,id',
            'tahun_akademik' => 'nullable|string',
            'unit'           => 'nullable|string',
        ]);

        $barangId      = $request->query('barang_id');
        $tahunAkademik = $request->query('tahun_akademik');
        $unit          = $request->query('unit');

        // Info barang
        $barang = DB::table('barangs')->where('id', $barangId)->first();

        if (!$barang) {
            return response()->json([
                'success' => false,
                'message' => 'Barang tidak ditemukan.',
            ], 404);
        }

        // Base query (join ke pengajuans)
        $baseQuery = DB::table('pengajuan_items')
            ->join('pengajuans', 'pengajuan_items.pengajuan_id', '=', 'pengajuans.id')
            ->where('pengajuan_items.barang_id', $barangId);

        // Filter tahun akademik (kecuali "all")
        if ($tahunAkademik && $tahunAkademik !== 'all') {
            $baseQuery->where('pengajuans.tahun_akademik', $tahunAkademik);
        }

        // Filter unit (kecuali "all")
        if ($unit && $unit !== 'all') {
            $baseQuery->where('pengajuans.unit', $unit);
        }

        // Ringkasan total semua unit
        $summary = (clone $baseQuery)
            ->selectRaw('
                SUM(pengajuan_items.kebutuhan_total) as total_kebutuhan,
                SUM(pengajuan_items.sisa_stok)       as total_sisa_stok,
                SUM(pengajuan_items.jumlah_diajukan) as total_diajukan
            ')
            ->first();

        if (!$summary || !$summary->total_diajukan) {
            return response()->json([
                'success' => true,
                'message' => 'Belum ada data pengajuan untuk barang ini dengan filter yang dipilih.',
                'barang'  => $barang,
                'summary' => null,
                'per_unit'=> [],
            ]);
        }

        // Group per unit
        $perUnitRows = (clone $baseQuery)
            ->selectRaw('
                pengajuans.unit as unit,
                SUM(pengajuan_items.kebutuhan_total) as total_kebutuhan,
                SUM(pengajuan_items.sisa_stok)       as total_sisa_stok,
                SUM(pengajuan_items.jumlah_diajukan) as total_diajukan
            ')
            ->groupBy('pengajuans.unit')
            ->orderBy('pengajuans.unit')
            ->get();

        $perUnit = $perUnitRows->map(function ($row) {
            $row->penggunaan = ($row->total_kebutuhan ?? 0) - ($row->total_sisa_stok ?? 0);
            return $row;
        });

        $summaryData = [
            'total_kebutuhan' => (int) $summary->total_kebutuhan,
            'total_sisa_stok' => (int) $summary->total_sisa_stok,
            'total_diajukan'  => (int) $summary->total_diajukan,
            'penggunaan'      => (int) $summary->total_kebutuhan - (int) $summary->total_sisa_stok,
        ];

        return response()->json([
            'success'        => true,
            'message'        => 'Data analisis berhasil diambil.',
            'barang'         => [
                'id'     => $barang->id,
                'nama'   => $barang->nama,
                'satuan' => $barang->satuan,
            ],
            'tahun_akademik' => $tahunAkademik,
            'unit_filter'    => $unit,
            'summary'        => $summaryData,
            'per_unit'       => $perUnit,
        ]);
    }

    /**
     * PATCH /api/pengajuan/{pengajuan}/revisi
     * revisiItems - sesuai kode kamu
     */
    public function revisiItems(Request $request, Pengajuan $pengajuan)
    {
        $validated = $request->validate([
            'items'                     => 'required|array|min:1',
            'items.*.id'                => 'required|integer|exists:pengajuan_items,id',
            'items.*.jumlah_disetujui'  => 'required|integer|min:0',
            'items.*.catatan_revisi'    => 'nullable|string',
        ]);

        if (!in_array($pengajuan->status, ['diajukan', 'diverifikasi'])) {
            return response()->json([
                'success' => false,
                'message' => 'Pengajuan tidak dapat direvisi karena status sudah ' . $pengajuan->status,
            ], 422);
        }

        foreach ($validated['items'] as $rev) {
            $item = PengajuanItem::where('pengajuan_id', $pengajuan->id)
                ->where('id', $rev['id'])
                ->first();

            if (!$item) {
                continue;
            }

            $item->jumlah_disetujui = $rev['jumlah_disetujui'];
            $item->catatan_revisi   = $rev['catatan_revisi'] ?? null;
            $item->save();
        }

        // Hitung ulang total berdasarkan jumlah_disetujui (kalau null → jumlah_diajukan)
        $items = PengajuanItem::where('pengajuan_id', $pengajuan->id)->get();

        $totalJumlah = 0;
        $totalNilai  = 0;

        foreach ($items as $it) {
            $qty = $it->jumlah_disetujui ?? $it->jumlah_diajukan;
            $totalJumlah += $qty;
            $totalNilai  += $qty * $it->harga_satuan;
        }

        $pengajuan->total_jumlah_diajukan = $totalJumlah;
        $pengajuan->total_nilai           = $totalNilai;
        $pengajuan->status                = 'disetujui';
        $pengajuan->save();

        return response()->json([
            'success'   => true,
            'message'   => 'Revisi jumlah barang berhasil disimpan.',
            'pengajuan' => $pengajuan->load('items.barang'),
        ]);
    }
}
