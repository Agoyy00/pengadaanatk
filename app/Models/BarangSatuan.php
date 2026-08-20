<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BarangSatuan extends Model
{
    use HasFactory;

    protected $table = 'barang_satuans';

    protected $fillable = [
        'barang_id',
        'nama_satuan',
        'faktor_konversi',
        'keterangan',
    ];

    public function barang(): BelongsTo
    {
        return $this->belongsTo(Barang::class);
    }
}
