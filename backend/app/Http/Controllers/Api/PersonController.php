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

        try {
            $person->delete();
            return response()->json([
                'message' => 'Person deleted successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
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
        $relationshipRole = $request->relationship_role ?? $request->parent_role ?? null;

        switch ($relationshipType) {
            case 'parent':
                return $this->handleParentRelationship($request, $familyTree, $person, $relationshipRole);
            case 'child':
                return $this->handleChildRelationship($request, $familyTree, $person, $relationshipRole);
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
        $relationshipRole = $validated['relationship_role'] ?? $request->parent_role ?? null;
        $relatedPersonId = $validated['related_person_id'];

        switch ($relationshipType) {
            case 'parent':
                return $this->handleParentLink($request, $familyTree, $person, $relatedPersonId, $relationshipRole);
            case 'child':
                return $this->handleChildLink($request, $familyTree, $person, $relatedPersonId, $relationshipRole);
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

        // Check if relationshipId is a parent type (father/mother)
        if (in_array($relationshipId, ['father', 'mother'])) {
            $person->update([$relationshipId . '_id' => null]);
            return response()->json([
                'message' => ucfirst($relationshipId) . ' unlinked successfully',
            ]);
        }

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
     * Update metadata for a relationship
     */
    public function updateRelationship(Request $request, FamilyTree $familyTree, Person $person, Relationship $relationship)
    {
        $this->authorize('update', $familyTree);

        if ($relationship->family_tree_id !== $familyTree->id) {
            abort(403);
        }

        $validated = $request->validate([
            'relationship_type' => 'required|in:spouse,partner,divorced,separated',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'marriage_place' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $relationship->update($validated);

        return response()->json([
            'data' => $relationship->load(['person1', 'person2']),
            'message' => 'Relationship updated successfully',
        ]);
    }

    /**
     * Copy a person's information to another family tree
     */
    public function copyToTree(Request $request, FamilyTree $familyTree, Person $person)
    {
        $this->authorize('view', $familyTree);

        $validated = $request->validate([
            'target_tree_id' => 'required|uuid|exists:family_trees,id',
        ]);

        $targetTree = FamilyTree::findOrFail($validated['target_tree_id']);
        $this->authorize('update', $targetTree);

        // Check if person already exists in the target tree (optional simple check)
        $exists = Person::where('family_tree_id', $targetTree->id)
            ->where('first_name', $person->first_name)
            ->where('last_name', $person->last_name)
            ->where('birth_date', $person->birth_date)
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'A person with this name and birth date already exists in the target tree',
            ], 422);
        }

        // Duplicate the person
        $newPerson = $person->replicate([
            'father_id',
            'mother_id',
            'family_tree_id',
            'created_at',
            'updated_at',
            'deleted_at'
        ]);
        
        $newPerson->family_tree_id = $targetTree->id;
        $newPerson->save();

        return response()->json([
            'data' => $newPerson,
            'message' => 'Person copied successfully to ' . $targetTree->name,
        ], 201);
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
    private function handleChildRelationship(Request $request, FamilyTree $familyTree, Person $person, ?string $relationshipRole)
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

        // Determine the role of the current person ($person) as a parent of the new child
        $parentRole = $relationshipRole ?: $request->parent_role;
        
        if (!$parentRole) {
            if ($person->gender === 'M') {
                $parentRole = 'father';
            } elseif ($person->gender === 'F') {
                $parentRole = 'mother';
            } else {
                return response()->json(['message' => 'Please specify if the current person is the father or mother'], 422);
            }
        }

        if (!in_array($parentRole, ['father', 'mother'])) {
            return response()->json(['message' => 'parent_role must be either "father" or "mother"'], 422);
        }

        $childData[$parentRole . '_id'] = $person->id;

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

        // Check for circular relationship
        if ($parent->isDescendantOf($person->id)) {
            return response()->json([
                'message' => 'Cannot link this person as parent: it would create a circular relationship (this person is already an ancestor of the potential parent).',
            ], 422);
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
    private function handleChildLink(Request $request, FamilyTree $familyTree, Person $person, string $childId, ?string $relationshipRole)
    {
        $child = Person::findOrFail($childId);

        // Ensure child belongs to same family tree
        if ($child->family_tree_id !== $familyTree->id) {
            return response()->json([
                'message' => 'Child must belong to the same family tree',
            ], 422);
        }

        // Determine the role of the current person ($person) as a parent of the child
        $role = $relationshipRole ?: $request->parent_role;
        
        if (!$role) {
            if ($person->gender === 'M') {
                $role = 'father';
            } elseif ($person->gender === 'F') {
                $role = 'mother';
            } else {
                return response()->json([
                    'message' => 'Please specify if the current person is the father or mother',
                ], 422);
            }
        }

        if (!in_array($role, ['father', 'mother'])) {
            return response()->json(['message' => 'role must be either "father" or "mother"'], 422);
        }

        // Check for circular relationship
        if ($person->isDescendantOf($child->id) || $child->id === $person->id) {
             return response()->json([
                'message' => 'Cannot link this person as child: it would create a circular relationship.',
            ], 422);
        }

        $child->update([$role . '_id' => $person->id]);

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
