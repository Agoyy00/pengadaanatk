<?php

namespace Database\Seeders;

use App\Models\Barang;
use Illuminate\Database\Seeder;

class BarangSeeder extends Seeder
{
    public function run(): void
    {
        Barang::updateOrCreate(
            ['kode' => 'ATK-001'],
            [
                'nama' => 'Kertas A4',
                'satuan' => 'Rim',
                'stok' => 50,
                'harga_satuan' => 50000,
            ]
        );

        Barang::updateOrCreate(
            ['kode' => 'ATK-002'],
            [
                'nama' => 'Pulpen Hitam',
                'satuan' => 'Pcs',
                'stok' => 100,
                'harga_satuan' => 3000,
                'foto'         => '/images/atk/kertas_a4.png', // path relatif ke /public

            ]
        );

        Barang::updateOrCreate(
            ['kode' => 'ATK-003'],
            [
                'nama' => 'Buku Tulis',
                'satuan' => 'Pcs',
                'stok' => 80,
                'harga_satuan' => 7000,
                'foto'         => '/images/atk/pulpen_hitam.png',

            ]
        );
    }
}
