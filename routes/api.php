<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BarangController;
use App\Http\Controllers\Api\PengajuanController;
use App\Http\Controllers\Api\PeriodeController;

/*
|--------------------------------------------------------------------------
| Barang
|--------------------------------------------------------------------------
*/

Route::get('/barang', [BarangController::class, 'index']);
Route::get('/barang/{barang}', [BarangController::class, 'show']);

/*
|--------------------------------------------------------------------------
| Pengajuan ATK
|--------------------------------------------------------------------------
*/

Route::get('/pengajuan', [PengajuanController::class, 'index']);
Route::post('/pengajuan', [PengajuanController::class, 'store']);
Route::patch('/pengajuan/{pengajuan}/status', [PengajuanController::class, 'updateStatus']);

/*
|--------------------------------------------------------------------------
| Login
|--------------------------------------------------------------------------
*/

Route::post('/login', [AuthController::class, 'login']);

/*
|--------------------------------------------------------------------------
| Periode Pengajuan ATK
|--------------------------------------------------------------------------
|
| Digunakan untuk membuka/menutup periode pengajuan,
| dan untuk dicek oleh Pengajuan.jsx sebelum form tampil.
|--------------------------------------------------------------------------
*/

Route::get('/periode/active', [PeriodeController::class, 'active']);      // cek periode aktif/akan datang
Route::post('/periode',        [PeriodeController::class, 'storeOrUpdate']);
Route::get('/periode',         [PeriodeController::class, 'index']);      // opsional lihat terakhir
Route::delete('/periode/{periode}', [PeriodeController::class, 'destroy']); // hapus periode
Route::get('/pengajuan/check/{user}/{tahun}', [PengajuanController::class, 'checkUserPengajuan']);
