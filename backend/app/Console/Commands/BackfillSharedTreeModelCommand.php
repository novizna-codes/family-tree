<?php

namespace App\Console\Commands;

use App\Models\FamilyTree;
use App\Models\Person;
use App\Models\TreeEdge;
use App\Models\TreePerson;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class BackfillSharedTreeModelCommand extends Command
{
    protected $signature = 'family-tree:backfill-shared-model {--dry-run : Report only, do not write} {--reset : Clear tree_people/tree_edges before backfill}';

    protected $description = 'Backfill tree_people and tree_edges from legacy people.family_tree_id, father_id, and mother_id';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $reset = (bool) $this->option('reset');

        if ($dryRun) {
            $this->info('Running in dry-run mode. No writes will be made.');
        }

        DB::beginTransaction();

        try {
            if ($reset) {
                if (!$dryRun) {
                    TreeEdge::query()->delete();
                    TreePerson::query()->delete();
                }

                $this->warn('Reset requested: tree_people and tree_edges will be rebuilt.');
            }

            $totalMemberships = 0;
            $totalEdges = 0;

            FamilyTree::query()->chunk(100, function ($trees) use (&$totalMemberships, &$totalEdges, $dryRun) {
                foreach ($trees as $tree) {
                    $people = Person::withTrashed()
                        ->where('family_tree_id', $tree->id)
                        ->get(['id', 'family_tree_id', 'father_id', 'mother_id']);

                    $personIdsInTree = $people->pluck('id')->flip();

                    foreach ($people as $person) {
                        if (!$dryRun) {
                            TreePerson::firstOrCreate([
                                'tree_id' => $tree->id,
                                'person_id' => $person->id,
                            ], [
                                'metadata' => null,
                            ]);
                        }

                        $totalMemberships++;

                        if ($person->father_id && $personIdsInTree->has($person->father_id)) {
                            if (!$dryRun) {
                                TreeEdge::firstOrCreate([
                                    'tree_id' => $tree->id,
                                    'parent_person_id' => $person->father_id,
                                    'child_person_id' => $person->id,
                                    'parent_role' => 'father',
                                ], [
                                    'relationship_type' => 'biological',
                                    'sort_order' => null,
                                ]);
                            }

                            $totalEdges++;
                        }

                        if ($person->mother_id && $personIdsInTree->has($person->mother_id)) {
                            if (!$dryRun) {
                                TreeEdge::firstOrCreate([
                                    'tree_id' => $tree->id,
                                    'parent_person_id' => $person->mother_id,
                                    'child_person_id' => $person->id,
                                    'parent_role' => 'mother',
                                ], [
                                    'relationship_type' => 'biological',
                                    'sort_order' => null,
                                ]);
                            }

                            $totalEdges++;
                        }
                    }
                }
            });

            $this->info("Processed memberships: {$totalMemberships}");
            $this->info("Processed parent-child edges: {$totalEdges}");

            if ($dryRun) {
                DB::rollBack();
                $this->info('Dry-run rollback complete.');
                return self::SUCCESS;
            }

            DB::commit();
            return self::SUCCESS;
        } catch (\Throwable $e) {
            DB::rollBack();
            $this->error('Backfill failed: ' . $e->getMessage());
            return self::FAILURE;
        }
    }
}
