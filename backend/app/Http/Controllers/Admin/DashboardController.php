<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\FamilyTree;
use App\Models\Person;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index()
    {
        $totalUsers = User::count();
        $totalAdmins = User::where('role', 'admin')->count();
        $totalTrees = FamilyTree::count();
        $totalPersons = Person::count();
        
        $recentUsers = User::latest()->take(5)->get();
        $recentTrees = FamilyTree::with('user:id,name')->latest()->take(5)->get();
        
        $usersLastMonth = User::where('created_at', '>=', Carbon::now()->subMonth())->count();
        $treesLastMonth = FamilyTree::where('created_at', '>=', Carbon::now()->subMonth())->count();
        
        $userRegistrations = User::selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->where('created_at', '>=', Carbon::now()->subDays(30))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return response()->json([
            'stats' => [
                'total_users' => $totalUsers,
                'total_admins' => $totalAdmins,
                'total_trees' => $totalTrees,
                'total_persons' => $totalPersons,
                'users_last_month' => $usersLastMonth,
                'trees_last_month' => $treesLastMonth,
            ],
            'recent_users' => $recentUsers,
            'recent_trees' => $recentTrees,
            'user_registrations' => $userRegistrations,
        ]);
    }
}
