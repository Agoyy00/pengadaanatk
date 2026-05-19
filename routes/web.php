<?php

use Illuminate\Support\Facades\Route;

Route::get('/pengajuan-baru', function () {
    return view('pengajuan.form'); // resources/views/pengajuan/form.blade.php
});

Route::get('/download-template', function () {
    return response()->download(public_path('templete_excel.csv'));
});