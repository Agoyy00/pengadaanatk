<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE notifications MODIFY COLUMN pengajuan_id BIGINT UNSIGNED NULL');
            DB::statement('ALTER TABLE notifications DROP FOREIGN KEY notifications_pengajuan_id_foreign');
            DB::statement('ALTER TABLE notifications ADD CONSTRAINT notifications_pengajuan_id_foreign FOREIGN KEY (pengajuan_id) REFERENCES pengajuans(id) ON DELETE SET NULL');
        } else {
            Schema::table('notifications', function (Blueprint $table) {
                $table->unsignedBigInteger('pengajuan_id')->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE notifications DROP FOREIGN KEY notifications_pengajuan_id_foreign');
            DB::statement('ALTER TABLE notifications MODIFY COLUMN pengajuan_id BIGINT UNSIGNED NOT NULL');
            DB::statement('ALTER TABLE notifications ADD CONSTRAINT notifications_pengajuan_id_foreign FOREIGN KEY (pengajuan_id) REFERENCES pengajuans(id) ON DELETE CASCADE');
        } else {
            Schema::table('notifications', function (Blueprint $table) {
                $table->unsignedBigInteger('pengajuan_id')->nullable(false)->change();
            });
        }
    }
};
