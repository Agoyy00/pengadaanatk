<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$now = \Carbon\Carbon::now('Asia/Jakarta');
$periode = \App\Models\Periode::where('mulai', '<=', $now)->where('selesai', '>=', $now)->first();
echo "NOW: " . $now->toDateTimeString() . "\n";
echo "PERIODE: " . ($periode ? "ID: {$periode->id}, mulai: {$periode->mulai}, selesai: {$periode->selesai}" : "NONE") . "\n";

$soFirst = \App\Models\StockOpname::first();
echo "SO CREATED_AT: " . ($soFirst ? $soFirst->created_at : "NONE") . "\n";

