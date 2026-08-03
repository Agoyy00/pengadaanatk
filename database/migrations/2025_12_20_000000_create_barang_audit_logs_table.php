<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('barang_audit_logs', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('barang_id')->nullable(); // nullable utk kasus delete (barang sudah hilang)
            $table->unsignedBigInteger('user_id')->nullable();

            $table->string('action', 30); // create, update, delete, update_harga
            $table->json('old_data')->nullable();
            $table->json('new_data')->nullable();

            $table->timestamps();

            $table->index('barang_id');
            $table->index('user_id');

            $table->foreign('barang_id')->references('id')->on('barangs')->nullOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('barang_audit_logs');
    }
};
