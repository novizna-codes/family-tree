<?php

namespace Tests\Feature;

use App\Models\FamilyTree;
use App\Models\Person;
use App\Models\User;
use App\Models\Relationship;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RelationshipTest extends TestCase
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

    public function test_can_create_child_with_parent_role_for_gender_o()
    {
        $parent = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
            'gender' => 'O'
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/trees/{$this->tree->id}/people/{$parent->id}/relationships", [
                'relationship_type' => 'child',
                'first_name' => 'Child',
                'parent_role' => 'father'
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('people', [
            'first_name' => 'Child',
            'father_id' => $parent->id
        ]);
    }

    public function test_prevents_circular_parent_relationship()
    {
        $person1 = Person::factory()->create(['family_tree_id' => $this->tree->id]);
        $person2 = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
            'father_id' => $person1->id
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/trees/{$this->tree->id}/people/{$person1->id}/relationships/link", [
                'relationship_type' => 'parent',
                'related_person_id' => $person2->id,
                'relationship_role' => 'father'
            ]);

        $response->assertStatus(422);
        $response->assertJsonPath('message', 'Cannot link this person as parent: it would create a circular relationship (this person is already an ancestor of the potential parent).');
    }

    public function test_prevents_circular_child_relationship()
    {
        $person1 = Person::factory()->create(['family_tree_id' => $this->tree->id]);
        $person2 = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
            'father_id' => $person1->id
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/trees/{$this->tree->id}/people/{$person2->id}/relationships/link", [
                'relationship_type' => 'child',
                'related_person_id' => $person1->id,
                'parent_role' => 'father'
            ]);

        $response->assertStatus(422);
        $response->assertJsonPath('message', 'Cannot link this person as child: it would create a circular relationship.');
    }

    public function test_prevents_force_deletion_of_person_with_children()
    {
        $parent = Person::factory()->create(['family_tree_id' => $this->tree->id]);
        Person::factory()->create([
            'family_tree_id' => $this->tree->id,
            'father_id' => $parent->id
        ]);

        // Regular soft-delete should be allowed now as it preserves lineage
        $response = $this->actingAs($this->user)
            ->deleteJson("/api/trees/{$this->tree->id}/people/{$parent->id}");
        
        $response->assertStatus(200);
        $this->assertSoftDeleted('people', ['id' => $parent->id]);

        // Force delete should still be prevented if children exist
        $this->expectException(\Exception::class);
        $parent->forceDelete();
    }

    public function test_relationships_persist_on_soft_delete_and_remove_on_force_delete()
    {
        $person1 = Person::factory()->create(['family_tree_id' => $this->tree->id]);
        $person2 = Person::factory()->create(['family_tree_id' => $this->tree->id]);
        
        $relationship = $this->tree->relationships()->create([
            'person1_id' => $person1->id,
            'person2_id' => $person2->id,
            'relationship_type' => 'spouse'
        ]);

        $this->assertDatabaseHas('relationships', ['id' => $relationship->id]);

        $this->actingAs($this->user)
            ->deleteJson("/api/trees/{$this->tree->id}/people/{$person1->id}");

        $this->assertSoftDeleted('people', ['id' => $person1->id]);
        // Relationship should still exist to preserve lineage
        $this->assertDatabaseHas('relationships', ['id' => $relationship->id]);
        
        // Relationship should be deleted on force delete
        $person1->forceDelete();
        $this->assertDatabaseMissing('relationships', ['id' => $relationship->id]);
    }
}
