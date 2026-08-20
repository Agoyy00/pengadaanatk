<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Pengajuan;
use App\Models\PengajuanItem;
use App\Models\PengambilanBarang;
use App\Models\PengambilanBarangItem;
use App\Models\Barang;
use App\Models\BarangAuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Barryvdh\DomPDF\Facade\Pdf;

class PengambilanBarangController extends Controller
{
    /**
     * GET /api/pengambilan-barang
     * Daftar seluruh form serah terima/pengambilan barang
     */
    public function index(Request $request)
    {
        $query = PengambilanBarang::with(['pengajuan.user', 'items.barang', 'creator'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('nomor_pengambilan', 'like', "%$s%")
                  ->orWhere('nama_penerima', 'like', "%$s%")
                  ->orWhere('unit', 'like', "%$s%")
                  ->orWhereHas('pengajuan', function ($pq) use ($s) {
                      $pq->where('nama_pemohon', 'like', "%$s%")
                         ->orWhere('tahun_akademik', 'like', "%$s%");
                  });
            });
        }

        if ($request->filled('unit')) {
            $query->where('unit', $request->unit);
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('tanggal_pengambilan', [$request->start_date . ' 00:00:00', $request->end_date . ' 23:59:59']);
        }

        return response()->json([
            'success' => true,
            'data'    => $query->get(),
        ]);
    }

    /**
     * GET /api/pengambilan-barang/{id}
     * Detail serah terima barang
     */
    public function show($id)
    {
        $pengambilan = PengambilanBarang::with(['pengajuan.items.barang', 'items.barang', 'creator'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data'    => $pengambilan,
        ]);
    }

    /**
     * GET /api/pengajuan/{pengajuanId}/pengambilan
     * Ambil data form serah terima dan riwayat seluruh pengambilan untuk pengajuan tertentu
     */
    public function getByPengajuan($pengajuanId)
    {
        $pengajuan = Pengajuan::with(['items.barang', 'user'])->findOrFail($pengajuanId);

        // Ambil seluruh riwayat pengambilan untuk pengajuan ini
        $pengambilans = PengambilanBarang::with(['items.barang', 'creator'])
            ->where('pengajuan_id', $pengajuanId)
            ->orderBy('created_at', 'desc')
            ->get();

        // Hitung sisa yang belum diambil untuk setiap item
        $itemsWithRemaining = $pengajuan->items->map(function ($item) {
            $disetujui = $item->jumlah_disetujui ?? $item->jumlah_diajukan;
            $kumulatif = (int)($item->jumlah_diambil_kumulatif ?? 0);
            $sisa = max(0, $disetujui - $kumulatif);

            $itemArray = $item->toArray();
            $itemArray['jumlah_disetujui_final'] = $disetujui;
            $itemArray['jumlah_diambil_kumulatif'] = $kumulatif;
            $itemArray['sisa_belum_diambil'] = $sisa;
            return $itemArray;
        });

        $totalDisetujui = $pengajuan->items->sum(function ($item) {
            return $item->jumlah_disetujui ?? $item->jumlah_diajukan;
        });
        $totalSudahDiambil = $pengajuan->items->sum('jumlah_diambil_kumulatif');
        $isFullyTaken = ($totalSudahDiambil >= $totalDisetujui) && ($totalDisetujui > 0);

        return response()->json([
            'success'            => true,
            'pengajuan'          => $pengajuan,
            'items_status'       => $itemsWithRemaining,
            'pengambilan'        => $pengambilans->first(), // Pengambilan terakhir (jika ada)
            'pengambilans'       => $pengambilans,          // Seluruh histori pengambilan (multi-handover)
            'is_fully_taken'     => $isFullyTaken,
            'total_disetujui'    => $totalDisetujui,
            'total_sudah_diambil'=> $totalSudahDiambil,
            'total_sisa'         => max(0, $totalDisetujui - $totalSudahDiambil),
        ]);
    }

    /**
     * GET /api/pengajuan/{pengajuanId}/handover-history
     * Riwayat serah-terima pengambilan barang
     */
    public function getHandoverHistory($pengajuanId)
    {
        return $this->getByPengajuan($pengajuanId);
    }

    /**
     * POST /api/pengajuan/{pengajuanId}/pengambilan
     * Submit Form Pengambilan Barang & Auto-Deduct Stock (Multi-Handover Support + Row Locking)
     */
    public function store(Request $request, $pengajuanId)
    {
        $pengajuan = Pengajuan::with('items.barang')->findOrFail($pengajuanId);

        // Validasi: Status pengajuan harus disetujui / approved / diverifikasi / sebagian
        $allowedStatuses = ['disetujui', 'approved', 'diverifikasi', 'verified', 'sebagian', 'partially_taken'];
        if (!in_array(strtolower($pengajuan->status), $allowedStatuses)) {
            return response()->json([
                'success' => false,
                'message' => 'Pengambilan barang hanya dapat dilakukan untuk pengajuan yang telah disetujui dan belum selesai seluruhnya.',
            ], 422);
        }

        $validated = $request->validate([
            'nama_penerima'          => 'required|string|max:255',
            'unit'                   => 'required|string|max:255',
            'tanggal_pengambilan'    => 'required|date',
            'catatan_kondisi'        => 'nullable|string',
            'tanda_tangan'           => 'nullable|string', // base64 string
            'foto_serah_terima'      => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:10240',
            'items'                  => 'required|array|min:1',
            'items.*.barang_id'      => 'required|exists:barangs,id',
            'items.*.jumlah_diambil' => 'required|integer|min:0',
        ]);

        // Pastikan ada setidaknya 1 item dengan jumlah diambil > 0
        $totalDiambilSekarang = collect($validated['items'])->sum('jumlah_diambil');
        if ($totalDiambilSekarang <= 0) {
            return response()->json([
                'success' => false,
                'message' => 'Total jumlah barang yang diambil pada formulir ini harus lebih dari 0.',
            ], 422);
        }

        $fotoPath = null;
        if ($request->hasFile('foto_serah_terima')) {
            $file = $request->file('foto_serah_terima');
            $filename = 'serah_terima_' . time() . '_' . Str::random(8) . '.' . $file->getClientOriginalExtension();
            $fotoPath = $file->storeAs('pengambilan', $filename, 'public');
        }

        $user = $request->user();
        $nomorPengambilan = 'PK-' . date('Ymd') . '-' . strtoupper(Str::random(5));

        return DB::transaction(function () use ($validated, $pengajuan, $user, $nomorPengambilan, $fotoPath, $request) {
            $pengambilan = PengambilanBarang::create([
                'pengajuan_id'        => $pengajuan->id,
                'nomor_pengambilan'   => $nomorPengambilan,
                'tanggal_pengambilan' => $validated['tanggal_pengambilan'],
                'nama_penerima'       => $validated['nama_penerima'],
                'unit'                => $validated['unit'],
                'catatan_kondisi'     => $validated['catatan_kondisi'] ?? null,
                'tanda_tangan'        => $validated['tanda_tangan'] ?? null,
                'foto_serah_terima'   => $fotoPath,
                'status'              => 'selesai',
                'tipe_pengambilan'    => 'PARTIAL',
                'created_by'          => $user ? $user->id : null,
            ]);

            foreach ($validated['items'] as $itemData) {
                $jumlahDiambil = (int)$itemData['jumlah_diambil'];
                if ($jumlahDiambil <= 0) continue;

                // Gunakan lockForUpdate untuk mencegah race condition
                $barang = Barang::where('id', $itemData['barang_id'])->lockForUpdate()->firstOrFail();
                $pengajuanItem = PengajuanItem::where('pengajuan_id', $pengajuan->id)
                    ->where('barang_id', $barang->id)
                    ->lockForUpdate()
                    ->first();

                $jumlahDisetujui = $pengajuanItem ? ($pengajuanItem->jumlah_disetujui ?? $pengajuanItem->jumlah_diajukan) : $jumlahDiambil;
                $sudahDiambil = $pengajuanItem ? (int)($pengajuanItem->jumlah_diambil_kumulatif ?? 0) : 0;
                $sisaBolehDiambil = max(0, $jumlahDisetujui - $sudahDiambil);

                if ($jumlahDiambil > $sisaBolehDiambil) {
                    throw new \Exception("Jumlah yang diambil untuk {$barang->nama} ({$jumlahDiambil}) melebihi sisa yang belum diambil ({$sisaBolehDiambil}).");
                }

                PengambilanBarangItem::create([
                    'pengambilan_barang_id' => $pengambilan->id,
                    'pengajuan_item_id'     => $pengajuanItem ? $pengajuanItem->id : null,
                    'barang_id'             => $barang->id,
                    'jumlah_disetujui'      => $jumlahDisetujui,
                    'jumlah_diambil'        => $jumlahDiambil,
                    'satuan'                => $barang->satuan ?? 'Pcs',
                    'catatan'               => $itemData['catatan'] ?? null,
                ]);

                // Update kumulatif pada item pengajuan
                if ($pengajuanItem) {
                    $pengajuanItem->increment('jumlah_diambil_kumulatif', $jumlahDiambil);
                }

                // Auto-Deduct Stok Fisik Barang di DB
                $stokLama = (int)$barang->stok;
                $stokBaru = max(0, $stokLama - $jumlahDiambil);
                $oldData = $barang->toArray();

                $barang->update(['stok' => $stokBaru]);

                // Audit Log Pengurangan Stok
                BarangAuditLog::create([
                    'barang_id' => $barang->id,
                    'user_id'   => $user ? $user->id : null,
                    'action'    => 'pengambilan_barang',
                    'old_data'  => json_encode(array_merge($oldData, ['stok' => $stokLama])),
                    'new_data'  => json_encode(array_merge($oldData, [
                        'stok'                  => $stokBaru,
                        'pengambilan_id'        => $pengambilan->id,
                        'nomor_pengambilan'     => $nomorPengambilan,
                        'jumlah_diambil'        => $jumlahDiambil,
                    ])),
                ]);
            }

            // Hitung status kelengkapan seluruh item pengajuan
            $allPengajuanItems = PengajuanItem::where('pengajuan_id', $pengajuan->id)->get();
            $isAllCompleted = true;

            foreach ($allPengajuanItems as $pi) {
                $target = $pi->jumlah_disetujui ?? $pi->jumlah_diajukan;
                if ((int)$pi->jumlah_diambil_kumulatif < $target) {
                    $isAllCompleted = false;
                    break;
                }
            }

            $tipe = $isAllCompleted ? 'COMPLETE' : 'PARTIAL';
            $statusPengajuan = $isAllCompleted ? 'selesai' : 'sebagian';

            $pengambilan->update(['tipe_pengambilan' => $tipe]);
            $pengajuan->update(['status' => $statusPengajuan]);

            return response()->json([
                'success'          => true,
                'message'          => $isAllCompleted
                    ? 'Serah terima barang selesai penuh (COMPLETE). Pengajuan telah tuntas.'
                    : 'Serah terima sebagian (PARTIAL) berhasil dicatat. Sisa barang dapat diambil di kemudian hari.',
                'tipe_pengambilan' => $tipe,
                'data'             => $pengambilan->load(['items.barang', 'pengajuan']),
            ], 201);
        });
    }

    /**
     * GET /api/pengambilan-barang/{id}/pdf
     * Unduh Berita Acara Serah Terima Pengambilan Barang dalam PDF
     */
    public function downloadPdf($id)
    {
        $pengambilan = PengambilanBarang::with(['pengajuan.user', 'items.barang', 'creator'])
            ->findOrFail($id);

        $pdf = Pdf::loadView('pdf.pengambilan_barang', [
            'pengambilan' => $pengambilan,
        ])->setPaper('a4', 'portrait');

        return $pdf->download('Berita_Acara_Pengambilan_' . $pengambilan->nomor_pengambilan . '.pdf');
    }
}
