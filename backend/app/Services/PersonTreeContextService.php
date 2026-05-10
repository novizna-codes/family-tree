<?php

namespace App\Services;

use App\Models\FamilyTree;
use App\Models\Person;
use App\Models\TreeEdge;
use App\Models\TreePerson;
use App\Models\User;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class PersonTreeContextService
{
    public function personBelongsToFamilyTreeContext(Person $person, FamilyTree $familyTree): bool
    {
        $belongsByMembership = TreePerson::query()
            ->where('tree_id', $familyTree->id)
            ->where('person_id', $person->id)
            ->exists();

        if ($belongsByMembership) {
            return true;
        }

        return $person->family_tree_id === $familyTree->id;
    }

    public function ensureParentsBelongToTreeContext(
        array $validated,
        FamilyTree $familyTree,
        SubtreeCopyService $subtreeCopyService,
        User $user
    ): void {
        $errors = [];

        if (!empty($validated['father_id'])) {
            $father = Person::find($validated['father_id']);

            if (
                !$father
                || !$subtreeCopyService->personBelongsToTree($father, $familyTree)
                || !Person::query()->accessibleBy($user)->where('id', $father->id)->exists()
            ) {
                $errors['father_id'] = ['The selected father_id is invalid for this family tree context.'];
            }
        }

        if (!empty($validated['mother_id'])) {
            $mother = Person::find($validated['mother_id']);

            if (
                !$mother
                || !$subtreeCopyService->personBelongsToTree($mother, $familyTree)
                || !Person::query()->accessibleBy($user)->where('id', $mother->id)->exists()
            ) {
                $errors['mother_id'] = ['The selected mother_id is invalid for this family tree context.'];
            }
        }

        if (!empty($errors)) {
            throw ValidationException::withMessages($errors);
        }
    }

    public function applyTreeParentContext(Collection $people, FamilyTree $familyTree, Authenticatable $user): void
    {
        $personIds = $people->pluck('id')->values();

        if ($personIds->isEmpty()) {
            return;
        }

        $treeEdges = TreeEdge::query()
            ->where('tree_id', $familyTree->id)
            ->whereIn('child_person_id', $personIds)
            ->whereIn('parent_role', ['father', 'mother'])
            ->get();

        $parentIds = $treeEdges->pluck('parent_person_id')->unique()->values();
        $parentsById = Person::query()
            ->accessibleBy($user)
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
                $father = $parentsById->get($fatherEdge->parent_person_id);

                if ($father) {
                    $person->setAttribute('father_id', $fatherEdge->parent_person_id);
                    $person->setRelation('father', $father);
                }
            }

            if ($motherEdge) {
                $mother = $parentsById->get($motherEdge->parent_person_id);

                if ($mother) {
                    $person->setAttribute('mother_id', $motherEdge->parent_person_id);
                    $person->setRelation('mother', $mother);
                }
            }
        }
    }

    public function resolveTreeChildren(FamilyTree $familyTree, Person $person, Authenticatable $user): EloquentCollection
    {
        $treeChildren = Person::query()
            ->accessibleBy($user)
            ->whereHas('childEdges', function ($query) use ($familyTree, $person) {
                $query->where('tree_id', $familyTree->id)
                    ->where('parent_person_id', $person->id);
            })
            ->get();

        if ($treeChildren->isNotEmpty()) {
            return $treeChildren;
        }

        return Person::query()
            ->accessibleBy($user)
            ->where(function ($query) use ($familyTree) {
                $query->whereHas('treeMemberships', function ($membershipQuery) use ($familyTree) {
                        $membershipQuery->where('tree_id', $familyTree->id);
                    })
                    ->orWhere(function ($legacyQuery) use ($familyTree) {
                        $legacyQuery->where('people.family_tree_id', $familyTree->id)
                            ->whereDoesntHave('treeMemberships', function ($membershipQuery) use ($familyTree) {
                                $membershipQuery->where('tree_id', $familyTree->id);
                            });
                    });
            })
            ->where(function ($query) use ($person) {
                $query->where('father_id', $person->id)
                    ->orWhere('mother_id', $person->id);
            })
            ->get();
    }
}
