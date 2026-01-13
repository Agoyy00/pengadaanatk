<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Barang;
use App\Models\BarangAuditLog;
use Illuminate\Http\Request;
use App\Imports\BarangAtkImport;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;


class BarangController extends Controller
{
    private function normalizeKode(string $kode): string
    {
        $kode = trim($kode);
        $kode = strtoupper($kode);
        $kode = preg_replace('/\s+/', '', $kode);
        return $kode;
    }

    private function normalizeNama(string $nama): string
    {
        $nama = trim($nama);
        $nama = preg_replace('/\s+/', ' ', $nama);
        return $nama;
    }

    private function normalizeSatuan(string $satuan): string
    {
        $satuan = trim($satuan);
        $satuan = preg_replace('/\s+/', ' ', $satuan);
        return $satuan;
    }

    private function writeLog(?int $barangId, ?int $userId, string $action, $oldData, $newData): void
    {
        BarangAuditLog::create([
            'barang_id' => $barangId,
            'user_id'   => $userId,
            'action'    => $action,
            'old_data'  => $oldData,
            'new_data'  => $newData,
        ]);
    }

    // GET /api/barang?q=
    public function index(Request $request)
{
    $q = $request->q;

    $barang = Barang::where('nama', 'like', "%$q%")
        ->get()
        ->map(function ($b) {
            return [
                'id' => $b->id,
                'nama' => $b->nama,
                'kode' => $b->kode,
                'stok' => $b->stok,
                'satuan' => $b->satuan,
                'harga_satuan' => $b->harga_satuan,

                // 🔴 INI KUNCINYA
                'foto' => $b->gambar
                ? '/storage/barang/' . $b->gambar
                : null,
                ];  
            });

    return response()->json($barang);
}

    public function show(Barang $barang)
    {
        return response()->json($barang);
    }

