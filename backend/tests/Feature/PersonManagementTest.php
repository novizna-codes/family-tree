<?php

namespace Tests\Feature;

use App\Models\FamilyTree;
use App\Models\Person;
use App\Models\User;
use App\Models\Relationship;
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
        $this->assertDatabaseHas('people', [
            'family_tree_id' => $targetTree->id,
            'first_name' => 'John',
            'last_name' => 'Doe',
        ]);
        
        // Verify it's a different ID
        $newPerson = Person::where('family_tree_id', $targetTree->id)->first();
        $this->assertNotEquals($person->id, $newPerson->id);
    }

    public function test_cannot_copy_person_if_already_exists()
    {
        $targetTree = FamilyTree::factory()->create(['user_id' => $this->user->id]);
        $person = Person::factory()->create([
            'family_tree_id' => $this->tree->id,
            'first_name' => 'John',
            'last_name' => 'Doe',
            'birth_date' => '1990-01-01',
        ]);

        // Create duplicate in target tree
        Person::factory()->create([
            'family_tree_id' => $targetTree->id,
            'first_name' => 'John',
            'last_name' => 'Doe',
            'birth_date' => '1990-01-01',
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/trees/{$this->tree->id}/people/{$person->id}/copy", [
                'target_tree_id' => $targetTree->id,
            ]);

        $response->assertStatus(422);
        $response->assertJsonPath('message', 'A person with this name and birth date already exists in the target tree');
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
}
