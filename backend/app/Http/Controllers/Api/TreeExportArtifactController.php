<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FamilyTree;
use App\Models\TreeExportArtifact;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TreeExportArtifactController extends Controller
{
    public function index(Request $request, FamilyTree $familyTree)
    {
        $this->authorize('view', $familyTree);

        $artifacts = $familyTree->exportArtifacts()
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $artifacts,
            'message' => 'Export artifacts retrieved successfully.',
        ]);
    }

    public function store(Request $request, FamilyTree $familyTree)
    {
        $this->authorize('update', $familyTree);

        $validated = $request->validate([
            'file' => 'required|file|mimetypes:application/pdf,image/svg+xml|max:51200',
            'metadata' => 'nullable|array',
            'metadata.paper_size' => 'nullable|string',
            'metadata.orientation' => 'nullable|string',
            'metadata.dimensions_mm' => 'nullable|array',
            'metadata.dimensions_mm.width' => 'nullable|numeric',
            'metadata.dimensions_mm.height' => 'nullable|numeric',
            'metadata.bleed_mm' => 'nullable|numeric',
            'metadata.safe_margin_mm' => 'nullable|numeric',
            'metadata.crop_marks' => 'nullable|boolean',
            'metadata.export_mode' => 'nullable|string',
            'metadata.tiled' => 'nullable|boolean',
            'metadata.tile_overlap_mm' => 'nullable|numeric',
            'metadata.scale' => 'nullable|numeric',
            'metadata.include_legend' => 'nullable|boolean',
        ]);

        $file = $validated['file'];
        $filePath = $file->store("tree-exports/{$familyTree->id}", 'local');

        $artifact = $familyTree->exportArtifacts()->create([
            'user_id' => $request->user()->id,
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $filePath,
            'mime_type' => $file->getMimeType() ?? 'application/octet-stream',
            'file_size_bytes' => $file->getSize(),
            'checksum_sha256' => hash_file('sha256', $file->getRealPath()),
            'metadata' => $validated['metadata'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'data' => $artifact,
            'message' => 'Export artifact uploaded successfully.',
        ], 201);
    }

    public function download(Request $request, FamilyTree $familyTree, TreeExportArtifact $artifact)
    {
        $this->authorize('view', $familyTree);

        if ($artifact->tree_id !== $familyTree->id) {
            abort(404);
        }

        return Storage::disk('local')->download(
            $artifact->file_path,
            $artifact->file_name,
            ['Content-Type' => $artifact->mime_type]
        );
    }

    public function destroy(Request $request, FamilyTree $familyTree, TreeExportArtifact $artifact)
    {
        $this->authorize('update', $familyTree);

        if ($artifact->tree_id !== $familyTree->id) {
            abort(404);
        }

        if (Storage::disk('local')->exists($artifact->file_path)) {
            Storage::disk('local')->delete($artifact->file_path);
        }

        $artifact->delete();

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => 'Export artifact deleted successfully.',
        ]);
    }
}
