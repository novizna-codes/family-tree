<?php

namespace App\Policies;

use App\Models\FamilyTree;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class FamilyTreePolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, FamilyTree $familyTree): bool
    {
        return $user->id === $familyTree->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, FamilyTree $familyTree): bool
    {
        return $user->id === $familyTree->user_id;
    }

    public function delete(User $user, FamilyTree $familyTree): bool
    {
        return $user->id === $familyTree->user_id;
    }

    public function restore(User $user, FamilyTree $familyTree): bool
    {
        return $user->id === $familyTree->user_id;
    }

    public function forceDelete(User $user, FamilyTree $familyTree): bool
    {
        return $user->id === $familyTree->user_id;
    }
}
