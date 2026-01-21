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
use App\Http\Controllers\Api\PengajuanAdminPdfController;
use App\Http\Controllers\Api\Superadmin\PengajuanPdfSuperadminController;
/*
|--------------------------------------------------------------------------
| Auth
|--------------------------------------------------------------------------
*/
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
    | User Management (Super Admin)
    */
    Route::get('/users', [UserManagementController::class, 'index']);
    Route::post('/users', [UserManagementController::class, 'store']);
    Route::delete('/users/{user}', [UserManagementController::class, 'destroy']);

    /*
    | Barang
    */
    Route::get('/barang', [BarangController::class, 'index']);
    Route::get('/barang/{barang}', [BarangController::class, 'show']);
    Route::get('/barang/{barang}/logs', [BarangController::class, 'logs']);

    Route::post('/barang', [BarangController::class, 'store']);
    Route::patch('/barang/{barang}', [BarangController::class, 'update']);
    Route::delete('/barang/{barang}', [BarangController::class, 'destroy']);
    Route::patch('/barang/{barang}/harga', [BarangController::class, 'updateHarga']);

    Route::post('/barang/import-excel', [BarangController::class, 'importExcel']);

    /*
    | Pengajuan ATK
    */
    Route::get('/pengajuan', [PengajuanController::class, 'index']);
    Route::post('/pengajuan', [PengajuanController::class, 'store']);
    Route::get('/pengajuan/check/{user}/{tahun}', [PengajuanController::class, 'checkUserPengajuan']);

    Route::patch('/pengajuan/{pengajuan}/status', [PengajuanController::class, 'updateStatus']);
    Route::patch('/pengajuan/{pengajuan}/revisi', [PengajuanController::class, 'revisiItems']);


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
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);

    /*
    | Barang Usulan
    */
    Route::post('/barang-usulan', [BarangUsulanController::class, 'store']);
    Route::get('/barang-usulan', [BarangUsulanController::class, 'index']);
    Route::get('/barang-usulan/statistik', [BarangUsulanController::class, 'statistik']);

    /*
    | Import
    */
    Route::post('/barang/import', [PengajuanController::class, 'importBarangATK']);

});
