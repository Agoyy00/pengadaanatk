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

/*
|--------------------------------------------------------------------------
| Auth
|--------------------------------------------------------------------------
*/
Route::post('/login', [AuthController::class, 'login']);

/*
|--------------------------------------------------------------------------
| User Management (Super Admin)
|--------------------------------------------------------------------------
*/
Route::get('/users', [UserManagementController::class, 'index']);
Route::post('/users', [UserManagementController::class, 'store']);

/*
|--------------------------------------------------------------------------
| Barang
|--------------------------------------------------------------------------
*/
Route::get('/barang', [BarangController::class, 'index']);
Route::get('/barang/{barang}', [BarangController::class, 'show']);
Route::get('/barang/{barang}/logs', [BarangController::class, 'logs']);

// CRUD barang
Route::post('/barang', [BarangController::class, 'store']);
Route::patch('/barang/{barang}', [BarangController::class, 'update']);
Route::delete('/barang/{barang}', [BarangController::class, 'destroy']);

// update harga
Route::patch('/barang/{barang}/harga', [BarangController::class, 'updateHarga']);

/*
|--------------------------------------------------------------------------
| Pengajuan ATK
|--------------------------------------------------------------------------
*/
Route::get('/pengajuan', [PengajuanController::class, 'index']);
Route::post('/pengajuan', [PengajuanController::class, 'store']);
Route::get('/pengajuan/check/{user}/{tahun}', [PengajuanController::class, 'checkUserPengajuan']);
Route::patch('/pengajuan/{pengajuan}/status', [PengajuanController::class, 'updateStatus']);
Route::patch('/pengajuan/{pengajuan}/revisi', [PengajuanController::class, 'revisiItems']);
Route::get('/pengajuan/{pengajuan}/pdf', [PengajuanController::class, 'downloadPdf']);

/*
|--------------------------------------------------------------------------
| Approval (Super Admin)
|--------------------------------------------------------------------------
*/
Route::get('/pengajuan/approval', [PengajuanController::class, 'approvalList']);

/*
|--------------------------------------------------------------------------
| Analisis
|--------------------------------------------------------------------------
*/
Route::get('/analisis-barang', [PengajuanController::class, 'analisisBarang']);

/*
|--------------------------------------------------------------------------
| Periode
|--------------------------------------------------------------------------
*/
Route::get('/periode', [PeriodeController::class, 'index']);
Route::get('/periode/active', [PeriodeController::class, 'active']);
Route::post('/periode', [PeriodeController::class, 'storeOrUpdate']);
Route::delete('/periode/{periode}', [PeriodeController::class, 'destroy']);

/*
|--------------------------------------------------------------------------
| Approval (SuperAdmin)
|--------------------------------------------------------------------------
*/
Route::get('/approval', [PengajuanController::class, 'approvalList']);
Route::patch('/approval/{pengajuan}', [PengajuanController::class, 'approveBySuperAdmin']);
Route::get('/approval/{pengajuan}/pdf', [PengajuanController::class, 'downloadPdf']);

/*
|--------------------------------------------------------------------------
| Laporan (SuperAdmin)
|--------------------------------------------------------------------------
*/
Route::get('/laporan/grafik-belanja', [LaporanController::class, 'grafikBelanja']);
Route::get('/test-qr', function () {return QrCode::size(200)->generate('VERIFIKASI YAYASAN');});

Route::get('/notifications', [NotificationController::class, 'index']);
Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
Route::delete('/users/{user}', [UserManagementController::class, 'destroy']);
