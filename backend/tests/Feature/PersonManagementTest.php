<?php

namespace Tests\Feature;

use App\Models\FamilyTree;
use App\Models\Person;
use App\Models\User;
use App\Models\Relationship;
use App\Models\TreeEdge;
use App\Models\TreePerson;
use App\Models\UserGroup;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PersonManagementTest extends TestCase
{
    use RefreshDatabase;

    protected $user;
    protected $tree;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->tree = FamilyTree::factory()->create(['user_id' => $this->user->id]);
    }

    public function test_can_copy_person_to_another_tree()
    {
        $targetTree = FamilyTree::factory()->create(['user_id' => $this->user->id]);
        $person = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
            'first_name' => 'John',
            'last_name' => 'Doe',
            'birth_date' => '1990-01-01',
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/trees/{$this->tree->id}/people/{$person->id}/copy", [
                'target_tree_id' => $targetTree->id,
            ]);

        $response->assertStatus(201);
        $response->assertJsonPath('meta.copied_count', 1);
        $response->assertJsonPath('meta.created_tree_id', null);
        $response->assertJsonPath('meta.created_tree_name', null);
        $this->assertDatabaseHas('people', [
            'family_tree_id' => $targetTree->id,
            'first_name' => 'John',
            'last_name' => 'Doe',
        ]);

        $newPerson = Person::where('family_tree_id', $targetTree->id)->first();
        $this->assertNotNull($newPerson);
        $this->assertDatabaseHas('tree_people', [
            'tree_id' => $targetTree->id,
            'person_id' => $newPerson->id,
        ]);
        
        // Verify it's a different ID
        $this->assertNotEquals($person->id, $newPerson->id);
    }

    public function test_copy_can_create_new_target_tree_and_copy_person()
    {
        $person = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
            'first_name' => 'John',
            'last_name' => 'Doe',
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/trees/{$this->tree->id}/people/{$person->id}/copy", [
                'create_target_tree' => true,
                'target_tree_name' => 'Copied Branch',
                'target_tree_description' => 'Created while copying person',
            ]);

        $response->assertCreated();
        $response->assertJsonPath('meta.copied_count', 1);
        $response->assertJsonPath('meta.created_tree_name', 'Copied Branch');

        $createdTreeId = $response->json('meta.created_tree_id');
        $this->assertNotNull($createdTreeId);

        $this->assertDatabaseHas('family_trees', [
            'id' => $createdTreeId,
            'user_id' => $this->user->id,
            'name' => 'Copied Branch',
            'description' => 'Created while copying person',
        ]);

        $this->assertDatabaseHas('people', [
            'family_tree_id' => $createdTreeId,
            'first_name' => 'John',
            'last_name' => 'Doe',
        ]);
    }

    public function test_copy_create_target_tree_requires_name()
    {
        $person = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/trees/{$this->tree->id}/people/{$person->id}/copy", [
                'create_target_tree' => true,
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['target_tree_name']);
    }

    public function test_copy_to_tree_unauthenticated_returns_401()
    {
        $targetTree = FamilyTree::factory()->create(['user_id' => $this->user->id]);
        $person = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
        ]);

        $response = $this->postJson("/api/trees/{$this->tree->id}/people/{$person->id}/copy", [
            'target_tree_id' => $targetTree->id,
        ]);

        $response->assertStatus(401);
    }

    public function test_copy_to_tree_with_unauthorized_target_tree_returns_403()
    {
        $otherUser = User::factory()->create();
        $otherUsersTree = FamilyTree::factory()->create(['user_id' => $otherUser->id]);
        $person = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/trees/{$this->tree->id}/people/{$person->id}/copy", [
                'target_tree_id' => $otherUsersTree->id,
            ]);

        $response->assertStatus(403);
    }

    public function test_copy_to_tree_with_unauthorized_target_parent_returns_403()
    {
        $targetTree = FamilyTree::factory()->create(['user_id' => $this->user->id]);
        $otherUser = User::factory()->create();
        $otherUsersTree = FamilyTree::factory()->create(['user_id' => $otherUser->id]);

        $person = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
        ]);

        $foreignTargetParent = Person::factory()->create([
            'family_tree_id' => $otherUsersTree->id,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/trees/{$this->tree->id}/people/{$person->id}/copy", [
                'target_tree_id' => $targetTree->id,
                'target_parent_id' => $foreignTargetParent->id,
            ]);

        $response->assertStatus(403);
    }

    public function test_copy_to_tree_source_person_outside_source_tree_context_returns_404()
    {
        $targetTree = FamilyTree::factory()->create(['user_id' => $this->user->id]);
        $anotherSourceTree = FamilyTree::factory()->create(['user_id' => $this->user->id]);

        $personOutsideSourceTree = Person::factory()->create([
            'family_tree_id' => $anotherSourceTree->id,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/trees/{$this->tree->id}/people/{$personOutsideSourceTree->id}/copy", [
                'target_tree_id' => $targetTree->id,
            ]);

        $response->assertStatus(404);
    }

    public function test_can_copy_person_with_descendants_and_attach_under_target_parent()
    {
        $targetTree = FamilyTree::factory()->create(['user_id' => $this->user->id]);
        $targetParent = Person::factory()->create([
            'family_tree_id' => $targetTree->id,
            'gender' => 'F',
        ]);

        $root = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
            'first_name' => 'John',
            'last_name' => 'Doe',
            'gender' => 'M',
        ]);

        $child = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
            'father_id' => $root->id,
            'first_name' => 'Kid',
        ]);

        Person::factory()->create([
            'family_tree_id' => $this->tree->id,
            'father_id' => $child->id,
            'first_name' => 'Grandkid',
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/trees/{$this->tree->id}/people/{$root->id}/copy", [
                'target_tree_id' => $targetTree->id,
                'target_parent_id' => $targetParent->id,
                'include_descendants' => true,
            ]);

        $response->assertStatus(201);
        $response->assertJsonPath('meta.copied_count', 3);

        $copiedRootId = $response->json('data.id');
        $this->assertDatabaseHas('people', [
            'id' => $copiedRootId,
            'family_tree_id' => $targetTree->id,
            'mother_id' => $targetParent->id,
        ]);

        $copiedRoot = Person::findOrFail($copiedRootId);
        $copiedChild = Person::where('family_tree_id', $targetTree->id)
            ->where('father_id', $copiedRoot->id)
            ->first();

        $this->assertNotNull($copiedChild);
        $this->assertGreaterThanOrEqual(3, TreePerson::where('tree_id', $targetTree->id)->count());
        $this->assertTrue(TreeEdge::where('tree_id', $targetTree->id)
            ->where('parent_person_id', $targetParent->id)
            ->where('child_person_id', $copiedRootId)
            ->where('parent_role', 'mother')
            ->exists());
    }

    public function test_copy_mode_clone_still_creates_new_person_ids()
    {
        $targetTree = FamilyTree::factory()->create(['user_id' => $this->user->id]);

        $root = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
            'gender' => 'M',
        ]);

        $child = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
            'father_id' => $root->id,
        ]);

        TreeEdge::create([
            'tree_id' => $this->tree->id,
            'parent_person_id' => $root->id,
            'child_person_id' => $child->id,
            'parent_role' => 'father',
            'relationship_type' => 'biological',
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/trees/{$this->tree->id}/people/{$root->id}/copy", [
                'target_tree_id' => $targetTree->id,
                'copy_mode' => 'clone',
                'include_descendants' => true,
            ]);

        $response->assertCreated();

        $copiedIds = $response->json('meta.copied_person_ids');
        $this->assertCount(2, $copiedIds);
        $this->assertNotContains($root->id, $copiedIds);
        $this->assertNotContains($child->id, $copiedIds);
    }

    public function test_copy_mode_reuse_reuses_ids_and_creates_target_memberships_and_edges()
    {
        $targetTree = FamilyTree::factory()->create(['user_id' => $this->user->id]);

        $root = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
            'gender' => 'M',
        ]);

        $child = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
            'father_id' => $root->id,
        ]);

        TreeEdge::create([
            'tree_id' => $this->tree->id,
            'parent_person_id' => $root->id,
            'child_person_id' => $child->id,
            'parent_role' => 'father',
            'relationship_type' => 'biological',
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/trees/{$this->tree->id}/people/{$root->id}/copy", [
                'target_tree_id' => $targetTree->id,
                'copy_mode' => 'reuse',
                'include_descendants' => true,
            ]);

        $response->assertCreated();
        $response->assertJsonPath('data.id', $root->id);

        $this->assertDatabaseHas('tree_people', [
            'tree_id' => $targetTree->id,
            'person_id' => $root->id,
        ]);

        $this->assertDatabaseHas('tree_people', [
            'tree_id' => $targetTree->id,
            'person_id' => $child->id,
        ]);

        $this->assertDatabaseHas('tree_edges', [
            'tree_id' => $targetTree->id,
            'parent_person_id' => $root->id,
            'child_person_id' => $child->id,
            'parent_role' => 'father',
        ]);
    }

    public function test_copy_mode_reuse_is_idempotent_for_memberships_and_edges()
    {
        $targetTree = FamilyTree::factory()->create(['user_id' => $this->user->id]);

        $root = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
            'gender' => 'M',
        ]);

        $child = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
            'father_id' => $root->id,
        ]);

        TreeEdge::create([
            'tree_id' => $this->tree->id,
            'parent_person_id' => $root->id,
            'child_person_id' => $child->id,
            'parent_role' => 'father',
            'relationship_type' => 'biological',
        ]);

        $payload = [
            'target_tree_id' => $targetTree->id,
            'copy_mode' => 'reuse',
            'include_descendants' => true,
        ];

        $this->actingAs($this->user)
            ->postJson("/api/trees/{$this->tree->id}/people/{$root->id}/copy", $payload)
            ->assertCreated();

        $this->actingAs($this->user)
            ->postJson("/api/trees/{$this->tree->id}/people/{$root->id}/copy", $payload)
            ->assertCreated();

        $this->assertEquals(1, TreePerson::where('tree_id', $targetTree->id)->where('person_id', $root->id)->count());
        $this->assertEquals(1, TreePerson::where('tree_id', $targetTree->id)->where('person_id', $child->id)->count());
        $this->assertEquals(1, TreeEdge::where('tree_id', $targetTree->id)
            ->where('parent_person_id', $root->id)
            ->where('child_person_id', $child->id)
            ->where('parent_role', 'father')
            ->count());
    }

    public function test_can_attach_reused_root_under_target_parent()
    {
        $targetTree = FamilyTree::factory()->create(['user_id' => $this->user->id]);

        $targetParent = Person::factory()->create([
            'family_tree_id' => $targetTree->id,
            'gender' => 'F',
        ]);

        $root = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
            'gender' => 'M',
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/trees/{$this->tree->id}/people/{$root->id}/copy", [
                'target_tree_id' => $targetTree->id,
                'copy_mode' => 'reuse',
                'target_parent_id' => $targetParent->id,
                'target_parent_role' => 'mother',
                'include_descendants' => false,
            ]);

        $response->assertCreated();
        $response->assertJsonPath('data.id', $root->id);

        $this->assertDatabaseHas('tree_edges', [
            'tree_id' => $targetTree->id,
            'parent_person_id' => $targetParent->id,
            'child_person_id' => $root->id,
            'parent_role' => 'mother',
        ]);
    }

    public function test_can_update_relationship_metadata()
    {
        $person1 = Person::factory()->create(['family_tree_id' => $this->tree->id]);
        $person2 = Person::factory()->create(['family_tree_id' => $this->tree->id]);
        
        $relationship = Relationship::create([
            'family_tree_id' => $this->tree->id,
            'person1_id' => $person1->id,
            'person2_id' => $person2->id,
            'relationship_type' => 'spouse',
        ]);

        $response = $this->actingAs($this->user)
            ->putJson("/api/trees/{$this->tree->id}/people/{$person1->id}/relationships/{$relationship->id}", [
                'relationship_type' => 'divorced',
                'notes' => 'Some notes',
            ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('relationships', [
            'id' => $relationship->id,
            'relationship_type' => 'divorced',
            'notes' => 'Some notes',
        ]);
    }

    public function test_can_unlink_parent()
    {
        $father = Person::factory()->create(['family_tree_id' => $this->tree->id]);
        $child = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
            'father_id' => $father->id,
        ]);

        $response = $this->actingAs($this->user)
            ->deleteJson("/api/trees/{$this->tree->id}/people/{$child->id}/relationships/father");

        $response->assertStatus(200);
        $this->assertDatabaseHas('people', [
            'id' => $child->id,
            'father_id' => null,
        ]);
        
        // Father should still exist
        $this->assertDatabaseHas('people', ['id' => $father->id]);
    }

    public function test_can_merge_people_and_repoint_references()
    {
        $treeB = FamilyTree::factory()->create(['user_id' => $this->user->id]);

        $keep = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
            'first_name' => 'Ali',
            'last_name' => 'Khan',
            'birth_date' => '1990-01-01',
        ]);

        $merge1 = Person::factory()->create([
            'family_tree_id' => $treeB->id,
            'first_name' => 'Ali',
            'last_name' => 'خان',
            'birth_date' => '1990-01-01',
        ]);

        $child = Person::factory()->create([
            'family_tree_id' => $treeB->id,
            'father_id' => $merge1->id,
        ]);

        $response = $this->actingAs($this->user)->postJson('/api/people/merge', [
            'keep_person_id' => $keep->id,
            'merge_person_ids' => [$merge1->id],
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.kept_person_id', $keep->id);

        $this->assertSoftDeleted('people', ['id' => $merge1->id]);
        $this->assertDatabaseHas('people', [
            'id' => $child->id,
            'father_id' => $keep->id,
        ]);
    }

    public function test_can_preview_merge_impact()
    {
        $keep = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
        ]);

        $merge = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
        ]);

        Person::factory()->create([
            'family_tree_id' => $this->tree->id,
            'father_id' => $merge->id,
        ]);

        $response = $this->actingAs($this->user)->postJson('/api/people/merge/preview', [
            'keep_person_id' => $keep->id,
            'merge_person_ids' => [$merge->id],
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.merge_people_count', 1);
        $response->assertJsonStructure([
            'data' => [
                'legacy_parent_links_count',
                'legacy_relationship_rows_count',
                'tree_memberships_count',
                'tree_edges_count',
                'tree_root_refs_count',
                'impacted_tree_ids',
                'impacted_tree_count',
                'impacted_relationship_tree_count',
                'has_cross_tree_impact',
            ],
        ]);
        $response->assertJsonPath('data.impacted_tree_count', 1);
        $response->assertJsonPath('data.impacted_relationship_tree_count', 0);
        $response->assertJsonPath('data.has_cross_tree_impact', false);

        $impactedTreeIds = $response->json('data.impacted_tree_ids');
        $this->assertIsArray($impactedTreeIds);
        $this->assertCount(1, $impactedTreeIds);
        $this->assertEquals($this->tree->id, $impactedTreeIds[0]);
    }

    public function test_preview_merge_metadata_flags_cross_tree_relationship_impact(): void
    {
        $treeB = FamilyTree::factory()->create(['user_id' => $this->user->id]);

        $keep = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
        ]);

        $merge = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
        ]);

        $treeBPerson = Person::factory()->create([
            'family_tree_id' => $treeB->id,
        ]);

        Relationship::create([
            'family_tree_id' => $treeB->id,
            'person1_id' => $merge->id,
            'person2_id' => $treeBPerson->id,
            'relationship_type' => 'spouse',
        ]);

        $response = $this->actingAs($this->user)->postJson('/api/people/merge/preview', [
            'keep_person_id' => $keep->id,
            'merge_person_ids' => [$merge->id],
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.impacted_tree_count', 2);
        $response->assertJsonPath('data.impacted_relationship_tree_count', 1);
        $response->assertJsonPath('data.has_cross_tree_impact', true);

        $impactedTreeIds = collect($response->json('data.impacted_tree_ids'));
        $this->assertCount(2, $impactedTreeIds);
        $this->assertTrue($impactedTreeIds->contains($this->tree->id));
        $this->assertTrue($impactedTreeIds->contains($treeB->id));
    }

    public function test_cannot_merge_people_from_tree_owned_by_another_user()
    {
        $otherUser = User::factory()->create();
        $otherTree = FamilyTree::factory()->create(['user_id' => $otherUser->id]);

        $keep = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
        ]);

        $merge = Person::factory()->create([
            'family_tree_id' => $otherTree->id,
        ]);

        $response = $this->actingAs($this->user)->postJson('/api/people/merge', [
            'keep_person_id' => $keep->id,
            'merge_person_ids' => [$merge->id],
        ]);

        $response->assertStatus(403);
        $response->assertJsonPath('message', 'You can only merge people from trees you own.');
    }

    public function test_cannot_preview_merge_people_from_tree_owned_by_another_user()
    {
        $otherUser = User::factory()->create();
        $otherTree = FamilyTree::factory()->create(['user_id' => $otherUser->id]);

        $keep = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
        ]);

        $merge = Person::factory()->create([
            'family_tree_id' => $otherTree->id,
        ]);

        $response = $this->actingAs($this->user)->postJson('/api/people/merge/preview', [
            'keep_person_id' => $keep->id,
            'merge_person_ids' => [$merge->id],
        ]);

        $response->assertStatus(403);
        $response->assertJsonPath('message', 'You can only merge people from trees you own.');
    }

    public function test_merge_policy_authorization_keeps_generic_forbidden_message(): void
    {
        $otherUser = User::factory()->create();
        $otherTree = FamilyTree::factory()->create(['user_id' => $otherUser->id]);

        $keep = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
        ]);

        $merge = Person::factory()->create([
            'family_tree_id' => $otherTree->id,
        ]);

        $this->actingAs($this->user)
            ->postJson('/api/people/merge', [
                'keep_person_id' => $keep->id,
                'merge_person_ids' => [$merge->id],
            ])
            ->assertStatus(403)
            ->assertJsonPath('message', 'You can only merge people from trees you own.');

        $this->actingAs($this->user)
            ->postJson('/api/people/merge/preview', [
                'keep_person_id' => $keep->id,
                'merge_person_ids' => [$merge->id],
            ])
            ->assertStatus(403)
            ->assertJsonPath('message', 'You can only merge people from trees you own.');
    }

    public function test_cannot_merge_person_when_access_only_granted_via_tree_people_membership()
    {
        $otherUser = User::factory()->create();
        $otherTree = FamilyTree::factory()->create(['user_id' => $otherUser->id]);

        $keep = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
        ]);

        $merge = Person::factory()->create([
            'family_tree_id' => $otherTree->id,
        ]);

        TreePerson::create([
            'tree_id' => $this->tree->id,
            'person_id' => $merge->id,
        ]);

        $response = $this->actingAs($this->user)->postJson('/api/people/merge', [
            'keep_person_id' => $keep->id,
            'merge_person_ids' => [$merge->id],
        ]);

        $response->assertStatus(403);
        $response->assertJsonPath('message', 'You can only merge people from trees you own.');
    }

    public function test_cannot_preview_merge_when_access_only_granted_via_tree_people_membership()
    {
        $otherUser = User::factory()->create();
        $otherTree = FamilyTree::factory()->create(['user_id' => $otherUser->id]);

        $keep = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
        ]);

        $merge = Person::factory()->create([
            'family_tree_id' => $otherTree->id,
        ]);

        TreePerson::create([
            'tree_id' => $this->tree->id,
            'person_id' => $merge->id,
        ]);

        $response = $this->actingAs($this->user)->postJson('/api/people/merge/preview', [
            'keep_person_id' => $keep->id,
            'merge_person_ids' => [$merge->id],
        ]);

        $response->assertStatus(403);
        $response->assertJsonPath('message', 'You can only merge people from trees you own.');
    }

    public function test_cannot_merge_people_when_impacted_tree_membership_is_in_another_users_tree()
    {
        $otherUser = User::factory()->create();
        $otherTree = FamilyTree::factory()->create(['user_id' => $otherUser->id]);

        $keep = Person::factory()->create(['family_tree_id' => $this->tree->id]);
        $merge = Person::factory()->create(['family_tree_id' => $this->tree->id]);

        TreePerson::create([
            'tree_id' => $otherTree->id,
            'person_id' => $merge->id,
        ]);

        $response = $this->actingAs($this->user)->postJson('/api/people/merge', [
            'keep_person_id' => $keep->id,
            'merge_person_ids' => [$merge->id],
        ]);

        $response->assertStatus(403);
        $response->assertJsonPath('message', 'You can only merge people from trees you own.');
    }

    public function test_cannot_merge_people_when_impacted_tree_edge_is_in_another_users_tree()
    {
        $otherUser = User::factory()->create();
        $otherTree = FamilyTree::factory()->create(['user_id' => $otherUser->id]);

        $keep = Person::factory()->create(['family_tree_id' => $this->tree->id]);
        $merge = Person::factory()->create(['family_tree_id' => $this->tree->id]);

        TreeEdge::create([
            'tree_id' => $otherTree->id,
            'parent_person_id' => $keep->id,
            'child_person_id' => $merge->id,
            'parent_role' => 'father',
            'relationship_type' => 'biological',
        ]);

        $response = $this->actingAs($this->user)->postJson('/api/people/merge', [
            'keep_person_id' => $keep->id,
            'merge_person_ids' => [$merge->id],
        ]);

        $response->assertStatus(403);
        $response->assertJsonPath('message', 'You can only merge people from trees you own.');
    }

    public function test_cannot_merge_people_when_impacted_root_reference_is_in_another_users_tree()
    {
        $otherUser = User::factory()->create();
        $otherTree = FamilyTree::factory()->create(['user_id' => $otherUser->id]);

        $keep = Person::factory()->create(['family_tree_id' => $this->tree->id]);
        $merge = Person::factory()->create(['family_tree_id' => $this->tree->id]);

        $otherTree->update([
            'root_person_id' => $merge->id,
        ]);

        $response = $this->actingAs($this->user)->postJson('/api/people/merge', [
            'keep_person_id' => $keep->id,
            'merge_person_ids' => [$merge->id],
        ]);

        $response->assertStatus(403);
        $response->assertJsonPath('message', 'You can only merge people from trees you own.');
    }

    public function test_merge_is_denied_and_foreign_tenant_references_remain_unchanged(): void
    {
        $otherUser = User::factory()->create();
        $otherTree = FamilyTree::factory()->create(['user_id' => $otherUser->id]);

        $keep = Person::factory()->create(['family_tree_id' => $this->tree->id]);
        $merge = Person::factory()->create(['family_tree_id' => $this->tree->id]);

        $foreignChild = Person::factory()->create([
            'family_tree_id' => $otherTree->id,
            'father_id' => $merge->id,
        ]);

        $foreignRelationship = Relationship::create([
            'family_tree_id' => $otherTree->id,
            'person1_id' => $merge->id,
            'person2_id' => Person::factory()->create(['family_tree_id' => $otherTree->id])->id,
            'relationship_type' => 'spouse',
        ]);

        $foreignEdge = TreeEdge::create([
            'tree_id' => $otherTree->id,
            'parent_person_id' => $merge->id,
            'child_person_id' => Person::factory()->create(['family_tree_id' => $otherTree->id])->id,
            'parent_role' => 'father',
            'relationship_type' => 'biological',
        ]);

        $otherTree->update(['root_person_id' => $merge->id]);

        $foreignMembership = TreePerson::create([
            'tree_id' => $otherTree->id,
            'person_id' => $merge->id,
        ]);

        $this->actingAs($this->user)
            ->postJson('/api/people/merge', [
                'keep_person_id' => $keep->id,
                'merge_person_ids' => [$merge->id],
            ])
            ->assertStatus(403)
            ->assertJsonPath('message', 'You can only merge people from trees you own.');

        $this->assertDatabaseHas('people', ['id' => $merge->id, 'deleted_at' => null]);
        $this->assertDatabaseHas('people', ['id' => $foreignChild->id, 'father_id' => $merge->id]);
        $this->assertDatabaseHas('relationships', ['id' => $foreignRelationship->id, 'person1_id' => $merge->id]);
        $this->assertDatabaseHas('tree_edges', ['id' => $foreignEdge->id, 'parent_person_id' => $merge->id]);
        $this->assertDatabaseHas('family_trees', ['id' => $otherTree->id, 'root_person_id' => $merge->id]);
        $this->assertDatabaseHas('tree_people', ['id' => $foreignMembership->id, 'person_id' => $merge->id]);
    }

    public function test_merge_with_duplicate_merge_person_ids_returns_unique_merged_person_id_once()
    {
        $keep = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
        ]);

        $merge = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
        ]);

        $response = $this->actingAs($this->user)->postJson('/api/people/merge', [
            'keep_person_id' => $keep->id,
            'merge_person_ids' => [$merge->id, $merge->id],
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.merged_person_ids', [$merge->id]);
    }

    public function test_shared_person_is_visible_in_multiple_trees_via_membership()
    {
        $treeB = FamilyTree::factory()->create(['user_id' => $this->user->id]);

        $person = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
            'first_name' => 'Shared',
        ]);

        TreePerson::create([
            'tree_id' => $treeB->id,
            'person_id' => $person->id,
        ]);

        $this->actingAs($this->user)
            ->getJson("/api/trees/{$treeB->id}/people")
            ->assertOk()
            ->assertJsonFragment(['id' => $person->id, 'first_name' => 'Shared']);

        $this->actingAs($this->user)
            ->getJson("/api/trees/{$treeB->id}/people/{$person->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $person->id);
    }

    public function test_tree_edges_are_isolated_per_tree_in_visualization()
    {
        $treeB = FamilyTree::factory()->create(['user_id' => $this->user->id]);

        $parentA = Person::factory()->create(['family_tree_id' => $this->tree->id, 'gender' => 'M']);
        $parentB = Person::factory()->create(['family_tree_id' => $treeB->id, 'gender' => 'M']);
        $child = Person::factory()->create(['family_tree_id' => $this->tree->id]);

        TreePerson::create(['tree_id' => $treeB->id, 'person_id' => $child->id]);
        TreePerson::create(['tree_id' => $treeB->id, 'person_id' => $parentB->id]);

        TreeEdge::create([
            'tree_id' => $this->tree->id,
            'parent_person_id' => $parentA->id,
            'child_person_id' => $child->id,
            'parent_role' => 'father',
            'relationship_type' => 'biological',
        ]);

        TreeEdge::create([
            'tree_id' => $treeB->id,
            'parent_person_id' => $parentB->id,
            'child_person_id' => $child->id,
            'parent_role' => 'father',
            'relationship_type' => 'biological',
        ]);

        $responseA = $this->actingAs($this->user)
            ->getJson("/api/trees/{$this->tree->id}/visualization")
            ->assertOk();

        $personInA = collect($responseA->json('data.people'))->firstWhere('id', $child->id);
        $this->assertNotNull($personInA);
        $this->assertEquals($parentA->id, $personInA['father_id']);

        $responseB = $this->actingAs($this->user)
            ->getJson("/api/trees/{$treeB->id}/visualization")
            ->assertOk();

        $personInB = collect($responseB->json('data.people'))->firstWhere('id', $child->id);
        $this->assertNotNull($personInB);
        $this->assertEquals($parentB->id, $personInB['father_id']);
    }

    public function test_show_denies_when_person_not_in_tree_membership_or_legacy_tree()
    {
        $otherTree = FamilyTree::factory()->create(['user_id' => $this->user->id]);
        $person = Person::factory()->create(['family_tree_id' => $otherTree->id]);

        $this->actingAs($this->user)
            ->getJson("/api/trees/{$this->tree->id}/people/{$person->id}")
            ->assertNotFound();
    }

    public function test_index_uses_legacy_fallback_for_same_tree_people_without_membership()
    {
        $person = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
            'first_name' => 'LegacyOnly',
        ]);

        $this->actingAs($this->user)
            ->getJson("/api/trees/{$this->tree->id}/people")
            ->assertOk()
            ->assertJsonFragment(['id' => $person->id, 'first_name' => 'LegacyOnly']);
    }

    public function test_cannot_mutate_relationships_for_person_not_in_route_tree(): void
    {
        $otherTree = FamilyTree::factory()->create(['user_id' => $this->user->id]);
        $personOutsideRouteTree = Person::factory()->create(['family_tree_id' => $otherTree->id]);

        $this->actingAs($this->user)
            ->postJson("/api/trees/{$this->tree->id}/people/{$personOutsideRouteTree->id}/relationships", [
                'relationship_type' => 'child',
                'first_name' => 'New Child',
                'parent_role' => 'father',
            ])
            ->assertNotFound();

        $relatedInTree = Person::factory()->create(['family_tree_id' => $this->tree->id]);

        $this->actingAs($this->user)
            ->postJson("/api/trees/{$this->tree->id}/people/{$personOutsideRouteTree->id}/relationships/link", [
                'relationship_type' => 'spouse',
                'related_person_id' => $relatedInTree->id,
            ])
            ->assertNotFound();

        $this->actingAs($this->user)
            ->deleteJson("/api/trees/{$this->tree->id}/people/{$personOutsideRouteTree->id}/relationships/father")
            ->assertNotFound();

        $relationship = Relationship::create([
            'family_tree_id' => $otherTree->id,
            'person1_id' => $personOutsideRouteTree->id,
            'person2_id' => Person::factory()->create(['family_tree_id' => $otherTree->id])->id,
            'relationship_type' => 'spouse',
        ]);

        $this->actingAs($this->user)
            ->putJson("/api/trees/{$this->tree->id}/people/{$personOutsideRouteTree->id}/relationships/{$relationship->id}", [
                'relationship_type' => 'partner',
            ])
            ->assertNotFound();
    }

    public function test_cannot_link_unrelated_person_from_another_owner_tree(): void
    {
        $personInTree = Person::factory()->create(['family_tree_id' => $this->tree->id]);

        $otherUser = User::factory()->create();
        $otherTree = FamilyTree::factory()->create(['user_id' => $otherUser->id]);
        $foreignPerson = Person::factory()->create(['family_tree_id' => $otherTree->id]);

        $this->actingAs($this->user)
            ->postJson("/api/trees/{$this->tree->id}/people/{$personInTree->id}/relationships/link", [
                'relationship_type' => 'spouse',
                'related_person_id' => $foreignPerson->id,
            ])
            ->assertForbidden();
    }

    public function test_merge_and_preview_with_trashed_foreign_owned_person_remain_forbidden(): void
    {
        $otherUser = User::factory()->create();
        $otherTree = FamilyTree::factory()->create(['user_id' => $otherUser->id]);

        $keep = Person::factory()->create(['family_tree_id' => $this->tree->id]);
        $foreignMerge = Person::factory()->create(['family_tree_id' => $otherTree->id]);
        $foreignMerge->delete();

        $this->actingAs($this->user)
            ->postJson('/api/people/merge', [
                'keep_person_id' => $keep->id,
                'merge_person_ids' => [$foreignMerge->id],
            ])
            ->assertStatus(403)
            ->assertJsonPath('message', 'You can only merge people from trees you own.');

        $this->actingAs($this->user)
            ->postJson('/api/people/merge/preview', [
                'keep_person_id' => $keep->id,
                'merge_person_ids' => [$foreignMerge->id],
            ])
            ->assertStatus(403)
            ->assertJsonPath('message', 'You can only merge people from trees you own.');
    }

    public function test_search_with_short_or_empty_query_returns_empty_results(): void
    {
        Person::factory()->create([
            'family_tree_id' => $this->tree->id,
            'first_name' => 'Alice',
        ]);

        $this->actingAs($this->user)
            ->getJson('/api/people/search?q=')
            ->assertOk()
            ->assertJsonPath('data', []);

        $this->actingAs($this->user)
            ->getJson('/api/people/search?q=a')
            ->assertOk()
            ->assertJsonPath('data', []);

        $this->actingAs($this->user)
            ->getJson('/api/people/search?q=Al')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_search_mergeable_only_excludes_shared_but_not_owned_people(): void
    {
        $owner = User::factory()->create();

        $group = UserGroup::create([
            'owner_user_id' => $owner->id,
            'name' => 'Merge access',
        ]);
        $group->members()->attach($this->user->id);

        $sharedButNotOwned = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
            'owner_user_id' => $owner->id,
            'first_name' => 'MergeableScope',
        ]);
        $sharedButNotOwned->shareGroups()->attach($group->id);

        $owned = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
            'owner_user_id' => $this->user->id,
            'first_name' => 'MergeableScope',
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/people/search?q=MergeableScope&mergeable_only=1');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertSame($owned->id, $response->json('data.0.id'));
        $this->assertNotSame($sharedButNotOwned->id, $response->json('data.0.id'));
    }
}
