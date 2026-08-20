<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Announcement extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'announcements';

    protected $fillable = [
        'title',
        'body',
        'priority',
        'status',
        'target_type',
        'target_value',
        'created_by',
        'published_at',
        'expires_at',
    ];

    protected $casts = [
        'target_value' => 'array',
        'published_at' => 'datetime',
        'expires_at'   => 'datetime',
        'deleted_at'   => 'datetime',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function reads(): HasMany
    {
        return $this->hasMany(AnnouncementRead::class, 'announcement_id');
    }

    public function isReadBy($userId): bool
    {
        return $this->reads()->where('user_id', $userId)->exists();
    }
}
