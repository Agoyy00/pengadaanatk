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

        $username = explode('@', $request->email)[0];
        
        // Cari user berdasarkan email di AWS RDS MySQL
        $user = User::with('role')->where('email', 'LIKE', $username . '%')->first();

        // JALUR 1: Cek Database Lokal Terlebih Dahulu (Bypass untuk Akun Buatan Tinker)
        // Jika user ditemukan di DB dan password-nya cocok dengan Hash Bcrypt MySQL
        if ($user && Hash::check($password, $user->password)) {
            $user->tokens()->delete();
            $token = $user->createToken('api-token')->plainTextToken;

            return response()->json([
                'success' => true,
                'token'   => $token,
                'user'    => [
                    'id'    => $user->id,
                    'name'  => $user->name,
                    'email' => $user->email,
                    'role'  => $user->role->name ?? 'User',
                ],
            ]);
        }

        // JALUR 2: Fallback ke LDAP YARSI (Jika login database lokal tidak cocok)
        $ldap_success = false;
        $ldap_host = env('LDAP_HOST', 'pdc.yarsi.ac.id'); // Ambil dari .env
        $ldap_dn = env('LDAP_BASE_DN', 'dc=yarsi,dc=ac,dc=id'); // Ambil dari .env

        $ds = @ldap_connect($ldap_host, 389);
        
        if ($ds) {
            ldap_set_option($ds, LDAP_OPT_PROTOCOL_VERSION, 3);
            ldap_set_option($ds, LDAP_OPT_REFERRALS, 0);

            if (@ldap_bind($ds)) {
                $filter = "(uid=$username)";
                $search = @ldap_search($ds, $ldap_dn, $filter);
                $info = @ldap_get_entries($ds, $search);

                if ($info && $info['count'] > 0) {
                    $user_dn = $info[0]['dn'];
                    if (@ldap_bind($ds, $user_dn, $password)) {
                        $ldap_success = true;
                    }
                }
            }
            ldap_close($ds);
        }

        // Proses jika LDAP Sukses
        if ($ldap_success) {
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => "Anda belum diberi akses. Silakan hubungi Superadmin.",
                ], 403);
            }

            $fullName = $info[0]['displayname'][0] ?? $user->name;

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
                    'name'  => $user->name,
                    'email' => $user->email,
                    'role'  => $user->role->name ?? 'User',
                ],
            ]);
        }

        // Jika dua-duanya gagal (DB salah & LDAP juga salah)
        return response()->json([
            'success' => false,
            'message' => 'Username atau Password salah.',
        ], 401);
    }
}