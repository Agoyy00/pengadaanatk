<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        // Role Super Admin
        DB::table('roles')->updateOrInsert(
            ['id' => 1],
            ['name' => 'superadmin']
        );

        // Role Admin
        DB::table('roles')->updateOrInsert(
            ['id' => 2],
            ['name' => 'admin']
        );

        // Role User
        DB::table('roles')->updateOrInsert(
            ['id' => 3],
            ['name' => 'user']
        );
    }
}
