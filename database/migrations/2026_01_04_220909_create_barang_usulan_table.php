<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('barang_usulan', function (Blueprint $table) {
        $table->id();
        $table->string('nama_barang');
        $table->foreignId('user_id')->constrained()->cascadeOnDelete();
        $table->string('unit')->nullable();
        $table->timestamps();
    });

    }

    public function down(): void
    {
        Schema::dropIfExists('barang_usulan');
    }
};
