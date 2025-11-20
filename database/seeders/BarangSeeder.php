<?php

namespace Database\Seeders;

use App\Models\Barang;
use Illuminate\Database\Seeder;

class BarangSeeder extends Seeder
{
    public function run(): void
    {
        Barang::create([
            'kode' => 'ATK-001',
            'nama' => 'Kertas A4',
            'satuan' => 'Rim',
            'stok' => 50,
            'harga_satuan' => 50000,
        ]);

        Barang::create([
            'kode' => 'ATK-002',
            'nama' => 'Pulpen Hitam',
            'satuan' => 'Pack',
            'stok' => 200,
            'harga_satuan' => 3000,
        ]);
    }
}
