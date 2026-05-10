<?php

namespace App\Services;

use App\Models\Person;
use App\Models\Relationship;
use App\Models\TreeEdge;
use App\Models\TreePerson;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;

class PersonMergeService
{
    /**
     * @param array<int, string> $sourcePersonIds
     * @param array<int, string>|null $allowedTreeIds
     * @return array<string, int|bool|array<int, string>>
     */
    public function preview(string $keepPersonId, array $sourcePersonIds, ?array $allowedTreeIds = null): array
    {
        $sourceIds = collect($sourcePersonIds)
            ->filter(fn ($id) => $id !== $keepPersonId)
            ->unique()
            ->values();

        $allowedTreeIdsCollection = collect($allowedTreeIds ?? [])->filter()->values();

        if ($sourceIds->isEmpty()) {
            return [
                'merge_people_count' => 0,
                'legacy_parent_links_count' => 0,
                'legacy_relationship_rows_count' => 0,
                'tree_memberships_count' => 0,
                'tree_edges_count' => 0,
                'tree_root_refs_count' => 0,
                'impacted_tree_ids' => [],
                'impacted_tree_count' => 0,
                'impacted_legacy_tree_count' => 0,
                'impacted_membership_tree_count' => 0,
                'impacted_edge_tree_count' => 0,
                'impacted_root_tree_count' => 0,
                'impacted_relationship_tree_count' => 0,
                'has_cross_tree_impact' => false,
            ];
        }

        $legacyImpactedTreeIds = Person::withTrashed()
            ->whereIn('id', $sourceIds)
            ->when($allowedTreeIdsCollection->isNotEmpty(), function ($query) use ($allowedTreeIdsCollection) {
                $query->whereIn('family_tree_id', $allowedTreeIdsCollection);
            })
            ->pluck('family_tree_id');

        $membershipImpactedTreeIds = TreePerson::query()
            ->whereIn('person_id', $sourceIds)
            ->when($allowedTreeIdsCollection->isNotEmpty(), function ($query) use ($allowedTreeIdsCollection) {
                $query->whereIn('tree_id', $allowedTreeIdsCollection);
            })
            ->pluck('tree_id');

        $edgeImpactedTreeIds = TreeEdge::query()
            ->where(function ($query) use ($sourceIds) {
                $query->whereIn('parent_person_id', $sourceIds)
                    ->orWhereIn('child_person_id', $sourceIds);
            })
            ->when($allowedTreeIdsCollection->isNotEmpty(), function ($query) use ($allowedTreeIdsCollection) {
                $query->whereIn('tree_id', $allowedTreeIdsCollection);
            })
            ->pluck('tree_id');

        $rootImpactedTreeIds = DB::table('family_trees')
            ->whereIn('root_person_id', $sourceIds)
            ->when($allowedTreeIdsCollection->isNotEmpty(), function ($query) use ($allowedTreeIdsCollection) {
                $query->whereIn('id', $allowedTreeIdsCollection);
            })
            ->pluck('id');

        $relationshipImpactedTreeIds = Relationship::query()
            ->where(function ($query) use ($sourceIds) {
                $query->whereIn('person1_id', $sourceIds)
                    ->orWhereIn('person2_id', $sourceIds);
            })
            ->when($allowedTreeIdsCollection->isNotEmpty(), function ($query) use ($allowedTreeIdsCollection) {
                $query->whereIn('family_tree_id', $allowedTreeIdsCollection);
            })
            ->pluck('family_tree_id');

        $impactedTreeIds = $legacyImpactedTreeIds
            ->concat($membershipImpactedTreeIds)
            ->concat($edgeImpactedTreeIds)
            ->concat($rootImpactedTreeIds)
            ->concat($relationshipImpactedTreeIds)
            ->filter()
            ->unique()
            ->values();

        return [
            'merge_people_count' => $sourceIds->count(),
            'legacy_parent_links_count' => Person::withTrashed()
                ->whereIn('father_id', $sourceIds)
                ->when($allowedTreeIdsCollection->isNotEmpty(), function ($query) use ($allowedTreeIdsCollection) {
                    $query->whereIn('family_tree_id', $allowedTreeIdsCollection);
                })
                ->count()
                + Person::withTrashed()
                    ->whereIn('mother_id', $sourceIds)
                    ->when($allowedTreeIdsCollection->isNotEmpty(), function ($query) use ($allowedTreeIdsCollection) {
                        $query->whereIn('family_tree_id', $allowedTreeIdsCollection);
                    })
                    ->count(),
            'legacy_relationship_rows_count' => Relationship::query()
                ->where(function ($query) use ($sourceIds) {
                    $query->whereIn('person1_id', $sourceIds)
                        ->orWhereIn('person2_id', $sourceIds);
                })
                ->when($allowedTreeIdsCollection->isNotEmpty(), function ($query) use ($allowedTreeIdsCollection) {
                    $query->whereIn('family_tree_id', $allowedTreeIdsCollection);
                })
                ->count(),
            'tree_memberships_count' => TreePerson::query()
                ->whereIn('person_id', $sourceIds)
                ->when($allowedTreeIdsCollection->isNotEmpty(), function ($query) use ($allowedTreeIdsCollection) {
                    $query->whereIn('tree_id', $allowedTreeIdsCollection);
                })
                ->count(),
            'tree_edges_count' => TreeEdge::query()
                ->where(function ($query) use ($sourceIds) {
                    $query->whereIn('parent_person_id', $sourceIds)
                        ->orWhereIn('child_person_id', $sourceIds);
                })
                ->when($allowedTreeIdsCollection->isNotEmpty(), function ($query) use ($allowedTreeIdsCollection) {
                    $query->whereIn('tree_id', $allowedTreeIdsCollection);
                })
                ->count(),
            'tree_root_refs_count' => DB::table('family_trees')
                ->whereIn('root_person_id', $sourceIds)
                ->when($allowedTreeIdsCollection->isNotEmpty(), function ($query) use ($allowedTreeIdsCollection) {
                    $query->whereIn('id', $allowedTreeIdsCollection);
                })
                ->count(),
            'impacted_tree_ids' => $impactedTreeIds->all(),
            'impacted_tree_count' => $impactedTreeIds->count(),
            'impacted_legacy_tree_count' => $legacyImpactedTreeIds->filter()->unique()->count(),
            'impacted_membership_tree_count' => $membershipImpactedTreeIds->filter()->unique()->count(),
            'impacted_edge_tree_count' => $edgeImpactedTreeIds->filter()->unique()->count(),
            'impacted_root_tree_count' => $rootImpactedTreeIds->filter()->unique()->count(),
            'impacted_relationship_tree_count' => $relationshipImpactedTreeIds
                ->filter()
                ->unique()
                ->count(),
            'has_cross_tree_impact' => $impactedTreeIds->count() > 1,
        ];
    }

