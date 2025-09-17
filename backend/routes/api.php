<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\FamilyTreeController;
use App\Http\Controllers\Api\PersonController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Http\Controllers\Admin\SettingsController as AdminSettingsController;
use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\SetupController;

// Health check endpoint for Docker
Route::get('/health', function () {
    return response()->json([
        'status' => 'healthy',
        'timestamp' => now()->toISOString(),
        'service' => 'family-tree-backend',
        'version' => config('app.version', '1.0.0'),
    ]);
});

// Setup routes (for initial admin creation)
Route::get('/setup/check', [SetupController::class, 'checkSetup']);
Route::post('/setup/admin', [SetupController::class, 'createInitialAdmin']);

// Authentication routes
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    // Auth user routes
    Route::get('/auth/user', [AuthController::class, 'user']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/refresh', [AuthController::class, 'refresh']);

    // Permission and role routes (available to all authenticated users)
    Route::get('/permissions/roles', [PermissionController::class, 'getRoles']);
    Route::get('/permissions', [PermissionController::class, 'getPermissions']);
    Route::get('/permissions/by-category', [PermissionController::class, 'getPermissionsByCategory']);
    Route::get('/permissions/user', [PermissionController::class, 'getUserPermissions']);

    // Family trees routes
    Route::get('/trees', [FamilyTreeController::class, 'index']);
    Route::post('/trees', [FamilyTreeController::class, 'store']);
    Route::get('/trees/{familyTree}', [FamilyTreeController::class, 'show']);
    Route::put('/trees/{familyTree}', [FamilyTreeController::class, 'update']);
    Route::delete('/trees/{familyTree}', [FamilyTreeController::class, 'destroy']);
    Route::get('/trees/{familyTree}/visualization', [FamilyTreeController::class, 'visualization']);
    Route::get('/trees/{familyTree}/export', [FamilyTreeController::class, 'export']);

    // People routes
    Route::get('/trees/{familyTree}/people', [PersonController::class, 'index']);
    Route::post('/trees/{familyTree}/people', [PersonController::class, 'store']);
    Route::get('/trees/{familyTree}/people/{person}', [PersonController::class, 'show']);
    Route::put('/trees/{familyTree}/people/{person}', [PersonController::class, 'update']);
    Route::delete('/trees/{familyTree}/people/{person}', [PersonController::class, 'destroy']);
    
    // Special person relationship routes
    Route::post('/trees/{familyTree}/people/{person}/add-parent', [PersonController::class, 'addParent']);
    Route::post('/trees/{familyTree}/people/{person}/add-child', [PersonController::class, 'addChild']);
    Route::post('/trees/{familyTree}/people/{person}/link-parent', [PersonController::class, 'linkParent']);
    Route::post('/trees/{familyTree}/people/{person}/link-child', [PersonController::class, 'linkChild']);
    
    // Spouse relationship routes
    Route::post('/trees/{familyTree}/people/{person}/add-spouse', [PersonController::class, 'addSpouse']);
    Route::post('/trees/{familyTree}/people/{person}/link-spouse', [PersonController::class, 'linkSpouse']);
    Route::delete('/trees/{familyTree}/people/{person}/spouse/{spouse}', [PersonController::class, 'removeSpouse']);

    // Admin routes
    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/dashboard', [AdminDashboardController::class, 'index']);
        
        // User management
        Route::apiResource('users', AdminUserController::class);
        Route::get('/roles', [AdminUserController::class, 'getRoles']);
        
        // Settings management
        Route::get('/settings', [AdminSettingsController::class, 'index']);
        Route::put('/settings', [AdminSettingsController::class, 'update']);
        Route::get('/settings/{key}', [AdminSettingsController::class, 'show']);
    });
});