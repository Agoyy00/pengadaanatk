<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('periodes', function (Blueprint $table) {
            $table->id();
            $table->string('tahun_akademik');   // contoh: 2024/2025
            $table->dateTime('mulai');
            $table->dateTime('selesai');
            $table->boolean('is_open')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('periodes');
    }
};