    /**
     * @param array<int, string> $sourcePersonIds
     * @param array<int, string> $allowedTreeIds
     * @return array{kept_person_id: string, merged_person_ids: array<int, string>}
     */
    public function merge(string $keepPersonId, array $sourcePersonIds, array $allowedTreeIds): array
    {
        return DB::transaction(function () use ($keepPersonId, $sourcePersonIds, $allowedTreeIds) {
            $keep = Person::withTrashed()->findOrFail($keepPersonId);

            $sourceIds = collect($sourcePersonIds)
                ->filter(fn ($id) => $id !== $keepPersonId)
                ->unique()
                ->values();

            if ($sourceIds->isEmpty()) {
                return [
                    'kept_person_id' => $keep->id,
                    'merged_person_ids' => [],
                ];
            }

            $sources = Person::withTrashed()->whereIn('id', $sourceIds)->get();
            $allowedTreeIdsCollection = collect($allowedTreeIds)->filter()->values();

            $this->assertNoForbiddenReferences($sourceIds->all(), $allowedTreeIdsCollection->all());

            foreach ($sources as $source) {
                $this->repointLegacyFamilyLinks($source->id, $keep->id, $allowedTreeIdsCollection->all());
                $this->repointRelationships($source->id, $keep->id, $allowedTreeIdsCollection->all());
                $this->repointTreeMembership($source->id, $keep->id, $allowedTreeIdsCollection->all());
                $this->repointTreeEdges($source->id, $keep->id, $allowedTreeIdsCollection->all());

                if (is_null($keep->birth_date) && !is_null($source->birth_date)) {
                    $keep->birth_date = $source->birth_date;
                }

                if (empty($keep->birth_place) && !empty($source->birth_place)) {
                    $keep->birth_place = $source->birth_place;
                }

                if (empty($keep->last_name) && !empty($source->last_name)) {
                    $keep->last_name = $source->last_name;
                }

                if (empty($keep->maiden_name) && !empty($source->maiden_name)) {
                    $keep->maiden_name = $source->maiden_name;
                }

                if (empty($keep->nickname) && !empty($source->nickname)) {
                    $keep->nickname = $source->nickname;
                }

                if (empty($keep->notes) && !empty($source->notes)) {
                    $keep->notes = $source->notes;
                }

                $source->delete();
            }

            $keep->save();

            return [
                'kept_person_id' => $keep->id,
                'merged_person_ids' => $sources->pluck('id')->all(),
            ];
        });
    }

