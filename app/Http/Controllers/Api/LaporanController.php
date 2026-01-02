<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LaporanController extends Controller
{
    public function grafikBelanja(Request $request)
    {
        $yearsCount = (int) ($request->query('years', 3));
        if ($yearsCount <= 0) $yearsCount = 3;
        if ($yearsCount > 10) $yearsCount = 10;

        // status default belanja (yang disetujui)
        $status = $request->query('status', 'disetujui');

        // Ambil tahun dari tahun_akademik: "2023/2024" -> 2023
        $yearSql = "CAST(SUBSTRING_INDEX(pengajuans.tahun_akademik,'/',1) AS UNSIGNED)";

        // tahun maksimum dari data sesuai status
        $maxYear = DB::table('pengajuans')
            ->where('status', $status)
            ->selectRaw("MAX($yearSql) as max_year")
            ->value('max_year');

        if (!$maxYear) {
            $maxYear = now()->year;
        }

        $startYear = $maxYear - ($yearsCount - 1);
        $years = range($startYear, $maxYear);

        // total subtotal per unit per tahun
        $rows = DB::table('pengajuans')
            ->join('pengajuan_items', 'pengajuan_items.pengajuan_id', '=', 'pengajuans.id')
            ->where('pengajuans.status', $status)
            ->whereNotNull('pengajuans.unit')
            ->whereRaw("$yearSql BETWEEN ? AND ?", [$startYear, $maxYear])
            ->selectRaw("
                pengajuans.unit as unit,
                $yearSql as tahun,
                SUM(pengajuan_items.subtotal) as total
            ")
            ->groupBy('unit', 'tahun')
            ->orderBy('unit')
            ->orderBy('tahun')
            ->get();

        // pivot -> format recharts:
        // [{ unit:'FK', '2023':1000, '2024':2000, '2025':0 }, ...]
        $map = [];
        foreach ($rows as $r) {
            $unit = $r->unit ?: 'Tidak Diketahui';

            if (!isset($map[$unit])) {
                $map[$unit] = ['unit' => $unit];
                foreach ($years as $y) $map[$unit][(string)$y] = 0;
            }

            $map[$unit][(string)$r->tahun] = (int) $r->total;
        }

        $data = array_values($map);

        return response()->json([
            'success' => true,
            'status' => $status,
            'years' => array_map('strval', $years),
            'data' => $data,
        ]);
    }
}
