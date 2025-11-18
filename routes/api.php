<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;

use App\Http\Controllers\Api\BarangController;

Route::get('/barang', [BarangController::class, 'index']);
Route::get('/barang/{barang}', [BarangController::class, 'show']);
