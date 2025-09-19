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
            ->with(['father', 'mother'])
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

    /**
     * Get complete tree structure with all relationships pre-built
     * Route: GET /api/trees/{familyTree}/complete-tree
     */
    public function completeTree(Request $request, FamilyTree $familyTree)
    {
        $this->authorize('view', $familyTree);

        $focusPersonId = $request->query('focus_person_id');
        $maxGenerations = (int) $request->query('max_generations', 10); // Limit depth
        
        // Get all people with their relationships
        $people = $familyTree->people()
            ->with(['father', 'mother'])
            ->get();

        // Get all relationships
        $relationships = $familyTree->relationships()
            ->with(['person1', 'person2'])
            ->get();

        // Build complete tree structure server-side
        $treeStructure = $this->buildCompleteTreeStructure($people, $relationships, $focusPersonId, $maxGenerations);

        return response()->json([
            'data' => [
                'tree' => $familyTree,
                'structure' => $treeStructure,
                'focus_person_id' => $focusPersonId,
                'stats' => [
                    'total_people' => $people->count(),
                    'total_relationships' => $relationships->count(),
                    'generations_span' => $treeStructure['metadata']['max_generation'] - $treeStructure['metadata']['min_generation'] + 1,
                    'tree_count' => count($treeStructure['roots']),
                    'unified_tree' => true,
                ]
            ],
        ]);
    }

    /**
     * Build complete hierarchical tree structure with all relationships - unified approach
     */
    private function buildCompleteTreeStructure($people, $relationships, $focusPersonId = null, $maxGenerations = 10)
    {
        // Convert to arrays for easier manipulation
        $peopleMap = $people->keyBy('id')->toArray();
        $relationshipMap = $this->mapRelationships($relationships);

        // If focus person specified, build tree just for their lineage
        if ($focusPersonId && isset($peopleMap[$focusPersonId])) {
            $roots = $this->findRootPeople($peopleMap, $focusPersonId);
        } else {
            // Build unified tree connecting all family members
            $roots = $this->findUnifiedRoots($peopleMap, $relationshipMap);
        }
        
        // Build tree nodes for each root
        $trees = [];
        $processedNodes = [];
        
        foreach ($roots as $rootId) {
            if (!isset($processedNodes[$rootId])) {
                $tree = $this->buildTreeNode($rootId, $peopleMap, $relationshipMap, $processedNodes, 0, $maxGenerations);
                if ($tree) {
                    $trees[] = $tree;
                }
            }
        }

        // Calculate metadata
        $metadata = $this->calculateTreeMetadata($trees);

        return [
            'roots' => $trees,
            'metadata' => $metadata,
            'relationship_map' => $relationshipMap,
            'people_map' => $peopleMap
        ];
    }

    /**
     * Map relationships for quick lookup with comprehensive data
     */
    private function mapRelationships($relationships)
    {
        $map = [];
        foreach ($relationships as $rel) {
            $person1Id = $rel->person1_id;
            $person2Id = $rel->person2_id;
            
            if (!isset($map[$person1Id])) {
                $map[$person1Id] = [];
            }
            if (!isset($map[$person2Id])) {
                $map[$person2Id] = [];
            }
            
            $relationshipData = [
                'id' => $rel->id,
                'person_id' => $person2Id,
                'type' => $rel->relationship_type,
                'start_date' => $rel->start_date,
                'end_date' => $rel->end_date,
                'marriage_place' => $rel->marriage_place,
                'notes' => $rel->notes,
                'is_current' => is_null($rel->end_date),
                'duration_years' => $this->calculateRelationshipDuration($rel->start_date, $rel->end_date)
            ];
            
            $map[$person1Id][] = $relationshipData;
            
            // Add reverse relationship
            $reverseData = $relationshipData;
            $reverseData['person_id'] = $person1Id;
            $map[$person2Id][] = $reverseData;
        }
        
        return $map;
    }

    /**
     * Calculate relationship duration in years
     */
    private function calculateRelationshipDuration($startDate, $endDate)
    {
        if (!$startDate) return null;
        
        $start = new \DateTime($startDate);
        $end = $endDate ? new \DateTime($endDate) : new \DateTime();
        
        return $start->diff($end)->y;
    }

    /**
     * Find root people for tree building - returns single highest root
     */
    private function findRootPeople($peopleMap, $focusPersonId = null)
    {
        if ($focusPersonId && isset($peopleMap[$focusPersonId])) {
            // If focus person specified, find their oldest ancestors
            $ancestors = $this->findOldestAncestors($focusPersonId, $peopleMap);
            // Still select single root from ancestors
            return count($ancestors) > 1 ? [$this->selectHighestRoot($ancestors, $peopleMap)] : $ancestors;
        }
        
        // Find all candidate roots (people with no parents)
        $candidateRoots = [];
        foreach ($peopleMap as $id => $person) {
            if (is_null($person['father_id']) && is_null($person['mother_id'])) {
                $candidateRoots[] = $id;
            }
        }
        
        // Return single highest root
        if (empty($candidateRoots)) {
            return [array_key_first($peopleMap)];
        } elseif (count($candidateRoots) === 1) {
            return $candidateRoots;
        } else {
            return [$this->selectHighestRoot($candidateRoots, $peopleMap)];
        }
    }

    /**
     * Find oldest ancestors for a given person
     */
    private function findOldestAncestors($personId, $peopleMap)
    {
        $visited = [];
        $ancestors = [];
        
        $this->collectAncestors($personId, $peopleMap, $visited, $ancestors);
        
        // Return roots (people with no parents) from collected ancestors
        $roots = [];
        foreach ($ancestors as $ancestorId) {
            $ancestor = $peopleMap[$ancestorId];
            if (is_null($ancestor['father_id']) && is_null($ancestor['mother_id'])) {
                $roots[] = $ancestorId;
            }
        }
        
        return empty($roots) ? [$personId] : $roots;
    }

    /**
     * Recursively collect ancestors
     */
    private function collectAncestors($personId, $peopleMap, &$visited, &$ancestors)
    {
        if (isset($visited[$personId]) || !isset($peopleMap[$personId])) {
            return;
        }
        
        $visited[$personId] = true;
        $ancestors[] = $personId;
        
        $person = $peopleMap[$personId];
        
        if ($person['father_id']) {
            $this->collectAncestors($person['father_id'], $peopleMap, $visited, $ancestors);
        }
        
        if ($person['mother_id']) {
            $this->collectAncestors($person['mother_id'], $peopleMap, $visited, $ancestors);
        }
    }

    /**
     * Select the highest priority root from candidate roots
     * Priority: oldest person -> most descendants -> alphabetical order
     */
    private function selectHighestRoot($candidateRoots, $peopleMap)
    {
        if (count($candidateRoots) === 1) {
            return $candidateRoots[0];
        }

        $rootData = [];
        foreach ($candidateRoots as $rootId) {
            $person = $peopleMap[$rootId];
            $rootData[] = [
                'id' => $rootId,
                'person' => $person,
                'birth_date' => $person['birth_date'],
                'descendant_count' => $this->countDescendants($rootId, $peopleMap),
                'full_name' => trim(($person['first_name'] ?? '') . ' ' . ($person['last_name'] ?? ''))
            ];
        }

        // Sort by priority: birth_date ASC (oldest first), descendant_count DESC, full_name ASC
        usort($rootData, function ($a, $b) {
            // 1. Oldest person first (earliest birth date)
            if ($a['birth_date'] && $b['birth_date']) {
                $dateComparison = strcmp($a['birth_date'], $b['birth_date']);
                if ($dateComparison !== 0) {
                    return $dateComparison;
                }
            } elseif ($a['birth_date'] && !$b['birth_date']) {
                return -1; // Person with birth date ranks higher
            } elseif (!$a['birth_date'] && $b['birth_date']) {
                return 1;  // Person with birth date ranks higher
            }

            // 2. Most descendants
            $descendantComparison = $b['descendant_count'] - $a['descendant_count'];
            if ($descendantComparison !== 0) {
                return $descendantComparison;
            }

            // 3. Alphabetical order (fallback)
            return strcmp($a['full_name'], $b['full_name']);
        });

        return $rootData[0]['id'];
    }

    /**
     * Count descendants for a given person
     */
    private function countDescendants($personId, $peopleMap)
    {
        $count = 0;
        $visited = [];
        
        $this->countDescendantsRecursive($personId, $peopleMap, $visited, $count);
        
        return $count;
    }

    /**
     * Recursively count descendants
     */
    private function countDescendantsRecursive($personId, $peopleMap, &$visited, &$count)
    {
        if (isset($visited[$personId])) {
            return;
        }
        
        $visited[$personId] = true;
        
        // Find children (people who have this person as father or mother)
        foreach ($peopleMap as $id => $person) {
            if ($person['father_id'] === $personId || $person['mother_id'] === $personId) {
                $count++;
                $this->countDescendantsRecursive($id, $peopleMap, $visited, $count);
            }
        }
    }

    /**
     * Build a comprehensive tree node with all relationships
     */
    private function buildTreeNode($personId, $peopleMap, $relationshipMap, &$processedNodes, $generation, $maxGenerations)
    {
        if (isset($processedNodes[$personId]) || !isset($peopleMap[$personId]) || $generation > $maxGenerations) {
            return null;
        }
        
        $person = $peopleMap[$personId];
        $processedNodes[$personId] = true;
        
        // Calculate person's age
        $age = null;
        if ($person['birth_date']) {
            $birthDate = new \DateTime($person['birth_date']);
            $endDate = $person['death_date'] ? new \DateTime($person['death_date']) : new \DateTime();
            $age = $birthDate->diff($endDate)->y;
        }
        
        // Build comprehensive node
        $node = [
            'id' => $personId,
            'person' => array_merge($person, [
                'full_name' => trim($person['first_name'] . ' ' . ($person['last_name'] ?? '')),
                'age' => $age,
                'is_living' => is_null($person['death_date']),
            ]),
            'generation' => $generation,
            'children' => [],
            'spouses' => [],
            'parents' => [],
            'siblings' => [],
            'relationships' => []
        ];
        
        // Add parents with their details
        if ($person['father_id'] && isset($peopleMap[$person['father_id']])) {
            $father = $peopleMap[$person['father_id']];
            $node['parents'][] = [
                'id' => $person['father_id'],
                'person' => array_merge($father, [
                    'full_name' => trim($father['first_name'] . ' ' . ($father['last_name'] ?? '')),
                ]),
                'type' => 'father'
            ];
        }
        
        if ($person['mother_id'] && isset($peopleMap[$person['mother_id']])) {
            $mother = $peopleMap[$person['mother_id']];
            $node['parents'][] = [
                'id' => $person['mother_id'],
                'person' => array_merge($mother, [
                    'full_name' => trim($mother['first_name'] . ' ' . ($mother['last_name'] ?? '')),
                ]),
                'type' => 'mother'
            ];
        }
        
        // Add spouses and their comprehensive relationship data
        if (isset($relationshipMap[$personId])) {
            foreach ($relationshipMap[$personId] as $relationship) {
                $spouseId = $relationship['person_id'];
                if (isset($peopleMap[$spouseId])) {
                    $spouse = $peopleMap[$spouseId];
                    $node['spouses'][] = [
                        'id' => $spouseId,
                        'person' => array_merge($spouse, [
                            'full_name' => trim($spouse['first_name'] . ' ' . ($spouse['last_name'] ?? '')),
                        ]),
                        'relationship' => $relationship
                    ];
                    
                    // Add to general relationships array too
                    $node['relationships'][] = [
                        'person_id' => $spouseId,
                        'category' => 'spouse',
                        'details' => $relationship
                    ];
                }
            }
        }
        
        // Add children recursively
        foreach ($peopleMap as $childId => $child) {
            if ($child['father_id'] === $personId || $child['mother_id'] === $personId) {
                if (!isset($processedNodes[$childId])) {
                    $childNode = $this->buildTreeNode($childId, $peopleMap, $relationshipMap, $processedNodes, $generation + 1, $maxGenerations);
                    if ($childNode) {
                        $node['children'][] = $childNode;
                    }
                } else {
                    // Add reference to already processed child
                    $child = $peopleMap[$childId];
                    $node['children'][] = [
                        'id' => $childId,
                        'person' => array_merge($child, [
                            'full_name' => trim($child['first_name'] . ' ' . ($child['last_name'] ?? '')),
                        ]),
                        'is_reference' => true, // Mark as reference to avoid infinite loops
                        'generation' => $generation + 1
                    ];
                }
            }
        }
        
        // Add siblings
        foreach ($peopleMap as $siblingId => $sibling) {
            if ($siblingId !== $personId && 
                (($sibling['father_id'] && $sibling['father_id'] === $person['father_id']) ||
                 ($sibling['mother_id'] && $sibling['mother_id'] === $person['mother_id']))) {
                $node['siblings'][] = [
                    'id' => $siblingId,
                    'person' => array_merge($sibling, [
                        'full_name' => trim($sibling['first_name'] . ' ' . ($sibling['last_name'] ?? '')),
                    ])
                ];
                
                // Add to relationships
                $node['relationships'][] = [
                    'person_id' => $siblingId,
                    'category' => 'sibling',
                    'details' => ['type' => 'sibling']
                ];
            }
        }
        
        return $node;
    }

    /**
     * Calculate comprehensive tree metadata
     */
    private function calculateTreeMetadata($trees)
    {
        $minGeneration = 0;
        $maxGeneration = 0;
        $totalNodes = 0;
        $totalRelationships = 0;
        $generationCounts = [];
        
        foreach ($trees as $tree) {
            $this->calculateNodeStats($tree, $minGeneration, $maxGeneration, $totalNodes, $totalRelationships, $generationCounts);
        }
        
        return [
            'min_generation' => $minGeneration,
            'max_generation' => $maxGeneration,
            'total_nodes' => $totalNodes,
            'total_relationships' => $totalRelationships,
            'tree_count' => count($trees),
            'generation_counts' => $generationCounts,
            'max_depth' => $maxGeneration - $minGeneration + 1
        ];
    }

    /**
     * Recursively calculate comprehensive node statistics
     */
    private function calculateNodeStats($node, &$minGeneration, &$maxGeneration, &$totalNodes, &$totalRelationships, &$generationCounts)
    {
        if (isset($node['is_reference']) && $node['is_reference']) {
            return; // Skip references to avoid double counting
        }
        
        $generation = $node['generation'];
        $minGeneration = min($minGeneration, $generation);
        $maxGeneration = max($maxGeneration, $generation);
        $totalNodes++;
        
        if (!isset($generationCounts[$generation])) {
            $generationCounts[$generation] = 0;
        }
        $generationCounts[$generation]++;
        
        // Count relationships
        if (isset($node['relationships'])) {
            $totalRelationships += count($node['relationships']);
        }
        
        // Recurse through children
        if (isset($node['children'])) {
            foreach ($node['children'] as $child) {
                $this->calculateNodeStats($child, $minGeneration, $maxGeneration, $totalNodes, $totalRelationships, $generationCounts);
            }
        }
    }
    
    /**
     * Find unified roots to create a single connected tree structure
     * This connects separate family lines through spouse relationships
     */
    private function findUnifiedRoots($peopleMap, $relationshipMap)
    {
        // Find all people without parents (potential roots)
        $candidateRoots = [];
        foreach ($peopleMap as $id => $person) {
            if (is_null($person['father_id']) && is_null($person['mother_id'])) {
                $candidateRoots[] = $id;
            }
        }
        
        if (empty($candidateRoots)) {
            return [array_key_first($peopleMap)];
        }
        
        if (count($candidateRoots) === 1) {
            return $candidateRoots;
        }
        
        // Find connections between roots through spouse relationships
        $connectedGroups = $this->findConnectedFamilyGroups($candidateRoots, $peopleMap, $relationshipMap);
        
        // For each connected group, select the primary root
        $unifiedRoots = [];
        foreach ($connectedGroups as $group) {
            $primaryRoot = $this->selectPrimaryRootFromGroup($group, $peopleMap);
            $unifiedRoots[] = $primaryRoot;
        }
        
        return $unifiedRoots;
    }
    
    /**
     * Find connected family groups by traversing spouse relationships
     */
    private function findConnectedFamilyGroups($candidateRoots, $peopleMap, $relationshipMap)
    {
        $visited = [];
        $groups = [];
        
        foreach ($candidateRoots as $rootId) {
            if (!isset($visited[$rootId])) {
                $group = [];
                $this->collectConnectedFamily($rootId, $peopleMap, $relationshipMap, $visited, $group);
                
                // Only include roots from this group
                $groupRoots = array_intersect($group, $candidateRoots);
                if (!empty($groupRoots)) {
                    $groups[] = $groupRoots;
                }
            }
        }
        
        return $groups;
    }
    
    /**
     * Collect all family members connected through any relationship
     */
    private function collectConnectedFamily($personId, $peopleMap, $relationshipMap, &$visited, &$group)
    {
        if (isset($visited[$personId]) || !isset($peopleMap[$personId])) {
            return;
        }
        
        $visited[$personId] = true;
        $group[] = $personId;
        
        $person = $peopleMap[$personId];
        
        // Follow parent relationships
        if ($person['father_id']) {
            $this->collectConnectedFamily($person['father_id'], $peopleMap, $relationshipMap, $visited, $group);
        }
        if ($person['mother_id']) {
            $this->collectConnectedFamily($person['mother_id'], $peopleMap, $relationshipMap, $visited, $group);
        }
        
        // Follow child relationships
        foreach ($peopleMap as $childId => $child) {
            if ($child['father_id'] === $personId || $child['mother_id'] === $personId) {
                $this->collectConnectedFamily($childId, $peopleMap, $relationshipMap, $visited, $group);
            }
        }
        
        // Follow spouse relationships to connect different family lines
        if (isset($relationshipMap[$personId])) {
            foreach ($relationshipMap[$personId] as $relationship) {
                if ($relationship['type'] === 'spouse') {
                    $this->collectConnectedFamily($relationship['person_id'], $peopleMap, $relationshipMap, $visited, $group);
                }
            }
        }
    }
    
    /**
     * Select primary root from a connected group
     */
    private function selectPrimaryRootFromGroup($groupRoots, $peopleMap)
    {
        if (count($groupRoots) === 1) {
            return $groupRoots[0];
        }
        
        // Sort by priority: birth date (oldest first), then descendant count, then name
        usort($groupRoots, function($a, $b) use ($peopleMap) {
            $personA = $peopleMap[$a];
            $personB = $peopleMap[$b];
            
            // Compare by birth date (oldest first, null dates go last)
            $birthA = $personA['birth_date'] ?? '9999-12-31';
            $birthB = $personB['birth_date'] ?? '9999-12-31';
            if ($birthA !== $birthB) {
                return $birthA <=> $birthB;
            }
            
            // Compare by descendant count (more descendants first)
            $descendantsA = $this->countDescendants($a, $peopleMap);
            $descendantsB = $this->countDescendants($b, $peopleMap);
            if ($descendantsA !== $descendantsB) {
                return $descendantsB <=> $descendantsA;
            }
            
            // Compare by name (alphabetical)
            $nameA = trim($personA['first_name'] . ' ' . ($personA['last_name'] ?? ''));
            $nameB = trim($personB['first_name'] . ' ' . ($personB['last_name'] ?? ''));
            return $nameA <=> $nameB;
        });
        
        return $groupRoots[0];
    }
}
