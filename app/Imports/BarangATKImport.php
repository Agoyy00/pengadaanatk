<?php

namespace App\Imports;

use App\Models\Barang;
use App\Models\BarangAuditLog;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class BarangAtkImport implements ToModel, WithHeadingRow
{
    protected int $actorUserId;
    protected int $nextNumber;

    public function __construct(int $actorUserId)
    {
        $this->actorUserId = $actorUserId;

        $lastBarang = Barang::where('kode', 'like', 'ATK-%')
            ->selectRaw("MAX(CAST(SUBSTRING(kode, 5) AS UNSIGNED)) as max_code")
            ->first();

        $this->nextNumber = ($lastBarang->max_code ?? 0) + 1;
    }

    public function model(array $row)
    {
        // 🔥 PAKSA BACA HEADER YANG VALID
        $nama = trim(
            $row['nama']
            ?? $row['nama_barang']
            ?? ''
        );

        if ($nama === '') {
            throw new \Exception("Kolom nama / nama_barang tidak ditemukan di Excel");
        }

        $harga = (int) (
            $row['harga']
            ?? $row['harga_satuan']
            ?? 0
        );

        $kode = 'ATK-' . str_pad($this->nextNumber, 3, '0', STR_PAD_LEFT);
        $this->nextNumber++;

        $barang = Barang::create([
            'kode'         => $kode,
            'nama'         => $nama,
            'satuan'       => 'dus',
            'harga_satuan' => $harga,
        ]);

        BarangAuditLog::create([
            'barang_id' => $barang->id,
            'user_id'   => $this->actorUserId,
            'action'    => 'import',
            'new_data'  => json_encode($barang->toArray()),
        ]);

        return $barang;
    }
}
