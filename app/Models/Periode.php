<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Periode extends Model
{
    protected $fillable = [
        'tahun_akademik',
        'mulai',
        'selesai',
        'is_open',
    ];

    protected $casts = [
        'mulai'   => 'datetime',
        'selesai' => 'datetime',
        'is_open' => 'boolean',
    ];
}
