<?php

namespace App\Enums;

enum PermissionEnum: string
{
    // User management
    case MANAGE_USERS = 'manage users';
    case VIEW_USERS = 'view users';
    case CREATE_USERS = 'create users';
    case EDIT_USERS = 'edit users';
    case DELETE_USERS = 'delete users';
    
    // Family tree management
    case MANAGE_FAMILY_TREES = 'manage family trees';
    case VIEW_FAMILY_TREES = 'view family trees';
    case CREATE_FAMILY_TREES = 'create family trees';
    case EDIT_FAMILY_TREES = 'edit family trees';
    case DELETE_FAMILY_TREES = 'delete family trees';
    case EXPORT_FAMILY_TREES = 'export family trees';
    
    // Person management
    case MANAGE_PERSONS = 'manage persons';
    case VIEW_PERSONS = 'view persons';
    case CREATE_PERSONS = 'create persons';
    case EDIT_PERSONS = 'edit persons';
    case DELETE_PERSONS = 'delete persons';
    
    // Relationship management
    case MANAGE_RELATIONSHIPS = 'manage relationships';
    case VIEW_RELATIONSHIPS = 'view relationships';
    case CREATE_RELATIONSHIPS = 'create relationships';
    case EDIT_RELATIONSHIPS = 'edit relationships';
    case DELETE_RELATIONSHIPS = 'delete relationships';
    
    // System settings
    case MANAGE_SYSTEM_SETTINGS = 'manage system settings';
    case VIEW_SYSTEM_SETTINGS = 'view system settings';
    case EDIT_SYSTEM_SETTINGS = 'edit system settings';
    
    // Admin dashboard
    case VIEW_ADMIN_DASHBOARD = 'view admin dashboard';
    case MANAGE_SITE = 'manage site';

    public function getDisplayName(): string
    {
        return match($this) {
            self::MANAGE_USERS => 'Manage Users',
            self::VIEW_USERS => 'View Users',
            self::CREATE_USERS => 'Create Users',
            self::EDIT_USERS => 'Edit Users',
            self::DELETE_USERS => 'Delete Users',
            
            self::MANAGE_FAMILY_TREES => 'Manage Family Trees',
            self::VIEW_FAMILY_TREES => 'View Family Trees',
            self::CREATE_FAMILY_TREES => 'Create Family Trees',
            self::EDIT_FAMILY_TREES => 'Edit Family Trees',
            self::DELETE_FAMILY_TREES => 'Delete Family Trees',
            self::EXPORT_FAMILY_TREES => 'Export Family Trees',
            
            self::MANAGE_PERSONS => 'Manage Persons',
            self::VIEW_PERSONS => 'View Persons',
            self::CREATE_PERSONS => 'Create Persons',
            self::EDIT_PERSONS => 'Edit Persons',
            self::DELETE_PERSONS => 'Delete Persons',
            
            self::MANAGE_RELATIONSHIPS => 'Manage Relationships',
            self::VIEW_RELATIONSHIPS => 'View Relationships',
            self::CREATE_RELATIONSHIPS => 'Create Relationships',
            self::EDIT_RELATIONSHIPS => 'Edit Relationships',
            self::DELETE_RELATIONSHIPS => 'Delete Relationships',
            
            self::MANAGE_SYSTEM_SETTINGS => 'Manage System Settings',
            self::VIEW_SYSTEM_SETTINGS => 'View System Settings',
            self::EDIT_SYSTEM_SETTINGS => 'Edit System Settings',
            
            self::VIEW_ADMIN_DASHBOARD => 'View Admin Dashboard',
            self::MANAGE_SITE => 'Manage Site',
        };
    }

    public function getCategory(): string
    {
        return match($this) {
            self::MANAGE_USERS,
            self::VIEW_USERS,
            self::CREATE_USERS,
            self::EDIT_USERS,
            self::DELETE_USERS => 'User Management',
            
            self::MANAGE_FAMILY_TREES,
            self::VIEW_FAMILY_TREES,
            self::CREATE_FAMILY_TREES,
            self::EDIT_FAMILY_TREES,
            self::DELETE_FAMILY_TREES,
            self::EXPORT_FAMILY_TREES => 'Family Tree Management',
            
            self::MANAGE_PERSONS,
            self::VIEW_PERSONS,
            self::CREATE_PERSONS,
            self::EDIT_PERSONS,
            self::DELETE_PERSONS => 'Person Management',
            
            self::MANAGE_RELATIONSHIPS,
            self::VIEW_RELATIONSHIPS,
            self::CREATE_RELATIONSHIPS,
            self::EDIT_RELATIONSHIPS,
            self::DELETE_RELATIONSHIPS => 'Relationship Management',
            
            self::MANAGE_SYSTEM_SETTINGS,
            self::VIEW_SYSTEM_SETTINGS,
            self::EDIT_SYSTEM_SETTINGS => 'System Settings',
            
            self::VIEW_ADMIN_DASHBOARD,
            self::MANAGE_SITE => 'Administration',
        };
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public static function getUserPermissions(): array
    {
        return [
            self::VIEW_FAMILY_TREES,
            self::CREATE_FAMILY_TREES,
            self::EDIT_FAMILY_TREES,
            self::DELETE_FAMILY_TREES,
            self::EXPORT_FAMILY_TREES,
            self::VIEW_PERSONS,
            self::CREATE_PERSONS,
            self::EDIT_PERSONS,
            self::DELETE_PERSONS,
            self::VIEW_RELATIONSHIPS,
            self::CREATE_RELATIONSHIPS,
            self::EDIT_RELATIONSHIPS,
            self::DELETE_RELATIONSHIPS,
        ];
    }

    public static function getAdminPermissions(): array
    {
        return self::cases();
    }

    public static function groupByCategory(): array
    {
        $grouped = [];
        foreach (self::cases() as $permission) {
            $category = $permission->getCategory();
            if (!isset($grouped[$category])) {
                $grouped[$category] = [];
            }
            $grouped[$category][] = [
                'value' => $permission->value,
                'name' => $permission->getDisplayName(),
                'enum' => $permission->name,
            ];
        }
        return $grouped;
    }

    public static function toArray(): array
    {
        $permissions = [];
        foreach (self::cases() as $permission) {
            $permissions[] = [
                'value' => $permission->value,
                'name' => $permission->getDisplayName(),
                'category' => $permission->getCategory(),
                'enum' => $permission->name,
            ];
        }
        return $permissions;
    }
}