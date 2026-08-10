<?php

namespace App\Http\Controllers\Api;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\Controller;
use App\Models\Pengajuan;
use App\Models\PengajuanItem;
use App\Models\Periode;
use App\Models\StockOpname;
use App\Models\Notification;
use App\Models\User;
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\BarangATKImport;


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
     * - Cek berdasarkan user_id + tahun_akademik dan keberadaan stock opname
     */
    public function checkUserPengajuan($userId, $tahunAkademik)
    {
        $sudah = Pengajuan::where('user_id', $userId)
            ->where('tahun_akademik', $tahunAkademik)
            ->exists();

        $now = Carbon::now('Asia/Jakarta');
        $periode = Periode::where('tahun_akademik', $tahunAkademik)->first();
        if (!$periode) {
            $periode = Periode::where('mulai', '<=', $now)->where('selesai', '>=', $now)->first();
        }

        $hasStockOpname = false;
        if ($periode) {
            $hasStockOpname = StockOpname::where('user_id', $userId)
                ->where('created_at', '>=', Carbon::parse($periode->mulai)->subDays(7))
                ->exists();

            if (!$hasStockOpname) {
                $hasStockOpname = StockOpname::where('user_id', $userId)->exists();
            }
        } else {
            $hasStockOpname = StockOpname::where('user_id', $userId)->exists();
        }

        return response()->json([
            'already'          => $sudah,
            'has_stock_opname' => $hasStockOpname,
        ]);
    }

    /**
     * POST /api/pengajuan
     * Simpan pengajuan baru milik user tertentu
     * + Hanya 1x per tahun akademik per user
     * + Hanya boleh kalau periode tahun akademik itu sedang dibuka
     * + Hanya boleh jika user sudah melakukan stock opname
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

        // 1.5. CEK: USER SUDAH MELAKUKAN STOCK OPNAME PADA PERIODE INI?
        $hasStockOpname = StockOpname::where('user_id', $userId)
            ->where('created_at', '>=', Carbon::parse($periode->mulai)->subDays(7))
            ->exists();

        if (!$hasStockOpname) {
            $hasStockOpname = StockOpname::where('user_id', $userId)->exists();
        }

        if (!$hasStockOpname) {
            return response()->json([
                'success' => false,
                'message' => 'Anda belum melakukan Stock Opname pada periode pengajuan ini. Silakan lakukan Stock Opname terlebih dahulu sebelum membuat pengajuan ATK.',
            ], 422);
        }

        // 1.6. CEK & SET UNIT USER (SATU UNIT PER USER)
        $user = User::findOrFail($userId);
        if (empty($user->unit)) {
            $user->unit = $validated['unit'];
            $user->save();
        } elseif ($user->unit !== $validated['unit']) {
            return response()->json([
                'success' => false,
                'message' => 'Unit Anda sudah terdaftar sebagai "' . $user->unit . '". Anda hanya diperbolehkan menggunakan satu unit.',
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
       $admins = User::whereIn('role_id', [2])->get();
        foreach ($admins as $admin) {
            Notification::create([
                'user_id'      => $admin->id,
                'title'        => 'Pengajuan ATK Baru',
                'message'      => 'Ada pengajuan ATK baru dari ' . $validated['nama_pemohon'],
                'pengajuan_id' => $pengajuan->id,
                'is_read'      => false,
            ]);
        }


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
    $validated = $request->validate([
        'status'  => 'required|in:diverifikasi_admin,disetujui,ditolak_admin',
        'user_id' => 'required|exists:users,id',
    ]);

    $user = Auth::user();

    $nextStatus = $validated['status'];

    // ================= ADMIN =================
    if ($user->role_id === 2) {

        if ($pengajuan->status !== 'diajukan' || !in_array($nextStatus, ['diverifikasi_admin', 'ditolak_admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Admin hanya boleh memverifikasi atau menolak pengajuan',
            ], 422);
        }

        $catatanAdmin = $request->input('catatan_admin') ?: ($nextStatus === 'ditolak_admin' ? 'Pengajuan ditolak oleh Admin' : null);

        $pengajuan->update([
            'status'        => $nextStatus,
            'catatan_admin' => $catatanAdmin,
            'verified_by'   => Auth::id(),
            'verified_at'   => now(),
        ]);

        // LOG ACTIVITY
        $actionName = ($nextStatus === 'ditolak_admin') ? 'tolak_pengajuan' : 'verifikasi_pengajuan';
        $descText   = ($nextStatus === 'ditolak_admin') ? "Admin menolak Pengajuan #{$pengajuan->id}" : "Admin memverifikasi Pengajuan #{$pengajuan->id}";

        \Illuminate\Support\Facades\DB::table('admin_activity_logs')->insert([
            'user_id'     => Auth::id() ?? $validated['user_id'],
            'action'      => $actionName,
            'description' => $descText,
            'details'     => json_encode(['status' => $nextStatus, 'catatan' => $request->input('catatan_admin')]),
            'ip_address'  => $request->ip(),
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        // hapus notif admin
        Notification::where('pengajuan_id', $pengajuan->id)
            ->where('user_id', $user->id)
            ->delete();

        if ($nextStatus === 'diverifikasi_admin') {
            // notif ke superadmin
            $superAdmins = User::where('role_id', 1)->get();
            foreach ($superAdmins as $sa) {
                Notification::create([
                    'user_id'      => $sa->id,
                    'title'        => 'Pengajuan Menunggu Persetujuan',
                    'message'      => 'Pengajuan ATK telah diverifikasi admin.',
                    'pengajuan_id' => $pengajuan->id,
                    'is_read'      => false,
                ]);
            }
            $message = 'Pengajuan berhasil diverifikasi admin';
        } else {
            // notif ke user pemohon
            Notification::create([
                'user_id'      => $pengajuan->user_id,
                'title'        => 'Pengajuan ATK Ditolak',
                'message'      => 'Pengajuan ATK Anda ditolak oleh Admin. Catatan: ' . $request->input('catatan_admin'),
                'pengajuan_id' => $pengajuan->id,
                'is_read'      => false,
            ]);
            $message = 'Pengajuan berhasil ditolak admin';
        }

        return response()->json([
            'success' => true,
            'message' => $message,
            'pengajuan' => $pengajuan,
        ]);
    }

    // ================= SUPERADMIN =================
    if ($user->role_id === 1) {

        if (
            $pengajuan->status !== 'diverifikasi_admin' ||
            !in_array($nextStatus, ['disetujui', 'ditolak_admin'])
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Superadmin hanya boleh approve / tolak',
            ], 422);
        }

        Notification::where('pengajuan_id', $pengajuan->id)->delete();

        $pengajuan->update([
            'status'       => $nextStatus,
            'approved_by'  => Auth::id(),
            'approved_at'  => now(),
        ]);

        // LOG ACTIVITY
        \Illuminate\Support\Facades\DB::table('admin_activity_logs')->insert([
            'user_id'     => Auth::id() ?? $validated['user_id'],
            'action'      => 'verifikasi_pengajuan',
            'description' => "Admin memproses Pengajuan #{$pengajuan->id}",
            'details'     => json_encode(['status' => $nextStatus]),
            'ip_address'  => $request->ip(),
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pengajuan berhasil diproses superadmin',
            'pengajuan' => $pengajuan,
        ]);
    }

    return response()->json([
        'success' => false,
        'message' => 'Role tidak dikenali',
    ], 403);
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
    Log::info('REVISI MASUK', $request->all());

    $validated = $request->validate([
        'items'                     => 'required|array|min:1',
        'items.*.id'                => 'required|integer|exists:pengajuan_items,id',
        'items.*.jumlah_disetujui'  => 'required|integer|min:0',
        'items.*.catatan_revisi'    => 'nullable|string',
        'items.*.kebutuhan_total'   => 'nullable|integer|min:0', // ini akan kita map ke kebutuhan_total_admin
        'items.*.sisa_stok'         => 'nullable|integer|min:0', // ini akan kita map ke sisa_stok_admin
        'actor_user_id' => 'required|exists:users,id',
    ]);

    if ($pengajuan->status !== 'diajukan') {
        return response()->json([
            'success' => false,
            'message' => 'Pengajuan tidak bisa direvisi karena status sudah ' . $pengajuan->status,
        ], 422);
    }

    foreach ($validated['items'] as $rev) {
        $itemModel = PengajuanItem::where('pengajuan_id', $pengajuan->id)
            ->where('id', $rev['id'])
            ->first();

        if ($itemModel) {
            $updateData = [
                'jumlah_disetujui' => $rev['jumlah_disetujui'],
                'catatan_revisi'   => $rev['catatan_revisi'] ?? null,
            ];

            if (isset($rev['kebutuhan_total'])) {
                $updateData['kebutuhan_total_admin'] = $rev['kebutuhan_total'];
            }
            if (isset($rev['sisa_stok'])) {
                $updateData['sisa_stok_admin'] = $rev['sisa_stok'];
            }

            $itemModel->update($updateData);
        }
    }

    // 🔁 hitung ulang total berdasarkan jumlah_disetujui
    $items = PengajuanItem::where('pengajuan_id', $pengajuan->id)->get();

    $totalJumlah = 0;
    $totalNilai  = 0;

    foreach ($items as $it) {
        $qty = $it->jumlah_disetujui ?? 0;
        $totalJumlah += $qty;
        $totalNilai  += $qty * $it->harga_satuan;
    }

    $user = Auth::user();

    $pengajuan->update([
        'total_jumlah_diajukan' => $totalJumlah,
        'total_nilai'           => $totalNilai,
        'verified_by' => Auth::id(),
        'verified_at' => now(),
    ]);

    return response()->json([
        'success'   => true,
        'message'   => 'Revisi berhasil disimpan',
        'pengajuan' => $pengajuan->load('items.barang'),
    ]);
}




/**
 * GET /api/pengajuan/approval
 * Super Admin → hanya pengajuan yang sudah diverifikasi admin
 */
    public function approvalList()
    {
        $data = Pengajuan::with(['items.barang', 'user'])
            ->where('status', 'diverifikasi_admin')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($data);
    }
    public function importBarangATK(Request $request)
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,xls',
            'actor_user_id' => 'required|exists:users,id',
        ]);

        try {
            Excel::import(
                new BarangATKImport($request->actor_user_id),
                $request->file('file')
            );

            return response()->json([
                'success' => true,
                'message' => 'Import barang ATK berhasil'
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function checkLimit(Request $request, $userId)
    {
        $tahun = $request->query('tahun');

        if (!$tahun) {
            return response()->json([
                'already' => false,
                'has_stock_opname' => false,
            ]);
        }

        $exists = Pengajuan::where('user_id', $userId)
            ->where('tahun_akademik', $tahun)
            ->exists();

        $now = Carbon::now('Asia/Jakarta');
        $periode = Periode::where('tahun_akademik', $tahun)->first();
        if (!$periode) {
            $periode = Periode::where('mulai', '<=', $now)->where('selesai', '>=', $now)->first();
        }

        $hasStockOpname = false;
        if ($periode) {
            $hasStockOpname = StockOpname::where('user_id', $userId)
                ->where('created_at', '>=', Carbon::parse($periode->mulai)->subDays(7))
                ->exists();

            if (!$hasStockOpname) {
                $hasStockOpname = StockOpname::where('user_id', $userId)->exists();
            }
        } else {
            $hasStockOpname = StockOpname::where('user_id', $userId)->exists();
        }

        return response()->json([
            'already' => $exists,
            'has_stock_opname' => $hasStockOpname,
        ]);
    }

    /**
     * GET /api/pengajuan/user-statistik
     * Data agregat untuk grafik riwayat pengajuan milik user tertentu.
     * Query: user_id (required), tahun_akademik (optional), status (optional)
     */
    public function userStatistik(Request $request)
    {
        $request->validate([
            'user_id'         => 'required|integer|exists:users,id',
            'tahun_akademik'  => 'nullable|string',
            'status'          => 'nullable|string',
        ]);

        $userId = (int) $request->query('user_id');
        $tahunFilter = $request->query('tahun_akademik');
        $statusFilter = $request->query('status');

        $query = Pengajuan::query()
            ->where('user_id', $userId)
            ->with(['items.barang']);

        if ($tahunFilter && $tahunFilter !== 'all') {
            $query->where('tahun_akademik', $tahunFilter);
        }

        if ($statusFilter && $statusFilter !== 'all') {
            $query->where('status', $statusFilter);
        }

        $pengajuans = $query->orderBy('created_at', 'desc')->get();

        $totalPengajuan = $pengajuans->count();
        $totalNilaiDiajukan = 0;
        $totalNilaiDisetujui = 0;
        $totalQtyDiajukan = 0;
        $totalQtyDisetujui = 0;

        $trenMap = [];
        $komposisiMap = [];
        $perbandinganMap = [];

        foreach ($pengajuans as $p) {
            $tahun = $p->tahun_akademik;
            $tahunKey = $tahun ?: 'Tanpa Tahun';

            if (!isset($trenMap[$tahunKey])) {
                $trenMap[$tahunKey] = [
                    'tahun' => $tahunKey,
                    'nilai_diajukan' => 0,
                    'nilai_disetujui' => 0,
                ];
            }
            if (!isset($perbandinganMap[$tahunKey])) {
                $perbandinganMap[$tahunKey] = [
                    'tahun' => $tahunKey,
                    'diajukan' => 0,
                    'disetujui' => 0,
                ];
            }

            $pengajuanNilaiDiajukan = 0;
            $pengajuanNilaiDisetujui = 0;
            $pengajuanQtyDiajukan = 0;
            $pengajuanQtyDisetujui = 0;

            foreach ($p->items as $item) {
                $qtyDiajukan = (int) ($item->jumlah_diajukan ?? 0);
                $qtyDisetujui = (int) ($item->jumlah_disetujui ?? $qtyDiajukan);
                $harga = (int) ($item->harga_satuan ?? 0);

                $nilaiDiajukan = $qtyDiajukan * $harga;
                $nilaiDisetujui = $qtyDisetujui * $harga;

                $pengajuanNilaiDiajukan += $nilaiDiajukan;
                $pengajuanNilaiDisetujui += $nilaiDisetujui;
                $pengajuanQtyDiajukan += $qtyDiajukan;
                $pengajuanQtyDisetujui += $qtyDisetujui;

                $namaBarang = $item->barang->nama ?? 'Barang Lainnya';
                if (!isset($komposisiMap[$namaBarang])) {
                    $komposisiMap[$namaBarang] = [
                        'nama_barang' => $namaBarang,
                        'jumlah_disetujui' => 0,
                        'nilai_disetujui' => 0,
                    ];
                }
                $komposisiMap[$namaBarang]['jumlah_disetujui'] += $qtyDisetujui;
                $komposisiMap[$namaBarang]['nilai_disetujui'] += $nilaiDisetujui;
            }

            $trenMap[$tahunKey]['nilai_diajukan'] += $pengajuanNilaiDiajukan;
            $trenMap[$tahunKey]['nilai_disetujui'] += $pengajuanNilaiDisetujui;

            $perbandinganMap[$tahunKey]['diajukan'] += $pengajuanQtyDiajukan;
            $perbandinganMap[$tahunKey]['disetujui'] += $pengajuanQtyDisetujui;

            $totalNilaiDiajukan += $pengajuanNilaiDiajukan;
            $totalNilaiDisetujui += $pengajuanNilaiDisetujui;
            $totalQtyDiajukan += $pengajuanQtyDiajukan;
            $totalQtyDisetujui += $pengajuanQtyDisetujui;
        }

        $trenData = array_values($trenMap);
        $perbandinganData = array_values($perbandinganMap);

        $komposisiData = array_values($komposisiMap);
        usort($komposisiData, function ($a, $b) {
            return $b['nilai_disetujui'] <=> $a['nilai_disetujui'];
        });
        $komposisiData = array_slice($komposisiData, 0, 8);

        $tahunList = array_keys($trenMap);
        sort($tahunList);

        return response()->json([
            'success' => true,
            'filters' => [
                'tahun_list' => $tahunList,
                'status_list' => [
                    ['value' => 'all', 'label' => 'Semua Status'],
                    ['value' => 'diajukan', 'label' => 'Diajukan'],
                    ['value' => 'diverifikasi_admin', 'label' => 'Diverifikasi Admin'],
                    ['value' => 'disetujui', 'label' => 'Disetujui'],
                    ['value' => 'ditolak_admin', 'label' => 'Ditolak Admin'],
                ],
            ],
            'summary' => [
                'total_pengajuan' => $totalPengajuan,
                'total_nilai_diajukan' => $totalNilaiDiajukan,
                'total_nilai_disetujui' => $totalNilaiDisetujui,
                'total_qty_diajukan' => $totalQtyDiajukan,
                'total_qty_disetujui' => $totalQtyDisetujui,
                'selisih_nilai' => $totalNilaiDisetujui - $totalNilaiDiajukan,
            ],
            'tren_tahun' => $trenData,
            'perbandingan_barang' => $perbandinganData,
            'komposisi_barang' => $komposisiData,
        ]);
    }

    /**
     * PATCH /api/pengajuan/{pengajuan}/user-revisi
     * User → revisi item pengajuan milik sendiri (selama status masih 'diajukan')
     * Logic: kebutuhan_total - sisa_stok = jumlah_diajukan
     * Mendukung update, penambahan barang baru, dan penghapusan barang.
     */
    public function userRevisiItems(Request $request, Pengajuan $pengajuan)
    {
        $validated = $request->validate([
            'items'                    => 'required|array|min:1',
            'items.*.id'               => 'nullable|integer',
            'items.*.barang_id'        => 'required|integer|exists:barangs,id',
            'items.*.kebutuhan_total'  => 'required|integer|min:0',
            'items.*.sisa_stok'        => 'required|integer|min:0',
        ]);

        // Pastikan status masih diajukan
        if ($pengajuan->status !== 'diajukan') {
            return response()->json([
                'success' => false,
                'message' => 'Pengajuan tidak bisa direvisi karena status sudah ' . $pengajuan->status,
            ], 422);
        }

        // Pastikan user hanya bisa revisi pengajuan miliknya
        $user = Auth::user();
        if ($pengajuan->user_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki akses untuk merevisi pengajuan ini.',
            ], 403);
        }

        $processedIds = [];
        $totalNilai = 0;
        $totalJumlahDiajukan = 0;

        foreach ($validated['items'] as $rev) {
            $barang = \App\Models\Barang::find($rev['barang_id']);
            if (!$barang) continue;

            $hargaSatuan = $barang->harga_satuan ?? 0;
            $jumlahDiajukan = max(0, $rev['kebutuhan_total'] - $rev['sisa_stok']);
            $subtotal = $jumlahDiajukan * $hargaSatuan;

            if (!empty($rev['id'])) {
                // Update item yang sudah ada
                $item = PengajuanItem::where('pengajuan_id', $pengajuan->id)
                    ->where('id', $rev['id'])
                    ->first();

                if ($item) {
                    $item->update([
                        'barang_id'       => $rev['barang_id'],
                        'kebutuhan_total' => $rev['kebutuhan_total'],
                        'sisa_stok'       => $rev['sisa_stok'],
                        'jumlah_diajukan' => $jumlahDiajukan,
                        'harga_satuan'    => $hargaSatuan,
                        'subtotal'        => $subtotal,
                    ]);
                    $processedIds[] = $item->id;
                }
            } else {
                // Tambah item baru yang baru dimasukkan user
                $newItem = PengajuanItem::create([
                    'pengajuan_id'    => $pengajuan->id,
                    'barang_id'       => $rev['barang_id'],
                    'kebutuhan_total' => $rev['kebutuhan_total'],
                    'sisa_stok'       => $rev['sisa_stok'],
                    'jumlah_diajukan' => $jumlahDiajukan,
                    'harga_satuan'    => $hargaSatuan,
                    'subtotal'        => $subtotal,
                ]);
                $processedIds[] = $newItem->id;
            }

            $totalJumlahDiajukan += $jumlahDiajukan;
            $totalNilai += $subtotal;
        }

        // Hapus item lama yang tidak ada lagi di daftar revisi
        PengajuanItem::where('pengajuan_id', $pengajuan->id)
            ->whereNotIn('id', $processedIds)
            ->delete();

        $pengajuan->update([
            'total_jumlah_diajukan' => $totalJumlahDiajukan,
            'total_nilai'           => $totalNilai,
        ]);

        return response()->json([
            'success'   => true,
            'message'   => 'Revisi pengajuan berhasil disimpan',
            'pengajuan' => $pengajuan->load('items.barang'),
        ]);
    }
}