    // ✅ GET /api/barang/{barang}/logs
    public function logs(Barang $barang)
    {
        $logs = BarangAuditLog::with(['user:id,name,role'])
            ->where('barang_id', $barang->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'barang'  => $barang,
            'logs'    => $logs,
        ]);
    }

    // POST /api/barang
    public function store(Request $request)
    {
        $validated = $request->validate([
            'actor_user_id' => 'required|exists:users,id',
            'nama'          => 'required|string|max:255',
            'kode'          => 'required|string|max:50',
            'satuan'        => 'required|string|max:50',
            'harga_satuan'  => 'nullable|integer|min:0|max:1000000000',
            'gambar'        => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
        ]);

        $nama   = $this->normalizeNama($validated['nama']);
        $kode   = $this->normalizeKode($validated['kode']);
        $satuan = $this->normalizeSatuan($validated['satuan']);
        $harga  = $validated['harga_satuan'] ?? 0;

        $existsKode = Barang::whereRaw('LOWER(kode) = ?', [strtolower($kode)])->exists();
        if ($existsKode) {
            return response()->json(['success' => false, 'message' => 'Kode barang sudah digunakan.'], 422);
        }

        $existsNama = Barang::whereRaw('LOWER(nama) = ?', [strtolower($nama)])
            ->whereRaw('LOWER(satuan) = ?', [strtolower($satuan)])
            ->exists();

        if ($existsNama) {
            return response()->json(['success' => false, 'message' => 'Barang dengan nama & satuan sama sudah ada.'], 422);
        }

        $barang = Barang::create([
            'nama'        => $nama,
            'kode'        => $kode,
            'satuan'      => $satuan,
            'harga_satuan'=> $harga,
            
        ]);

        if ($request->hasFile('gambar')) {
    $file = $request->file('gambar');
    $filename = time().'_'.uniqid().'.'.$file->getClientOriginalExtension();

    Storage::disk('public')->putFileAs(
        'barang',
        $file,
        $filename
    );

    $barang->gambar = $filename;
    $barang->save();
}


        $this->writeLog($barang->id, (int)$validated['actor_user_id'], 'create', null, $barang->toArray());

        return response()->json([
            'success' => true,
            'message' => 'Barang berhasil ditambahkan.',
            'barang'  => $barang,
        ]);
    }

    // PATCH /api/barang/{barang}
    public function update(Request $request, Barang $barang)
    {
        $validated = $request->validate([
            'actor_user_id' => 'required|exists:users,id',
            'nama'          => 'required|string|max:255',
            'kode'          => 'required|string|max:50',
            'satuan'        => 'required|string|max:50',
            'harga_satuan'  => 'nullable|integer|min:0|max:1000000000',
            'gambar'        => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
        ]);

        $old = $barang->toArray();

        $nama   = $this->normalizeNama($validated['nama']);
        $kode   = $this->normalizeKode($validated['kode']);
        $satuan = $this->normalizeSatuan($validated['satuan']);
        $harga  = $validated['harga_satuan'] ?? $barang->harga_satuan;

        $existsKode = Barang::whereRaw('LOWER(kode) = ?', [strtolower($kode)])
            ->where('id', '!=', $barang->id)
            ->exists();
        if ($existsKode) {
            return response()->json(['success' => false, 'message' => 'Kode barang sudah digunakan oleh barang lain.'], 422);
        }

        $existsNama = Barang::whereRaw('LOWER(nama) = ?', [strtolower($nama)])
            ->whereRaw('LOWER(satuan) = ?', [strtolower($satuan)])
            ->where('id', '!=', $barang->id)
            ->exists();
        if ($existsNama) {
            return response()->json(['success' => false, 'message' => 'Nama + satuan duplikat dengan barang lain.'], 422);
        }

        $barang->nama = $nama;
        $barang->kode = $kode;
        $barang->satuan = $satuan;
        $barang->harga_satuan = $harga;
        $barang->save();

        if ($request->hasFile('gambar')) {
    // hapus gambar lama
            if ($barang->gambar && Storage::disk('public')->exists('barang/' . $barang->gambar)) {
                Storage::disk('public')->delete('barang/' . $barang->gambar);
            }

            $file = $request->file('gambar');
            $filename = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
            Storage::disk('public')->putFileAs(
    'barang',
    $file,
    $filename
);


            $barang->gambar = $filename;
            $barang->save();
        }


        // ✅ LOG UPDATE
        $this->writeLog($barang->id, (int)$validated['actor_user_id'], 'update', $old, $barang->toArray());

        return response()->json([
            'success' => true,
            'message' => 'Barang berhasil diperbarui.',
            'barang'  => $barang,
        ]);
    }

    // DELETE /api/barang/{barang}
    public function destroy(Request $request, Barang $barang)
{
    // =========================
    // VALIDASI USER PENGHAPUS
    // =========================
    $actorUserId = $request->input('actor_user_id');

    if (!$actorUserId || !\App\Models\User::where('id', $actorUserId)->exists()) {
        return response()->json([
            'success' => false,
            'message' => 'User penghapus tidak valid.'
        ], 422);
    }

    // =========================
    // CEK: BARANG SUDAH DIPAKAI ATAU BELUM
    // =========================
    $dipakai = \Illuminate\Support\Facades\DB::table('pengajuan_items')
        ->where('barang_id', $barang->id)
        ->exists();

    if ($dipakai) {
        return response()->json([
            'success' => false,
            'message' => 'Barang tidak bisa dihapus karena sudah digunakan dalam pengajuan.'
        ], 409);
    }

    // =========================
    // SIMPAN DATA LAMA (UNTUK LOG)
    // =========================
    $oldData = $barang->toArray();

    // =========================
    // TULIS LOG DULU (PENTING!)
    // =========================
    \App\Models\BarangAuditLog::create([
        'barang_id' => $barang->id, // MASIH ADA
        'user_id'   => $actorUserId,
        'action'    => 'delete',
        'old_data'  => json_encode($oldData),
        'new_data'  => null,
    ]);

    // =========================
    // BARU HAPUS BARANG
    // =========================
    $barang->delete();

    return response()->json([
        'success' => true,
        'message' => 'Barang berhasil dihapus.'
    ]);
}
    // PATCH /api/barang/{barang}/harga
    public function updateHarga(Request $request, Barang $barang)
    {
        $validated = $request->validate([
            'actor_user_id' => 'required|exists:users,id',
            'harga_satuan'  => 'required|integer|min:0|max:1000000000',
        ]);

        $old = $barang->toArray();

        $barang->harga_satuan = $validated['harga_satuan'];
        $barang->save();

        // ✅ LOG UPDATE HARGA
        $this->writeLog($barang->id, (int)$validated['actor_user_id'], 'update_harga', $old, $barang->toArray());

        return response()->json([
            'success' => true,
            'message' => 'Harga barang berhasil diperbarui.',
            'barang'  => $barang,
        ]);
    }



public function importExcel(Request $request)
{
    $request->validate([
        'file' => 'required|mimes:xlsx,xls'
    ]);

    Excel::import(new BarangAtkImport, $request->file('file'));

    return response()->json([
        'success' => true,
        'message' => 'Import barang ATK berhasil'
    ]);
}

}
