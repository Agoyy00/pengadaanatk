<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Barang;
use Illuminate\Http\Request;

class BarangController extends Controller
{
    // GET /api/barang?q=kata
    public function index(Request $request)
    {
        $q = $request->query('q');

        $query = Barang::query();

        if ($q) {
            $query->where('nama', 'like', "%{$q}%")
                  ->orWhere('kode', 'like', "%{$q}%");
        }

        // ambil maksimal 20 hasil
        $barangs = $query->orderBy('nama')->limit(20)->get();

        return response()->json($barangs);
    }

    // GET /api/barang/{id}
    public function show(Barang $barang)
    {
        return response()->json($barang);
    }
}
