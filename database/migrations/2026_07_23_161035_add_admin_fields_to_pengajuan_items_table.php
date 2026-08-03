<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('pengajuan_items', function (Blueprint $table) {
            $table->integer('kebutuhan_total_admin')->nullable()->after('sisa_stok');
            $table->integer('sisa_stok_admin')->nullable()->after('kebutuhan_total_admin');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pengajuan_items', function (Blueprint $table) {
            $table->dropColumn(['kebutuhan_total_admin', 'sisa_stok_admin']);
        });
    }
};