    /**
     * @param array<int, string> $allowedTreeIds
     */
    private function repointLegacyFamilyLinks(string $sourcePersonId, string $keepPersonId, array $allowedTreeIds): void
    {
        Person::withTrashed()
            ->where('father_id', $sourcePersonId)
            ->whereIn('family_tree_id', $allowedTreeIds)
            ->update(['father_id' => $keepPersonId]);
        Person::withTrashed()
            ->where('mother_id', $sourcePersonId)
            ->whereIn('family_tree_id', $allowedTreeIds)
            ->update(['mother_id' => $keepPersonId]);

        DB::table('family_trees')
            ->where('root_person_id', $sourcePersonId)
            ->whereIn('id', $allowedTreeIds)
            ->update(['root_person_id' => $keepPersonId]);
    }

    /**
     * @param array<int, string> $allowedTreeIds
     */
    private function repointRelationships(string $sourcePersonId, string $keepPersonId, array $allowedTreeIds): void
    {
        Relationship::where('person1_id', $sourcePersonId)
            ->whereIn('family_tree_id', $allowedTreeIds)
            ->update(['person1_id' => $keepPersonId]);
        Relationship::where('person2_id', $sourcePersonId)
            ->whereIn('family_tree_id', $allowedTreeIds)
            ->update(['person2_id' => $keepPersonId]);

        $dedupeGroups = Relationship::query()
            ->select(['person1_id', 'person2_id', 'relationship_type'])
            ->whereIn('family_tree_id', $allowedTreeIds)
            ->groupBy(['person1_id', 'person2_id', 'relationship_type'])
            ->havingRaw('COUNT(*) > 1')
            ->get();

        foreach ($dedupeGroups as $group) {
            $dupes = Relationship::query()
                ->where('person1_id', $group->person1_id)
                ->where('person2_id', $group->person2_id)
                ->where('relationship_type', $group->relationship_type)
                ->whereIn('family_tree_id', $allowedTreeIds)
                ->orderBy('created_at')
                ->get();

            $dupes->slice(1)->each->delete();
        }
    }

