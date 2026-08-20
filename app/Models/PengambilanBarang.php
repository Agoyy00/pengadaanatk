<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PengambilanBarang extends Model
{
    use HasFactory;

    protected $table = 'pengambilan_barangs';

    protected $fillable = [
        'pengajuan_id',
        'nomor_pengambilan',
        'tanggal_pengambilan',
        'nama_penerima',
        'unit',
        'catatan_kondisi',
        'tanda_tangan',
        'foto_serah_terima',
        'status',
        'tipe_pengambilan',
        'created_by',
    ];

    protected $casts = [
        'tanggal_pengambilan' => 'datetime',
    ];

    public function pengajuan(): BelongsTo
    {
        return $this->belongsTo(Pengajuan::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PengambilanBarangItem::class, 'pengambilan_barang_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
