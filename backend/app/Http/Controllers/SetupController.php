<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Enums\RoleEnum;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class SetupController extends Controller
{
    public function checkSetup()
    {
        $hasAdminUser = User::whereHas('roles', function($query) {
            $query->where('name', RoleEnum::ADMIN->value);
        })->exists();
        
        return response()->json([
            'needs_setup' => !$hasAdminUser,
            'has_admin' => $hasAdminUser,
        ]);
    }

    public function createInitialAdmin(Request $request)
    {
        // Check if admin already exists
        if (User::whereHas('roles', function($query) {
            $query->where('name', RoleEnum::ADMIN->value);
        })->exists()) {
            return response()->json([
                'message' => 'Admin user already exists.',
            ], 400);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'preferred_language' => 'in:en,ur',
        ]);

        $admin = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'preferred_language' => $request->preferred_language ?? 'en',
        ]);

        // Assign admin role using enum
        $admin->assignRoleEnum(RoleEnum::ADMIN);

        // Load roles for response
        $admin->load('roles');

        $token = $admin->createToken('auth_token')->plainTextToken;

        return response()->json([
            'data' => [
                'user' => $admin,
                'token' => $token,
            ],
            'message' => 'Initial admin user created successfully',
        ], 201);
    }
}
