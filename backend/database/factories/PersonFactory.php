<?php

namespace Database\Factories;

use App\Models\FamilyTree;
use App\Models\Person;
use Illuminate\Database\Eloquent\Factories\Factory;

class PersonFactory extends Factory
{
    protected $model = Person::class;

    public function definition(): array
    {
        return [
            'family_tree_id' => FamilyTree::factory(),
            'owner_user_id' => function (array $attributes) {
                return FamilyTree::findOrFail($attributes['family_tree_id'])->user_id;
            },
            'first_name' => $this->faker->firstName(),
            'last_name' => $this->faker->lastName(),
            'gender' => $this->faker->randomElement(['M', 'F', 'O']),
            'birth_date' => $this->faker->date(),
            'is_deceased' => false,
        ];
    }

    public function male()
    {
        return $this->state(fn (array $attributes) => [
            'gender' => 'M',
        ]);
    }

    public function female()
    {
        return $this->state(fn (array $attributes) => [
            'gender' => 'F',
        ]);
    }
}
