<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pengajuans', function (Blueprint $table) {
            // Tambah kolom user_id (tanpa foreign key agar tidak error)
            if (!Schema::hasColumn('pengajuans', 'user_id')) {
                $table->unsignedBigInteger('user_id')
                      ->nullable() // biarkan NULL agar migration tidak error
                      ->after('id');
            }

            // Tambah kolom status
            if (!Schema::hasColumn('pengajuans', 'status')) {
                $table->string('status')
                      ->default('diajukan')
                      ->after('unit');
            }

            // Tambah kolom total_nilai kalau belum ada
            if (!Schema::hasColumn('pengajuans', 'total_nilai')) {
                $table->bigInteger('total_nilai')->default(0)->after('status');
            }

            // Tambah kolom total_jumlah_diajukan kalau belum ada
            if (!Schema::hasColumn('pengajuans', 'total_jumlah_diajukan')) {
                $table->integer('total_jumlah_diajukan')->default(0)->after('total_nilai');
            }
        });
    }

    public function down(): void
    {
        Schema::table('pengajuans', function (Blueprint $table) {
            // Hapus kolom user_id
            if (Schema::hasColumn('pengajuans', 'user_id')) {
                $table->dropColumn('user_id');
            }

            // Hapus kolom status
            if (Schema::hasColumn('pengajuans', 'status')) {
                $table->dropColumn('status');
            }

            // Hapus kolom total_nilai
            if (Schema::hasColumn('pengajuans', 'total_nilai')) {
                $table->dropColumn('total_nilai');
            }

            // Hapus kolom total_jumlah_diajukan
            if (Schema::hasColumn('pengajuans', 'total_jumlah_diajukan')) {
                $table->dropColumn('total_jumlah_diajukan');
            }
        });
    }
};
