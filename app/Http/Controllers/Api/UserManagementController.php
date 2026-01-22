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
        $users = User::with('role')
        ->orderBy('role_id')
        ->orderBy('name')
        ->get();


    return response()->json($users);
    }

    public function destroy(User $user)
{
    // Optional: cegah hapus diri sendiri
    if (Auth::id() === $user->id) {
        return response()->json([
            'success' => false,
            'message' => 'Tidak bisa menghapus akun sendiri'
        ], 403);
    }

    $user->delete();

    return response()->json([
        'success' => true,
        'message' => 'User berhasil dihapus'
    ]);
}


    /**
     * POST /api/users
     * Super Admin menambah user baru
     */
   public function store(Request $request)
{
    $request->validate([
        'email' => 'required',
        'role'  => 'required'
    ]);

    $username = explode('@', $request->email)[0];
    $ldap_found = false;

    // --- PROSES CEK KE SERVER LDAP YARSI ---
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
                $displayName = $info[0]['displayname'][0] ?? $username;
            }
        }
        ldap_close($ds);
    }

    // --- JIKA TIDAK ADA DI LDAP, TOLAK ---
    if (!$ldap_found) {
        return response()->json([
            'success' => false,
            'message' => "Gagal: Username '$username' tidak terdaftar di sistem akun kampus YARSI."
        ], 404);
    }

    // --- JIKA ADA, BARU SIMPAN KE DATABASE ---
    $user = User::create([
        'name'     => $displayName, // Langsung dapat nama asli dari kampus
        'email'    => $username . '@yarsi.ac.id',
        'role_id'  => $request->role === 'superadmin' ? 1 : ($request->role === 'admin' ? 2 : 3),
        'password' => bcrypt('LDAP_USER'), 
        'is_ldap'  => 1
    ]);

    return response()->json(['success' => true, 'user' => $user]);
}
}