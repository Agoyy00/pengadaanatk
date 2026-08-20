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
        if (!Schema::hasTable('pengajuan_revision_logs')) {
            Schema::create('pengajuan_revision_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('pengajuan_id')->constrained('pengajuans')->onDelete('cascade');
                $table->foreignId('revised_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('revised_at')->useCurrent();
                $table->string('action_type')->default('revisi'); // revisi, hapus_item, tambah_item, batal
                $table->json('diff_json')->nullable();
                $table->text('catatan')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pengajuan_revision_logs');
    }
};
