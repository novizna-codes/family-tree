<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;
use App\Enums\RoleEnum;
use App\Enums\PermissionEnum;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens, HasRoles;

    protected $fillable = [
        'name',
        'email',
        'password',
        'preferred_language',
        'timezone',
        'date_format',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function familyTrees()
    {
        return $this->hasMany(FamilyTree::class);
    }

    public function isAdmin(): bool
    {
        return $this->hasRole(RoleEnum::ADMIN->value);
    }

    public function hasRoleEnum(RoleEnum $role): bool
    {
        return $this->hasRole($role->value);
    }

    public function hasPermissionEnum(PermissionEnum $permission): bool
    {
        return $this->hasPermissionTo($permission->value);
    }

    public function assignRoleEnum(RoleEnum $role): self
    {
        $this->assignRole($role->value);
        return $this;
    }

    public function removeRoleEnum(RoleEnum $role): self
    {
        $this->removeRole($role->value);
        return $this;
    }
}
