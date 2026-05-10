<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FamilyTree;
use App\Models\Person;
use App\Models\TreeEdge;
use App\Models\TreePerson;
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

        $memberPersonIds = TreePerson::query()
            ->where('tree_id', $familyTree->id)
            ->pluck('person_id');

        $people = Person::query()
            ->accessibleBy($request->user())
            ->where(function ($query) use ($memberPersonIds, $familyTree) {
                $query->whereIn('id', $memberPersonIds)
                    ->orWhere('family_tree_id', $familyTree->id);
            })
            ->with(['father', 'mother'])
            ->get();

        $tree = $familyTree->load([
            'relationships.person1',
            'relationships.person2',
        ]);
        $tree->setRelation('people', $people);

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

        $memberPersonIds = TreePerson::query()
            ->where('tree_id', $familyTree->id)
            ->pluck('person_id');

        $people = Person::query()
            ->accessibleBy($request->user())
            ->where(function ($query) use ($memberPersonIds, $familyTree) {
                $query->whereIn('id', $memberPersonIds)
                    ->orWhere('family_tree_id', $familyTree->id);
            })
            ->with(['father', 'mother'])
            ->get();

        $personIds = $people->pluck('id')->values();

        $treeEdges = TreeEdge::query()
            ->where('tree_id', $familyTree->id)
            ->whereIn('child_person_id', $personIds)
            ->whereIn('parent_role', ['father', 'mother'])
            ->get();

        if ($treeEdges->isNotEmpty()) {
            $parentIds = $treeEdges->pluck('parent_person_id')->unique()->values();
            $parentsById = Person::query()
                ->accessibleBy($request->user())
                ->whereIn('id', $parentIds)
                ->get()
                ->keyBy('id');

            foreach ($people as $person) {
                $hasTreeParentEdge = $treeEdges->contains(function (TreeEdge $edge) use ($person) {
                    return $edge->child_person_id === $person->id;
                });

                if ($hasTreeParentEdge) {
                    $person->setAttribute('father_id', null);
                    $person->setAttribute('mother_id', null);
                    $person->setRelation('father', null);
                    $person->setRelation('mother', null);
                }

                $fatherEdge = $treeEdges->first(function (TreeEdge $edge) use ($person) {
                    return $edge->child_person_id === $person->id && $edge->parent_role === 'father';
                });

                $motherEdge = $treeEdges->first(function (TreeEdge $edge) use ($person) {
                    return $edge->child_person_id === $person->id && $edge->parent_role === 'mother';
                });

                if ($fatherEdge) {
                    $person->setAttribute('father_id', $fatherEdge->parent_person_id);
                    $person->setRelation('father', $parentsById->get($fatherEdge->parent_person_id));
                }

                if ($motherEdge) {
                    $person->setAttribute('mother_id', $motherEdge->parent_person_id);
                    $person->setRelation('mother', $parentsById->get($motherEdge->parent_person_id));
                }
            }
        }

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
