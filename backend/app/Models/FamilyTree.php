<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class FamilyTree extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'user_id',
        'name',
        'description',
        'root_person_id',
        'settings',
    ];

    protected function casts(): array
    {
        return [
            'settings' => 'array',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function people()
    {
        return $this->hasMany(Person::class);
    }

    public function relationships()
    {
        return $this->hasMany(Relationship::class);
    }

    public function rootPerson()
    {
        return $this->belongsTo(Person::class, 'root_person_id');
    }

    public function getDefaultSettings(): array
    {
        return [
            'focus_person_id' => null,
            'display' => [
                'show_birth_dates' => true,
                'show_death_dates' => true,
                'show_marriage_dates' => true,
                'show_photos' => true,
                'theme' => 'default',
            ],
            'layout' => [
                'direction' => 'vertical',
                'generation_spacing' => 120,
                'sibling_spacing' => 20,
                'auto_layout' => true,
            ],
            'collapsed_generations' => [],
            'print' => [
                'paper_size' => 'A4',
                'orientation' => 'landscape',
                'include_legend' => true,
            ],
        ];
    }

    protected static function booted()
    {
        static::creating(function ($familyTree) {
            if (empty($familyTree->settings)) {
                $familyTree->settings = $familyTree->getDefaultSettings();
            }
        });
    }
}
