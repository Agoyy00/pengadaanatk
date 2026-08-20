<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PengajuanItem extends Model
{
    use SoftDeletes;
    protected $fillable = [
        'pengajuan_id',
        'barang_id',
        'kebutuhan_total',
        'sisa_stok',
        'jumlah_diajukan',
        'harga_satuan',
        'subtotal',

        // 🔽 kolom baru revisi & handover
        'jumlah_disetujui',
        'jumlah_diambil_kumulatif',
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
