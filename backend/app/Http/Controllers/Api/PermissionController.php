<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PermissionService;
use Illuminate\Http\Request;

class PermissionController extends Controller
{
    protected $permissionService;

    public function __construct(PermissionService $permissionService)
    {
        $this->permissionService = $permissionService;
    }

    public function getRoles()
    {
        return response()->json([
            'data' => $this->permissionService->getAllRoles()
        ]);
    }

    public function getPermissions()
    {
        return response()->json([
            'data' => $this->permissionService->getAllPermissions()
        ]);
    }

    public function getPermissionsByCategory()
    {
        return response()->json([
            'data' => $this->permissionService->getPermissionsByCategory()
        ]);
    }

    public function getUserPermissions()
    {
        return response()->json([
            'data' => $this->permissionService->getUserPermissions()
        ]);
    }
}