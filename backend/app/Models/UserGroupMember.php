<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\Pivot;

class UserGroupMember extends Pivot
{
    use HasUuids;

    protected $table = 'user_group_members';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'user_group_id',
        'user_id',
    ];
}
