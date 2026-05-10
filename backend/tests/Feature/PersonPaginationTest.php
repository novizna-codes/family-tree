<?php

namespace Tests\Feature;

use App\Models\FamilyTree;
use App\Models\Person;
use App\Models\TreePerson;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PersonPaginationTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_accepts_paginate_true_string_and_returns_paginated_shape(): void
    {
        $user = User::factory()->create();
        $tree = FamilyTree::factory()->create(['user_id' => $user->id]);

        Person::factory()->count(2)->create(['family_tree_id' => $tree->id]);

        $response = $this->actingAs($user)
            ->getJson("/api/trees/{$tree->id}/people?paginate=true&per_page=1&page=1");

        $response
            ->assertOk()
            ->assertJsonStructure([
                'data',
                'links' => ['first', 'last', 'prev', 'next'],
                'meta' => ['current_page', 'per_page', 'total'],
            ]);
    }

    public function test_index_returns_paginated_people_with_total_and_remaining_ids(): void
    {
        $user = User::factory()->create();
        $tree = FamilyTree::factory()->create(['user_id' => $user->id]);

        $legacyPeople = Person::factory()->count(3)->sequence(
            ['family_tree_id' => $tree->id, 'first_name' => 'Alpha'],
            ['family_tree_id' => $tree->id, 'first_name' => 'Bravo'],
            ['family_tree_id' => $tree->id, 'first_name' => 'Charlie']
        )->create();

        $otherOwnedTree = FamilyTree::factory()->create(['user_id' => $user->id]);
        $memberOnlyPeople = Person::factory()->count(2)->sequence(
            ['family_tree_id' => $otherOwnedTree->id, 'first_name' => 'Delta'],
            ['family_tree_id' => $otherOwnedTree->id, 'first_name' => 'Echo']
        )->create();

        foreach ($memberOnlyPeople as $person) {
            TreePerson::create([
                'tree_id' => $tree->id,
                'person_id' => $person->id,
            ]);
        }

        $otherUser = User::factory()->create();
        $otherUserTree = FamilyTree::factory()->create(['user_id' => $otherUser->id]);
        $foreignPerson = Person::factory()->create(['family_tree_id' => $otherUserTree->id, 'first_name' => 'Hidden']);
        TreePerson::create([
            'tree_id' => $tree->id,
            'person_id' => $foreignPerson->id,
        ]);

        $page1 = $this->actingAs($user)
            ->getJson("/api/trees/{$tree->id}/people?paginate=1&per_page=3&page=1&sort=name_asc")
            ->assertOk();

        $page1->assertJsonPath('meta.total', 5);
        $page1->assertJsonCount(3, 'data');

        $page2 = $this->actingAs($user)
            ->getJson("/api/trees/{$tree->id}/people?paginate=1&per_page=3&page=2&sort=name_asc")
            ->assertOk();

        $page2->assertJsonPath('meta.total', 5);
        $page2->assertJsonCount(2, 'data');

        $accessibleIds = $legacyPeople
            ->concat($memberOnlyPeople)
            ->pluck('id')
            ->all();

        $page1Ids = collect($page1->json('data'))->pluck('id');
        $page2Ids = collect($page2->json('data'))->pluck('id');
        $combinedIds = $page1Ids->concat($page2Ids);

        $this->assertCount(5, $combinedIds->unique()->all());
        $this->assertEmpty($combinedIds->diff($accessibleIds)->all());
        $this->assertEmpty(collect($accessibleIds)->diff($combinedIds)->all());
    }
}
