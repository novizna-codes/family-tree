<?php

namespace App\Policies;

use App\Models\Person;
use App\Models\User;

class PersonPolicy
{
    public function view(User $user, Person $person): bool
    {
        return $this->canAccessPerson($user, $person);
    }

    public function update(User $user, Person $person): bool
    {
        return $this->isOwner($user, $person);
    }

    public function delete(User $user, Person $person): bool
    {
        return $this->isOwner($user, $person);
    }

    private function isOwner(User $user, Person $person): bool
    {
        return $person->owner_user_id === $user->id;
    }

    private function canAccessPerson(User $user, Person $person): bool
    {
        return Person::query()
            ->where('id', $person->id)
            ->accessibleBy($user)
            ->exists();
    }
}
