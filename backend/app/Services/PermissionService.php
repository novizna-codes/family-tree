<?php

namespace App\Services;

use App\Enums\RoleEnum;
use App\Enums\PermissionEnum;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class PermissionService
{
    public function getAllRoles(): array
    {
        return RoleEnum::toArray();
    }

    public function getAllPermissions(): array
    {
        return PermissionEnum::toArray();
    }

    public function getPermissionsByCategory(): array
    {
        return PermissionEnum::groupByCategory();
    }

    public function getUserPermissions(): array
    {
        return array_map(
            fn(PermissionEnum $permission) => [
                'value' => $permission->value,
                'name' => $permission->getDisplayName(),
                'category' => $permission->getCategory(),
            ],
            PermissionEnum::getUserPermissions()
        );
    }

    public function assignRoleToUser(User $user, RoleEnum $role): bool
    {
        try {
            $user->assignRoleEnum($role);
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }

    public function removeRoleFromUser(User $user, RoleEnum $role): bool
    {
        try {
            $user->removeRoleEnum($role);
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }

    public function userHasPermission(User $user, PermissionEnum $permission): bool
    {
        return $user->hasPermissionEnum($permission);
    }

    public function userHasRole(User $user, RoleEnum $role): bool
    {
        return $user->hasRoleEnum($role);
    }

    public function syncPermissionsForRole(RoleEnum $roleEnum, array $permissions): bool
    {
        try {
            $role = Role::where('name', $roleEnum->value)->first();
            if (!$role) {
                return false;
            }

            $permissionNames = array_map(function($permission) {
                if ($permission instanceof PermissionEnum) {
                    return $permission->value;
                }
                return $permission;
            }, $permissions);

            $role->syncPermissions($permissionNames);
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }

    public function getRolePermissions(RoleEnum $roleEnum): array
    {
        $role = Role::with('permissions')->where('name', $roleEnum->value)->first();
        
        if (!$role) {
            return [];
        }

        return $role->permissions->pluck('name')->toArray();
    }
}