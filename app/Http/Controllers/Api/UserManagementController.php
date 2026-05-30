<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;

class UserManagementController extends Controller
{
    /**
     * GET /api/users
     * (Untuk Super Admin melihat daftar user)
     */
    public function store(Request $request)
{
    $request->validate([
        'email' => 'required',
        'role'  => 'required'
    ]);

    $username = explode('@', $request->email)[0];
    $ldap_found = false;
    
    // Buat nama cadangan otomatis dari username (misal: yoga.pandu jadi Yoga Pandu)
    $displayName = ucwords(str_replace('.', ' ', $username)); 

    // --- BUNGKUS DENGAN TRY-CATCH BIAR ANTI-GANTUNG / TIMEOUT ---
    try {
        // Ini bagian yang kamu maksud (pastikan parameter URL LDAP-mu sudah benar di sini)
        $ds = @ldap_connect('pdc.yarsi.ac.id', 389);

        if ($ds) {
            ldap_set_option($ds, LDAP_OPT_PROTOCOL_VERSION, 3);
            ldap_set_option($ds, LDAP_OPT_REFERRALS, 0);

            if (@ldap_bind($ds)) {
                $filter = "(uid=$username)";
                $search = @ldap_search($ds, 'dc=yarsi,dc=ac,dc=id', $filter);
                $info = @ldap_get_entries($ds, $search);

                if ($info && $info['count'] > 0) {
                    $ldap_found = true;
                    // Ambil displayname asli untuk disimpan sebagai nama awal
                    $displayName = $info[0]['displayname'][0] ?? $displayName;
                }
            }
            @ldap_close($ds);
        }
    } catch (\Exception $e) {
        // Jika jaringan ke kampus putus/gantung, eror ditangkap di sini dan web gak akan loading lama
        $ldap_found = false;
    }

    // --- JALUR BYPASS DARURAT UNTUK DEVELOPER ---
    // Jika username yang diinput adalah kamu, otomatis dianggap valid walau LDAP kampus lagi down
    if ($username === 'yoga.pandu') {
        $ldap_found = true;
    }

    // --- JIKA TIDAK ADA DI LDAP DAN BUKAN AKUN BYPASS, TOLAK ---
    if (!$ldap_found) {
        return response()->json([
            'success' => false,
            'message' => "Gagal: Username '$username' tidak terdaftar di sistem akun kampus YARSI."
        ], 404);
    }

    // --- CEK BIAR TIDAK ADA EMAIL DUPLIKAT DI DATABASE ---
    $existingUser = User::where('email', $username . '@yarsi.ac.id')->first();
    if ($existingUser) {
        return response()->json([
            'success' => false,
            'message' => "Gagal: Akun dengan email tersebut sudah terdaftar."
        ], 400);
    }

    // --- SIMPAN KE DATABASE RDS MYSQL AWS ---
    $user = User::create([
        'name'     => $displayName, 
        'email'    => $username . '@yarsi.ac.id',
        // Konversi string role dari frontend menjadi role_id database kamu
        'role_id'  => $request->role === 'superadmin' ? 1 : ($request->role === 'admin' ? 2 : 3),
        'password' => bcrypt('Password123!'), // Password default lokal untuk dual-auth login
        'is_ldap'  => 1
    ]);

    return response()->json([
        'success' => true, 
        'message' => "User berhasil ditambahkan!",
        'user' => $user
    ]);
}
}
