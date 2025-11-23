<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Hapus foreign key & kolom role_id di tabel users kalau ada
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'role_id')) {
                // nama constraint bisa beda, jadi kita amanin pakai try-catch
                try {
                    $table->dropForeign(['role_id']);
                } catch (\Throwable $e) {
                    // abaikan kalau sudah pernah di-drop
                }

                $table->dropColumn('role_id');
            }
        });

        // Drop tabel roles kalau ada
        if (Schema::hasTable('roles')) {
            Schema::drop('roles');
        }
    }

    public function down(): void
    {
        // Kalau mau, bisa dibiarkan kosong atau bikin ulang tabel roles + role_id
        // Tapi untuk kasus kita, kosong juga tidak masalah.
    }
};
