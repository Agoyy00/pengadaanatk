<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PengajuanLampiran extends Model
{
    use HasFactory;

    protected $table = 'pengajuan_lampirans';

    protected $fillable = [
        'pengajuan_id',
        'user_id',
        'file_name',
        'file_path',
        'file_type',
        'file_size',
        'kategori',
        'keterangan',
    ];

    public function pengajuan(): BelongsTo
    {
        return $this->belongsTo(Pengajuan::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
