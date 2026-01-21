<?php

namespace App\Http\Controllers\Api\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\Pengajuan;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Auth;

class PengajuanPdfSuperadminController extends Controller
{
    public function download(Pengajuan $pengajuan)
    {
        $user = Auth::user();

        // AUTH
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        // ROLE (1 = superadmin)
        if ((int) $user->role_id !== 1) {
            return response()->json([
                'message' => 'Forbidden (Not Superadmin)',
            ], 403);
        }

        // STATUS
        if (!in_array($pengajuan->status, ['disetujui', 'ditolak_admin'])) {
            return response()->json([
                'message' => 'PDF hanya tersedia setelah approval superadmin',
                'status'  => $pengajuan->status,
            ], 422);
        }

        // LOAD RELATION
        $pengajuan->load([
            'items.barang',
            'verifiedBy',
            'approvedBy',
        ]);

        // PDF
        return Pdf::loadView(
            'pdf.pengajuan',
            ['pengajuan' => $pengajuan]
        )
        ->setPaper('A4', 'portrait')
        ->download('Approval-ATK-' . $pengajuan->id . '.pdf');
    }
}
