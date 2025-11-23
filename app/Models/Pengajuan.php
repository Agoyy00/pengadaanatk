<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Pengajuan extends Model
{
    use HasFactory;

    protected $table = 'pengajuans';

    protected $fillable = [
        'tahun_akademik',
        'nama_pemohon',
        'jabatan',
        'unit',
        'status',
        'total_nilai',
        'total_jumlah_diajukan',
        'user_id',
    ];

    /**
     * Relasi ke item pengajuan (detail barang-barang yang diajukan)
     */
    public function items(): HasMany
    {
        return $this->hasMany(PengajuanItem::class);
    }

    /**
     * Relasi ke user yang mengajukan
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
