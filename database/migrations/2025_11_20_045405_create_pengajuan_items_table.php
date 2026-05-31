<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pengajuan_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pengajuan_id')->constrained('pengajuans')->onDelete('cascade');
            $table->foreignId('barang_id')->constrained('barangs');
            $table->integer('kebutuhan_total');
            $table->integer('sisa_stok');
            $table->integer('jumlah_diajukan');
            $table->bigInteger('harga_satuan');
            $table->bigInteger('subtotal'); // jumlah_diajukan * harga_satuan
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pengajuan_items');
    }
};
