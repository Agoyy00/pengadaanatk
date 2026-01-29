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

        // Hanya ambil periode yang BELUM berakhir (selesai >= sekarang)
        $periode = Periode::where('selesai', '>=', $now)
            ->orderBy('mulai')   // paling dekat dulu
            ->first();

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

        // (opsional) sinkronkan kolom is_open di DB dengan kondisi terkini
        //$periode->is_open = $isOpen;
        //$periode->save();
        $isOpen = $periode->is_open;


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
        $periode = Periode::orderByDesc('mulai')->first();

        return response()->json($periode);
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
