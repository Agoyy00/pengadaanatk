<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StockOpname;
use App\Models\Barang;
use App\Models\BarangAuditLog;
use App\Models\Periode;
use App\Models\Pengajuan;
use App\Models\PengajuanItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class StockOpnameController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = StockOpname::with(['barang.satuans', 'user', 'approvedBy']);

        // Jika role user biasa, batasi hanya data miliknya sendiri
        if ($user->isUser()) {
            $query->where('user_id', $user->id);
        }

        // Filter per unit jika ada parameter unit
        if ($request->has('unit') && !empty($request->unit) && $request->unit !== 'all') {
            $query->where('unit', $request->unit);
        }

        // Search Keyword
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('unit', 'like', "%$s%")
                  ->orWhere('keterangan', 'like', "%$s%")
                  ->orWhere('alasan_penyesuaian', 'like', "%$s%")
                  ->orWhereHas('barang', function ($bq) use ($s) {
                      $bq->where('nama', 'like', "%$s%")
                         ->orWhere('kode', 'like', "%$s%");
                  })
                  ->orWhereHas('user', function ($uq) use ($s) {
                      $uq->where('name', 'like', "%$s%")
                         ->orWhere('email', 'like', "%$s%");
                  });
            });
        }

        // Filter Status
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Filter Unit
        if ($request->filled('unit') && $request->unit !== 'all') {
            $query->where('unit', $request->unit);
        }

        // Filter Tanggal
        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('created_at', [$request->start_date . ' 00:00:00', $request->end_date . ' 23:59:59']);
        }
        $data = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $data
        ]);
    }

    public function draftPengajuan(Request $request)
    {
        $user = $request->user();
        $now = Carbon::now('Asia/Jakarta');

        $periode = Periode::where('mulai', '<=', $now)->where('selesai', '>=', $now)->first();
        if (!$periode) {
            return response()->json([
                'success' => true,
                'items' => []
            ]);
        }

        $stockOpnames = StockOpname::with(['barang.satuans'])
            ->where('user_id', $user->id)
            ->where('created_at', '>=', Carbon::parse($periode->mulai)->subDays(7))
            ->get();

        $items = $stockOpnames->map(function ($so) {
            $barang = $so->barang;
            $stokFisik = (int)($so->stok_fisik ?? 0);
            $sisaStok = $so->hasil_verifikasi !== null
                ? (int)$so->hasil_verifikasi
                : $stokFisik;

            return [
                'barang_id'       => $so->barang_id,
                'nama'            => $barang->nama ?? 'Barang Terhapus',
                'satuan'          => $so->satuan ?? $barang->satuan ?? '',
                'kebutuhan_total' => 0,
                'sisa_stok'       => $sisaStok,
                'jumlah_diajukan' => 0,
                'estimasi_nilai'  => $barang->harga_satuan ?? 0,
                'stok_sistem'     => (int)($so->stok_sistem ?? 0),
                'stok_fisik'      => $stokFisik,
                'hasil_verifikasi' => $so->hasil_verifikasi,
                'selisih'         => $so->selisih,
                'rincian_satuan'  => $so->rincian_satuan,
                'alasan_penyesuaian' => $so->alasan_penyesuaian,
                'unit'            => $so->unit,
            ];
        })->values()->all();

        return response()->json([
            'success' => true,
            'items' => $items
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'barang_id'           => 'required|exists:barangs,id',
            'stok_fisik'          => 'nullable|integer|min:0',
            'satuan'              => 'nullable|string|max:50',
            'unit'                => 'required|string|max:255',
            'rincian_satuan'      => 'nullable|array',
            'keterangan'          => 'nullable|string',
            'alasan_penyesuaian'  => 'nullable|string',
        ]);

        $existing = StockOpname::where('user_id', $request->user()->id)
            ->where('barang_id', $validated['barang_id'])
            ->whereIn('status', ['pending', 'verified'])
            ->first();

        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => 'Barang ini sudah memiliki laporan stock opname yang belum selesai (pending/verified).',
            ], 422);
        }

        // Cek periode aktif untuk menentukan apakah user boleh ganti unit
        $now = Carbon::now('Asia/Jakarta');
        $periodeAktif = Periode::where('mulai', '<=', $now)->where('selesai', '>=', $now)->first();
        $tahunAktif = $periodeAktif ? $periodeAktif->tahun_akademik : null;

        $user = $request->user();

        // Jika periode berbeda dari terakhir kali user set unit → reset, boleh pilih baru
        if ($tahunAktif && $user->unit_tahun_akademik !== $tahunAktif) {
            $user->unit = $validated['unit'];
            $user->unit_tahun_akademik = $tahunAktif;
            $user->save();
        } elseif (!empty($user->unit) && $user->unit !== $validated['unit']) {
            // Periode sama tapi unit beda → tolak
            return response()->json([
                'success' => false,
                'message' => 'Pada periode ini Anda sudah terdaftar di unit "' . $user->unit . '". Unit hanya bisa diganti saat periode baru.',
            ], 422);
        } elseif (empty($user->unit)) {
            // Belum pernah set unit sama sekali
            $user->unit = $validated['unit'];
            $user->unit_tahun_akademik = $tahunAktif;
            $user->save();
        }

        $barang = Barang::with('satuans')->findOrFail($validated['barang_id']);
        $stok_sistem = $barang->stok; // Stok sistem saat ini

        // Hitung total fisik dari rincian multi satuan jika disediakan
        $stok_fisik = 0;
        if (!empty($validated['rincian_satuan']) && is_array($validated['rincian_satuan'])) {
            foreach ($validated['rincian_satuan'] as $rincian) {
                $qty = (int)($rincian['jumlah'] ?? 0);
                $konversi = (int)($rincian['faktor_konversi'] ?? 1);
                $stok_fisik += ($qty * $konversi);
            }
        } elseif (isset($validated['stok_fisik'])) {
            $stok_fisik = (int)$validated['stok_fisik'];
        }

        $selisih = $stok_fisik - $stok_sistem;

        $stockOpname = StockOpname::create([
            'barang_id'          => $validated['barang_id'],
            'user_id'            => $user->id,
            'unit'               => $validated['unit'],
            'stok_sistem'        => $stok_sistem,
            'stok_fisik'         => $stok_fisik,
            'satuan'             => $validated['satuan'] ?? $barang->satuan ?? 'Pcs',
            'selisih'            => $selisih,
            'rincian_satuan'     => $validated['rincian_satuan'] ?? null,
            'keterangan'         => $validated['keterangan'] ?? null,
            'alasan_penyesuaian' => $validated['alasan_penyesuaian'] ?? null,
            'status'             => 'pending',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Laporan stock opname berhasil dikirim.',
            'data'    => $stockOpname->load(['barang.satuans', 'user'])
        ], 201);
    }

    /**
     * Bulk import stock opname dari CSV
     */
    public function bulkStore(Request $request)
    {
        $validated = $request->validate([
            'items'              => 'required|array|min:1',
            'items.*.barang_id'  => 'required|exists:barangs,id',
            'items.*.stok_fisik' => 'required|integer|min:0',
            'items.*.satuan'     => 'required|string|max:50',
            'items.*.unit'       => 'required|string|max:255',
        ]);

        $units = array_unique(array_column($validated['items'], 'unit'));
        if (count($units) > 1) {
            return response()->json([
                'success' => false,
                'message' => 'Semua barang dalam import harus memiliki unit yang sama.',
            ], 422);
        }

        $bulkUnit = $units[0] ?? null;

        $duplicateBarangIds = StockOpname::where('user_id', $request->user()->id)
            ->whereIn('barang_id', array_column($validated['items'], 'barang_id'))
            ->whereIn('status', ['pending', 'verified'])
            ->pluck('barang_id')
            ->toArray();

        if (!empty($duplicateBarangIds)) {
            return response()->json([
                'success' => false,
                'message' => 'Beberapa barang sudah memiliki laporan stock opname yang belum selesai (pending/verified): ' . implode(', ', $duplicateBarangIds),
            ], 422);
        }

        // Cek periode aktif untuk menentukan apakah user boleh ganti unit
        $now = Carbon::now('Asia/Jakarta');
        $periodeAktif = Periode::where('mulai', '<=', $now)->where('selesai', '>=', $now)->first();
        $tahunAktif = $periodeAktif ? $periodeAktif->tahun_akademik : null;

        $user = $request->user();

        if ($tahunAktif && $user->unit_tahun_akademik !== $tahunAktif) {
            $user->unit = $bulkUnit;
            $user->unit_tahun_akademik = $tahunAktif;
            $user->save();
        } elseif (!empty($user->unit) && $user->unit !== $bulkUnit) {
            return response()->json([
                'success' => false,
                'message' => 'Pada periode ini Anda sudah terdaftar di unit "' . $user->unit . '". Unit hanya bisa diganti saat periode baru.',
            ], 422);
        } elseif (empty($user->unit)) {
            $user->unit = $bulkUnit;
            $user->unit_tahun_akademik = $tahunAktif;
            $user->save();
        }

        $created = [];

        DB::transaction(function () use ($validated, $request, $bulkUnit, &$created) {
            foreach ($validated['items'] as $item) {
                $barang = Barang::findOrFail($item['barang_id']);
                $stok_sistem = $barang->stok;
                $stok_fisik = (int) $item['stok_fisik'];
                $selisih = $stok_fisik - $stok_sistem;

                $stockOpname = StockOpname::create([
                    'barang_id'   => $item['barang_id'],
                    'user_id'     => $request->user()->id,
                    'unit'        => $bulkUnit,
                    'stok_sistem' => $stok_sistem,
                    'stok_fisik'  => $stok_fisik,
                    'satuan'      => $item['satuan'],
                    'selisih'     => $selisih,
                    'status'      => 'pending',
                ]);

                $created[] = $stockOpname;
            }
        });

        return response()->json([
            'success' => true,
            'message' => count($created) . ' laporan stock opname berhasil diimport.',
            'count'   => count($created),
        ], 201);
    }

    public function verify(Request $request, $id)
    {
        $stockOpname = StockOpname::findOrFail($id);
        $user = $request->user();

        if ($user->isUser()) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'stok_fisik' => 'nullable|integer|min:0',
        ]);

        $updateData = ['status' => 'verified'];

        if (isset($validated['stok_fisik'])) {
            $hasil_verifikasi = (int)$validated['stok_fisik'];
            $updateData['hasil_verifikasi'] = $hasil_verifikasi;
            $updateData['selisih'] = $hasil_verifikasi - $stockOpname->stok_sistem;
        } else {
            $updateData['hasil_verifikasi'] = $stockOpname->stok_fisik;
            $updateData['selisih'] = $stockOpname->stok_fisik - $stockOpname->stok_sistem;
        }

        $stockOpname->update($updateData);

        // Update pengajuan user jika ada yang masih diajukan untuk periode aktif
        $now = Carbon::now('Asia/Jakarta');
        $periode = Periode::where('mulai', '<=', $now)->where('selesai', '>=', $now)->first();
        if ($periode) {
            $pengajuan = Pengajuan::where('user_id', $stockOpname->user_id)
                ->where('tahun_akademik', $periode->tahun_akademik)
                ->where('status', 'diajukan')
                ->first();

            if ($pengajuan) {
                $item = PengajuanItem::where('pengajuan_id', $pengajuan->id)
                    ->where('barang_id', $stockOpname->barang_id)
                    ->first();

                if ($item) {
                    $kebutuhanTotal = $item->kebutuhan_total;
                    $sisaStokBaru = $stockOpname->hasil_verifikasi;
                    $jumlahDiajukanBaru = max(0, $kebutuhanTotal - $sisaStokBaru);

                    $item->update([
                        'sisa_stok' => $sisaStokBaru,
                        'jumlah_diajukan' => $jumlahDiajukanBaru,
                    ]);
                }
            }
        }

        // LOG ACTIVITY
        \Illuminate\Support\Facades\DB::table('admin_activity_logs')->insert([
            'user_id'     => $user->id,
            'action'      => 'stock_opname_verify',
            'description' => "Admin memverifikasi Laporan Stock Opname #{$stockOpname->id}",
            'details'     => json_encode(['status' => 'verified', 'hasil_verifikasi' => $stockOpname->hasil_verifikasi]),
            'ip_address'  => $request->ip(),
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Laporan stock opname berhasil diverifikasi oleh admin.',
            'data'    => $stockOpname->load(['barang', 'user'])
        ]);
    }

    public function approve(Request $request, $id)
    {
        $stockOpname = StockOpname::findOrFail($id);
        $user = $request->user();

        if (!$user->isSuperAdmin()) {
            return response()->json(['success' => false, 'message' => 'Hanya Superadmin yang dapat menyetujui stock opname.'], 403);
        }

        // Mulai transaksi database
        DB::transaction(function () use ($stockOpname, $request, $user) {
            $stockOpname->update([
                'status'      => 'approved',
                'approved_by' => $user->id,
                'approved_at' => now(),
            ]);

            $barang = Barang::findOrFail($stockOpname->barang_id);
            $oldData = $barang->toArray();

            // Update stok barang ke hasil verifikasi
            $barang->update([
                'stok' => $stockOpname->hasil_verifikasi ?? $stockOpname->stok_fisik
            ]);

            // Catat ke audit log
            BarangAuditLog::create([
                'barang_id' => $barang->id,
                'user_id'   => $request->user()->id,
                'action'    => 'update',
                'old_data'  => json_encode($oldData),
                'new_data'  => json_encode($barang->toArray()),
            ]);

            // LOG ACTIVITY
            \Illuminate\Support\Facades\DB::table('admin_activity_logs')->insert([
                'user_id'     => $request->user()->id,
                'action'      => 'stock_opname_verify',
                'description' => "Admin memverifikasi Laporan Stock Opname #{$stockOpname->id}",
                'details'     => json_encode(['status' => 'approved']),
                'ip_address'  => $request->ip(),
                'created_at'  => now(),
                'updated_at'  => now(),
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Laporan stock opname disetujui dan stok barang telah diperbarui.',
            'data'    => $stockOpname->load(['barang'])
        ]);
    }

    public function reject(Request $request, $id)
    {
        $stockOpname = StockOpname::findOrFail($id);
        $user = $request->user();

        if ($user->isUser()) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $stockOpname->update([
            'status' => 'rejected'
        ]);

        // LOG ACTIVITY
        \Illuminate\Support\Facades\DB::table('admin_activity_logs')->insert([
            'user_id'     => $user->id,
            'action'      => 'stock_opname_verify',
            'description' => "Admin memproses Laporan Stock Opname #{$stockOpname->id}",
            'details'     => json_encode(['status' => 'rejected']),
            'ip_address'  => $request->ip(),
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Laporan stock opname ditolak.',
            'data'    => $stockOpname
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $stockOpname = StockOpname::findOrFail($id);
        $user = $request->user();

        // Hanya pembuat atau admin/superadmin yang bisa hapus jika status pending
        if ($user->isUser() && $stockOpname->user_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        if ($stockOpname->status !== 'pending' && !$user->isSuperAdmin()) {
            return response()->json(['success' => false, 'message' => 'Hanya laporan dengan status pending yang dapat dihapus.'], 400);
        }

        $stockOpname->delete();

        return response()->json([
            'success' => true,
            'message' => 'Laporan stock opname berhasil dihapus.'
        ]);
    }

    public function bulkDestroy(Request $request)
    {
        $validated = $request->validate([
            'ids'   => 'required|array|min:1',
            'ids.*' => 'required|integer',
        ]);

        $user = $request->user();
        $query = StockOpname::whereIn('id', $validated['ids']);

        if ($user->isUser()) {
            $query->where('user_id', $user->id)->where('status', 'pending');
        } elseif (!$user->isSuperAdmin()) {
            $query->where('status', 'pending');
        }

        $count = $query->delete();

        return response()->json([
            'success' => true,
            'message' => "{$count} laporan stock opname berhasil dihapus.",
            'count'   => $count
        ]);
    }
}
