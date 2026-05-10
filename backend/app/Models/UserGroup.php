<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserGroup extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'owner_user_id',
        'name',
        'description',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function members()
    {
        return $this->belongsToMany(User::class, 'user_group_members', 'user_group_id', 'user_id')
            ->using(UserGroupMember::class)
            ->withTimestamps();
    }

    public function sharedPeople()
    {
        return $this->belongsToMany(Person::class, 'people_share_groups', 'user_group_id', 'person_id')
            ->using(PeopleShareGroup::class)
            ->withTimestamps();
    }
}
