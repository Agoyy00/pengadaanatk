<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE notifications MODIFY COLUMN pengajuan_id BIGINT UNSIGNED NULL');
        DB::statement('ALTER TABLE notifications DROP FOREIGN KEY notifications_pengajuan_id_foreign');
        DB::statement('ALTER TABLE notifications ADD CONSTRAINT notifications_pengajuan_id_foreign FOREIGN KEY (pengajuan_id) REFERENCES pengajuans(id) ON DELETE SET NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE notifications DROP FOREIGN KEY notifications_pengajuan_id_foreign');
        DB::statement('ALTER TABLE notifications MODIFY COLUMN pengajuan_id BIGINT UNSIGNED NOT NULL');
        DB::statement('ALTER TABLE notifications ADD CONSTRAINT notifications_pengajuan_id_foreign FOREIGN KEY (pengajuan_id) REFERENCES pengajuans(id) ON DELETE CASCADE');
    }
};
