<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pengajuans', function (Blueprint $table) {
    $table->id();
    $table->string('tahun_akademik');
    $table->string('nama_pemohon');
    $table->string('jabatan');
    $table->string('unit');
    $table->enum('status', ['diajukan', 'diverifikasi', 'ditolak', 'disetujui'])
          ->default('diajukan');
    $table->timestamps();
});

    }

    public function down(): void
    {
        Schema::dropIfExists('pengajuans');
    }
};
