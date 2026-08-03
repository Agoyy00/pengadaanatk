<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // SUPER ADMIN
        User::updateOrCreate(
            ['email' => 'superadmin@atk.test'],
            [
                'name'     => 'Super Admin ATK',
                'password' => Hash::make('password123'),
                'role_id'  => 1,
            ]
        );
        User::updateOrCreate(
            ['email' => 'superadmin@yarsi.ac.id'],
            [
                'name'     => 'Super Admin YARSI',
                'password' => Hash::make('password123'),
                'role_id'  => 1,
            ]
        );

        // ADMIN
        User::updateOrCreate(
            ['email' => 'admin@atk.test'],
            [
                'name'     => 'Admin ATK',
                'password' => Hash::make('password123'),
                'role_id'  => 2,
            ]
        );
        User::updateOrCreate(
            ['email' => 'admin@yarsi.ac.id'],
            [
                'name'     => 'Admin YARSI',
                'password' => Hash::make('password123'),
                'role_id'  => 2,
            ]
        );

        // USER BIASA
        User::updateOrCreate(
            ['email' => 'user@atk.test'],
            [
                'name'     => 'User ATK',
                'password' => Hash::make('password123'),
                'role_id'  => 3,
            ]
        );
        User::updateOrCreate(
            ['email' => 'user@yarsi.ac.id'],
            [
                'name'     => 'User YARSI',
                'password' => Hash::make('password123'),
                'role_id'  => 3,
            ]
        );
        User::updateOrCreate(
            ['email' => 'user2@atk.test'],
            [
                'name'     => 'User Pengajuan 2',
                'password' => Hash::make('password123'),
                'role_id'  => 3,
            ]
        );
        User::updateOrCreate(
            ['email' => 'dosen@yarsi.ac.id'],
            [
                'name'     => 'Dr. Ahmad Hidayat',
                'password' => Hash::make('password123'),
                'role_id'  => 3,
            ]
        );
        User::updateOrCreate(
            ['email' => 'staff@yarsi.ac.id'],
            [
                'name'     => 'Siti Rahmah',
                'password' => Hash::make('password123'),
                'role_id'  => 3,
            ]
        );
        User::updateOrCreate(
            ['email' => 'admin2@atk.test'],
            [
                'name'     => 'Admin Pengadaan 2',
                'password' => Hash::make('password123'),
                'role_id'  => 2,
            ]
        );
    }
}
