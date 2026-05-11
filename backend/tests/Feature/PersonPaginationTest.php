<?php

namespace Tests\Feature;

use App\Models\FamilyTree;
use App\Models\Person;
use App\Models\TreePerson;
use App\Models\User;
use App\Models\UserGroup;
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

    public function test_global_index_returns_only_accessible_people_for_authenticated_user(): void
    {
        $user = User::factory()->create();
        $owner = User::factory()->create();
        $outsider = User::factory()->create();

        $userTree = FamilyTree::factory()->create(['user_id' => $user->id]);
        $ownerTree = FamilyTree::factory()->create(['user_id' => $owner->id]);
        $outsiderTree = FamilyTree::factory()->create(['user_id' => $outsider->id]);

        $ownedPerson = Person::factory()->create([
            'family_tree_id' => $userTree->id,
            'owner_user_id' => $user->id,
            'first_name' => 'Owned',
        ]);

        $group = UserGroup::create([
            'owner_user_id' => $owner->id,
            'name' => 'Global List Share',
        ]);
        $group->members()->attach($user->id);

        $sharedPerson = Person::factory()->create([
            'family_tree_id' => $ownerTree->id,
            'owner_user_id' => $owner->id,
            'first_name' => 'Shared',
        ]);
        $sharedPerson->shareGroups()->attach($group->id);

        Person::factory()->create([
            'family_tree_id' => $outsiderTree->id,
            'owner_user_id' => $outsider->id,
            'first_name' => 'Hidden',
        ]);

        $response = $this->actingAs($user)->getJson('/api/people?sort=name_asc');

        $response->assertOk()->assertJsonStructure([
            'data' => [
                '*' => ['id', 'father', 'mother'],
            ],
        ]);

        $ids = collect($response->json('data'))->pluck('id');
        $this->assertCount(2, $ids->all());
        $this->assertTrue($ids->contains($ownedPerson->id));
        $this->assertTrue($ids->contains($sharedPerson->id));
    }

    public function test_global_index_paginate_returns_laravel_paginated_shape(): void
    {
        $user = User::factory()->create();
        $tree = FamilyTree::factory()->create(['user_id' => $user->id]);

        Person::factory()->count(3)->create([
            'family_tree_id' => $tree->id,
            'owner_user_id' => $user->id,
        ]);

        $response = $this->actingAs($user)
            ->getJson('/api/people?paginate=true&per_page=2&page=1');

        $response->assertOk()->assertJsonStructure([
            'data',
            'links',
            'meta' => ['current_page', 'per_page', 'total'],
        ]);
    }

    public function test_global_index_search_filters_people_by_name_fields(): void
    {
        $user = User::factory()->create();
        $tree = FamilyTree::factory()->create(['user_id' => $user->id]);

        $matched = Person::factory()->create([
            'family_tree_id' => $tree->id,
            'owner_user_id' => $user->id,
            'first_name' => 'Alex',
            'last_name' => 'Stone',
            'maiden_name' => 'Taylor',
            'nickname' => 'Ace',
        ]);

        Person::factory()->create([
            'family_tree_id' => $tree->id,
            'owner_user_id' => $user->id,
            'first_name' => 'Brian',
            'last_name' => 'Mills',
            'maiden_name' => 'Rivers',
            'nickname' => 'Bee',
        ]);

        $response = $this->actingAs($user)->getJson('/api/people?q=ace');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertSame($matched->id, $response->json('data.0.id'));
    }

    public function test_global_index_requires_authentication(): void
    {
        $this->getJson('/api/people')->assertUnauthorized();
    }
}
