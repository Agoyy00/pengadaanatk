<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserManagementController extends Controller
{
    /**
     * GET /api/users
     * (Untuk Super Admin melihat daftar user)
     */
    public function index()
    {
        // Sementara: ambil semua user
        // (kalau mau diurutkan: orderBy('name'))
        $users = User::orderBy('name')->get();

        return response()->json($users);
    }

    /**
     * POST /api/users
     * Super Admin menambah user baru
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'role'     => 'required|exists:roles,name',
        ]);

        $role = Role::where('name', $data['role'])->firstOrFail();

        $user = User::create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'password' => Hash::make($data['password']),
            'role_id'  => $role->id, // ✅ YANG DISIMPAN
            'is_ldap'  => false,
        ]);

        $user->load('role');

       return response()->json([
            'success' => true,
            'user' => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'role'  => $user->role->name, // ⬅️ STRING
            ]
        ]);
    }
}