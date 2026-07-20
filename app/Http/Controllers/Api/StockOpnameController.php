<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StockOpname;
use App\Models\Barang;
use App\Models\BarangAuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class StockOpnameController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = StockOpname::with(['barang', 'user']);

        // Jika role user biasa, batasi hanya data miliknya sendiri
        $roleNormalized = strtolower(str_replace([' ', '_'], '', $user->role ?? ''));
        if ($roleNormalized === 'user' || $user->role_id === 3) {
            $query->where('user_id', $user->id);
        }

        $data = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $data
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'barang_id'   => 'required|exists:barangs,id',
            'stok_fisik'  => 'required|integer|min:0',
            'keterangan'  => 'nullable|string',
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
            'keterangan'  => $validated['keterangan'] ?? null,
            'status'      => 'pending',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Laporan stock opname berhasil dikirim.',
            'data'    => $stockOpname->load(['barang', 'user'])
        ], 201);
    }

    public function verify(Request $request, $id)
    {
        $stockOpname = StockOpname::findOrFail($id);
        $user = $request->user();
        $roleNormalized = strtolower(str_replace([' ', '_'], '', $user->role ?? ''));

        if ($roleNormalized === 'user' || $user->role_id === 3) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $stockOpname->update([
            'status' => 'verified'
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Laporan stock opname berhasil diverifikasi oleh admin.',
            'data'    => $stockOpname
        ]);
    }

    public function approve(Request $request, $id)
    {
        $stockOpname = StockOpname::findOrFail($id);
        $user = $request->user();
        $roleNormalized = strtolower(str_replace([' ', '_'], '', $user->role ?? ''));

        if ($roleNormalized !== 'superadmin' && $user->role_id !== 1) {
            return response()->json(['success' => false, 'message' => 'Hanya Superadmin yang dapat menyetujui stock opname.'], 403);
        }

        // Mulai transaksi database
        DB::transaction(function () use ($stockOpname, $request) {
            $stockOpname->update([
                'status' => 'approved'
            ]);

            $barang = Barang::findOrFail($stockOpname->barang_id);
            $oldData = $barang->toArray();

            // Update stok barang ke stok fisik
            $barang->update([
                'stok' => $stockOpname->stok_fisik
            ]);

            // Catat ke audit log
            BarangAuditLog::create([
                'barang_id' => $barang->id,
                'user_id'   => $request->user()->id,
                'action'    => 'update',
                'old_data'  => json_encode($oldData),
                'new_data'  => json_encode($barang->toArray()),
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
        $roleNormalized = strtolower(str_replace([' ', '_'], '', $user->role ?? ''));

        if ($roleNormalized === 'user' || $user->role_id === 3) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $stockOpname->update([
            'status' => 'rejected'
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
        $roleNormalized = strtolower(str_replace([' ', '_'], '', $user->role ?? ''));

        // Hanya pembuat atau admin/superadmin yang bisa hapus jika status pending
        if (($roleNormalized === 'user' || $user->role_id === 3) && $stockOpname->user_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        if ($stockOpname->status !== 'pending') {
            return response()->json(['success' => false, 'message' => 'Hanya laporan dengan status pending yang dapat dihapus.'], 400);
        }

        $stockOpname->delete();

        return response()->json([
            'success' => true,
            'message' => 'Laporan stock opname berhasil dihapus.'
        ]);
    }
}
