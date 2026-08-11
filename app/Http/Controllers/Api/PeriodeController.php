<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Periode;
use Carbon\Carbon;
use Illuminate\Http\Request;

class PeriodeController extends Controller
{
    /**
     * Admin menyimpan / mengubah periode.
     * Frontend kirim: tahun_akademik, mulai (datetime-local), selesai (datetime-local)
     */
    public function storeOrUpdate(Request $request)
    {
        $validated = $request->validate([
            'tahun_akademik' => 'required',
            'jenis_periode'  => 'nullable|string',
            'mulai'          => 'required|date',
            'selesai'        => 'required|date|after:mulai',
        ], [
            'tahun_akademik.required' => 'Tahun akademik wajib diisi.',
            'mulai.required'          => 'Tanggal mulai pengajuan wajib diisi.',
            'mulai.date'              => 'Format tanggal mulai pengajuan tidak valid.',
            'selesai.required'        => 'Tanggal berakhir / deadline wajib diisi.',
            'selesai.date'            => 'Format tanggal berakhir / deadline tidak valid.',
            'selesai.after'           => 'Tanggal berakhir / deadline harus setelah tanggal mulai pengajuan.',
        ]);

        // Pakai timezone Jakarta biar jamnya sama dengan yang dipilih di browser
        $mulai   = Carbon::parse($validated['mulai'], 'Asia/Jakarta');
        $selesai = Carbon::parse($validated['selesai'], 'Asia/Jakarta');

        $tahunAkademik = $validated['tahun_akademik'];
        $jenisPeriode  = $validated['jenis_periode'] ?? 'Periode Pengajuan';

        // Hitung apakah SEKARANG sudah masuk range (info saja)
        $now       = Carbon::now('Asia/Jakarta');
        $isOpenNow = $now->between($mulai, $selesai);

        // Update or create per tahun akademik & jenis_periode
        $periode = Periode::updateOrCreate(
            [
                'tahun_akademik' => $tahunAkademik,
                'jenis_periode'  => $jenisPeriode,
            ],
            [
                'mulai'   => $mulai,
                'selesai' => $selesai,
                'is_open' => $isOpenNow,
            ]
        );

        // LOG ACTIVITY
        \Illuminate\Support\Facades\DB::table('admin_activity_logs')->insert([
            'user_id'     => \Illuminate\Support\Facades\Auth::id() ?? $request->input('user_id') ?? 1, // Default fallback if not auth
            'action'      => 'atur_periode',
            'description' => "Admin mengatur Periode Akademik [{$tahunAkademik}]",
            'details'     => json_encode(['mulai' => $mulai, 'selesai' => $selesai]),
            'ip_address'  => $request->ip(),
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => $isOpenNow
                ? 'Periode berhasil disimpan. Saat ini pengajuan SEDANG DIBUKA.'
                : 'Periode berhasil disimpan. Saat ini pengajuan BELUM dibuka / sudah ditutup.',
            'periode' => $periode,
        ]);
    }

    /**
     * Dipakai Pengajuan.jsx (User) & DashboardAdmin.jsx
     * untuk cek periode AKTIF atau YANG AKAN DATANG.
     * Periode yang SUDAH LEWAT tidak dikirim lagi.
     */
    public function active(Request $request)
    {
        $now = Carbon::now('Asia/Jakarta');
        $jenis = $request->query('jenis');

        // 1. Prioritaskan mencari periode yang sedang aktif saat ini (mulai <= now dan selesai >= now)
        $query = Periode::where('mulai', '<=', $now)
            ->where('selesai', '>=', $now);

        if ($jenis === 'stock_opname') {
            $query->where('jenis_periode', 'like', '%Stock Opname%');
        } elseif ($jenis === 'pengajuan') {
            $query->where(function ($q) {
                $q->whereNull('jenis_periode')
                  ->orWhere('jenis_periode', 'Periode Pengajuan')
                  ->orWhere('jenis_periode', 'not like', '%Stock Opname%');
            });
        }

        $periode = $query->orderByDesc('mulai')->first();

        // 2. Jika tidak ada yang sedang aktif, cari yang akan datang (belum mulai)
        if (!$periode) {
            $upcomingQuery = Periode::where('mulai', '>', $now);
            if ($jenis === 'stock_opname') {
                $upcomingQuery->where('jenis_periode', 'like', '%Stock Opname%');
            } elseif ($jenis === 'pengajuan') {
                $upcomingQuery->where(function ($q) {
                    $q->whereNull('jenis_periode')
                      ->orWhere('jenis_periode', 'Periode Pengajuan')
                      ->orWhere('jenis_periode', 'not like', '%Stock Opname%');
                });
            }
            $periode = $upcomingQuery->orderBy('mulai')->first();
        }

        if (!$periode) {
            // semua periode sudah lewat → tidak ada yang ditampilkan
            return response()->json([
                'is_open' => false,
                'message' => 'Saat ini tidak ada periode pengajuan aktif maupun yang akan datang.',
                'periode' => null,
            ]);
        }

        // Hitung dinamis: sekarang lagi di dalam range atau belum
        $isOpen     = $now->between($periode->mulai, $periode->selesai);
        $belumMulai = $now->lt($periode->mulai);

        if ($isOpen) {
            $message = 'Periode pengajuan SEDANG DIBUKA sampai ' .
                $periode->selesai->format('d/m/Y H:i');
        } elseif ($belumMulai) {
            $message = 'Periode pengajuan AKAN DIBUKA pada ' .
                $periode->mulai->format('d/m/Y H:i') .
                ' dan ditutup pada ' .
                $periode->selesai->format('d/m/Y H:i');
        } else {
            // backup, mestinya nggak kesini karena selesai >= now
            $message = 'Saat ini tidak ada periode pengajuan aktif.';
        }

        // Sinkronkan kolom is_open di DB agar selalu up-to-date
        if ($periode->is_open !== $isOpen) {
            $periode->is_open = $isOpen;
            $periode->save();
        }

        return response()->json([
            'is_open'  => $isOpen,   // INI yang dipakai Pengajuan.jsx dan DashboardAdmin.jsx
            'message'  => $message,  // teks siap tampil
            'periode'  => $periode,  // detail periode
        ]);
    }

    /**
     * Opsional: lihat periode terakhir
     */
    public function index()
    {
        $periodes = Periode::orderByDesc('created_at')->get();

        return response()->json([
            'success' => true,
            'data'    => $periodes,
        ]);
    }

    /**
     * Hapus periode (kalau jadwal salah)
     */
    public function destroy(Periode $periode)
    {
        $periode->delete();

        return response()->json([
            'success' => true,
            'message' => 'Periode berhasil dihapus.',
        ]);
    }
}
