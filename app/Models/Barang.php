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
        'stok',
        'harga_satuan',
        'foto',
    ];

    public function satuans()
    {
        return $this->hasMany(BarangSatuan::class, 'barang_id');
    }

    public function auditLogs()
    {
        return $this->hasMany(BarangAuditLog::class, 'barang_id')->orderBy('created_at', 'desc');
    }
}
