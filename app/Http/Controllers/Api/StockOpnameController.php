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
        $query = StockOpname::with(['barang', 'user']);

        // Jika role user biasa, batasi hanya data miliknya sendiri
        if ($user->isUser()) {
            $query->where('user_id', $user->id);
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

        $stockOpnames = StockOpname::with(['barang'])
            ->where('user_id', $user->id)
            ->where('created_at', '>=', Carbon::parse($periode->mulai)->subDays(7))
            ->get();

        $items = $stockOpnames->map(function ($so) {
            $barang = $so->barang;
            $stokFisik = (int)($so->stok_fisik ?? 0);
            $sisaStok = $so->hasil_verifikasi !== null && $so->hasil_verifikasi !== undefined
                ? (int)$so->hasil_verifikasi
                : $stokFisik;

            return [
                'barang_id'       => $so->barang_id,
                'nama'            => $barang->nama ?? 'Barang Terhapus',
                'satuan'          => $barang->satuan ?? '',
                'kebutuhan_total' => 0,
                'sisa_stok'       => $sisaStok,
                'jumlah_diajukan' => 0,
                'estimasi_nilai'  => $barang->harga_satuan ?? 0,
                'stok_sistem'     => (int)($so->stok_sistem ?? 0),
                'stok_fisik'      => $stokFisik,
                'hasil_verifikasi' => $so->hasil_verifikasi,
                'selisih'         => $so->selisih,
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
            'barang_id'   => 'required|exists:barangs,id',
            'stok_fisik'  => 'required|integer|min:0',
        ]);

        $barang = Barang::findOrFail($validated['barang_id']);
        $stok_sistem = $barang->stok; // Stok sistem saat ini
        $stok_fisik = (int)$validated['stok_fisik'];
        $selisih = $stok_fisik - $stok_sistem;

        $stockOpname = StockOpname::create([
            'barang_id'   => $validated['barang_id'],
            'user_id'     => $request->user()->id,
            'stok_sistem' => $stok_sistem,
            'stok_fisik'  => $stok_fisik,
            'selisih'     => $selisih,
            'status'      => 'pending',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Laporan stock opname berhasil dikirim.',
            'data'    => $stockOpname->load(['barang', 'user'])
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
        ]);

        $created = [];

        DB::transaction(function () use ($validated, $request, &$created) {
            foreach ($validated['items'] as $item) {
                $barang = Barang::findOrFail($item['barang_id']);
                $stok_sistem = $barang->stok;
                $stok_fisik = (int) $item['stok_fisik'];
                $selisih = $stok_fisik - $stok_sistem;

                $stockOpname = StockOpname::create([
                    'barang_id'  => $item['barang_id'],
                    'user_id'    => $request->user()->id,
                    'stok_sistem' => $stok_sistem,
                    'stok_fisik'  => $stok_fisik,
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
        DB::transaction(function () use ($stockOpname, $request) {
            $stockOpname->update([
                'status' => 'approved'
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
}
