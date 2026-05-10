<?php

namespace App\Services;

use App\Models\FamilyTree;
use App\Models\Person;
use App\Models\TreeEdge;
use App\Models\TreePerson;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class SubtreeCopyService
{
    /**
     * @return array{root: Person, copied_person_ids: array<int, string>, skipped_person_ids: array<int, string>}
     */
    public function copy(
        FamilyTree $sourceTree,
        FamilyTree $targetTree,
        Person $sourceRoot,
        ?Person $targetParent = null,
        bool $includeDescendants = true,
        ?string $targetParentRole = null,
        string $copyMode = 'clone'
    ): array {
        return DB::transaction(function () use ($sourceTree, $targetTree, $sourceRoot, $targetParent, $includeDescendants, $targetParentRole, $copyMode) {
            if (!$this->personBelongsToTree($sourceRoot, $sourceTree)) {
                abort(422, 'Source root must belong to the source tree');
            }

            if ($targetParent && !$this->personBelongsToTree($targetParent, $targetTree)) {
                abort(422, 'Target parent must belong to the target tree');
            }

            $sourcePeople = $includeDescendants
                ? $this->collectSubtree($sourceTree, $sourceRoot)
                : collect([$sourceRoot]);

            $map = [];
            $copiedPersonIds = [];

            if ($copyMode === 'reuse') {
                foreach ($sourcePeople as $sourcePerson) {
                    $map[$sourcePerson->id] = $sourcePerson->id;

                    TreePerson::firstOrCreate([
                        'tree_id' => $targetTree->id,
                        'person_id' => $sourcePerson->id,
                    ], [
                        'metadata' => null,
                    ]);
                }

                $this->copyTreeEdgesByMap($sourceTree, $targetTree, $map);

                $reusedRoot = Person::findOrFail($sourceRoot->id);

                if ($targetParent) {
                    $role = $this->resolveParentRole($targetParentRole, $targetParent);

                    if ($this->wouldCreateCycle($targetTree, $targetParent, $reusedRoot)) {
                        abort(422, 'Cannot attach target parent: this would create a cycle in the tree');
                    }

                    TreePerson::firstOrCreate([
                        'tree_id' => $targetTree->id,
                        'person_id' => $targetParent->id,
                    ], [
                        'metadata' => null,
                    ]);

                    TreeEdge::firstOrCreate([
                        'tree_id' => $targetTree->id,
                        'parent_person_id' => $targetParent->id,
                        'child_person_id' => $reusedRoot->id,
                        'parent_role' => $role,
                    ], [
                        'relationship_type' => 'biological',
                        'sort_order' => null,
                    ]);
                }

                return [
                    'root' => $reusedRoot,
                    'copied_person_ids' => array_values($map),
                    'skipped_person_ids' => [],
                ];
            }

            foreach ($sourcePeople as $sourcePerson) {
                $newPerson = $sourcePerson->replicate([
                    'family_tree_id',
                    'father_id',
                    'mother_id',
                    'created_at',
                    'updated_at',
                    'deleted_at',
                ]);

                $newPerson->family_tree_id = $targetTree->id;
                $newPerson->owner_user_id = $targetTree->user_id;
                $newPerson->father_id = null;
                $newPerson->mother_id = null;
                $newPerson->save();

                $map[$sourcePerson->id] = $newPerson->id;
                $copiedPersonIds[] = $newPerson->id;

                TreePerson::firstOrCreate([
                    'tree_id' => $targetTree->id,
                    'person_id' => $newPerson->id,
                ], [
                    'metadata' => null,
                ]);
            }

            foreach ($sourcePeople as $sourcePerson) {
                $newPersonId = $map[$sourcePerson->id];
                $update = [];

                if ($sourcePerson->father_id && isset($map[$sourcePerson->father_id])) {
                    $update['father_id'] = $map[$sourcePerson->father_id];
                }

                if ($sourcePerson->mother_id && isset($map[$sourcePerson->mother_id])) {
                    $update['mother_id'] = $map[$sourcePerson->mother_id];
                }

                if (!empty($update)) {
                    Person::where('id', $newPersonId)->update($update);
                }

            }

            $this->copyTreeEdgesByMap($sourceTree, $targetTree, $map);

            $copiedRoot = Person::findOrFail($map[$sourceRoot->id]);

            if ($targetParent) {
                $role = $this->resolveParentRole($targetParentRole, $targetParent);

                if ($this->wouldCreateCycle($targetTree, $targetParent, $copiedRoot)) {
                    abort(422, 'Cannot attach target parent: this would create a cycle in the tree');
                }

                $copiedRoot->update([$role . '_id' => $targetParent->id]);

                TreePerson::firstOrCreate([
                    'tree_id' => $targetTree->id,
                    'person_id' => $targetParent->id,
                ], [
                    'metadata' => null,
                ]);

                TreeEdge::firstOrCreate([
                    'tree_id' => $targetTree->id,
                    'parent_person_id' => $targetParent->id,
                    'child_person_id' => $copiedRoot->id,
                    'parent_role' => $role,
                ], [
                    'relationship_type' => 'biological',
                    'sort_order' => null,
                ]);
            }

            return [
                'root' => $copiedRoot,
                'copied_person_ids' => $copiedPersonIds,
                'skipped_person_ids' => [],
            ];
        });
    }

    public function personBelongsToTree(Person $person, FamilyTree $tree): bool
    {
        if ($person->family_tree_id === $tree->id) {
            return true;
        }

        return TreePerson::query()
            ->where('tree_id', $tree->id)
            ->where('person_id', $person->id)
            ->exists();
    }

    private function collectSubtree(FamilyTree $sourceTree, Person $root): Collection
    {
        $queue = [$root];
        $visited = [];
        $collected = collect();

        while (!empty($queue)) {
            /** @var Person $current */
            $current = array_shift($queue);

            if (isset($visited[$current->id])) {
                continue;
            }

            $visited[$current->id] = true;
            $collected->push($current);

            $children = $this->childrenFromTreeEdges($sourceTree, $current);

            if ($children->isEmpty()) {
                $children = Person::where('family_tree_id', $sourceTree->id)
                    ->where(function ($query) use ($current) {
                        $query->where('father_id', $current->id)
                            ->orWhere('mother_id', $current->id);
                    })
                    ->get();
            }

            foreach ($children as $child) {
                if (!isset($visited[$child->id])) {
                    $queue[] = $child;
                }
            }
        }

        return $collected;
    }

    private function resolveParentRole(?string $targetParentRole, Person $targetParent): string
    {
        if (in_array($targetParentRole, ['father', 'mother'], true)) {
            return $targetParentRole;
        }

        if ($targetParent->gender === 'F') {
            return 'mother';
        }

        return 'father';
    }

    /**
     * @param array<string, string> $map
     */
    private function copyTreeEdgesByMap(FamilyTree $sourceTree, FamilyTree $targetTree, array $map): void
    {
        $sourceIds = array_keys($map);

        if ($sourceIds === []) {
            return;
        }

        $edges = TreeEdge::query()
            ->where('tree_id', $sourceTree->id)
            ->whereIn('parent_person_id', $sourceIds)
            ->whereIn('child_person_id', $sourceIds)
            ->get();

        foreach ($edges as $edge) {
            TreeEdge::firstOrCreate([
                'tree_id' => $targetTree->id,
                'parent_person_id' => $map[$edge->parent_person_id],
                'child_person_id' => $map[$edge->child_person_id],
                'parent_role' => $edge->parent_role,
            ], [
                'relationship_type' => $edge->relationship_type,
                'sort_order' => $edge->sort_order,
            ]);
        }

        if ($edges->isNotEmpty()) {
            return;
        }

        foreach ($sourceIds as $sourceId) {
            $sourcePerson = Person::find($sourceId);
            if (!$sourcePerson) {
                continue;
            }

            if ($sourcePerson->father_id && isset($map[$sourcePerson->father_id])) {
                TreeEdge::firstOrCreate([
                    'tree_id' => $targetTree->id,
                    'parent_person_id' => $map[$sourcePerson->father_id],
                    'child_person_id' => $map[$sourcePerson->id],
                    'parent_role' => 'father',
                ], [
                    'relationship_type' => 'biological',
                    'sort_order' => null,
                ]);
            }

            if ($sourcePerson->mother_id && isset($map[$sourcePerson->mother_id])) {
                TreeEdge::firstOrCreate([
                    'tree_id' => $targetTree->id,
                    'parent_person_id' => $map[$sourcePerson->mother_id],
                    'child_person_id' => $map[$sourcePerson->id],
                    'parent_role' => 'mother',
                ], [
                    'relationship_type' => 'biological',
                    'sort_order' => null,
                ]);
            }
        }
    }

    private function childrenFromTreeEdges(FamilyTree $sourceTree, Person $parent): Collection
    {
        return Person::query()
            ->join('tree_edges', 'tree_edges.child_person_id', '=', 'people.id')
            ->where('tree_edges.tree_id', $sourceTree->id)
            ->where('tree_edges.parent_person_id', $parent->id)
            ->select('people.*')
            ->get();
    }

    private function wouldCreateCycle(FamilyTree $tree, Person $parent, Person $child): bool
    {
        if ($parent->id === $child->id) {
            return true;
        }

        $treePersonIds = TreePerson::query()
            ->where('tree_id', $tree->id)
            ->pluck('person_id')
            ->all();

        $queue = [$child->id];
        $visited = [];

        while ($queue !== []) {
            $currentId = array_shift($queue);

            if (isset($visited[$currentId])) {
                continue;
            }

            $visited[$currentId] = true;

            $edgeChildren = TreeEdge::query()
                ->where('tree_id', $tree->id)
                ->where('parent_person_id', $currentId)
                ->pluck('child_person_id')
                ->all();

            foreach ($edgeChildren as $descendantId) {
                if ($descendantId === $parent->id) {
                    return true;
                }

                if (!isset($visited[$descendantId])) {
                    $queue[] = $descendantId;
                }
            }

            if ($edgeChildren !== []) {
                continue;
            }

            $legacyChildren = Person::query()
                ->where(function ($query) use ($currentId) {
                    $query->where('father_id', $currentId)
                        ->orWhere('mother_id', $currentId);
                })
                ->where(function ($query) use ($tree, $treePersonIds) {
                    $query->where('family_tree_id', $tree->id);

                    if ($treePersonIds !== []) {
                        $query->orWhereIn('id', $treePersonIds);
                    }
                })
                ->pluck('id')
                ->all();

            foreach ($legacyChildren as $descendantId) {
                if ($descendantId === $parent->id) {
                    return true;
                }

                if (!isset($visited[$descendantId])) {
                    $queue[] = $descendantId;
                }
            }
        }

        return false;
    }
}
