<?php

namespace App\Http\Controllers\Api;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Log;
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

    $user = User::find($validated['user_id']);
    $nextStatus = $validated['status'];

    // ================= ADMIN =================
    if ($user->role_id === 2) {

        if ($pengajuan->status !== 'diajukan' || $nextStatus !== 'diverifikasi_admin') {
            return response()->json([
                'success' => false,
                'message' => 'Admin hanya boleh memverifikasi pengajuan',
            ], 422);
        }

        // ❌ hapus notif admin
        Notification::where('pengajuan_id', $pengajuan->id)
            ->where('user_id', $user->id)
            ->delete();

        // ✅ kirim notif ke superadmin
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
    }

    // ================= SUPER ADMIN =================
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

        // ❌ hapus semua notif terkait pengajuan ini (admin + superadmin)
        Notification::where('pengajuan_id', $pengajuan->id)->delete();
    }

    // ✅ update status TERAKHIR
    $pengajuan->update(['status' => $nextStatus]);

    return response()->json([
        'success'   => true,
        'message'   => 'Status berhasil diperbarui',
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
    Log::info('REVISI MASUK', $request->all());

    $validated = $request->validate([
        'items'                     => 'required|array|min:1',
        'items.*.id'                => 'required|integer|exists:pengajuan_items,id',
        'items.*.jumlah_disetujui'  => 'required|integer|min:0',
        'items.*.catatan_revisi'    => 'nullable|string',
    ]);

    if ($pengajuan->status !== 'diajukan') {
        return response()->json([
            'success' => false,
            'message' => 'Pengajuan tidak bisa direvisi karena status sudah ' . $pengajuan->status,
        ], 422);
    }

    foreach ($validated['items'] as $rev) {
        PengajuanItem::where('pengajuan_id', $pengajuan->id)
            ->where('id', $rev['id'])
            ->update([
                // ⬇️ jumlah_disetujui = FINAL
                'jumlah_disetujui' => $rev['jumlah_disetujui'],
                'catatan_revisi'   => $rev['catatan_revisi'] ?? null,
            ]);
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

    $pengajuan->update([
        'total_jumlah_diajukan' => $totalJumlah,
        'total_nilai'           => $totalNilai,
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
    
    public function downloadPdf(Pengajuan $pengajuan)
{
    $pengajuan->load('items.barang');

    // 🔐 DATA VALIDASI (nanti dipakai QR)
    $payload = json_encode([
        'pengajuan_id' => $pengajuan->id,
        'status' => $pengajuan->status,
        'tanggal' => $pengajuan->updated_at->toIso8601String(),
    ]);

    // ⚠️ DUMMY QR (sementara, biar blade gak error)
    $qr = null;

    $pdf = Pdf::loadView('pdf.pengajuan', [
        'pengajuan' => $pengajuan,
        'qr'        => $qr, // ⬅️ INI YANG HILANG
    ])->setPaper('A4', 'portrait');

    return $pdf->download('Pengajuan-ATK-'.$pengajuan->id.'.pdf');
}
}
