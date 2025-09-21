<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\SystemSetting;
use App\Enums\RoleEnum;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function registrationStatus()
    {
        return response()->json([
            'enabled' => SystemSetting::get('public_registration_enabled', false),
        ]);
    }

    public function register(Request $request)
    {
        if (!SystemSetting::get('public_registration_enabled', false)) {
            return response()->json([
                'message' => 'Public registration is currently disabled.',
            ], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'preferred_language' => 'in:en,ur',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'preferred_language' => $request->preferred_language ?? 'en',
        ]);

        // Assign default user role
        $user->assignRoleEnum(RoleEnum::USER);

        $token = $user->createToken('auth_token')->plainTextToken;

        // Load roles for response
        $user->load('roles');

        return response()->json([
            'data' => [
                'user' => $user,
                'token' => $token,
            ],
            'message' => 'Registration successful',
        ], 201);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if (!Auth::attempt($request->only('email', 'password'))) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $user = User::with('roles')->where('email', $request->email)->first();
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'data' => [
                'user' => $user,
                'token' => $token,
            ],
            'message' => 'Login successful',
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    public function user(Request $request)
    {
        $user = $request->user()->load('roles');
        
        return response()->json([
            'data' => $user,
        ]);
    }

    public function refresh(Request $request)
    {
        $user = $request->user();
        $user->currentAccessToken()->delete();
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'data' => [
                'token' => $token,
            ],
        ]);
    }
}
