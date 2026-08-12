<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('support_tickets', function (Blueprint $table) {
            if (!Schema::hasColumn('support_tickets', 'is_read')) {
                $table->boolean('is_read')->default(false)->after('status');
            }
        });

        Schema::table('support_ticket_replies', function (Blueprint $table) {
            if (!Schema::hasColumn('support_ticket_replies', 'is_read')) {
                $table->boolean('is_read')->default(false)->after('sender_type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('support_tickets', function (Blueprint $table) {
            if (Schema::hasColumn('support_tickets', 'is_read')) {
                $table->dropColumn('is_read');
            }
        });

        Schema::table('support_ticket_replies', function (Blueprint $table) {
            if (Schema::hasColumn('support_ticket_replies', 'is_read')) {
                $table->dropColumn('is_read');
            }
        });
    }
};
