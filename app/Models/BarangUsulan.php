<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class BarangUsulan extends Model
{
    use HasFactory;

    protected $table = 'barang_usulan';

    protected $fillable = [
        'nama_barang',
        'user_id',
        'status',
        'catatan_admin',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
    public function statistik()
{
    $data = DB::table('barang_usulans')
        ->select(
            'nama_barang',
            DB::raw('COUNT(*) as total')
        )
        ->groupBy('nama_barang')
        ->orderByDesc('total')
        ->get();

    return response()->json($data);
}
}
