<?php

namespace Tests\Feature;

use App\Models\FamilyTree;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TreeSettingsValidationTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_update_settings_with_valid_paper_size_and_orientation()
    {
        $user = User::factory()->create();
        $tree = FamilyTree::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)
            ->putJson("/api/trees/{$tree->id}", [
                'name' => 'Updated Tree',
                'description' => 'Test description',
                'settings' => [
                    'print' => [
                        'paper_size' => 'A3',
                        'orientation' => 'portrait',
                    ],
                ],
            ]);

        $response->assertOk()
            ->assertJsonPath('data.settings.print.paper_size', 'A3')
            ->assertJsonPath('data.settings.print.orientation', 'portrait')
            // Verify untouched default keys survive (not wiped by partial update)
            ->assertJsonPath('data.settings.display.theme', 'default')
            ->assertJsonPath('data.settings.layout.direction', 'vertical')
            ->assertJsonPath('data.settings.print.include_legend', true);
    }

    public function test_can_update_settings_without_settings_array()
    {
        $user = User::factory()->create();
        $tree = FamilyTree::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)
            ->putJson("/api/trees/{$tree->id}", [
                'name' => 'Updated Tree',
                'description' => 'Test description',
            ]);

        $response->assertOk();
    }

    public function test_can_update_name_without_changing_settings()
    {
        $user = User::factory()->create();
        $tree = FamilyTree::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)
            ->putJson("/api/trees/{$tree->id}", [
                'name' => 'Updated Tree',
                'description' => 'Test description',
            ]);

        $response->assertOk()
            ->assertJsonPath('data.settings.print.paper_size', 'A4')
            ->assertJsonPath('data.settings.print.orientation', 'landscape')
            ->assertJsonPath('data.settings.layout.direction', 'vertical')
            ->assertJsonPath('data.settings.display.theme', 'default')
            ->assertJsonPath('data.settings.focus_person_id', null);
    }

    public function test_cannot_update_with_invalid_paper_size()
    {
        $user = User::factory()->create();
        $tree = FamilyTree::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)
            ->putJson("/api/trees/{$tree->id}", [
                'name' => 'Updated Tree',
                'description' => 'Test description',
                'settings' => [
                    'print' => [
                        'paper_size' => 'Invalid',
                    ],
                ],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['settings.print.paper_size']);
    }

    public function test_cannot_update_with_invalid_orientation()
    {
        $user = User::factory()->create();
        $tree = FamilyTree::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)
            ->putJson("/api/trees/{$tree->id}", [
                'name' => 'Updated Tree',
                'description' => 'Test description',
                'settings' => [
                    'print' => [
                        'orientation' => 'diagonal',
                    ],
                ],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['settings.print.orientation']);
    }

    public function test_unauthorized_user_cannot_update_settings()
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $tree = FamilyTree::factory()->create(['user_id' => $owner->id]);

        $response = $this->actingAs($intruder)
            ->putJson("/api/trees/{$tree->id}", [
                'name' => 'Hacked Tree',
                'description' => 'Trying to hack',
                'settings' => [
                    'print' => [
                        'paper_size' => 'A0',
                    ],
                ],
            ]);

        $response->assertForbidden();
    }

    public function test_can_update_with_valid_paper_size_a0_and_a4()
    {
        $user = User::factory()->create();
        $tree = FamilyTree::factory()->create(['user_id' => $user->id]);

        // Test A0 (largest valid size)
        $responseA0 = $this->actingAs($user)
            ->putJson("/api/trees/{$tree->id}", [
                'name' => 'Updated Tree',
                'description' => 'Test A0',
                'settings' => [
                    'print' => [
                        'paper_size' => 'A0',
                    ],
                ],
            ]);

        $responseA0->assertOk()
            ->assertJsonPath('data.settings.print.paper_size', 'A0');

        // Test A4 (smallest valid size)
        $responseA4 = $this->actingAs($user)
            ->putJson("/api/trees/{$tree->id}", [
                'name' => 'Updated Tree',
                'description' => 'Test A4',
                'settings' => [
                    'print' => [
                        'paper_size' => 'A4',
                    ],
                ],
            ]);

        $responseA4->assertOk()
            ->assertJsonPath('data.settings.print.paper_size', 'A4');
    }
}
