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

    protected static function booted()
    {
        static::deleting(function ($person) {
            // Only perform cleanup if we are force deleting
//            if ($person->isForceDeleting()) {
                // Prevent deletion if the person has children (including soft-deleted)
                $hasChildren = Person::where(function ($query) use ($person) {
                        $query->where('father_id', $person->id)
                              ->orWhere('mother_id', $person->id);
                    })->exists();

                if ($hasChildren) {
                    throw new \Exception("Cannot force delete person because they have children. Delete the children first.");
                }

                // Cleanup relationships when a person is deleted
                $person->getAllSpouseRelationships()->delete();

                // Clear parent IDs for any other people
                Person::where('father_id', $person->id)->update(['father_id' => null]);
                Person::where('mother_id', $person->id)->update(['mother_id' => null]);
//            }
            // For soft delete, we keep the record and its IDs intact to preserve lineage
        });
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
        // Use a dummy relationship that we override with a proper query
        // This allows $person->children to return a collection and $person->children() to return a query builder
        return $this->hasMany(Person::class, 'father_id')
            ->orWhere('mother_id', $this->id);
    }

    public function siblings()
    {
        $fatherId = $this->father_id;
        $motherId = $this->mother_id;
        $id = $this->id;

        return Person::where('family_tree_id', $this->family_tree_id)
            ->where('id', '!=', $id)
            ->where(function ($query) use ($fatherId, $motherId) {
                if ($fatherId) {
                    $query->where('father_id', $fatherId);
                }
                if ($motherId) {
                    $query->orWhere('mother_id', $motherId);
                }
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
        return trim(($this->first_name ?? '') . ' ' . ($this->last_name ?? ''));
    }

    public function getAgeAttribute(): ?int
    {
        if (!$this->birth_date) {
            return null;
        }

        try {
            $endDate = $this->death_date ?: now();
            if ($this->birth_date > $endDate) return null;
            return $this->birth_date->diffInYears($endDate);
        } catch (\Exception $e) {
            return null;
        }
    }

    public function getIsLivingAttribute(): bool
    {
        return $this->is_deceased === false;
    }

    public function getSpousesAttribute()
    {
        return $this->getAllSpouseRelationships()->get()->map(function ($relationship) {
            $spouseId = $relationship->person1_id === $this->id ? $relationship->person2_id : $relationship->person1_id;
            $spouse = Person::find($spouseId);

            if (!$spouse) {
                return null;
            }

            return [
                'id' => $spouse->id,
                'first_name' => $spouse->first_name,
                'last_name' => $spouse->last_name,
                'is_deleted' => $spouse->trashed(),
                'relationship' => [
                    'id' => $relationship->id,
                    'type' => $relationship->relationship_type,
                    'start_date' => $relationship->start_date,
                    'end_date' => $relationship->end_date,
                ]
            ];
        })->filter()->values();
    }

    /**
     * Check if this person is a descendant of the given person.
     * Used for cycle detection in family trees.
     */
    public function isDescendantOf(string $potentialAncestorId): bool
    {
        if ($this->id === $potentialAncestorId) {
            return true;
        }

        if ($this->father_id === $potentialAncestorId || $this->mother_id === $potentialAncestorId) {
            return true;
        }

        if ($this->father && $this->father->isDescendantOf($potentialAncestorId)) {
            return true;
        }

        if ($this->mother && $this->mother->isDescendantOf($potentialAncestorId)) {
            return true;
        }

        return false;
    }
}
