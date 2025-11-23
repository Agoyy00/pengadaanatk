<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Admin
        User::updateOrCreate(
            ['email' => 'admin@atk.test'],
            [
                'name' => 'Admin ATK',
                'password' => Hash::make('password123'),
                'role' => 'admin',
            ]
        );

        // User biasa
        User::updateOrCreate(
            ['email' => 'user@atk.test'],
            [
                'name' => 'User ATK',
                'password' => Hash::make('password123'),
                'role' => 'user',
            ]
        );
    }
}
