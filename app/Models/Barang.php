<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Barang extends Model
{
    use HasFactory;

    protected $fillable = [
        'nama',
        'kode',
        'satuan',
        'harga_satuan',
        'foto',
    ];

    public function auditLogs()
    {
        return $this->hasMany(BarangAuditLog::class, 'barang_id')->orderBy('created_at', 'desc');
    }
}
