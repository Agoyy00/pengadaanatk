<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Pengajuan extends Model
{
    use HasFactory, SoftDeletes;

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
        'catatan_admin',
        'alasan_pembatalan',
        'cancelled_by',
        'cancelled_at',

        'verified_by',
        'verified_at',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
    'created_at'   => 'datetime',
    'verified_at'  => 'datetime',
    'approved_at'  => 'datetime',
    'cancelled_at' => 'datetime',
    'deleted_at'   => 'datetime',
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
    
    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function cancelledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    public function lampirans(): HasMany
    {
        return $this->hasMany(PengajuanLampiran::class);
    }

    public function pengambilan(): HasOne
    {
        return $this->hasOne(PengambilanBarang::class)->latestOfMany();
    }

    public function pengambilans(): HasMany
    {
        return $this->hasMany(PengambilanBarang::class)->orderBy('created_at', 'asc');
    }

    public function revisionLogs(): HasMany
    {
        return $this->hasMany(PengajuanRevisionLog::class)->orderBy('created_at', 'desc');
    }

}
