<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;

<<<<<<< HEAD
Route::get('/test', function () {
    return response()->json([
        'message' => 'API jalan!'
    ]);
});

Route::post('/login', [AuthController::class, 'login']);
=======
use App\Http\Controllers\Api\BarangController;

Route::get('/barang', [BarangController::class, 'index']);
Route::get('/barang/{barang}', [BarangController::class, 'show']);
>>>>>>> e32da5a2da99e65512d139ffa3342237e08da15e
