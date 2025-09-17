<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Enums\RoleEnum;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::with('roles');

        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->filled('role')) {
            $query->role($request->get('role'));
        }

        $users = $query->orderBy('created_at', 'desc')
                      ->paginate($request->get('per_page', 15));

        return response()->json($users);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'password' => 'required|string|min:8',
            'role' => ['required', Rule::in(RoleEnum::values())],
            'preferred_language' => 'in:en,ur',
            'timezone' => 'string',
            'date_format' => 'string',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'preferred_language' => $request->get('preferred_language', 'en'),
            'timezone' => $request->get('timezone', 'UTC'),
            'date_format' => $request->get('date_format', 'Y-m-d'),
        ]);

        // Assign role using Spatie
        $user->assignRole($request->role);

        $user->load('roles');
        return response()->json($user, 201);
    }

    public function show(User $user)
    {
        $user->load(['familyTrees', 'roles', 'permissions']);
        return response()->json($user);
    }

    public function update(Request $request, User $user)
    {
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => ['sometimes', 'email', Rule::unique('users')->ignore($user->id)],
            'role' => ['sometimes', Rule::in(RoleEnum::values())],
            'preferred_language' => 'sometimes|in:en,ur',
            'timezone' => 'sometimes|string',
            'date_format' => 'sometimes|string',
        ]);

        if ($request->has('password') && $request->password) {
            $request->validate(['password' => 'string|min:8']);
            $user->password = Hash::make($request->password);
        }

        $user->fill($request->except(['password', 'role']));
        $user->save();

        // Update role if provided
        if ($request->has('role')) {
            $user->syncRoles([$request->role]);
        }

        $user->load('roles');
        return response()->json($user);
    }

    public function destroy(User $user)
    {
        if ($user->hasRoleEnum(RoleEnum::ADMIN) && User::role(RoleEnum::ADMIN->value)->count() <= 1) {
            return response()->json([
                'message' => 'Cannot delete the last admin user.'
            ], 422);
        }

        $user->delete();

        return response()->json(['message' => 'User deleted successfully.']);
    }

    public function getRoles()
    {
        return response()->json([
            'data' => RoleEnum::toArray()
        ]);
    }
}
