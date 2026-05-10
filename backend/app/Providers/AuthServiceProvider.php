<?php

namespace App\Providers;

use App\Models\FamilyTree;
use App\Models\Person;
use App\Policies\FamilyTreePolicy;
use App\Policies\PersonPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        FamilyTree::class => FamilyTreePolicy::class,
        Person::class => PersonPolicy::class,
    ];

    public function boot(): void
    {
        $this->registerPolicies();
    }
}
