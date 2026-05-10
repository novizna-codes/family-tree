<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TreeEdge extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'tree_id',
        'parent_person_id',
        'child_person_id',
        'parent_role',
        'relationship_type',
        'sort_order',
    ];

    public function tree()
    {
        return $this->belongsTo(FamilyTree::class, 'tree_id');
    }

    public function parentPerson()
    {
        return $this->belongsTo(Person::class, 'parent_person_id');
    }

    public function childPerson()
    {
        return $this->belongsTo(Person::class, 'child_person_id');
    }
}
