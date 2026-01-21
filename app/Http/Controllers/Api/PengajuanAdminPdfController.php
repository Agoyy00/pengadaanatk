<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Pengajuan;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Auth;

class PengajuanAdminPdfController extends Controller
{
    /**
     * ================= ADMIN PDF =================
     * Untuk keperluan VERIFIKASI ADMIN
     * Status: diajukan
     * Role  : Admin (role_id = 2)
     */
    public function adminPdf(Pengajuan $pengajuan)
    {
        $user = Auth::user();

        // Auth check
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        // Role check (ADMIN)
        if ((int) $user->role_id !== 2) {
            return response()->json([
                'message' => 'Forbidden (Not Admin)',
                'role_id' => $user->role_id
            ], 403);
        }

        // Status check
        if ($pengajuan->status !== 'diajukan') {
            return response()->json([
                'message' => 'PDF Admin hanya tersedia untuk pengajuan berstatus diajukan',
                'status'  => $pengajuan->status
            ], 422);
        }

        // Load relations
        $pengajuan->load([
            'items.barang',
        ]);

        return Pdf::loadView(
            'pdf.pengajuan-admin',
            compact('pengajuan')
        )->download('Pengajuan-Admin-' . $pengajuan->id . '.pdf');
    }

    /**
     * ================= SUPERADMIN PDF =================
     * Untuk dokumen APPROVAL
     * Status: disetujui | ditolak_admin
     * Role  : Superadmin (role_id = 1)
     */
    public function superadminPdf(Pengajuan $pengajuan)
    {
        $user = Auth::user();

        // Auth check
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        // Role check (SUPERADMIN)
        if ((int) $user->role_id !== 1) {
            return response()->json([
                'message' => 'Forbidden (Not Superadmin)',
                'role_id' => $user->role_id
            ], 403);
        }

        // Status check
        if (!in_array($pengajuan->status, ['disetujui', 'ditolak_admin'])) {
            return response()->json([
                'message' => 'PDF Superadmin hanya tersedia setelah approval',
                'status'  => $pengajuan->status
            ], 422);
        }

        // Load relations lengkap (AMAN DARI NULL)
        $pengajuan->load([
            'items.barang',
            'verifiedBy',
            'approvedBy',
        ]);

        return Pdf::loadView(
            'pdf.pengajuan-superadmin',
            compact('pengajuan')
        )->download('Approval-ATK-' . $pengajuan->id . '.pdf');
    }
}
