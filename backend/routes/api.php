<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\FamilyTreeController;
use App\Http\Controllers\Api\PersonController;

// Health check endpoint for Docker
Route::get('/health', function () {
    return response()->json([
        'status' => 'healthy',
        'timestamp' => now()->toISOString(),
        'service' => 'family-tree-backend',
        'version' => config('app.version', '1.0.0'),
    ]);
});

// Authentication routes
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    // Auth user routes
    Route::get('/auth/user', [AuthController::class, 'user']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/refresh', [AuthController::class, 'refresh']);

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
});