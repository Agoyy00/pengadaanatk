<?php

namespace App\Imports;

use App\Models\Barang;
use App\Models\BarangAuditLog;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class BarangAtkImport implements ToModel, WithHeadingRow
{
    protected int $actorUserId;

    public function __construct(int $actorUserId)
    {
        $this->actorUserId = $actorUserId;
    }

    public function model(array $row)
    {
        $nama = trim($row['nama'] ?? '');
        $harga = (int) ($row['harga_satuan'] ?? 0);

        if ($nama === '') {
            return null;
        }

        // 🔒 generate kode AMAN (atomic)
        $kodeBaru = DB::transaction(function () {
            $lastNumber = Barang::lockForUpdate()
                ->selectRaw("MAX(CAST(SUBSTRING(kode,5) AS UNSIGNED)) as max")
                ->value('max') ?? 0;

            return 'ATK-' . str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        });

        $barang = Barang::create([
            'kode'         => $kodeBaru,
            'nama'         => $nama,
            'satuan'       => 'dus', // 🔒 KUNCI FINAL
            'harga_satuan' => $harga,
        ]);

        // 🧾 audit log import
        BarangAuditLog::create([
            'barang_id' => $barang->id,
            'user_id'   => $this->actorUserId,
            'action'    => 'import',
            'old_data'  => null,
            'new_data'  => $barang->toArray(),
        ]);

        return $barang;
    }
}
