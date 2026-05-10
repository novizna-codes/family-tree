<?php

namespace Tests\Feature;

use App\Models\FamilyTree;
use App\Models\Person;
use App\Models\Relationship;
use App\Models\TreePerson;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TreePeopleBackfillAndScopingTest extends TestCase
{
    use RefreshDatabase;

    public function test_backfill_migration_is_idempotent_and_creates_missing_tree_membership(): void
    {
        $user = User::factory()->create();
        $tree = FamilyTree::factory()->create(['user_id' => $user->id]);

        $person = Person::factory()->create([
            'family_tree_id' => $tree->id,
            'owner_user_id' => $user->id,
        ]);

        $this->assertDatabaseMissing('tree_people', [
            'tree_id' => $tree->id,
            'person_id' => $person->id,
        ]);

        $migration = include base_path('database/migrations/2026_05_10_140000_backfill_tree_people_from_legacy_people.php');
        $migration->up();
        $migration->up();

        $this->assertSame(
            1,
            TreePerson::query()->where('tree_id', $tree->id)->where('person_id', $person->id)->count()
        );
    }

    public function test_index_uses_tree_people_as_primary_with_legacy_fallback(): void
    {
        $user = User::factory()->create();
        $tree = FamilyTree::factory()->create(['user_id' => $user->id]);
        $otherTree = FamilyTree::factory()->create(['user_id' => $user->id]);

        $legacyFallbackPerson = Person::factory()->create([
            'family_tree_id' => $tree->id,
            'owner_user_id' => $user->id,
            'first_name' => 'Legacy',
        ]);

        $membershipPrimaryPerson = Person::factory()->create([
            'family_tree_id' => $otherTree->id,
            'owner_user_id' => $user->id,
            'first_name' => 'Membership',
        ]);
        TreePerson::create([
            'tree_id' => $tree->id,
            'person_id' => $membershipPrimaryPerson->id,
        ]);

        $inBothPerson = Person::factory()->create([
            'family_tree_id' => $tree->id,
            'owner_user_id' => $user->id,
            'first_name' => 'Both',
        ]);
        TreePerson::create([
            'tree_id' => $tree->id,
            'person_id' => $inBothPerson->id,
        ]);

        $response = $this->actingAs($user)
            ->getJson("/api/trees/{$tree->id}/people");

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id');

        $this->assertTrue($ids->contains($legacyFallbackPerson->id));
        $this->assertTrue($ids->contains($membershipPrimaryPerson->id));
        $this->assertTrue($ids->contains($inBothPerson->id));
        $this->assertSame(1, $ids->filter(fn (string $id) => $id === $inBothPerson->id)->count());
    }

    public function test_merge_preview_reports_cross_tree_impact_with_tree_filter(): void
    {
        $user = User::factory()->create();
        $treeA = FamilyTree::factory()->create(['user_id' => $user->id]);
        $treeB = FamilyTree::factory()->create(['user_id' => $user->id]);

        $keep = Person::factory()->create([
            'family_tree_id' => $treeA->id,
            'owner_user_id' => $user->id,
        ]);

        $merge = Person::factory()->create([
            'family_tree_id' => $treeA->id,
            'owner_user_id' => $user->id,
        ]);

        $treeBPerson = Person::factory()->create([
            'family_tree_id' => $treeB->id,
            'owner_user_id' => $user->id,
        ]);

        Relationship::create([
            'family_tree_id' => $treeB->id,
            'person1_id' => $merge->id,
            'person2_id' => $treeBPerson->id,
            'relationship_type' => 'spouse',
        ]);

        $this->actingAs($user)
            ->postJson('/api/people/merge/preview', [
                'keep_person_id' => $keep->id,
                'merge_person_ids' => [$merge->id],
            ])
            ->assertOk()
            ->assertJsonPath('data.impacted_tree_count', 2)
            ->assertJsonPath('data.has_cross_tree_impact', true)
            ->assertJsonPath('data.impacted_relationship_tree_count', 1);

        $this->actingAs($user)
            ->postJson('/api/people/merge/preview', [
                'keep_person_id' => $keep->id,
                'merge_person_ids' => [$merge->id],
                'tree_id' => $treeA->id,
            ])
            ->assertOk()
            ->assertJsonPath('data.impacted_tree_count', 1)
            ->assertJsonPath('data.has_cross_tree_impact', false)
            ->assertJsonPath('data.impacted_legacy_tree_count', 1);
    }
}
