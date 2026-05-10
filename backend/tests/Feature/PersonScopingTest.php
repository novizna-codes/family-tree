<?php

namespace Tests\Feature;

use App\Models\FamilyTree;
use App\Models\Person;
use App\Models\TreePerson;
use App\Models\User;
use App\Models\UserGroup;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PersonScopingTest extends TestCase
{
    use RefreshDatabase;

    public function test_foreign_user_cannot_view_or_edit_person_even_if_present_in_tree_people(): void
    {
        $owner = User::factory()->create();
        $foreign = User::factory()->create();
        $ownerTree = FamilyTree::factory()->create(['user_id' => $owner->id]);
        $foreignTree = FamilyTree::factory()->create(['user_id' => $foreign->id]);

        $person = Person::factory()->create([
            'family_tree_id' => $ownerTree->id,
            'owner_user_id' => $owner->id,
        ]);

        TreePerson::create([
            'tree_id' => $foreignTree->id,
            'person_id' => $person->id,
        ]);

        $this->actingAs($foreign)
            ->getJson("/api/trees/{$foreignTree->id}/people/{$person->id}")
            ->assertForbidden();

        $this->actingAs($foreign)
            ->putJson("/api/trees/{$foreignTree->id}/people/{$person->id}", [
                'first_name' => 'Edited',
            ])
            ->assertForbidden();
    }

    public function test_owner_can_access_own_person(): void
    {
        $owner = User::factory()->create();
        $tree = FamilyTree::factory()->create(['user_id' => $owner->id]);
        $person = Person::factory()->create([
            'family_tree_id' => $tree->id,
            'owner_user_id' => $owner->id,
        ]);

        $this->actingAs($owner)
            ->getJson("/api/trees/{$tree->id}/people/{$person->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $person->id);
    }

    public function test_group_shared_user_can_access_person(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();

        $ownerTree = FamilyTree::factory()->create(['user_id' => $owner->id]);
        $memberTree = FamilyTree::factory()->create(['user_id' => $member->id]);

        $group = UserGroup::create([
            'owner_user_id' => $owner->id,
            'name' => 'Collaborators',
        ]);

        $group->members()->attach($member->id);

        $person = Person::factory()->create([
            'family_tree_id' => $ownerTree->id,
            'owner_user_id' => $owner->id,
        ]);

        $person->shareGroups()->attach($group->id);

        TreePerson::create([
            'tree_id' => $memberTree->id,
            'person_id' => $person->id,
        ]);

        $this->actingAs($member)
            ->getJson("/api/trees/{$memberTree->id}/people/{$person->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $person->id);
    }

    public function test_search_returns_only_accessible_people(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $outsider = User::factory()->create();

        $ownerTree = FamilyTree::factory()->create(['user_id' => $owner->id]);
        $outsiderTree = FamilyTree::factory()->create(['user_id' => $outsider->id]);

        $group = UserGroup::create([
            'owner_user_id' => $owner->id,
            'name' => 'Search Share',
        ]);
        $group->members()->attach($member->id);

        $shared = Person::factory()->create([
            'family_tree_id' => $ownerTree->id,
            'owner_user_id' => $owner->id,
            'first_name' => 'ScopedMatch',
        ]);
        $shared->shareGroups()->attach($group->id);

        Person::factory()->create([
            'family_tree_id' => $outsiderTree->id,
            'owner_user_id' => $outsider->id,
            'first_name' => 'ScopedMatchHidden',
        ]);

        $response = $this->actingAs($member)
            ->getJson('/api/people/search?q=ScopedMatch');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertSame($shared->id, $response->json('data.0.id'));
    }

    public function test_merge_denies_inaccessible_people(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();

        $ownerTree = FamilyTree::factory()->create(['user_id' => $owner->id]);
        $otherTree = FamilyTree::factory()->create(['user_id' => $other->id]);

        $keep = Person::factory()->create(['family_tree_id' => $ownerTree->id, 'owner_user_id' => $owner->id]);
        $merge = Person::factory()->create(['family_tree_id' => $otherTree->id, 'owner_user_id' => $other->id]);

        $this->actingAs($owner)
            ->postJson('/api/people/merge', [
                'keep_person_id' => $keep->id,
                'merge_person_ids' => [$merge->id],
            ])
            ->assertForbidden()
            ->assertJsonPath('message', 'You can only merge people from trees you own.');
    }

    public function test_relationship_link_denies_inaccessible_related_person(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();

        $ownerTree = FamilyTree::factory()->create(['user_id' => $owner->id]);
        $memberTree = FamilyTree::factory()->create(['user_id' => $member->id]);

        $localPerson = Person::factory()->create([
            'family_tree_id' => $memberTree->id,
            'owner_user_id' => $member->id,
            'gender' => 'M',
        ]);

        $foreignPerson = Person::factory()->create([
            'family_tree_id' => $ownerTree->id,
            'owner_user_id' => $owner->id,
        ]);

        TreePerson::create([
            'tree_id' => $memberTree->id,
            'person_id' => $foreignPerson->id,
        ]);

        $this->actingAs($member)
            ->postJson("/api/trees/{$memberTree->id}/people/{$localPerson->id}/relationships/link", [
                'relationship_type' => 'child',
                'related_person_id' => $foreignPerson->id,
                'parent_role' => 'father',
            ])
            ->assertForbidden();
    }

    public function test_shared_user_cannot_link_child_when_child_is_not_owned_by_them(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();

        $ownerTree = FamilyTree::factory()->create(['user_id' => $owner->id]);
        $memberTree = FamilyTree::factory()->create(['user_id' => $member->id]);

        $group = UserGroup::create([
            'owner_user_id' => $owner->id,
            'name' => 'Child Link Share',
        ]);
        $group->members()->attach($member->id);

        $localParent = Person::factory()->create([
            'family_tree_id' => $memberTree->id,
            'owner_user_id' => $member->id,
            'gender' => 'M',
        ]);

        $sharedChild = Person::factory()->create([
            'family_tree_id' => $ownerTree->id,
            'owner_user_id' => $owner->id,
            'father_id' => null,
            'mother_id' => null,
        ]);
        $sharedChild->shareGroups()->attach($group->id);

        TreePerson::create([
            'tree_id' => $memberTree->id,
            'person_id' => $sharedChild->id,
        ]);

        $this->actingAs($member)
            ->postJson("/api/trees/{$memberTree->id}/people/{$localParent->id}/relationships/link", [
                'relationship_type' => 'child',
                'related_person_id' => $sharedChild->id,
                'parent_role' => 'father',
            ])
            ->assertForbidden();

        $this->assertDatabaseHas('people', [
            'id' => $sharedChild->id,
            'father_id' => null,
            'mother_id' => null,
        ]);
    }

    public function test_shared_user_can_view_but_cannot_update_or_delete_person(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();

        $ownerTree = FamilyTree::factory()->create(['user_id' => $owner->id]);
        $memberTree = FamilyTree::factory()->create(['user_id' => $member->id]);

        $group = UserGroup::create([
            'owner_user_id' => $owner->id,
            'name' => 'Tree Scope Share',
        ]);
        $group->members()->attach($member->id);

        $person = Person::factory()->create([
            'family_tree_id' => $ownerTree->id,
            'owner_user_id' => $owner->id,
        ]);
        $person->shareGroups()->attach($group->id);

        TreePerson::create([
            'tree_id' => $memberTree->id,
            'person_id' => $person->id,
        ]);

        $this->actingAs($member)
            ->getJson("/api/trees/{$memberTree->id}/people/{$person->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $person->id);

        $this->actingAs($member)
            ->putJson("/api/trees/{$memberTree->id}/people/{$person->id}", [
                'first_name' => 'Blocked Update',
            ])
            ->assertForbidden();

        $this->actingAs($member)
            ->deleteJson("/api/trees/{$memberTree->id}/people/{$person->id}")
            ->assertForbidden();
    }

    public function test_shared_user_cannot_link_parent_when_related_parent_is_not_owned_by_them(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();

        $ownerTree = FamilyTree::factory()->create(['user_id' => $owner->id]);
        $memberTree = FamilyTree::factory()->create(['user_id' => $member->id]);

        $group = UserGroup::create([
            'owner_user_id' => $owner->id,
            'name' => 'Parent Link Share',
        ]);
        $group->members()->attach($member->id);

        $localChild = Person::factory()->create([
            'family_tree_id' => $memberTree->id,
            'owner_user_id' => $member->id,
        ]);

        $sharedParent = Person::factory()->create([
            'family_tree_id' => $ownerTree->id,
            'owner_user_id' => $owner->id,
        ]);
        $sharedParent->shareGroups()->attach($group->id);

        TreePerson::create([
            'tree_id' => $memberTree->id,
            'person_id' => $sharedParent->id,
        ]);

        $this->actingAs($member)
            ->postJson("/api/trees/{$memberTree->id}/people/{$localChild->id}/relationships/link", [
                'relationship_type' => 'parent',
                'related_person_id' => $sharedParent->id,
                'relationship_role' => 'father',
            ])
            ->assertForbidden();

        $this->assertDatabaseHas('people', [
            'id' => $localChild->id,
            'father_id' => null,
            'mother_id' => null,
        ]);
    }

    public function test_user_cannot_link_spouse_with_inaccessible_related_person(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();

        $ownerTree = FamilyTree::factory()->create(['user_id' => $owner->id]);
        $memberTree = FamilyTree::factory()->create(['user_id' => $member->id]);

        $localPerson = Person::factory()->create([
            'family_tree_id' => $memberTree->id,
            'owner_user_id' => $member->id,
        ]);

        $foreignSpouse = Person::factory()->create([
            'family_tree_id' => $ownerTree->id,
            'owner_user_id' => $owner->id,
        ]);

        TreePerson::create([
            'tree_id' => $memberTree->id,
            'person_id' => $foreignSpouse->id,
        ]);

        $this->actingAs($member)
            ->postJson("/api/trees/{$memberTree->id}/people/{$localPerson->id}/relationships/link", [
                'relationship_type' => 'spouse',
                'related_person_id' => $foreignSpouse->id,
                'relationship_role' => 'spouse',
            ])
            ->assertForbidden();
    }

    public function test_store_rejects_inaccessible_parent_even_if_parent_is_in_tree_context(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();

        $ownerTree = FamilyTree::factory()->create(['user_id' => $owner->id]);
        $memberTree = FamilyTree::factory()->create(['user_id' => $member->id]);

        $inaccessibleFather = Person::factory()->create([
            'family_tree_id' => $ownerTree->id,
            'owner_user_id' => $owner->id,
        ]);

        TreePerson::create([
            'tree_id' => $memberTree->id,
            'person_id' => $inaccessibleFather->id,
        ]);

        $this->actingAs($member)
            ->postJson("/api/trees/{$memberTree->id}/people", [
                'first_name' => 'Child',
                'father_id' => $inaccessibleFather->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['father_id']);
    }
}
