<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BarangController;
use App\Http\Controllers\Api\PengajuanController;
use App\Http\Controllers\Api\PeriodeController;
use App\Http\Controllers\Api\UserManagementController;

/*s
|--------------------------------------------------------------------------
| Login
|--------------------------------------------------------------------------
*/
Route::post('/login', [AuthController::class, 'login']);

/*
|--------------------------------------------------------------------------
| Manajemen User (Super Admin)
|--------------------------------------------------------------------------
*/
Route::get('/users', [UserManagementController::class, 'index']);
Route::post('/users', [UserManagementController::class, 'store']);

/*
|--------------------------------------------------------------------------
| Barang (Admin/SuperAdmin)
|--------------------------------------------------------------------------
*/
Route::get('/barang', [BarangController::class, 'index']);
Route::get('/barang/{barang}', [BarangController::class, 'show']);
Route::get('/barang/{barang}/logs', [BarangController::class, 'logs']);


// ✅ CRUD barang (baru)
Route::post('/barang', [BarangController::class, 'store']);
Route::patch('/barang/{barang}', [BarangController::class, 'update']);
Route::delete('/barang/{barang}', [BarangController::class, 'destroy']);

// ✅ update harga (kalau kamu sudah pakai ini)
Route::patch('/barang/{barang}/harga', [BarangController::class, 'updateHarga']);

/*
|--------------------------------------------------------------------------
| Pengajuan ATK
|--------------------------------------------------------------------------
*/
Route::get('/pengajuan', [PengajuanController::class, 'index']);
Route::post('/pengajuan', [PengajuanController::class, 'store']);
Route::patch('/pengajuan/{pengajuan}/status', [PengajuanController::class, 'updateStatus']);
Route::get('/pengajuan/check/{user}/{tahun}', [PengajuanController::class, 'checkUserPengajuan']);

Route::get('/analisis-barang', [PengajuanController::class, 'analisisBarang']);
Route::patch('/pengajuan/{pengajuan}/revisi', [PengajuanController::class, 'revisiItems']);

/*
|--------------------------------------------------------------------------
| Periode Pengajuan
|--------------------------------------------------------------------------
*/
Route::get('/periode/active', [PeriodeController::class, 'active']);
Route::post('/periode', [PeriodeController::class, 'storeOrUpdate']);
Route::get('/periode', [PeriodeController::class, 'index']);
Route::delete('/periode/{periode}', [PeriodeController::class, 'destroy']);
