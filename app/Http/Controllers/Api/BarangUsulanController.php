<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BarangUsulanController extends Controller
{
    /**
     * GET /api/barang-usulan/statistik
     * Grafik jumlah usulan per nama barang
     */
    public function statistik()
    {
        $data = DB::table('barang_usulan')
            ->select('nama_barang', DB::raw('COUNT(*) as total'))
            ->groupBy('nama_barang')
            ->orderByDesc('total')
            ->get();

        return response()->json($data);
    }

    /**
     * POST /api/barang-usulan
     * Simpan usulan dari user
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'nama_barang' => 'required|string|max:255',
            'user_id'     => 'required|exists:users,id',
        ]);

        DB::table('barang_usulan')->insert([
            'nama_barang' => $validated['nama_barang'],
            'user_id'     => $validated['user_id'],
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Usulan barang berhasil disimpan',
        ]);
    }
}
