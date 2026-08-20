<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PengambilanBarangItem extends Model
{
    use HasFactory;

    protected $table = 'pengambilan_barang_items';

    protected $fillable = [
        'pengambilan_barang_id',
        'pengajuan_item_id',
        'barang_id',
        'jumlah_disetujui',
        'jumlah_diambil',
        'satuan',
        'catatan',
    ];

    public function pengambilan(): BelongsTo
    {
        return $this->belongsTo(PengambilanBarang::class, 'pengambilan_barang_id');
    }

    public function pengajuanItem(): BelongsTo
    {
        return $this->belongsTo(PengajuanItem::class, 'pengajuan_item_id');
    }

    public function barang(): BelongsTo
    {
        return $this->belongsTo(Barang::class, 'barang_id');
    }
}
