<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PengajuanRevisionLog extends Model
{
    use HasFactory;

    protected $table = 'pengajuan_revision_logs';

    protected $fillable = [
        'pengajuan_id',
        'revised_by',
        'revised_at',
        'action_type',
        'diff_json',
        'catatan',
    ];

    protected $casts = [
        'revised_at' => 'datetime',
        'diff_json'  => 'array',
    ];

    public function pengajuan(): BelongsTo
    {
        return $this->belongsTo(Pengajuan::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'revised_by');
    }
}
