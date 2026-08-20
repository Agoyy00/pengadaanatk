<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Pengajuan;
use App\Models\StockOpname;

class MonitoringController extends Controller
{
    /**
     * GET /api/monitoring/admin
     * Retrieve admin activity logs with search and filter support.
     */
    public function adminLogs(Request $request)
    {
        $query = DB::table('admin_activity_logs')
            ->leftJoin('users', 'admin_activity_logs.user_id', '=', 'users.id')
            ->select('admin_activity_logs.*', 'users.name as admin_name', 'users.email as admin_email', 'users.unit as admin_unit')
            ->orderBy('admin_activity_logs.created_at', 'desc');

        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('admin_activity_logs.action', 'like', "%$s%")
                  ->orWhere('admin_activity_logs.description', 'like', "%$s%")
                  ->orWhere('users.name', 'like', "%$s%")
                  ->orWhere('users.email', 'like', "%$s%")
                  ->orWhere('users.unit', 'like', "%$s%");
            });
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('admin_activity_logs.created_at', [$request->start_date . ' 00:00:00', $request->end_date . ' 23:59:59']);
        }

        $logs = $query->get();

        return response()->json([
            'success' => true,
            'logs'    => $logs
        ]);
    }

    /**
     * GET /api/monitoring/user
     * Retrieve all user requests (pengajuan) with search, debounce query support, and filters.
     */
    public function userRequests(Request $request)
    {
        $user = $request->user();
        $query = Pengajuan::with(['items.barang', 'user', 'lampirans', 'pengambilan'])
            ->orderBy('created_at', 'desc');

        // Scoping hak akses: Jika admin unit, batasi ke unit yang sama jika diperlukan
        if ($user && $user->role_id === 2 && !empty($user->unit)) {
            // Admin can monitor their unit or all if not set
            if ($request->filled('scoped_unit') && $request->scoped_unit === 'true') {
                $query->where('unit', $user->unit);
            }
        }

        // Search Keyword
        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('id', 'like', "%$s%")
                  ->orWhere('nama_pemohon', 'like', "%$s%")
                  ->orWhere('unit', 'like', "%$s%")
                  ->orWhere('jabatan', 'like', "%$s%")
                  ->orWhere('tahun_akademik', 'like', "%$s%")
                  ->orWhere('status', 'like', "%$s%")
                  ->orWhereHas('user', function ($uq) use ($s) {
                      $uq->where('name', 'like', "%$s%")
                         ->orWhere('email', 'like', "%$s%");
                  })
                  ->orWhereHas('items.barang', function ($bq) use ($s) {
                      $bq->where('nama', 'like', "%$s%")
                         ->orWhere('kode', 'like', "%$s%");
                  });
            });
        }

        // Filter Status
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Filter Unit
        if ($request->filled('unit') && $request->unit !== 'all') {
            $query->where('unit', $request->unit);
        }

        // Filter Tanggal
        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('created_at', [$request->start_date . ' 00:00:00', $request->end_date . ' 23:59:59']);
        }

        $requests = $query->get();

        return response()->json([
            'success'  => true,
            'requests' => $requests
        ]);
    }
}
