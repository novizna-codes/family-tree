<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\SoftDeletes;

class Person extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'family_tree_id',
        'first_name',
        'last_name',
        'maiden_name',
        'nickname',
        'gender',
        'birth_date',
        'death_date',
        'birth_place',
        'death_place',
        'father_id',
        'mother_id',
        'photo_path',
        'notes',
        'is_deceased',
    ];

    protected $appends = [
        'full_name',
        'age',
        'is_living',
        'spouses',
    ];

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'death_date' => 'date',
            'is_deceased' => 'bool',
        ];
    }

    public function familyTree()
    {
        return $this->belongsTo(FamilyTree::class);
    }

    public function father()
    {
        return $this->belongsTo(Person::class, 'father_id');
    }

    public function mother()
    {
        return $this->belongsTo(Person::class, 'mother_id');
    }

    public function children()
    {
        return $this->hasMany(Person::class, 'father_id')
            ->orWhere('mother_id', $this->id);
    }

    public function siblings()
    {
        return Person::where('family_tree_id', $this->family_tree_id)
            ->where('id', '!=', $this->id)
            ->where(function ($query) {
                $query->where(function ($q) {
                    $q->where('father_id', $this->father_id)
                      ->whereNotNull('father_id');
                })->orWhere(function ($q) {
                    $q->where('mother_id', $this->mother_id)
                      ->whereNotNull('mother_id');
                });
            });
    }

    public function relationshipsAsPerson1()
    {
        return $this->hasMany(Relationship::class, 'person1_id');
    }

    public function relationshipsAsPerson2()
    {
        return $this->hasMany(Relationship::class, 'person2_id');
    }

    public function getAllSpouseRelationships()
    {
        return Relationship::where('family_tree_id', $this->family_tree_id)
            ->where('relationship_type', 'spouse')
            ->where(function ($query) {
                $query->where('person1_id', $this->id)
                      ->orWhere('person2_id', $this->id);
            });
    }

    public function getAllRelationships()
    {
        return Relationship::where('family_tree_id', $this->family_tree_id)
            ->where(function ($query) {
                $query->where('person1_id', $this->id)
                      ->orWhere('person2_id', $this->id);
            })->get();
    }

    public function spouses()
    {
        $relationships = $this->getAllSpouseRelationships()->get();
        $spouseIds = $relationships->map(function ($rel) {
            return $rel->person1_id === $this->id ? $rel->person2_id : $rel->person1_id;
        });

        return Person::whereIn('id', $spouseIds);
    }

    public function getFullNameAttribute(): string
    {
        return trim($this->first_name . ' ' . $this->last_name);
    }

    public function getAgeAttribute(): ?int
    {
        if (!$this->birth_date) {
            return null;
        }

        $endDate = $this->death_date ?: now();
        return $this->birth_date->diffInYears($endDate);
    }

    public function getIsLivingAttribute(): bool
    {
        return $this->is_deceased === false;
    }

    public function getSpousesAttribute()
    {
        $relationships = $this->getAllSpouseRelationships()->with(['person1', 'person2'])->get();
        
        return $relationships->map(function ($relationship) {
            $spouse = $relationship->person1_id === $this->id 
                ? $relationship->person2 
                : $relationship->person1;
                
            return [
                'id' => $spouse->id,
                'first_name' => $spouse->first_name,
                'last_name' => $spouse->last_name,
                'relationship' => [
                    'id' => $relationship->id,
                    'type' => $relationship->relationship_type,
                    'start_date' => $relationship->start_date,
                    'end_date' => $relationship->end_date,
                ]
            ];
        });
    }
}
