<?php

namespace App\Enums;

enum RoleEnum: string
{
    case ADMIN = 'admin';
    case USER = 'user';

    public function getDisplayName(): string
    {
        return match($this) {
            self::ADMIN => 'Administrator',
            self::USER => 'User',
        };
    }

    public function getDescription(): string
    {
        return match($this) {
            self::ADMIN => 'Full access to all system features and user management',
            self::USER => 'Standard user with access to personal family trees',
        };
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public static function toArray(): array
    {
        $roles = [];
        foreach (self::cases() as $role) {
            $roles[] = [
                'value' => $role->value,
                'name' => $role->getDisplayName(),
                'description' => $role->getDescription(),
            ];
        }
        return $roles;
    }
}