    /**
     * @param array<int, string> $allowedTreeIds
     */
    private function repointTreeMembership(string $sourcePersonId, string $keepPersonId, array $allowedTreeIds): void
    {
        $memberships = TreePerson::where('person_id', $sourcePersonId)
            ->whereIn('tree_id', $allowedTreeIds)
            ->get();

        foreach ($memberships as $membership) {
            $existing = TreePerson::where('tree_id', $membership->tree_id)
                ->where('person_id', $keepPersonId)
                ->first();

            if ($existing) {
                $membership->delete();
                continue;
            }

            $membership->update(['person_id' => $keepPersonId]);
        }
    }

    /**
     * @param array<int, string> $allowedTreeIds
     */
    private function repointTreeEdges(string $sourcePersonId, string $keepPersonId, array $allowedTreeIds): void
    {
        TreeEdge::where('parent_person_id', $sourcePersonId)
            ->whereIn('tree_id', $allowedTreeIds)
            ->update(['parent_person_id' => $keepPersonId]);
        TreeEdge::where('child_person_id', $sourcePersonId)
            ->whereIn('tree_id', $allowedTreeIds)
            ->update(['child_person_id' => $keepPersonId]);

        $duplicateEdgeGroups = TreeEdge::query()
            ->select(['tree_id', 'parent_person_id', 'child_person_id', 'parent_role'])
            ->whereIn('tree_id', $allowedTreeIds)
            ->groupBy(['tree_id', 'parent_person_id', 'child_person_id', 'parent_role'])
            ->havingRaw('COUNT(*) > 1')
            ->get();

        foreach ($duplicateEdgeGroups as $group) {
            $dupes = TreeEdge::query()
                ->where('tree_id', $group->tree_id)
                ->where('parent_person_id', $group->parent_person_id)
                ->where('child_person_id', $group->child_person_id)
                ->where('parent_role', $group->parent_role)
                ->orderBy('created_at')
                ->get();

            $dupes->slice(1)->each->delete();
        }
    }

    /**
     * @param array<int, string> $sourcePersonIds
     * @param array<int, string> $allowedTreeIds
     */
    private function assertNoForbiddenReferences(array $sourcePersonIds, array $allowedTreeIds): void
    {
        $hasLegacyParentRefsOutsideAllowedTrees = Person::withTrashed()
            ->where(function ($query) use ($sourcePersonIds) {
                $query->whereIn('father_id', $sourcePersonIds)
                    ->orWhereIn('mother_id', $sourcePersonIds);
            })
            ->whereNotIn('family_tree_id', $allowedTreeIds)
            ->exists();

        $hasRelationshipRefsOutsideAllowedTrees = Relationship::query()
            ->where(function ($query) use ($sourcePersonIds) {
                $query->whereIn('person1_id', $sourcePersonIds)
                    ->orWhereIn('person2_id', $sourcePersonIds);
            })
            ->whereNotIn('family_tree_id', $allowedTreeIds)
            ->exists();

        $hasTreeEdgeRefsOutsideAllowedTrees = TreeEdge::query()
            ->where(function ($query) use ($sourcePersonIds) {
                $query->whereIn('parent_person_id', $sourcePersonIds)
                    ->orWhereIn('child_person_id', $sourcePersonIds);
            })
            ->whereNotIn('tree_id', $allowedTreeIds)
            ->exists();

        $hasRootRefsOutsideAllowedTrees = DB::table('family_trees')
            ->whereIn('root_person_id', $sourcePersonIds)
            ->whereNotIn('id', $allowedTreeIds)
            ->exists();

        $hasMembershipRefsOutsideAllowedTrees = TreePerson::query()
            ->whereIn('person_id', $sourcePersonIds)
            ->whereNotIn('tree_id', $allowedTreeIds)
            ->exists();

        if (
            $hasLegacyParentRefsOutsideAllowedTrees
            || $hasRelationshipRefsOutsideAllowedTrees
            || $hasTreeEdgeRefsOutsideAllowedTrees
            || $hasRootRefsOutsideAllowedTrees
            || $hasMembershipRefsOutsideAllowedTrees
        ) {
            throw new AuthorizationException('You can only merge people from trees you own.');
        }
    }
}
