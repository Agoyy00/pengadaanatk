<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    /**
     * Kolom yang boleh di-mass assign.
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'is_ldap',
        'role_id',   // ✅ pakai role_id, bukan role
    ];

    /**
     * Kolom yang disembunyikan saat serialisasi.
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Casting atribut.
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
            'is_ldap'           => 'boolean',
        ];
    }

    /**
     * Relasi ke Role.
     * Pastikan kamu punya App\Models\Role dengan kolom "name" (admin/user).
     */
    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function isSuperAdmin(): bool
    {
        return $this->role_id === 1 || $this->role?->name === 'superadmin';
    }

    public function isAdmin(): bool
    {
        return $this->role_id === 2 || $this->role?->name === 'admin';
    }

    public function isUser(): bool
    {
        return $this->role_id === 3 || $this->role?->name === 'user';
    }

}
