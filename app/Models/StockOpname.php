<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockOpname extends Model
{
    use HasFactory;

    protected $fillable = [
        'barang_id',
        'user_id',
        'unit',
        'stok_sistem',
        'stok_fisik',
        'satuan',
        'hasil_verifikasi',
        'selisih',
        'rincian_satuan',
        'keterangan',
        'alasan_penyesuaian',
        'status',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'rincian_satuan' => 'array',
        'approved_at'    => 'datetime',
    ];

    public function barang()
    {
        return $this->belongsTo(Barang::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
