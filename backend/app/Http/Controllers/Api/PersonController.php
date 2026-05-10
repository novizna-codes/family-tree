<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FamilyTree;
use App\Models\Person;
use App\Models\Relationship;
use App\Services\PersonAuthorizationService;
use App\Services\PersonMergeService;
use App\Services\PersonTreeContextService;
use App\Services\SubtreeCopyService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PersonController extends Controller
{
    public function index(Request $request, FamilyTree $familyTree, PersonTreeContextService $personTreeContextService)
    {
        $this->authorize('view', $familyTree);

        if ($request->has('paginate')) {
            $rawPaginate = $request->query('paginate');

            if (is_string($rawPaginate)) {
                $rawPaginate = trim($rawPaginate);
            }

            $normalizedPaginate = filter_var($rawPaginate, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);

            if ($normalizedPaginate !== null) {
                $request->merge(['paginate' => $normalizedPaginate]);
            }
        }

        $validated = $request->validate([
            'page' => 'sometimes|integer|min:1',
            'per_page' => 'sometimes|integer|min:1|max:100',
            'search' => 'nullable|string',
            'q' => 'nullable|string',
            'sort' => 'sometimes|in:name_asc,created_desc',
            'paginate' => 'sometimes|boolean',
        ]);

        $paginate = (bool) ($validated['paginate'] ?? false);
        $perPage = $validated['per_page'] ?? 25;
        $search = isset($validated['search']) ? trim($validated['search']) : null;
        $q = isset($validated['q']) ? trim($validated['q']) : null;
        $search ??= $q;
        $sort = $validated['sort'] ?? 'name_asc';

        $peopleQuery = Person::query()
            ->accessibleBy($request->user())
            ->where(function (Builder $query) use ($familyTree) {
                $query->whereHas('treeMemberships', function (Builder $membershipQuery) use ($familyTree) {
                    $membershipQuery->where('tree_id', $familyTree->id);
                })->orWhere(function (Builder $legacyQuery) use ($familyTree) {
                    $legacyQuery->where('family_tree_id', $familyTree->id)
                        ->whereDoesntHave('treeMemberships', function (Builder $membershipQuery) use ($familyTree) {
                            $membershipQuery->where('tree_id', $familyTree->id);
                        });
                });
            })
            ->with(['father', 'mother']);

        if ($search !== null && $search !== '') {
            $this->applyNameSearchFilter($peopleQuery, $search);
        }

        if ($sort === 'created_desc') {
            $peopleQuery->orderByDesc('created_at');
        } else {
            $peopleQuery->orderBy('first_name')->orderBy('last_name');
        }

        if ($paginate) {
            $paginatedPeople = $peopleQuery->paginate($perPage);

            $personTreeContextService->applyTreeParentContext(
                collect($paginatedPeople->items()),
                $familyTree,
                $request->user()
            );

            return response()->json([
                'data' => $paginatedPeople->items(),
                'links' => [
                    'first' => $paginatedPeople->url(1),
                    'last' => $paginatedPeople->url($paginatedPeople->lastPage()),
                    'prev' => $paginatedPeople->previousPageUrl(),
                    'next' => $paginatedPeople->nextPageUrl(),
                ],
                'meta' => [
                    'current_page' => $paginatedPeople->currentPage(),
                    'from' => $paginatedPeople->firstItem(),
                    'last_page' => $paginatedPeople->lastPage(),
                    'links' => $paginatedPeople->linkCollection()->toArray(),
                    'path' => $paginatedPeople->path(),
                    'per_page' => $paginatedPeople->perPage(),
                    'to' => $paginatedPeople->lastItem(),
                    'total' => $paginatedPeople->total(),
                ],
            ]);
        }

        $people = $peopleQuery->get();

        $personTreeContextService->applyTreeParentContext($people, $familyTree, $request->user());

        return response()->json([
            'data' => $people,
        ]);
    }

    public function store(
        Request $request,
        FamilyTree $familyTree,
        SubtreeCopyService $subtreeCopyService,
        PersonTreeContextService $personTreeContextService
    )
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

        $personTreeContextService->ensureParentsBelongToTreeContext(
            $validated,
            $familyTree,
            $subtreeCopyService,
            $request->user()
        );

        $validated = $this->processPersonData($validated);

        $validated['owner_user_id'] = $request->user()->id;
        $person = $familyTree->people()->create($validated);

        return response()->json([
            'data' => $person->load(['father', 'mother']),
            'message' => 'Person created successfully',
        ], 201);
    }

    public function show(Request $request, FamilyTree $familyTree, Person $person, PersonTreeContextService $personTreeContextService)
    {
        $this->authorize('view', $familyTree);

        $belongsToTree = $personTreeContextService->personBelongsToFamilyTreeContext($person, $familyTree);

        if (!$belongsToTree) {
            abort(404);
        }

        $this->authorize('view', $person);

        $person->load([
            'father',
            'mother',
            'relationshipsAsPerson1.person2',
            'relationshipsAsPerson2.person1',
        ]);

        $personTreeContextService->applyTreeParentContext(collect([$person]), $familyTree, $request->user());

        $treeChildren = $personTreeContextService->resolveTreeChildren($familyTree, $person, $request->user());
        $person->setRelation('children', $treeChildren);

        return response()->json([
            'data' => $person,
        ]);
    }

    public function update(
        Request $request,
        FamilyTree $familyTree,
        Person $person,
        SubtreeCopyService $subtreeCopyService,
        PersonTreeContextService $personTreeContextService
    )
    {
        $this->authorize('update', $familyTree);

        $belongsToRouteTree = $personTreeContextService->personBelongsToFamilyTreeContext($person, $familyTree);

        if (!$belongsToRouteTree) {
            abort(404);
        }

        $this->authorize('update', $person);

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

        $personTreeContextService->ensureParentsBelongToTreeContext(
            $validated,
            $familyTree,
            $subtreeCopyService,
            $request->user()
        );

        $validated = $this->processPersonData($validated);

        $person->update($validated);

        return response()->json([
            'data' => $person->load(['father', 'mother']),
            'message' => 'Person updated successfully',
        ]);
    }

    public function destroy(Request $request, FamilyTree $familyTree, Person $person, PersonTreeContextService $personTreeContextService)
    {
        $this->authorize('update', $familyTree);

        $belongsToRouteTree = $personTreeContextService->personBelongsToFamilyTreeContext($person, $familyTree);

        if (!$belongsToRouteTree) {
            abort(404);
        }

        $this->authorize('delete', $person);

        try {
            $person->delete();
            return response()->json([
                'message' => 'Person deleted successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to delete person.', [
                'person_id' => $person->id,
                'family_tree_id' => $familyTree->id,
                'user_id' => $request->user()?->id,
                'exception' => $e,
            ]);

            return response()->json([
                'message' => 'Failed to delete person.',
            ], 500);
        }
    }

    /**
     * Unified method to create a new person and establish a relationship
     */
    public function manageRelationship(
        Request $request,
        FamilyTree $familyTree,
        Person $person,
        PersonTreeContextService $personTreeContextService
    )
    {
        if (!$personTreeContextService->personBelongsToFamilyTreeContext($person, $familyTree)) {
            abort(404);
        }

        $this->authorize('update', $familyTree);
        $this->authorize('update', $person);

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
    public function linkRelationship(
        Request $request,
        FamilyTree $familyTree,
        Person $person,
        PersonTreeContextService $personTreeContextService
    )
    {
        if (!$personTreeContextService->personBelongsToFamilyTreeContext($person, $familyTree)) {
            abort(404);
        }

        $this->authorize('update', $familyTree);
        $this->authorize('update', $person);

        $validated = $request->validate([
            'relationship_type' => 'required|in:parent,child,spouse',
            'relationship_role' => 'nullable|string',
            'related_person_id' => 'required|uuid|exists:people,id',
        ]);

        $relationshipType = $validated['relationship_type'];
        $relationshipRole = $validated['relationship_role'] ?? $request->parent_role ?? null;
        $relatedPersonId = $validated['related_person_id'];
        $relatedPerson = Person::findOrFail($relatedPersonId);

        $this->authorize('view', $relatedPerson);

        if (!$personTreeContextService->personBelongsToFamilyTreeContext($relatedPerson, $familyTree)) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Related person must belong to the same family tree context',
            ], 422);
        }

        switch ($relationshipType) {
            case 'parent':
                return $this->handleParentLink($request, $familyTree, $person, $relatedPerson->id, $relationshipRole, $personTreeContextService);
            case 'child':
                return $this->handleChildLink($request, $familyTree, $person, $relatedPerson->id, $relationshipRole, $personTreeContextService);
            case 'spouse':
                return $this->handleSpouseLink($request, $familyTree, $person, $relatedPerson->id, $relationshipRole, $personTreeContextService);
            default:
                return response()->json(['message' => 'Invalid relationship type'], 422);
        }
    }

    /**
     * Remove a relationship between two people
     */
    public function removeRelationship(
        Request $request,
        FamilyTree $familyTree,
        Person $person,
        $relationshipId,
        PersonTreeContextService $personTreeContextService
    )
    {
        if (!$personTreeContextService->personBelongsToFamilyTreeContext($person, $familyTree)) {
            abort(404);
        }

        $this->authorize('update', $familyTree);
        $this->authorize('update', $person);

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
    public function updateRelationship(
        Request $request,
        FamilyTree $familyTree,
        Person $person,
        Relationship $relationship,
        PersonTreeContextService $personTreeContextService
    )
    {
        if (!$personTreeContextService->personBelongsToFamilyTreeContext($person, $familyTree)) {
            abort(404);
        }

        $this->authorize('update', $familyTree);
        $this->authorize('update', $person);

        if ($relationship->family_tree_id !== $familyTree->id) {
            abort(403);
        }

        if ($relationship->person1) {
            $this->authorize('update', $relationship->person1);
        }

        if ($relationship->person2) {
            $this->authorize('update', $relationship->person2);
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
    public function copyToTree(Request $request, FamilyTree $familyTree, Person $person, SubtreeCopyService $subtreeCopyService)
    {
        $this->authorize('view', $familyTree);

        if (!$subtreeCopyService->personBelongsToTree($person, $familyTree)) {
            abort(404);
        }

        $this->authorize('view', $person);

        $validated = $request->validate([
            'create_target_tree' => 'nullable|boolean',
            'target_tree_id' => 'required_unless:create_target_tree,true|uuid|exists:family_trees,id',
            'target_tree_name' => 'required_if:create_target_tree,true|string|max:255',
            'target_tree_description' => 'nullable|string|max:1000',
            'target_parent_id' => 'nullable|uuid|exists:people,id',
            'include_descendants' => 'nullable|boolean',
            'target_parent_role' => 'nullable|in:father,mother',
            'copy_mode' => 'nullable|in:clone,reuse',
        ]);

        $createdTreeId = null;
        $createdTreeName = null;
        $createTargetTree = (bool) ($validated['create_target_tree'] ?? false);

        if ($createTargetTree) {
            $this->authorize('create', FamilyTree::class);

            $targetTree = FamilyTree::create([
                'user_id' => $request->user()->id,
                'name' => $validated['target_tree_name'],
                'description' => $validated['target_tree_description'] ?? null,
            ]);

            $createdTreeId = $targetTree->id;
            $createdTreeName = $targetTree->name;
        } else {
            $targetTree = FamilyTree::findOrFail($validated['target_tree_id']);
        }

        $this->authorize('update', $targetTree);

        $targetParent = null;
        if (!empty($validated['target_parent_id'])) {
            $targetParent = Person::findOrFail($validated['target_parent_id']);

            $this->authorize('update', $targetParent);

            if (!$subtreeCopyService->personBelongsToTree($targetParent, $targetTree)) {
                return response()->json([
                    'message' => 'Target parent must belong to the target tree',
                ], 422);
            }
        }

        $result = $subtreeCopyService->copy(
            sourceTree: $familyTree,
            targetTree: $targetTree,
            sourceRoot: $person,
            targetParent: $targetParent,
            includeDescendants: (bool) ($validated['include_descendants'] ?? true),
            targetParentRole: $validated['target_parent_role'] ?? null,
            copyMode: $validated['copy_mode'] ?? 'clone'
        );

        return response()->json([
            'data' => $result['root'],
            'meta' => [
                'copied_person_ids' => $result['copied_person_ids'],
                'skipped_person_ids' => $result['skipped_person_ids'],
                'copied_count' => count($result['copied_person_ids']),
                'created_tree_id' => $createdTreeId,
                'created_tree_name' => $createdTreeName,
            ],
            'message' => 'Subtree copied successfully to ' . $targetTree->name,
        ], 201);
    }

    public function search(Request $request)
    {
        $validated = $request->validate([
            'q' => 'nullable|string|max:255',
            'mergeable_only' => 'sometimes|boolean',
            'tree_id' => 'sometimes|uuid|exists:family_trees,id',
        ]);

        $query = trim((string) ($validated['q'] ?? ''));
        $mergeableOnly = (bool) ($validated['mergeable_only'] ?? false);
        $treeId = $validated['tree_id'] ?? null;

        if (mb_strlen($query) < 2) {
            return response()->json([
                'data' => [],
            ]);
        }

        if ($treeId !== null) {
            $tree = FamilyTree::findOrFail($treeId);
            $this->authorize('view', $tree);
        }

        $people = Person::query()
            ->accessibleBy($request->user())
            ->when($mergeableOnly, function ($builder) use ($request) {
                $builder->where('people.owner_user_id', $request->user()->id);
            })
            ->when($treeId !== null, function (Builder $builder) use ($treeId) {
                $builder->where(function (Builder $treeQuery) use ($treeId) {
                    $treeQuery->whereHas('treeMemberships', function (Builder $membershipQuery) use ($treeId) {
                        $membershipQuery->where('tree_id', $treeId);
                    })->orWhere(function (Builder $legacyQuery) use ($treeId) {
                        $legacyQuery->where('people.family_tree_id', $treeId)
                            ->whereDoesntHave('treeMemberships', function (Builder $membershipQuery) use ($treeId) {
                                $membershipQuery->where('tree_id', $treeId);
                            });
                    });
                });
            })
            ->when($query !== '', function (Builder $builder) use ($query) {
                $this->applyNameSearchFilter($builder, $query);
            })
            ->select('people.*')
            ->distinct()
            ->with('familyTree:id,name')
            ->orderBy('people.first_name')
            ->orderBy('people.last_name')
            ->limit(30)
            ->get();

        return response()->json([
            'data' => $people,
        ]);
    }

    public function merge(
        Request $request,
        PersonMergeService $personMergeService,
        PersonAuthorizationService $personAuthorizationService
    )
    {
        $validated = $request->validate([
            'keep_person_id' => 'required|uuid|exists:people,id',
            'merge_person_ids' => 'required|array|min:1',
            'merge_person_ids.*' => 'required|uuid|exists:people,id|different:keep_person_id',
        ]);

        $allowedTreeIds = $personAuthorizationService->resolveAllowedTreeIdsForMerge(
            $request,
            $validated['keep_person_id'],
            $validated['merge_person_ids']
        );
        if ($allowedTreeIds instanceof JsonResponse) {
            return $allowedTreeIds;
        }

        $policyError = $personAuthorizationService->ensureUserCanUpdateMergedPeople(
            $request,
            $validated['keep_person_id'],
            $validated['merge_person_ids']
        );
        if ($policyError instanceof JsonResponse) {
            return $policyError;
        }

        try {
            $result = $personMergeService->merge(
                $validated['keep_person_id'],
                $validated['merge_person_ids'],
                $allowedTreeIds
            );
        } catch (AuthorizationException) {
            return response()->json([
                'message' => 'You can only merge people from trees you own.',
            ], 403);
        }

        return response()->json([
            'data' => $result,
            'message' => 'People merged successfully',
        ]);
    }

    public function mergePreview(
        Request $request,
        PersonMergeService $personMergeService,
        PersonAuthorizationService $personAuthorizationService
    )
    {
        $validated = $request->validate([
            'keep_person_id' => 'required|uuid|exists:people,id',
            'merge_person_ids' => 'required|array|min:1',
            'merge_person_ids.*' => 'required|uuid|exists:people,id|different:keep_person_id',
            'tree_id' => 'sometimes|uuid|exists:family_trees,id',
        ]);

        $allowedTreeIds = $personAuthorizationService->resolveAllowedTreeIdsForMerge(
            $request,
            $validated['keep_person_id'],
            $validated['merge_person_ids']
        );
        if ($allowedTreeIds instanceof JsonResponse) {
            return $allowedTreeIds;
        }

        $policyError = $personAuthorizationService->ensureUserCanUpdateMergedPeople(
            $request,
            $validated['keep_person_id'],
            $validated['merge_person_ids']
        );
        if ($policyError instanceof JsonResponse) {
            return $policyError;
        }

        $previewTreeIds = $allowedTreeIds;

        if (!empty($validated['tree_id'])) {
            $tree = FamilyTree::findOrFail($validated['tree_id']);
            $this->authorize('view', $tree);

            if (!in_array($tree->id, $allowedTreeIds, true)) {
                return response()->json([
                    'message' => 'You can only merge people from trees you own.',
                ], 403);
            }

            $previewTreeIds = [$tree->id];
        }

        $preview = $personMergeService->preview(
            $validated['keep_person_id'],
            $validated['merge_person_ids'],
            $previewTreeIds
        );

        return response()->json([
            'data' => $preview,
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

    private function applyNameSearchFilter(Builder $builder, string $query): void
    {
        $normalizedQuery = $this->normalizeSearchTerm($query);

        $builder->where(function (Builder $q) use ($normalizedQuery) {
            $q->whereRaw('LOWER(TRIM(people.first_name)) LIKE ?', ["%{$normalizedQuery}%"])
                ->orWhereRaw('LOWER(TRIM(people.last_name)) LIKE ?', ["%{$normalizedQuery}%"])
                ->orWhereRaw('LOWER(TRIM(people.maiden_name)) LIKE ?', ["%{$normalizedQuery}%"])
                ->orWhereRaw('LOWER(TRIM(people.nickname)) LIKE ?', ["%{$normalizedQuery}%"])
                ->orWhereRaw("LOWER(REPLACE(CONCAT(COALESCE(people.first_name, ''), COALESCE(people.last_name, '')), ' ', '')) LIKE ?", [
                    '%' . str_replace(' ', '', $normalizedQuery) . '%',
                ]);
        });
    }

    private function normalizeSearchTerm(string $query): string
    {
        $normalized = mb_strtolower(trim($query), 'UTF-8');

        return preg_replace('/\s+/', ' ', $normalized) ?? $normalized;
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
        $parentData['owner_user_id'] = $request->user()->id;

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
        $childData['owner_user_id'] = $request->user()->id;

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
        $spouseData['owner_user_id'] = $request->user()->id;

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
    private function handleParentLink(
        Request $request,
        FamilyTree $familyTree,
        Person $person,
        string $parentId,
        ?string $relationshipRole,
        PersonTreeContextService $personTreeContextService
    )
    {
        $parent = Person::findOrFail($parentId);

        $this->authorize('update', $parent);

        // Ensure parent belongs to same family tree context
        if (!$personTreeContextService->personBelongsToFamilyTreeContext($parent, $familyTree)) {
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
    private function handleChildLink(
        Request $request,
        FamilyTree $familyTree,
        Person $person,
        string $childId,
        ?string $relationshipRole,
        PersonTreeContextService $personTreeContextService
    )
    {
        $child = Person::findOrFail($childId);

        $this->authorize('update', $child);

        // Ensure child belongs to same family tree context
        if (!$personTreeContextService->personBelongsToFamilyTreeContext($child, $familyTree)) {
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
    private function handleSpouseLink(
        Request $request,
        FamilyTree $familyTree,
        Person $person,
        string $spouseId,
        ?string $relationshipRole,
        PersonTreeContextService $personTreeContextService
    )
    {
        $validated = $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'marriage_place' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $spouse = Person::findOrFail($spouseId);

        $this->authorize('view', $spouse);

        // Ensure spouse belongs to same family tree context
        if (!$personTreeContextService->personBelongsToFamilyTreeContext($spouse, $familyTree)) {
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
