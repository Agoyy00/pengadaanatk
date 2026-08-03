<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class FixSatuanSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('barangs')->get()->each(function ($b) {
            if ($b->satuan) {
                $formatted = ucwords(strtolower(trim($b->satuan)));
                DB::table('barangs')->where('id', $b->id)->update(['satuan' => $formatted]);
            }
        });
    }
}
