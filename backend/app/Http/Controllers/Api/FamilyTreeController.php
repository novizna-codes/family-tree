<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FamilyTree;
use Illuminate\Http\Request;

class FamilyTreeController extends Controller
{
    public function index(Request $request)
    {
        $trees = $request->user()->familyTrees()
            ->withCount('people')
            ->latest()
            ->get();

        return response()->json([
            'data' => $trees,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $tree = $request->user()->familyTrees()->create([
            'name' => $request->name,
            'description' => $request->description,
        ]);

        return response()->json([
            'data' => $tree,
            'message' => 'Family tree created successfully',
        ], 201);
    }

    public function show(Request $request, FamilyTree $familyTree)
    {
        $this->authorize('view', $familyTree);

        $tree = $familyTree->load([
            'people' => function ($query) {
                $query->with(['father', 'mother']);
            },
            'relationships.person1',
            'relationships.person2',
        ]);

        return response()->json([
            'data' => $tree,
        ]);
    }

    public function update(Request $request, FamilyTree $familyTree)
    {
        $this->authorize('update', $familyTree);

        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'settings' => 'nullable|array',
        ]);

        $familyTree->update($request->only(['name', 'description', 'settings']));

        return response()->json([
            'data' => $familyTree,
            'message' => 'Family tree updated successfully',
        ]);
    }

    public function destroy(Request $request, FamilyTree $familyTree)
    {
        $this->authorize('delete', $familyTree);

        $familyTree->delete();

        return response()->json([
            'message' => 'Family tree deleted successfully',
        ]);
    }

    public function visualization(Request $request, FamilyTree $familyTree)
    {
        $this->authorize('view', $familyTree);

        $focusPersonId = $request->query('focus_person_id');
        
        $people = $familyTree->people()
            ->with(['father', 'mother', 'spouseRelationships'])
            ->get();

        $relationships = $familyTree->relationships()
            ->with(['person1', 'person2'])
            ->get();

        return response()->json([
            'data' => [
                'tree' => $familyTree,
                'people' => $people,
                'relationships' => $relationships,
                'focus_person_id' => $focusPersonId,
            ],
        ]);
    }

    public function export(Request $request, FamilyTree $familyTree)
    {
        $this->authorize('view', $familyTree);

        $format = $request->query('format', 'json');

        if ($format === 'json') {
            $data = [
                'tree' => $familyTree,
                'people' => $familyTree->people,
                'relationships' => $familyTree->relationships,
                'exported_at' => now(),
            ];

            return response()->json($data);
        }

        return response()->json([
            'message' => 'Export format not supported',
        ], 400);
    }
}
