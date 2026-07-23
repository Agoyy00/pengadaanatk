<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Pengajuan;

class MonitoringController extends Controller
{
    /**
     * GET /api/monitoring/admin
     * Retrieve admin activity logs.
     */
    public function adminLogs(Request $request)
    {
        $logs = DB::table('admin_activity_logs')
            ->leftJoin('users', 'admin_activity_logs.user_id', '=', 'users.id')
            ->select('admin_activity_logs.*', 'users.name as admin_name', 'users.email as admin_email')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'logs' => $logs
        ]);
    }

    /**
     * GET /api/monitoring/user
     * Retrieve all user requests (pengajuan).
     */
    public function userRequests(Request $request)
    {
        $requests = Pengajuan::with(['items.barang', 'user'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'requests' => $requests
        ]);
    }
}
