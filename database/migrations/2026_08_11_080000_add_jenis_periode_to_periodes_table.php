<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('periodes', function (Blueprint $table) {
            if (!Schema::hasColumn('periodes', 'jenis_periode')) {
                $table->string('jenis_periode')->default('Periode Pengajuan')->after('tahun_akademik');
            }
        });
    }

    public function down(): void
    {
        Schema::table('periodes', function (Blueprint $table) {
            if (Schema::hasColumn('periodes', 'jenis_periode')) {
                $table->dropColumn('jenis_periode');
            }
        });
    }
};
