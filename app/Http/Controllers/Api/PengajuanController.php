<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Pengajuan;
use App\Models\PengajuanItem;
use Illuminate\Http\Request;

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
     * POST /api/pengajuan
     * Simpan pengajuan baru milik user tertentu
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

        // Hitung total nilai & jumlah
        $totalNilai = 0;
        $totalJumlahDiajukan = 0;

        foreach ($validated['items'] as $item) {
            $subtotal = $item['jumlahDiajukan'] * $item['estimasiNilai'];
            $totalNilai += $subtotal;
            $totalJumlahDiajukan += $item['jumlahDiajukan'];
        }

        // Simpan header pengajuan
        $pengajuan = Pengajuan::create([
            'tahun_akademik'         => $validated['tahun_akademik'],
            'nama_pemohon'           => $validated['nama_pemohon'],
            'jabatan'                => $validated['jabatan'],
            'unit'                   => $validated['unit'],
            'status'                 => 'diajukan',              // belum diverifikasi
            'total_nilai'            => $totalNilai,
            'total_jumlah_diajukan'  => $totalJumlahDiajukan,
            'user_id'                => $validated['user_id'],
        ]);

        // Simpan semua item barang
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
            'success'     => true,
            'message'     => 'Pengajuan berhasil dibuat',
            'pengajuan'   => $pengajuan->load('items.barang'),
        ]);
    }

    /**
     * PATCH /api/pengajuan/{pengajuan}/status
     * Admin → update status pengajuan (diajukan / diverifikasi / ditolak)
     */
   public function updateStatus(Request $request, Pengajuan $pengajuan)
{
    $request->validate([
        'status' => 'required|in:diajukan,diverifikasi,ditolak,disetujui',
    ]);


        // ❌ HANYA boleh ubah kalau masih "diajukan"
        if ($pengajuan->status !== 'diajukan') {
            return response()->json([
                'success' => false,
                'message' => 'Status tidak dapat diubah karena pengajuan sudah ' . $pengajuan->status,
            ], 422);
        }

        $pengajuan->status = $request->status;
        $pengajuan->save();

        return response()->json([
            'success'   => true,
            'message'   => 'Status pengajuan berhasil diperbarui',
            'pengajuan' => $pengajuan,
        ]);
    }
}
