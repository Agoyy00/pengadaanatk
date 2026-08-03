<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Pengajuan;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class StatistikController extends Controller
{
    public function fakultas()
    {
        // Ambil tahun sekarang
        $tahunSekarang = Carbon::now()->year;

        // Ambil data 5 tahun terakhir
        $tahunMulai = $tahunSekarang - 4;

        // Query jumlah pengajuan per fakultas
        $data = Pengajuan::select('unit as fakultas', DB::raw('COUNT(*) as total'))
            ->whereRaw("YEAR(created_at) BETWEEN $tahunMulai AND $tahunSekarang")
            ->groupBy('unit')
            ->orderBy('total', 'DESC')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $data
        ]);
    }
}
