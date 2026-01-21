<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        // 1. Validasi Input dari React
        $request->validate([
            'email'    => 'required', 
            'password' => 'required',
        ]);

        $input = $request->email;
        $password = $request->password;

        // 2. Ambil username saja (misal: '1212024@yarsi.ac.id' -> '1212024')
        $username = explode('@', $input)[0];

        $ldap_success = false;
        $ldap_attributes = [];
        $ldap_host = 'pdc.yarsi.ac.id';
        $ldap_dn   = 'dc=yarsi,dc=ac,dc=id';

        // 3. Proses Koneksi LDAP
        $ds = @ldap_connect($ldap_host, 389);
        
        if ($ds) {
            ldap_set_option($ds, LDAP_OPT_PROTOCOL_VERSION, 3);
            ldap_set_option($ds, LDAP_OPT_REFERRALS, 0);

            // Bind Awal (Anonymous) untuk mencari user
            if (@ldap_bind($ds)) {
                $filter = "(uid=$username)";
                $search = @ldap_search($ds, $ldap_dn, $filter);
                $info = @ldap_get_entries($ds, $search);

                if ($info && $info['count'] > 0) {
                    $user_dn = $info[0]['dn'];
                    
                    // Ambil nama asli dari LDAP jika ada
                    $ldap_attributes['name'] = $info[0]['displayname'][0] ?? $username;
                    
                    // Verifikasi Password dengan Bind menggunakan DN user asli
                    if (@ldap_bind($ds, $user_dn, $password)) {
                        $ldap_success = true;
                    }
                }
            }
            ldap_close($ds);
        } else {
            return response()->json([
                'success' => false,
                'message' => 'Gagal terhubung ke server LDAP YARSI. Pastikan jaringan tersedia.'
            ], 500);
        }

        // 4. Proses Database Lokal (MySQL)
        if ($ldap_success) {
            // Cari user di DB lokal (Cek email yang mirip)
            $user = User::with('role')
                ->where('email', 'LIKE', $username . '%')
                ->first();

            // --- FITUR AUTO-REGISTER ---
            // Jika login LDAP sukses tapi data tidak ada di MySQL, buat otomatis
            if (!$user) {
                $user = User::create([
                    'name'     => $ldap_attributes['name'],
                    'email'    => $username . '@yarsi.ac.id',
                    'password' => Hash::make($password), // Backup password
                    'role_id'  => 3, // Default sebagai 'user'
                    'is_ldap'  => 1, // Sesuai kolom di database Anda
                ]);
                $user->load('role'); // Muat relasi role untuk user baru
            }

            // 5. Generate Token Sanctum untuk React
            $user->tokens()->delete(); // Hapus session lama
            $token = $user->createToken('api-token')->plainTextToken;

            return response()->json([
                'success' => true,
                'token'   => $token,
                'user'    => [
                    'id'    => $user->id,
                    'name'  => $user->name,
                    'email' => $user->email,
                    'role'  => $user->role->name, // Mengirim 'superadmin', 'admin', atau 'user'
                ],
            ]);
        }

        // 6. Jika Password LDAP Salah
        return response()->json([
            'success' => false,
            'message' => 'Username atau Password LDAP YARSI salah.',
        ], 401);
    }
}