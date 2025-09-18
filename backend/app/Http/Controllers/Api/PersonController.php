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
            ->with(['father', 'mother'])
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

    /**
     * Unified method to create a new person and establish a relationship
     */
    public function manageRelationship(Request $request, FamilyTree $familyTree, Person $person)
    {
        $this->authorize('update', $familyTree);

        $request->validate([
            'relationship_type' => 'required|in:parent,child,spouse',
            'relationship_role' => 'nullable|string', // father/mother for parent, spouse/partner/etc for spouse
        ]);

        $relationshipType = $request->relationship_type;
        $relationshipRole = $request->relationship_role ?? null;

        switch ($relationshipType) {
            case 'parent':
                return $this->handleParentRelationship($request, $familyTree, $person, $relationshipRole);
            case 'child':
                return $this->handleChildRelationship($request, $familyTree, $person);
            case 'spouse':
                return $this->handleSpouseRelationship($request, $familyTree, $person, $relationshipRole);
            default:
                return response()->json(['message' => 'Invalid relationship type'], 422);
        }
    }

    /**
     * Unified method to link existing people in a relationship
     */
    public function linkRelationship(Request $request, FamilyTree $familyTree, Person $person)
    {
        $this->authorize('update', $familyTree);

        $validated = $request->validate([
            'relationship_type' => 'required|in:parent,child,spouse',
            'relationship_role' => 'nullable|string',
            'related_person_id' => 'required|uuid|exists:people,id',
        ]);

        $relationshipType = $validated['relationship_type'];
        $relationshipRole = $validated['relationship_role'] ?? null;
        $relatedPersonId = $validated['related_person_id'];

        switch ($relationshipType) {
            case 'parent':
                return $this->handleParentLink($request, $familyTree, $person, $relatedPersonId, $relationshipRole);
            case 'child':
                return $this->handleChildLink($request, $familyTree, $person, $relatedPersonId);
            case 'spouse':
                return $this->handleSpouseLink($request, $familyTree, $person, $relatedPersonId, $relationshipRole);
            default:
                return response()->json(['message' => 'Invalid relationship type'], 422);
        }
    }

    /**
     * Remove a relationship between two people
     */
    public function removeRelationship(Request $request, FamilyTree $familyTree, Person $person, $relationshipId)
    {
        $this->authorize('update', $familyTree);

        // Find relationship where this person is involved
        $relationship = $familyTree->relationships()
            ->where('id', $relationshipId)
            ->where(function ($query) use ($person) {
                $query->where('person1_id', $person->id)
                      ->orWhere('person2_id', $person->id);
            })
            ->first();

        if (!$relationship) {
            return response()->json([
                'message' => 'Relationship not found',
            ], 404);
        }

        $relationship->delete();

        return response()->json([
            'message' => 'Relationship removed successfully',
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

    /**
     * Handle creating a new parent and establishing relationship
     */
    private function handleParentRelationship(Request $request, FamilyTree $familyTree, Person $person, ?string $relationshipRole)
    {
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
        ]);

        // Determine parent type from role or validate it's provided
        $parentType = $relationshipRole;
        if (!in_array($parentType, ['father', 'mother'])) {
            return response()->json(['message' => 'relationship_role must be either "father" or "mother" for parent relationships'], 422);
        }

        $parentData = $this->processPersonData($validated);
        $parentData['family_tree_id'] = $familyTree->id;

        $parent = Person::create($parentData);

        $person->update([
            $parentType . '_id' => $parent->id
        ]);

        return response()->json([
            'data' => $parent,
            'message' => 'Parent added successfully',
        ], 201);
    }

    /**
     * Handle creating a new child and establishing relationship
     */
    private function handleChildRelationship(Request $request, FamilyTree $familyTree, Person $person)
    {
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
        ]);

        $childData = $this->processPersonData($validated);
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

    /**
     * Handle creating a new spouse and establishing relationship
     */
    private function handleSpouseRelationship(Request $request, FamilyTree $familyTree, Person $person, ?string $relationshipRole)
    {
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
            // Relationship metadata
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'marriage_place' => 'nullable|string|max:255',
            'relationship_notes' => 'nullable|string',
        ]);

        // Default relationship role if not provided
        $relationshipType = $relationshipRole ?: 'spouse';
        if (!in_array($relationshipType, ['spouse', 'partner', 'divorced', 'separated'])) {
            return response()->json(['message' => 'relationship_role must be one of: spouse, partner, divorced, separated'], 422);
        }

        // Extract person data (remove relationship fields)
        $spouseData = collect($validated)->except([
            'start_date', 'end_date', 'marriage_place', 'relationship_notes'
        ])->toArray();

        $spouseData = $this->processPersonData($spouseData);
        $spouseData['family_tree_id'] = $familyTree->id;

        // Create the spouse
        $spouse = $familyTree->people()->create($spouseData);

        // Create the relationship
        $familyTree->relationships()->create([
            'person1_id' => $person->id,
            'person2_id' => $spouse->id,
            'relationship_type' => $relationshipType,
            'start_date' => $validated['start_date'] ?? null,
            'end_date' => $validated['end_date'] ?? null,
            'marriage_place' => $validated['marriage_place'] ?? null,
            'notes' => $validated['relationship_notes'] ?? null,
        ]);

        return response()->json([
            'data' => $spouse->load('relationshipsAsPerson1', 'relationshipsAsPerson2'),
            'message' => 'Spouse added successfully',
        ], 201);
    }

    /**
     * Handle linking existing person as parent
     */
    private function handleParentLink(Request $request, FamilyTree $familyTree, Person $person, string $parentId, ?string $relationshipRole)
    {
        $parent = Person::findOrFail($parentId);

        // Ensure parent belongs to same family tree
        if ($parent->family_tree_id !== $familyTree->id) {
            return response()->json([
                'message' => 'Parent must belong to the same family tree',
            ], 422);
        }

        // Determine parent type from role
        $parentType = $relationshipRole;
        if (!in_array($parentType, ['father', 'mother'])) {
            return response()->json(['message' => 'relationship_role must be either "father" or "mother" for parent relationships'], 422);
        }

        // Update person with new parent
        $person->update([
            $parentType . '_id' => $parent->id
        ]);

        return response()->json([
            'data' => $person->load(['father', 'mother']),
            'message' => 'Parent linked successfully',
        ]);
    }

    /**
     * Handle linking existing person as child
     */
    private function handleChildLink(Request $request, FamilyTree $familyTree, Person $person, string $childId)
    {
        $child = Person::findOrFail($childId);

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

    /**
     * Handle linking existing person as spouse
     */
    private function handleSpouseLink(Request $request, FamilyTree $familyTree, Person $person, string $spouseId, ?string $relationshipRole)
    {
        $validated = $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'marriage_place' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $spouse = Person::findOrFail($spouseId);

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

        // Default relationship role if not provided
        $relationshipType = $relationshipRole ?: 'spouse';
        if (!in_array($relationshipType, ['spouse', 'partner', 'divorced', 'separated'])) {
            return response()->json(['message' => 'relationship_role must be one of: spouse, partner, divorced, separated'], 422);
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
            'relationship_type' => $relationshipType,
            'start_date' => $validated['start_date'] ?? null,
            'end_date' => $validated['end_date'] ?? null,
            'marriage_place' => $validated['marriage_place'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'data' => $relationship->load('person1', 'person2'),
            'message' => 'Spouse relationship created successfully',
        ], 201);
    }
}
