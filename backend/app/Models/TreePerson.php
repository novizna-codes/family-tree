<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TreePerson extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'tree_people';

    protected $fillable = [
        'tree_id',
        'person_id',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
        ];
    }

    public function tree()
    {
        return $this->belongsTo(FamilyTree::class, 'tree_id');
    }

    public function person()
    {
        return $this->belongsTo(Person::class);
    }
}
