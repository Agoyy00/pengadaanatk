<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;

Route::get('/test', function () {
    return response()->json([
        'message' => 'API jalan!'
    ]);
});

Route::post('/login', [AuthController::class, 'login']);