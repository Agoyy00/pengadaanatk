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
        $username = explode('@', $request->email)[0];
        $user = User::where('email', 'LIKE', $username . '%')->first();

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
        // Di dalam AuthController.php pada bagian if ($ldap_success)

        if ($ldap_success) {
            $username = explode('@', $request->email)[0];
            
            // 1. Cari user yang sudah didaftarkan Superadmin tadi
            $user = User::with('role')->where('email', 'LIKE', $username . '%')->first();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => "Anda belum diberi akses. Silakan hubungi Superadmin.",
                ], 403);
            }

            // 2. AMBIL NAMA ASLI DARI LDAP (Display Name)
            // $info berasal dari hasil ldap_get_entries yang sudah kita buat sebelumnya
            $fullName = $info[0]['displayname'][0] ?? $user->name;

            // 3. UPDATE NAMA DI DATABASE LOKAL
            // Sekarang nama 'keke.odsa' akan berubah jadi 'Keke Odsa Maya' secara otomatis
            $user->update([
                'name' => $fullName,
                'is_ldap' => 1
            ]);

            $user->tokens()->delete();
            $token = $user->createToken('api-token')->plainTextToken;

            return response()->json([
                'success' => true,
                'token'   => $token,
                'user'    => [
                    'id'    => $user->id,
                    'name'  => $user->name, // Ini sudah nama lengkap asli
                    'email' => $user->email,
                    'role'  => $user->role->name,
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