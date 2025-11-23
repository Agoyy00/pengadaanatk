<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;

use App\Http\Controllers\Api\BarangController;
use App\Http\Controllers\Api\PengajuanController;


Route::get('/barang', [BarangController::class, 'index']);
Route::get('/barang/{barang}', [BarangController::class, 'show']);
Route::get('/pengajuan', [PengajuanController::class, 'index']);
Route::post('/pengajuan', [PengajuanController::class, 'store']);
Route::post('/login', [AuthController::class, 'login']);
Route::get('/pengajuan', [PengajuanController::class, 'index']);
Route::post('/pengajuan', [PengajuanController::class, 'store']);
Route::patch('/pengajuan/{pengajuan}/status', [PengajuanController::class, 'updateStatus']);
