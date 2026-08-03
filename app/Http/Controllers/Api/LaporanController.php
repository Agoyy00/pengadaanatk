<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LaporanController extends Controller
{
    public function grafikBelanja(Request $request)
    {
        try {
            $yearsCount = (int) ($request->query('years', 3));
            if ($yearsCount <= 0) $yearsCount = 3;
            if ($yearsCount > 10) $yearsCount = 10;

            $status = $request->query('status', 'disetujui');

            // 1. Fetch pengajuans with items (Database-agnostic query compatible with SQLite & MySQL)
            $query = DB::table('pengajuans')
                ->join('pengajuan_items', 'pengajuan_items.pengajuan_id', '=', 'pengajuans.id')
                ->whereNotNull('pengajuans.unit');

            if ($status !== 'all') {
                if ($status === 'diverifikasi_admin') {
                    $query->whereIn('pengajuans.status', ['diverifikasi_admin', 'diverifikasi']);
                } elseif ($status === 'ditolak_admin' || $status === 'ditolak') {
                    $query->whereIn('pengajuans.status', ['ditolak_admin', 'ditolak']);
                } else {
                    $query->where('pengajuans.status', $status);
                }
            }

            $rows = $query->select(
                'pengajuans.unit',
                'pengajuans.tahun_akademik',
                'pengajuans.created_at',
                'pengajuan_items.subtotal',
                'pengajuan_items.jumlah_diajukan',
                'pengajuan_items.harga_satuan'
            )->get();

            // 2. Process year extraction & subtotal in PHP
            $parsedRows = [];
            $maxYearFound = null;

            foreach ($rows as $row) {
                $unitName = trim($row->unit ?: 'Lainnya');
                $extractedYear = null;

                if (!empty($row->tahun_akademik) && str_contains($row->tahun_akademik, '/')) {
                    $parts = explode('/', $row->tahun_akademik);
                    $firstPart = (int) trim($parts[0]);
                    if ($firstPart > 1900 && $firstPart < 2100) {
                        $extractedYear = $firstPart;
                    }
                }

                if (!$extractedYear && !empty($row->created_at)) {
                    $extractedYear = (int) date('Y', strtotime($row->created_at));
                }

                if (!$extractedYear) {
                    $extractedYear = (int) date('Y');
                }

                if ($maxYearFound === null || $extractedYear > $maxYearFound) {
                    $maxYearFound = $extractedYear;
                }

                $subtotal = (int) $row->subtotal;
                if ($subtotal <= 0) {
                    $subtotal = ((int) ($row->jumlah_diajukan ?? 0)) * ((int) ($row->harga_satuan ?? 0));
                }

                $parsedRows[] = [
                    'unit'  => $unitName,
                    'tahun' => $extractedYear,
                    'total' => $subtotal
                ];
            }

            if ($maxYearFound === null) {
                $maxYearFound = (int) date('Y');
            }

            $startYear = (int) $maxYearFound - ($yearsCount - 1);
            $years = range($startYear, (int) $maxYearFound);

            // 3. Aggregate data per unit & year (Bar Chart)
            $map = [];
            $unitTotals = [];
            $yearTotals = [];

            foreach ($years as $yr) {
                $yearTotals[(string)$yr] = 0;
            }

            foreach ($parsedRows as $item) {
                $y = $item['tahun'];
                if ($y >= $startYear && $y <= $maxYearFound) {
                    $unitName = $item['unit'];
                    if (!isset($map[$unitName])) {
                        $map[$unitName] = ['unit' => $unitName];
                        foreach ($years as $yr) {
                            $map[$unitName][(string)$yr] = 0;
                        }
                    }
                    $map[$unitName][(string)$y] += $item['total'];

                    if (!isset($unitTotals[$unitName])) {
                        $unitTotals[$unitName] = 0;
                    }
                    $unitTotals[$unitName] += $item['total'];
                    $yearTotals[(string)$y] += $item['total'];
                }
            }

            $data = array_values($map);

            // 4. Data Diagram Pie (Proporsi Belanja per Unit)
            $pieData = [];
            foreach ($unitTotals as $uName => $val) {
                $pieData[] = [
                    'name' => $uName,
                    'value' => $val,
                ];
            }

            // 5. Data Diagram Line (Tren Belanja per Tahun)
            $lineData = [];
            foreach ($years as $yr) {
                $lineData[] = [
                    'tahun' => (string)$yr,
                    'total' => $yearTotals[(string)$yr] ?? 0,
                ];
            }

            // 6. Data Diagram Status (Distribusi Status Pengajuan)
            $allReqs = DB::table('pengajuans')->get();
            $statusCounts = [
                'Disetujui Super Admin' => 0,
                'Diverifikasi Admin' => 0,
                'Diajukan' => 0,
                'Ditolak Admin' => 0,
            ];

            foreach ($allReqs as $rq) {
                $st = strtolower($rq->status);
                if ($st === 'disetujui') $statusCounts['Disetujui Super Admin']++;
                elseif ($st === 'diverifikasi_admin' || $st === 'diverifikasi') $statusCounts['Diverifikasi Admin']++;
                elseif ($st === 'diajukan') $statusCounts['Diajukan']++;
                elseif (str_contains($st, 'ditolak')) $statusCounts['Ditolak Admin']++;
            }

            $statusData = [];
            foreach ($statusCounts as $sName => $countVal) {
                $statusData[] = [
                    'name' => $sName,
                    'jumlah' => $countVal,
                ];
            }

            return response()->json([
                'success' => true,
                'status'  => $status,
                'years'   => array_map('strval', $years),
                'data'    => $data,
                'pieData' => $pieData,
                'lineData' => $lineData,
                'statusData' => $statusData,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal memuat data grafik: ' . $e->getMessage(),
            ], 500);
        }
    }
}
