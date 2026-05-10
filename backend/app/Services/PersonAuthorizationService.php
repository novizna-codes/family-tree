<?php

namespace App\Services;

use App\Models\Person;
use App\Models\FamilyTree;
use App\Models\Relationship;
use App\Models\TreeEdge;
use App\Models\TreePerson;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class PersonAuthorizationService
{
    /**
     * @param array<int, string> $mergePersonIds
     * @return array<int, string>|JsonResponse
     */
    public function resolveAllowedTreeIdsForMerge(Request $request, string $keepPersonId, array $mergePersonIds): array|JsonResponse
    {
        $personIds = collect($mergePersonIds)
            ->push($keepPersonId)
            ->unique()
            ->values();

        $existingCount = Person::query()
            ->withTrashed()
            ->whereIn('id', $personIds)
            ->count();

        $scopedCount = Person::query()
            ->withTrashed()
            ->whereIn('id', $personIds)
            ->accessibleBy($request->user())
            ->count();

        if ($existingCount !== $personIds->count() || $scopedCount !== $personIds->count()) {
            return $this->forbiddenMergeResponse();
        }

        $impactedTreeIds = $this->resolveImpactedTreeIds($personIds);

        $allowedTreeIds = FamilyTree::query()
            ->whereIn('id', $impactedTreeIds)
            ->where('user_id', $request->user()->id)
            ->pluck('id');

        if ($allowedTreeIds->count() !== $impactedTreeIds->count()) {
            return $this->forbiddenMergeResponse();
        }

        return $allowedTreeIds->values()->all();
    }

    /**
     * @param array<int, string> $mergePersonIds
     */
    public function ensureUserCanMergePeople(Request $request, string $keepPersonId, array $mergePersonIds): ?JsonResponse
    {
        $allowedTreeIds = $this->resolveAllowedTreeIdsForMerge($request, $keepPersonId, $mergePersonIds);

        return $allowedTreeIds instanceof JsonResponse ? $allowedTreeIds : null;
    }

    /**
     * @param array<int, string> $mergePersonIds
     */
    public function ensureUserCanUpdateMergedPeople(Request $request, string $keepPersonId, array $mergePersonIds): ?JsonResponse
    {
        $personIds = collect($mergePersonIds)
            ->push($keepPersonId)
            ->unique()
            ->values();

        $people = Person::query()
            ->withTrashed()
            ->whereIn('id', $personIds)
            ->get();

        foreach ($people as $person) {
            if ($request->user()->cannot('update', $person)) {
                return response()->json([
                    'message' => 'You can only merge people from trees you own.',
                ], 403);
            }
        }

        return null;
    }

    /**
     * @param Collection<int, string> $personIds
     * @return Collection<int, string>
     */
    private function resolveImpactedTreeIds(Collection $personIds): Collection
    {
        $legacyTreeIds = Person::query()
            ->withTrashed()
            ->whereIn('id', $personIds)
            ->pluck('family_tree_id');

        $membershipTreeIds = TreePerson::query()
            ->whereIn('person_id', $personIds)
            ->pluck('tree_id');

        $edgeTreeIds = TreeEdge::query()
            ->where(function ($query) use ($personIds) {
                $query->whereIn('parent_person_id', $personIds)
                    ->orWhereIn('child_person_id', $personIds);
            })
            ->pluck('tree_id');

        $rootTreeIds = FamilyTree::query()
            ->whereIn('root_person_id', $personIds)
            ->pluck('id');

        $relationshipTreeIds = Relationship::query()
            ->where(function ($query) use ($personIds) {
                $query->whereIn('person1_id', $personIds)
                    ->orWhereIn('person2_id', $personIds);
            })
            ->pluck('family_tree_id');

        return $legacyTreeIds
            ->concat($membershipTreeIds)
            ->concat($edgeTreeIds)
            ->concat($rootTreeIds)
            ->concat($relationshipTreeIds)
            ->filter()
            ->unique()
            ->values();
    }

    private function forbiddenMergeResponse(): JsonResponse
    {
        return response()->json([
            'message' => 'You can only merge people from trees you own.',
        ], 403);
    }
}
