<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Barang;
use Illuminate\Http\Request;

class BarangController extends Controller
{
    // ============================
    // Helper normalisasi data
    // ============================
    private function normalizeKode(string $kode): string
    {
        $kode = trim($kode);
        $kode = strtoupper($kode);
        $kode = preg_replace('/\s+/', '', $kode); // hapus spasi
        return $kode;
    }

    private function normalizeNama(string $nama): string
    {
        $nama = trim($nama);
        $nama = preg_replace('/\s+/', ' ', $nama); // spasi berlebih jadi 1
        return $nama;
    }

    private function normalizeSatuan(string $satuan): string
    {
        $satuan = trim($satuan);
        $satuan = preg_replace('/\s+/', ' ', $satuan);
        return $satuan;
    }

    // ============================
    // GET /api/barang?q=
    // ============================
    public function index(Request $request)
    {
        $q = $request->query('q');

        $query = Barang::query();

        if ($q) {
            $query->where('nama', 'like', "%{$q}%")
                  ->orWhere('kode', 'like', "%{$q}%")
                  ->orWhere('satuan', 'like', "%{$q}%");
        }

        $barangs = $query->orderBy('nama')->get();

        return response()->json($barangs);
    }

    // ============================
    // GET /api/barang/{barang}
    // ============================
    public function show(Barang $barang)
    {
        return response()->json($barang);
    }

    // ============================
    // POST /api/barang
    // Admin menambah barang
    // ============================
    public function store(Request $request)
    {
        $validated = $request->validate([
            'nama'        => 'required|string|max:255',
            'kode'        => 'required|string|max:50',
            'satuan'      => 'required|string|max:50',
            'harga_satuan'=> 'nullable|integer|min:0|max:1000000000',
        ]);

        $nama   = $this->normalizeNama($validated['nama']);
        $kode   = $this->normalizeKode($validated['kode']);
        $satuan = $this->normalizeSatuan($validated['satuan']);
        $harga  = array_key_exists('harga_satuan', $validated) ? $validated['harga_satuan'] : null;

        // ✅ Validasi konsistensi: kode unik (case-insensitive)
        $existsKode = Barang::whereRaw('LOWER(kode) = ?', [strtolower($kode)])->exists();
        if ($existsKode) {
            return response()->json([
                'success' => false,
                'message' => 'Kode barang sudah digunakan. Gunakan kode lain.',
            ], 422);
        }

        // ✅ Validasi konsistensi: nama+satuan tidak boleh duplikat persis (case-insensitive)
        $existsNama = Barang::whereRaw('LOWER(nama) = ?', [strtolower($nama)])
            ->whereRaw('LOWER(satuan) = ?', [strtolower($satuan)])
            ->exists();

        if ($existsNama) {
            return response()->json([
                'success' => false,
                'message' => 'Barang dengan nama dan satuan yang sama sudah ada.',
            ], 422);
        }

        $barang = Barang::create([
            'nama' => $nama,
            'kode' => $kode,
            'satuan' => $satuan,
            'harga_satuan' => $harga ?? 0,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Barang berhasil ditambahkan.',
            'barang'  => $barang,
        ]);
    }

    // ============================
    // PATCH /api/barang/{barang}
    // Admin edit barang
    // ============================
    public function update(Request $request, Barang $barang)
    {
        $validated = $request->validate([
            'nama'        => 'required|string|max:255',
            'kode'        => 'required|string|max:50',
            'satuan'      => 'required|string|max:50',
            'harga_satuan'=> 'nullable|integer|min:0|max:1000000000',
        ]);

        $nama   = $this->normalizeNama($validated['nama']);
        $kode   = $this->normalizeKode($validated['kode']);
        $satuan = $this->normalizeSatuan($validated['satuan']);
        $harga  = array_key_exists('harga_satuan', $validated) ? $validated['harga_satuan'] : null;

        // ✅ Validasi konsistensi: kode unik (case-insensitive) kecuali dirinya sendiri
        $existsKode = Barang::whereRaw('LOWER(kode) = ?', [strtolower($kode)])
            ->where('id', '!=', $barang->id)
            ->exists();

        if ($existsKode) {
            return response()->json([
                'success' => false,
                'message' => 'Kode barang sudah digunakan oleh barang lain.',
            ], 422);
        }

        // ✅ Validasi konsistensi: nama+satuan tidak duplikat kecuali dirinya sendiri
        $existsNama = Barang::whereRaw('LOWER(nama) = ?', [strtolower($nama)])
            ->whereRaw('LOWER(satuan) = ?', [strtolower($satuan)])
            ->where('id', '!=', $barang->id)
            ->exists();

        if ($existsNama) {
            return response()->json([
                'success' => false,
                'message' => 'Barang dengan nama dan satuan yang sama sudah ada (duplikat).',
            ], 422);
        }

        $barang->nama = $nama;
        $barang->kode = $kode;
        $barang->satuan = $satuan;

        if ($harga !== null) {
            $barang->harga_satuan = $harga;
        }

        $barang->save();

        return response()->json([
            'success' => true,
            'message' => 'Barang berhasil diperbarui.',
            'barang'  => $barang,
        ]);
    }

    // ============================
    // DELETE /api/barang/{barang}
    // Admin hapus barang
    // ============================
    public function destroy(Barang $barang)
    {
        $barang->delete();

        return response()->json([
            'success' => true,
            'message' => 'Barang berhasil dihapus.',
        ]);
    }

    // ============================
    // PATCH /api/barang/{barang}/harga
    // (kalau kamu pakai fitur kelola harga)
    // ============================
    public function updateHarga(Request $request, Barang $barang)
    {
        $validated = $request->validate([
            'harga_satuan' => 'required|integer|min:0|max:1000000000',
        ]);

        $barang->harga_satuan = $validated['harga_satuan'];
        $barang->save();

        return response()->json([
            'success' => true,
            'message' => 'Harga barang berhasil diperbarui.',
            'barang'  => $barang,
        ]);
    }
}
