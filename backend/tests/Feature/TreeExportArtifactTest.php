<?php

namespace Tests\Feature;

use App\Models\FamilyTree;
use App\Models\TreeExportArtifact;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TreeExportArtifactTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_owner_can_upload_and_list_artifact()
    {
        Storage::fake('local');

        $user = User::factory()->create();
        $tree = FamilyTree::factory()->create(['user_id' => $user->id]);

        $file = UploadedFile::fake()->create('family-tree.pdf', 100, 'application/pdf');

        $uploadResponse = $this->actingAs($user)
            ->postJson("/api/trees/{$tree->id}/export-artifacts", [
                'file' => $file,
                'metadata' => ['paper_size' => 'A3'],
            ]);

        $uploadResponse->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.tree_id', $tree->id);

        $artifact = TreeExportArtifact::query()->firstOrFail();
        Storage::disk('local')->assertExists($artifact->file_path);

        $listResponse = $this->actingAs($user)
            ->getJson("/api/trees/{$tree->id}/export-artifacts");

        $listResponse->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data');
    }

    public function test_unauthorized_user_gets_403_on_list_and_upload()
    {
        Storage::fake('local');

        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $tree = FamilyTree::factory()->create(['user_id' => $owner->id]);

        $listResponse = $this->actingAs($intruder)
            ->getJson("/api/trees/{$tree->id}/export-artifacts");

        $listResponse->assertForbidden();

        $file = UploadedFile::fake()->create('artifact.pdf', 10, 'application/pdf');

        $uploadResponse = $this->actingAs($intruder)
            ->postJson("/api/trees/{$tree->id}/export-artifacts", [
                'file' => $file,
            ]);

        $uploadResponse->assertForbidden();
    }

    public function test_owner_can_download_own_artifact_and_receives_200()
    {
        Storage::fake('local');

        $user = User::factory()->create();
        $tree = FamilyTree::factory()->create(['user_id' => $user->id]);

        $path = "tree-exports/{$tree->id}/export.pdf";
        Storage::disk('local')->put($path, 'pdf-content');

        $artifact = TreeExportArtifact::create([
            'tree_id' => $tree->id,
            'user_id' => $user->id,
            'file_name' => 'export.pdf',
            'file_path' => $path,
            'mime_type' => 'application/pdf',
            'file_size_bytes' => strlen('pdf-content'),
            'checksum_sha256' => hash('sha256', 'pdf-content'),
            'metadata' => ['orientation' => 'landscape'],
        ]);

        $response = $this->actingAs($user)
            ->get("/api/trees/{$tree->id}/export-artifacts/{$artifact->id}/download");

        $response->assertStatus(200);
    }

    public function test_cannot_download_artifact_through_different_tree_id_gets_404()
    {
        Storage::fake('local');

        $user = User::factory()->create();
        $treeA = FamilyTree::factory()->create(['user_id' => $user->id]);
        $treeB = FamilyTree::factory()->create(['user_id' => $user->id]);

        $path = "tree-exports/{$treeA->id}/export.pdf";
        Storage::disk('local')->put($path, 'pdf-content');

        $artifact = TreeExportArtifact::create([
            'tree_id' => $treeA->id,
            'user_id' => $user->id,
            'file_name' => 'export.pdf',
            'file_path' => $path,
            'mime_type' => 'application/pdf',
            'file_size_bytes' => strlen('pdf-content'),
            'checksum_sha256' => hash('sha256', 'pdf-content'),
        ]);

        $response = $this->actingAs($user)
            ->get("/api/trees/{$treeB->id}/export-artifacts/{$artifact->id}/download");

        $response->assertStatus(404);
    }

    public function test_owner_can_delete_artifact_and_file_removed()
    {
        Storage::fake('local');

        $user = User::factory()->create();
        $tree = FamilyTree::factory()->create(['user_id' => $user->id]);

        $path = "tree-exports/{$tree->id}/export.pdf";
        Storage::disk('local')->put($path, 'pdf-content');

        $artifact = TreeExportArtifact::create([
            'tree_id' => $tree->id,
            'user_id' => $user->id,
            'file_name' => 'export.pdf',
            'file_path' => $path,
            'mime_type' => 'application/pdf',
            'file_size_bytes' => strlen('pdf-content'),
            'checksum_sha256' => hash('sha256', 'pdf-content'),
        ]);

        Storage::disk('local')->assertExists($path);

        $response = $this->actingAs($user)
            ->deleteJson("/api/trees/{$tree->id}/export-artifacts/{$artifact->id}");

        $response->assertOk()
            ->assertJsonPath('success', true);

        Storage::disk('local')->assertMissing($path);
        $this->assertDatabaseMissing('tree_export_artifacts', ['id' => $artifact->id]);
    }

    public function test_upload_validation_fails_for_missing_file()
    {
        $user = User::factory()->create();
        $tree = FamilyTree::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)
            ->postJson("/api/trees/{$tree->id}/export-artifacts", [
                'metadata' => ['paper_size' => 'A4'],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    public function test_upload_svg_succeeds()
    {
        Storage::fake('local');

        $user = User::factory()->create();
        $tree = FamilyTree::factory()->create(['user_id' => $user->id]);

        $file = UploadedFile::fake()->create('family-tree.svg', 100, 'image/svg+xml');

        $response = $this->actingAs($user)
            ->postJson("/api/trees/{$tree->id}/export-artifacts", [
                'file' => $file,
                'metadata' => [
                    'paper_size' => 'A2',
                    'dimensions_mm' => [
                        'width' => 420,
                        'height' => 594,
                    ],
                ],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.mime_type', 'image/svg+xml')
            ->assertJsonPath('data.metadata.dimensions_mm.width', 420)
            ->assertJsonPath('data.metadata.dimensions_mm.height', 594);
    }

    public function test_upload_invalid_mime_type_fails_with_422()
    {
        Storage::fake('local');

        $user = User::factory()->create();
        $tree = FamilyTree::factory()->create(['user_id' => $user->id]);

        $file = UploadedFile::fake()->create('notes.txt', 10, 'text/plain');

        $response = $this->actingAs($user)
            ->postJson("/api/trees/{$tree->id}/export-artifacts", [
                'file' => $file,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }
}
