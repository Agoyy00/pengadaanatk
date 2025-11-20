<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('barangs', function (Blueprint $table) {
            $table->id();
            $table->string('kode')->unique();       // contoh: ATK-001
            $table->string('nama');                 // contoh: Kertas A4
            $table->string('satuan');               // contoh: Rim, Box, Pcs
            $table->integer('stok')->default(0);    // stok di gudang
            $table->bigInteger('harga_satuan');     // harga per satuan
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('barangs');
    }
};
