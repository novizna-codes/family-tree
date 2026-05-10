<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\Pivot;

class PeopleShareGroup extends Pivot
{
    use HasUuids;

    protected $table = 'people_share_groups';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'person_id',
        'user_group_id',
    ];
}
