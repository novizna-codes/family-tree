<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FamilyTree;
use App\Models\Person;
use App\Models\Relationship;
use Illuminate\Http\Request;

class PersonController extends Controller
{
    public function index(Request $request, FamilyTree $familyTree)
    {
        $this->authorize('view', $familyTree);

        $people = $familyTree->people()
            ->with(['father', 'mother', 'relationshipsAsPerson1', 'relationshipsAsPerson2'])
            ->get();

        return response()->json([
            'data' => $people,
        ]);
    }

    public function store(Request $request, FamilyTree $familyTree)
    {
        $this->authorize('update', $familyTree);

        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'maiden_name' => 'nullable|string|max:255',
            'nickname' => 'nullable|string|max:255',
            'gender' => 'nullable|in:M,F,O',
            'birth_date' => 'nullable|date',
            'death_date' => 'nullable|date|after_or_equal:birth_date',
            'birth_place' => 'nullable|string|max:255',
            'death_place' => 'nullable|string|max:255',
            'father_id' => 'nullable|uuid|exists:people,id',
            'mother_id' => 'nullable|uuid|exists:people,id',
            'notes' => 'nullable|string',
            'is_deceased' => 'nullable|boolean',
        ]);

        $validated = $this->processPersonData($validated);

        $person = $familyTree->people()->create($validated);

        return response()->json([
            'data' => $person->load(['father', 'mother']),
            'message' => 'Person created successfully',
        ], 201);
    }

    public function show(Request $request, FamilyTree $familyTree, Person $person)
    {
        $this->authorize('view', $familyTree);

        if ($person->family_tree_id !== $familyTree->id) {
            abort(404);
        }

        $person->load([
            'father',
            'mother',
            'children',
            'spouseRelationships.person1',
            'spouseRelationships.person2',
        ]);

        return response()->json([
            'data' => $person,
        ]);
    }

    public function update(Request $request, FamilyTree $familyTree, Person $person)
    {
        $this->authorize('update', $familyTree);

        if ($person->family_tree_id !== $familyTree->id) {
            abort(404);
        }

        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'maiden_name' => 'nullable|string|max:255',
            'nickname' => 'nullable|string|max:255',
            'gender' => 'nullable|in:M,F,O',
            'birth_date' => 'nullable|date',
            'death_date' => 'nullable|date|after_or_equal:birth_date',
            'birth_place' => 'nullable|string|max:255',
            'death_place' => 'nullable|string|max:255',
            'father_id' => 'nullable|uuid|exists:people,id',
            'mother_id' => 'nullable|uuid|exists:people,id',
            'notes' => 'nullable|string',
            'is_deceased' => 'nullable|boolean',
        ]);

        $validated = $this->processPersonData($validated);

        $person->update($validated);

        return response()->json([
            'data' => $person->load(['father', 'mother']),
            'message' => 'Person updated successfully',
        ]);
    }

    public function destroy(Request $request, FamilyTree $familyTree, Person $person)
    {
        $this->authorize('delete', $familyTree);

        if ($person->family_tree_id !== $familyTree->id) {
            abort(404);
        }

        $person->delete();

        return response()->json([
            'message' => 'Person deleted successfully',
        ]);
    }

    public function addParent(Request $request, FamilyTree $familyTree, Person $person)
    {
        $this->authorize('update', $familyTree);

        $validated = $request->validate([
            'parent_type' => 'required|in:father,mother',
            'first_name' => 'required|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'gender' => 'nullable|in:M,F,O',
            'birth_date' => 'nullable|date',
            'death_date' => 'nullable|date|after_or_equal:birth_date',
            'death_place' => 'nullable|string|max:255',
            'is_deceased' => 'nullable|boolean',
        ]);

        $parentData = $validated;
        unset($parentData['parent_type']);

        $parentData = $this->processPersonData($parentData);
        $parentData['family_tree_id'] = $familyTree->id;

        $parent = Person::create($parentData);

        $person->update([
            $validated['parent_type'] . '_id' => $parent->id
        ]);

        return response()->json([
            'data' => $parent,
            'message' => 'Parent added successfully',
        ], 201);
    }

    public function addChild(Request $request, FamilyTree $familyTree, Person $person)
    {
        $this->authorize('update', $familyTree);

        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'gender' => 'nullable|in:M,F,O',
            'birth_date' => 'nullable|date',
            'death_date' => 'nullable|date|after_or_equal:birth_date',
            'death_place' => 'nullable|string|max:255',
            'is_deceased' => 'nullable|boolean',
        ]);

        $childData = $validated;

        $childData = $this->processPersonData($childData);
        $childData['family_tree_id'] = $familyTree->id;

        if ($person->gender === 'M') {
            $childData['father_id'] = $person->id;
        } elseif ($person->gender === 'F') {
            $childData['mother_id'] = $person->id;
        }

        $child = Person::create($childData);

        return response()->json([
            'data' => $child,
            'message' => 'Child added successfully',
        ], 201);
    }

    public function linkParent(Request $request, FamilyTree $familyTree, Person $person)
    {
        $this->authorize('update', $familyTree);

        $request->validate([
            'parent_id' => 'required|uuid|exists:people,id',
            'parent_type' => 'required|in:father,mother',
        ]);

        $parent = Person::findOrFail($request->parent_id);

        // Ensure parent belongs to same family tree
        if ($parent->family_tree_id !== $familyTree->id) {
            return response()->json([
                'message' => 'Parent must belong to the same family tree',
            ], 422);
        }

        // Update person with new parent
        $person->update([
            $request->parent_type . '_id' => $parent->id
        ]);

        return response()->json([
            'data' => $person->load(['father', 'mother']),
            'message' => 'Parent linked successfully',
        ]);
    }

    public function linkChild(Request $request, FamilyTree $familyTree, Person $person)
    {
        $this->authorize('update', $familyTree);

        $request->validate([
            'child_id' => 'required|uuid|exists:people,id',
        ]);

        $child = Person::findOrFail($request->child_id);

        // Ensure child belongs to same family tree
        if ($child->family_tree_id !== $familyTree->id) {
            return response()->json([
                'message' => 'Child must belong to the same family tree',
            ], 422);
        }

        // Update child with this person as parent based on gender
        if ($person->gender === 'M') {
            $child->update(['father_id' => $person->id]);
        } elseif ($person->gender === 'F') {
            $child->update(['mother_id' => $person->id]);
        } else {
            return response()->json([
                'message' => 'Person must have gender specified to be linked as parent',
            ], 422);
        }

        return response()->json([
            'data' => $child->load(['father', 'mother']),
            'message' => 'Child linked successfully',
        ]);
    }

    public function addSpouse(Request $request, FamilyTree $familyTree, Person $person)
    {
        $this->authorize('update', $familyTree);

        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'maiden_name' => 'nullable|string|max:255',
            'nickname' => 'nullable|string|max:255',
            'gender' => 'nullable|in:M,F,O',
            'birth_date' => 'nullable|date',
            'death_date' => 'nullable|date|after_or_equal:birth_date',
            'birth_place' => 'nullable|string|max:255',
            'death_place' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'is_deceased' => 'nullable|boolean',
            // Relationship fields
            'relationship_type' => 'required|in:spouse,partner,divorced,separated',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'marriage_place' => 'nullable|string|max:255',
            'relationship_notes' => 'nullable|string',
        ]);

        // Extract person data (remove relationship fields)
        $spouseData = collect($validated)->except([
            'relationship_type', 'start_date', 'end_date', 'marriage_place', 'relationship_notes'
        ])->toArray();

        $spouseData = $this->processPersonData($spouseData);
        $spouseData['family_tree_id'] = $familyTree->id;

        // Create the spouse
        $spouse = $familyTree->people()->create($spouseData);

        // Create the relationship
        $familyTree->relationships()->create([
            'person1_id' => $person->id,
            'person2_id' => $spouse->id,
            'relationship_type' => $validated['relationship_type'],
            'start_date' => $validated['start_date'] ?? null,
            'end_date' => $validated['end_date'] ?? null,
            'marriage_place' => $validated['marriage_place'] ?? null,
            'notes' => $validated['relationship_notes'] ?? null,
        ]);

        return response()->json([
            'data' => $spouse->load(['father', 'mother']),
            'message' => 'Spouse added successfully',
        ], 201);
    }

    public function linkSpouse(Request $request, FamilyTree $familyTree, Person $person)
    {
        $this->authorize('update', $familyTree);

        $validated = $request->validate([
            'spouse_id' => 'required|uuid|exists:people,id',
            'relationship_type' => 'required|in:spouse,partner,divorced,separated',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'marriage_place' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $spouse = Person::findOrFail($validated['spouse_id']);

        // Ensure spouse belongs to same family tree
        if ($spouse->family_tree_id !== $familyTree->id) {
            return response()->json([
                'message' => 'Spouse must belong to the same family tree',
            ], 422);
        }

        // Prevent self-relationships
        if ($spouse->id === $person->id) {
            return response()->json([
                'message' => 'A person cannot be in a relationship with themselves',
            ], 422);
        }

        // Check if relationship already exists
        $existingRelationship = $familyTree->relationships()
            ->where(function ($query) use ($person, $spouse) {
                $query->where('person1_id', $person->id)
                      ->where('person2_id', $spouse->id);
            })
            ->orWhere(function ($query) use ($person, $spouse) {
                $query->where('person1_id', $spouse->id)
                      ->where('person2_id', $person->id);
            })
            ->where('relationship_type', $validated['relationship_type'])
            ->first();

        if ($existingRelationship) {
            return response()->json([
                'message' => 'This relationship already exists',
            ], 422);
        }

        // Create the relationship
        $relationship = $familyTree->relationships()->create([
            'person1_id' => $person->id,
            'person2_id' => $spouse->id,
            'relationship_type' => $validated['relationship_type'],
            'start_date' => $validated['start_date'] ?? null,
            'end_date' => $validated['end_date'] ?? null,
            'marriage_place' => $validated['marriage_place'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'data' => $relationship->load(['person1', 'person2']),
            'message' => 'Spouse linked successfully',
        ]);
    }

    public function removeSpouse(Request $request, FamilyTree $familyTree, Person $person, Person $spouse)
    {
        $this->authorize('update', $familyTree);

        // Find the relationship between these two people
        $relationship = $familyTree->relationships()
            ->where(function ($query) use ($person, $spouse) {
                $query->where('person1_id', $person->id)
                      ->where('person2_id', $spouse->id);
            })
            ->orWhere(function ($query) use ($person, $spouse) {
                $query->where('person1_id', $spouse->id)
                      ->where('person2_id', $person->id);
            })
            ->first();

        if (!$relationship) {
            return response()->json([
                'message' => 'Relationship not found',
            ], 404);
        }

        $relationship->delete();

        return response()->json([
            'message' => 'Spouse relationship removed successfully',
        ]);
    }

    /**
     * Helper method to handle is_deceased logic for person data
     */
    private function processPersonData(array $personData): array
    {
        // Handle is_deceased logic
        if (isset($personData['is_deceased'])) {
            if (!$personData['is_deceased']) {
                $personData['death_date'] = null;
                $personData['death_place'] = null;
            }
        }

        return $personData;
    }
}
