<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pengajuan_items', function (Blueprint $table) {
            $table->integer('jumlah_disetujui')->nullable()->after('jumlah_diajukan');
            $table->text('catatan_revisi')->nullable()->after('jumlah_disetujui');
        });
    }

    public function down(): void
    {
        Schema::table('pengajuan_items', function (Blueprint $table) {
            $table->dropColumn('jumlah_disetujui');
            $table->dropColumn('catatan_revisi');
        });
    }
};
