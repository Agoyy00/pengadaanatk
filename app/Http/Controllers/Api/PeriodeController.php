<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Periode;
use Carbon\Carbon;
use Illuminate\Http\Request;

class PeriodeController extends Controller
{
    /**
     * Admin menyimpan / mengubah periode.
     * Frontend kirim: tahun_akademik, mulai (datetime-local), selesai (datetime-local)
     */
    public function storeOrUpdate(Request $request)
    {
        $validated = $request->validate([
            'tahun_akademik' => 'required',
            'mulai'          => 'required|date',
            'selesai'        => 'required|date|after:mulai',
        ]);

        // Pakai timezone Jakarta biar jamnya sama dengan yang dipilih di browser
        $mulai   = Carbon::parse($validated['mulai'], 'Asia/Jakarta');
        $selesai = Carbon::parse($validated['selesai'], 'Asia/Jakarta');

        $tahunAkademik = $validated['tahun_akademik'];

        // Hitung apakah SEKARANG sudah masuk range (info saja)
        $now     = Carbon::now('Asia/Jakarta');
        $isOpenNow = $now->between($mulai, $selesai);

        // 1 row per tahun akademik
        $periode = Periode::updateOrCreate(
            ['tahun_akademik' => $tahunAkademik],
            [
                'mulai'   => $mulai,
                'selesai' => $selesai,
                // simpan is_open sebagai status saat disimpan (opsional)
                'is_open' => $isOpenNow,
            ]
        );

        // LOG ACTIVITY
        \Illuminate\Support\Facades\DB::table('admin_activity_logs')->insert([
            'user_id'     => \Illuminate\Support\Facades\Auth::id() ?? $request->input('user_id') ?? 1, // Default fallback if not auth
            'action'      => 'atur_periode',
            'description' => "Admin mengatur Periode Akademik [{$tahunAkademik}]",
            'details'     => json_encode(['mulai' => $mulai, 'selesai' => $selesai]),
            'ip_address'  => $request->ip(),
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => $isOpenNow
                ? 'Periode berhasil disimpan. Saat ini pengajuan SEDANG DIBUKA.'
                : 'Periode berhasil disimpan. Saat ini pengajuan BELUM dibuka / sudah ditutup.',
            'periode' => $periode,
        ]);
    }

    /**
     * Dipakai Pengajuan.jsx (User) & DashboardAdmin.jsx
     * untuk cek periode AKTIF atau YANG AKAN DATANG.
     * Periode yang SUDAH LEWAT tidak dikirim lagi.
     */
    public function active()
    {
        $now = Carbon::now('Asia/Jakarta');

        // 1. Prioritaskan mencari periode yang sedang aktif saat ini (mulai <= now dan selesai >= now)
        $periode = Periode::where('mulai', '<=', $now)
            ->where('selesai', '>=', $now)
            ->orderByDesc('mulai') // Ambil yang paling baru mulai jika ada lebih dari satu
            ->first();

        // 2. Jika tidak ada yang sedang aktif, cari yang akan datang (belum mulai)
        if (!$periode) {
            $periode = Periode::where('mulai', '>', $now)
                ->orderBy('mulai') // Yang paling dekat dimulai
                ->first();
        }

        if (!$periode) {
            // semua periode sudah lewat → tidak ada yang ditampilkan
            return response()->json([
                'is_open' => false,
                'message' => 'Saat ini tidak ada periode pengajuan aktif maupun yang akan datang.',
                'periode' => null,
            ]);
        }

        // Hitung dinamis: sekarang lagi di dalam range atau belum
        $isOpen     = $now->between($periode->mulai, $periode->selesai);
        $belumMulai = $now->lt($periode->mulai);

        if ($isOpen) {
            $message = 'Periode pengajuan SEDANG DIBUKA sampai ' .
                $periode->selesai->format('d/m/Y H:i');
        } elseif ($belumMulai) {
            $message = 'Periode pengajuan AKAN DIBUKA pada ' .
                $periode->mulai->format('d/m/Y H:i') .
                ' dan ditutup pada ' .
                $periode->selesai->format('d/m/Y H:i');
        } else {
            // backup, mestinya nggak kesini karena selesai >= now
            $message = 'Saat ini tidak ada periode pengajuan aktif.';
        }

        // Sinkronkan kolom is_open di DB agar selalu up-to-date
        if ($periode->is_open !== $isOpen) {
            $periode->is_open = $isOpen;
            $periode->save();
        }

        return response()->json([
            'is_open'  => $isOpen,   // INI yang dipakai Pengajuan.jsx dan DashboardAdmin.jsx
            'message'  => $message,  // teks siap tampil
            'periode'  => $periode,  // detail periode
        ]);
    }

    /**
     * Opsional: lihat periode terakhir
     */
    public function index()
    {
        $periodes = Periode::orderByDesc('created_at')->get();

        return response()->json([
            'success' => true,
            'data'    => $periodes,
        ]);
    }

    /**
     * Hapus periode (kalau jadwal salah)
     */
    public function destroy(Periode $periode)
    {
        $periode->delete();

        return response()->json([
            'success' => true,
            'message' => 'Periode berhasil dihapus.',
        ]);
    }
}
