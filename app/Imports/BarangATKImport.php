<?php

namespace App\Imports;

use App\Models\Barang;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class BarangAtkImport implements ToModel, WithHeadingRow
{
    public function model(array $row)
    {
        // Ambil kode terakhir
        $last = Barang::orderBy('id', 'desc')->first();
        $lastNumber = $last ? intval(substr($last->kode, 4)) : 0;

        $kodeBaru = 'ATK-' . str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);

        return new Barang([
            'kode' => $kodeBaru,
            'nama' => $row['nama'],
            'satuan' => 'dus', // DIKUNCI
            'harga_satuan' => $row['harga_satuan'],
        ]);
    }
}
