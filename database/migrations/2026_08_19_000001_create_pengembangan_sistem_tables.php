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
        // 1. Soft Deletes & Pembatalan pada Pengajuans
        Schema::table('pengajuans', function (Blueprint $table) {
            if (!Schema::hasColumn('pengajuans', 'alasan_pembatalan')) {
                $table->text('alasan_pembatalan')->nullable()->after('catatan_admin');
            }
            if (!Schema::hasColumn('pengajuans', 'cancelled_by')) {
                $table->foreignId('cancelled_by')->nullable()->after('alasan_pembatalan')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('pengajuans', 'cancelled_at')) {
                $table->timestamp('cancelled_at')->nullable()->after('cancelled_by');
            }
            if (!Schema::hasColumn('pengajuans', 'deleted_at')) {
                $table->softDeletes()->after('updated_at');
            }
        });

        Schema::table('pengajuan_items', function (Blueprint $table) {
            if (!Schema::hasColumn('pengajuan_items', 'deleted_at')) {
                $table->softDeletes()->after('updated_at');
            }
        });

        // 2. Satuan Barang Tambahan (Multi-unit conversion)
        if (!Schema::hasTable('barang_satuans')) {
            Schema::create('barang_satuans', function (Blueprint $table) {
                $table->id();
                $table->foreignId('barang_id')->constrained('barangs')->onDelete('cascade');
                $table->string('nama_satuan'); // Dus, Pack, Box, Lusin, dll.
                $table->integer('faktor_konversi')->default(1); // 1 Box = 100 Pcs -> 100
                $table->string('keterangan')->nullable();
                $table->timestamps();
            });
        }

        // 3. Detail Stock Opname Multi-Satuan & Approval fields
        Schema::table('stock_opnames', function (Blueprint $table) {
            if (!Schema::hasColumn('stock_opnames', 'alasan_penyesuaian')) {
                $table->text('alasan_penyesuaian')->nullable()->after('keterangan');
            }
            if (!Schema::hasColumn('stock_opnames', 'approved_by')) {
                $table->foreignId('approved_by')->nullable()->after('status')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('stock_opnames', 'approved_at')) {
                $table->timestamp('approved_at')->nullable()->after('approved_by');
            }
            if (!Schema::hasColumn('stock_opnames', 'rincian_satuan')) {
                $table->json('rincian_satuan')->nullable()->after('selisih');
            }
        });

        // 4. Lampiran / File Uploads
        if (!Schema::hasTable('pengajuan_lampirans')) {
            Schema::create('pengajuan_lampirans', function (Blueprint $table) {
                $table->id();
                $table->foreignId('pengajuan_id')->nullable()->constrained('pengajuans')->onDelete('cascade');
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('file_name');
                $table->string('file_path');
                $table->string('file_type')->nullable();
                $table->bigInteger('file_size')->nullable();
                $table->string('kategori')->default('lampiran_pengajuan'); // nota, foto_fisik, lampiran_pengajuan, serah_terima
                $table->text('keterangan')->nullable();
                $table->timestamps();
            });
        }

        // 5. Form Pengambilan Barang (Handover & Auto-Deduct)
        if (!Schema::hasTable('pengambilan_barangs')) {
            Schema::create('pengambilan_barangs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('pengajuan_id')->constrained('pengajuans')->onDelete('cascade');
                $table->string('nomor_pengambilan')->unique();
                $table->dateTime('tanggal_pengambilan');
                $table->string('nama_penerima');
                $table->string('unit');
                $table->text('catatan_kondisi')->nullable();
                $table->longText('tanda_tangan')->nullable(); // Signature base64 / path
                $table->string('foto_serah_terima')->nullable();
                $table->string('status')->default('selesai');
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('pengambilan_barang_items')) {
            Schema::create('pengambilan_barang_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('pengambilan_barang_id')->constrained('pengambilan_barangs')->onDelete('cascade');
                $table->foreignId('pengajuan_item_id')->nullable()->constrained('pengajuan_items')->nullOnDelete();
                $table->foreignId('barang_id')->constrained('barangs')->onDelete('cascade');
                $table->integer('jumlah_disetujui');
                $table->integer('jumlah_diambil');
                $table->string('satuan');
                $table->string('catatan')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pengambilan_barang_items');
        Schema::dropIfExists('pengambilan_barangs');
        Schema::dropIfExists('pengajuan_lampirans');
        Schema::dropIfExists('barang_satuans');

        Schema::table('stock_opnames', function (Blueprint $table) {
            $table->dropColumn(['alasan_penyesuaian', 'approved_by', 'approved_at', 'rincian_satuan']);
        });

        Schema::table('pengajuan_items', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('pengajuans', function (Blueprint $table) {
            $table->dropColumn(['alasan_pembatalan', 'cancelled_by', 'cancelled_at']);
            $table->dropSoftDeletes();
        });
    }
};
