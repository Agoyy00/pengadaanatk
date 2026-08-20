<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BarangController;
use App\Http\Controllers\Api\PengajuanController;
use App\Http\Controllers\Api\PeriodeController;
use App\Http\Controllers\Api\UserManagementController;
use App\Http\Controllers\Api\LaporanController;
use SimpleSoftwareIO\QrCode\Facades\QrCode;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\BarangUsulanController;
use App\Http\Controllers\Api\MonitoringController;
use App\Http\Controllers\Api\PengajuanAdminPdfController;
use App\Http\Controllers\Api\SupportTicketController;
use App\Http\Controllers\Api\StockOpnameController;
use App\Http\Controllers\Api\Superadmin\PengajuanPdfSuperadminController;
use App\Http\Controllers\Api\OptionController;
use App\Http\Controllers\Api\AnnouncementController;
/*
|--------------------------------------------------------------------------
| Auth
|--------------------------------------------------------------------------
*/
use App\Http\Controllers\Api\PengambilanBarangController;

/*
|--------------------------------------------------------------------------
| Public API
|--------------------------------------------------------------------------
*/
Route::post('/login', [AuthController::class, 'login']);

Route::get('/periode/active', [PeriodeController::class, 'active']);

/*
|--------------------------------------------------------------------------
| Protected API (Sanctum)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {

    /*
    | Monitoring (Admin & Super Admin)
    */
    Route::get('/monitoring/admin', [MonitoringController::class, 'adminLogs']);
    Route::get('/monitoring/user', [MonitoringController::class, 'userRequests']);

    /*
    | User Management (Super Admin)
    */
    Route::get('/users', [UserManagementController::class, 'index']);
    Route::post('/users', [UserManagementController::class, 'store']);
    Route::delete('/users/{user}', [UserManagementController::class, 'destroy']);
    Route::post('/users/{user}/reset-unit', [UserManagementController::class, 'resetUnit']);

    /*
    | Barang & Satuan
    */
    Route::get('/barang', [BarangController::class, 'index']);
    Route::post('/barang', [BarangController::class, 'store']);
    Route::post('/barang/bulk/delete', [BarangController::class, 'bulkDelete']);
    Route::post('/barang/import-excel', [BarangController::class, 'importExcel']);
    Route::post('/barang/import', [PengajuanController::class, 'importBarangATK']);
    Route::get('/barang/template-pengajuan', [PengajuanController::class, 'exportTemplate']);

    Route::get('/barang/{barang}/logs', [BarangController::class, 'logs']);
    Route::patch('/barang/{barang}/harga', [BarangController::class, 'updateHarga']);
    Route::get('/barang/{barang}/satuans', [BarangController::class, 'getSatuans']);
    Route::post('/barang/{barang}/satuans', [BarangController::class, 'storeSatuan']);
    Route::delete('/barang-satuans/{id}', [BarangController::class, 'destroySatuan']);

    Route::get('/barang/{barang}', [BarangController::class, 'show'])->whereNumber('barang');
    Route::patch('/barang/{barang}', [BarangController::class, 'update'])->whereNumber('barang');
    Route::delete('/barang/{barang}', [BarangController::class, 'destroy'])->whereNumber('barang');

    /*
    | Pengajuan
    */
    Route::get('/pengajuan', [PengajuanController::class, 'index']);
    Route::post('/pengajuan', [PengajuanController::class, 'store']);
    Route::get('/pengajuan/template-export', [PengajuanController::class, 'exportTemplate']);
    Route::get('/pengajuan/trashed', [PengajuanController::class, 'trashed']);
    Route::patch('/pengajuan/{id}/restore', [PengajuanController::class, 'restore']);
    Route::get('/pengajuan/check/{user}',[PengajuanController::class, 'checkLimit']);

    Route::patch('/pengajuan/{pengajuan}/status', [PengajuanController::class, 'updateStatus']);
    Route::patch('/pengajuan/{pengajuan}/cancel', [PengajuanController::class, 'cancel']);
    Route::patch('/pengajuan/{pengajuan}/revisi', [PengajuanController::class, 'revisiItems']);
    Route::patch('/pengajuan/{pengajuan}/user-revisi', [PengajuanController::class, 'userRevisiItems']);
    Route::delete('/pengajuan/{pengajuan}/items/{item}', [PengajuanController::class, 'deleteItem']);
    Route::get('/pengajuan/{pengajuan}/revisions', [PengajuanController::class, 'getRevisionHistory']);
    Route::get('/pengajuan/user-statistik', [PengajuanController::class, 'userStatistik']);
    Route::delete('/pengajuan/{pengajuan}', [PengajuanController::class, 'destroy']);

    /*
    | Lampiran File Pengajuan
    */
    Route::post('/pengajuan/{pengajuan}/lampiran', [PengajuanController::class, 'uploadLampiran']);
    Route::get('/pengajuan/{pengajuan}/lampiran', [PengajuanController::class, 'getLampirans']);
    Route::get('/lampiran/{id}/download', [PengajuanController::class, 'downloadLampiran']);
    Route::delete('/lampiran/{id}', [PengajuanController::class, 'deleteLampiran']);

    /*
    | Form Pengambilan Barang (Serah Terima & Auto-Deduct)
    */
    Route::get('/pengambilan-barang', [PengambilanBarangController::class, 'index']);
    Route::get('/pengambilan-barang/{id}', [PengambilanBarangController::class, 'show']);
    Route::get('/pengajuan/{pengajuan}/pengambilan', [PengambilanBarangController::class, 'getByPengajuan']);
    Route::get('/pengajuan/{pengajuan}/handover-history', [PengambilanBarangController::class, 'getHandoverHistory']);
    Route::post('/pengajuan/{pengajuan}/pengambilan', [PengambilanBarangController::class, 'store']);
    Route::get('/pengambilan-barang/{id}/pdf', [PengambilanBarangController::class, 'downloadPdf']);

    /*
    | Approval (Super Admin)
    */
    Route::get('/approval', [PengajuanController::class, 'approvalList']);
    Route::patch('/approval/{pengajuan}', [PengajuanController::class, 'approveBySuperAdmin']);
    // ===== PDF ADMIN (verifikasi) =====
    Route::get(
        '/pengajuan/{pengajuan}/pdf/admin',
        [PengajuanAdminPdfController::class, 'adminPdf']
    );

    // ===== PDF SUPERADMIN (approval) =====
    Route::prefix('superadmin')
    ->middleware('auth:sanctum')
    ->group(function () {

        Route::get('/pengajuan/pdf/{pengajuan}',
            [PengajuanPdfSuperadminController::class, 'download']
        );

    });

    /*
    | Analisis & Laporan
    */
    Route::get('/analisis-barang', [PengajuanController::class, 'analisisBarang']);
    Route::get('/laporan/grafik-belanja', [LaporanController::class, 'grafikBelanja']);

    /*
    | Periode Management (Admin)
    */
    Route::get('/periode', [PeriodeController::class, 'index']);
    Route::post('/periode', [PeriodeController::class, 'storeOrUpdate']);
    Route::delete('/periode/{periode}', [PeriodeController::class, 'destroy']);

    /*
    | Notification
    */
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);

    /*
    | Barang Usulan
    */
    Route::post('/barang-usulan', [BarangUsulanController::class, 'store']);
    Route::get('/barang-usulan', [BarangUsulanController::class, 'index']);
    Route::get('/barang-usulan/statistik', [BarangUsulanController::class, 'statistik']);

    /*
    | Stock Opname
    */
    Route::get('/stock-opname', [StockOpnameController::class, 'index']);
    Route::get('/stock-opname/draft-pengajuan', [StockOpnameController::class, 'draftPengajuan']);
    Route::post('/stock-opname', [StockOpnameController::class, 'store']);
    Route::post('/stock-opname/bulk', [StockOpnameController::class, 'bulkStore']);
    Route::patch('/stock-opname/{id}/verify', [StockOpnameController::class, 'verify']);
    Route::patch('/stock-opname/{id}/approve', [StockOpnameController::class, 'approve']);
    Route::patch('/stock-opname/{id}/reject', [StockOpnameController::class, 'reject']);
    Route::delete('/stock-opname/bulk-delete', [StockOpnameController::class, 'bulkDestroy']);
    Route::delete('/stock-opname/{id}', [StockOpnameController::class, 'destroy']);

    /*
    | Options (Satuan, Jabatan, Unit)
    */
    Route::get('/options/{type}', [OptionController::class, 'index']);
    Route::post('/options/{type}', [OptionController::class, 'store']);
    Route::put('/options/{id}', [OptionController::class, 'update']);
    Route::delete('/options/{id}', [OptionController::class, 'destroy']);

    /*
    | Support Ticket
    */
    Route::get('/support-tickets/unread-count', [SupportTicketController::class, 'unreadCount']);
    Route::get('/support-tickets/unread-counts', [SupportTicketController::class, 'unreadCounts']);
    Route::get('/support-tickets', [SupportTicketController::class, 'index']);
    Route::post('/support-tickets', [SupportTicketController::class, 'store']);
    Route::patch('/support-tickets/{id}/mark-read', [SupportTicketController::class, 'markTicketAsRead']);
    Route::get('/support-tickets/{id}', [SupportTicketController::class, 'show']);
    Route::patch('/support-tickets/{id}/status', [SupportTicketController::class, 'updateStatus']);
    Route::post('/support-tickets/{id}/reply', [SupportTicketController::class, 'reply']);
    Route::delete('/support-tickets/{id}', [SupportTicketController::class, 'destroy']);

    /*
    | Pengumuman (Announcements)
    */
    // Admin / Superadmin Management
    Route::get('/announcements', [AnnouncementController::class, 'index']);
    Route::post('/announcements', [AnnouncementController::class, 'store']);
    Route::put('/announcements/{id}', [AnnouncementController::class, 'update']);
    Route::patch('/announcements/{id}/publish', [AnnouncementController::class, 'publish']);
    Route::delete('/announcements/{id}', [AnnouncementController::class, 'destroy']);
    Route::get('/announcements/{id}/read-receipts', [AnnouncementController::class, 'readReceipts']);

    // User Broadcast & Read-Only Notifications
    Route::get('/me/announcements', [AnnouncementController::class, 'myAnnouncements']);
    Route::get('/me/announcements/unread-count', [AnnouncementController::class, 'unreadCount']);
    Route::get('/me/announcements/history', [AnnouncementController::class, 'myHistory']);
    Route::get('/me/announcements/{id}', [AnnouncementController::class, 'show']);

});
