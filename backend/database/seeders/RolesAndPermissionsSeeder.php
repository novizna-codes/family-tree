<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use App\Enums\RoleEnum;
use App\Enums\PermissionEnum;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Create permissions from enum
        foreach (PermissionEnum::cases() as $permission) {
            Permission::create(['name' => $permission->value]);
        }

        // Create roles from enum
        $adminRole = Role::create(['name' => RoleEnum::ADMIN->value]);
        $userRole = Role::create(['name' => RoleEnum::USER->value]);

        // Admin gets all permissions
        $adminRole->givePermissionTo(Permission::all());

        // User gets limited permissions (only for their own family trees)
        $userPermissions = array_map(
            fn(PermissionEnum $permission) => $permission->value,
            PermissionEnum::getUserPermissions()
        );
        
        $userRole->givePermissionTo($userPermissions);
    }
}
