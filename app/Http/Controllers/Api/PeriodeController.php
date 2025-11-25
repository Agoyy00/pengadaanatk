<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Periode;
use Carbon\Carbon;
use Illuminate\Http\Request;

class PeriodeController extends Controller
{
    // Admin mengatur / mengganti periode
    public function storeOrUpdate(Request $request)
    {
        $data = $request->validate([
            'tahun_akademik' => 'required',
            'mulai'          => 'required|date',
            'selesai'        => 'required|date|after:mulai',
            'is_open'        => 'required|boolean',
        ]);

        // 1 row per tahun akademik
        $periode = Periode::updateOrCreate(
            ['tahun_akademik' => $data['tahun_akademik']],
            $data
        );

        return response()->json([
            'success' => true,
            'periode' => $periode,
        ]);
    }

    // Dipanggil Pengajuan.jsx → cek apakah periode sedang dibuka
    public function active()
    {
        $now = Carbon::now();

        // ambil periode yang "masih berlaku" sekarang
        $periode = Periode::where('mulai', '<=', $now)
            ->where('selesai', '>=', $now)
            ->orderByDesc('mulai')
            ->first();

        if (!$periode) {
            return response()->json([
                'is_open' => false,
                'message' => 'Periode pengajuan belum diatur.',
            ]);
        }

        $isOpen = $periode->is_open && $now->between($periode->mulai, $periode->selesai);

        return response()->json([
            'is_open' => $isOpen,
            'message' => $isOpen
                ? 'Pengajuan dibuka sampai ' . $periode->selesai->format('d/m/Y H:i')
                : 'Pengajuan ditutup. Terakhir dibuka sampai ' . $periode->selesai->format('d/m/Y H:i'),
        ]);
    }
}
