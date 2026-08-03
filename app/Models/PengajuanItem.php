<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PengajuanItem extends Model
{
    protected $fillable = [
        'pengajuan_id',
        'barang_id',
        'kebutuhan_total',
        'sisa_stok',
        'jumlah_diajukan',
        'harga_satuan',
        'subtotal',

        // 🔽 kolom baru revisi
        'jumlah_disetujui',
        'catatan_revisi',
        'kebutuhan_total_admin',
        'sisa_stok_admin',
    ];

    public function pengajuan()
    {
        return $this->belongsTo(Pengajuan::class);
    }

    public function barang()
    {
        return $this->belongsTo(Barang::class);
    }
}
