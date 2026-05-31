<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('barangs', function (Blueprint $table) {
            // Harga satuan (rupiah) tanpa desimal
            // after('satuan') bisa kamu ubah sesuai kolom terakhir yang ada
            $table->unsignedBigInteger('harga')->default(0)->after('satuan');
        });
    }

    public function down(): void
    {
        Schema::table('barangs', function (Blueprint $table) {
            $table->dropColumn('harga');
        });
    }
};
