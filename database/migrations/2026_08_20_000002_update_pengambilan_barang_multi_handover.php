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
            if (!Schema::hasColumn('pengajuan_items', 'jumlah_diambil_kumulatif')) {
                $table->integer('jumlah_diambil_kumulatif')->default(0)->after('jumlah_disetujui');
            }
        });

        Schema::table('pengambilan_barangs', function (Blueprint $table) {
            if (!Schema::hasColumn('pengambilan_barangs', 'tipe_pengambilan')) {
                $table->string('tipe_pengambilan')->default('COMPLETE')->after('status'); // PARTIAL or COMPLETE
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pengambilan_barangs', function (Blueprint $table) {
            if (Schema::hasColumn('pengambilan_barangs', 'tipe_pengambilan')) {
                $table->dropColumn('tipe_pengambilan');
            }
        });

        Schema::table('pengajuan_items', function (Blueprint $table) {
            if (Schema::hasColumn('pengajuan_items', 'jumlah_diambil_kumulatif')) {
                $table->dropColumn('jumlah_diambil_kumulatif');
            }
        });
    }
};
