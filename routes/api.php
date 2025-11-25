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

Route::get('/periode/active', [PeriodeController::class, 'active']);             // User cek apakah pengajuan dibuka
Route::post('/periode', [PeriodeController::class, 'storeOrUpdate']);            // Admin atur periode
Route::get('/periode', [PeriodeController::class, 'index']);                     // (opsional) tampilkan semua periode
