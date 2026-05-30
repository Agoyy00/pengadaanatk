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
    public function index()
    {
        // Mengambil semua user beserta relasi rolenya dari database RDS MySQL YARSI
        $users = User::with('role')->get();
        return response()->json($users, 200);
    }

    /**
     * POST /api/users
     * Super Admin menambah user baru (Bypass Jaringan LDAP Kampus)
     */
    public function store(Request $request)
    {
        $request->validate([
            'email' => 'required',
            'role'  => 'required'
        ]);

        $username = explode('@', $request->email)[0];
        $ldap_found = false;

        // Buat format nama default dari username jika LDAP timeout (contoh: yoga.pandu -> Yoga Pandu)
        $displayName = ucwords(str_replace('.', ' ', $username));

        // --- BUNGKUS TRY-CATCH AGAR TIDAK LOADING LAMA/GANTUNG ---
        try {
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
                        $displayName = $info[0]['displayname'][0] ?? $displayName;
                    }
                }
                ldap_close($ds);
            }
        } catch (\Exception $e) {
            // Jika network AWS ke kampus terputus/gantung, eror diamankan di sini
            $ldap_found = false;
        }

        // --- JALUR BYPASS KHUSUS AKUN KAMU ---
        if ($username === 'yoga.pandu') {
            $ldap_found = true;
        }

        // --- JIKA TIDAK ADA DI LDAP DAN BUKAN BYPASS, BARU TOLAK ---
        if (!$ldap_found) {
            return response()->json([
                'success' => false,
                'message' => "Gagal: Username '$username' tidak terdaftar di sistem akun kampus YARSI."
            ], 404);
        }

        // --- CEK BIAR TIDAK DUPLIKAT DI DATABASE RDS ---
        $existingUser = User::where('email', $username . '@yarsi.ac.id')->first();
        if ($existingUser) {
            return response()->json([
                'success' => false,
                'message' => "Gagal: Akun dengan email tersebut sudah terdaftar di sistem ATK."
            ], 400);
        }

        // --- JIKA JALUR AMAN, SIMPAN KE DATABASE ---
        $user = User::create([
            'name'     => $displayName, 
            'email'    => $username . '@yarsi.ac.id',
            'role_id'  => $request->role === 'superadmin' ? 1 : ($request->role === 'admin' ? 2 : 3),
            'password' => bcrypt('Password123!'), // Password lokal agar fitur Dual-Auth kemarin bisa login langsung
            'is_ldap'  => 1
        ]);

        return response()->json(['success' => true, 'user' => $user]);
    }
}