<?php

namespace App\Providers;

use App\Models\FamilyTree;
use App\Policies\FamilyTreePolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        FamilyTree::class => FamilyTreePolicy::class,
    ];

    public function boot(): void
    {
        $this->registerPolicies();
    }
}
