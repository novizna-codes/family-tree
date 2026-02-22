<?php

namespace Database\Factories;

use App\Models\FamilyTree;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class FamilyTreeFactory extends Factory
{
    protected $model = FamilyTree::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => $this->faker->words(3, true) . ' Family Tree',
            'description' => $this->faker->sentence(),
            'settings' => (new FamilyTree())->getDefaultSettings(),
        ];
    }
}
