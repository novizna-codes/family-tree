<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Relationship extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'family_tree_id',
        'person1_id',
        'person2_id',
        'relationship_type',
        'start_date',
        'end_date',
        'marriage_place',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
        ];
    }

    public function familyTree()
    {
        return $this->belongsTo(FamilyTree::class);
    }

    public function person1()
    {
        return $this->belongsTo(Person::class, 'person1_id');
    }

    public function person2()
    {
        return $this->belongsTo(Person::class, 'person2_id');
    }

    public function getPartner(Person $person)
    {
        return $this->person1_id === $person->id ? $this->person2 : $this->person1;
    }
}
