<?php

namespace App\Console\Commands;

use App\Models\Person;
use App\Services\PersonMergeService;
use Illuminate\Console\Command;

class DedupePeopleCommand extends Command
{
    protected $signature = 'family-tree:dedupe-people {--dry-run : Show groups only} {--limit=50 : Maximum groups to process}';

    protected $description = 'Merge duplicate people across trees using strict normalized key matching';

    public function handle(PersonMergeService $personMergeService): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $limit = max(1, (int) $this->option('limit'));

        $groups = Person::withTrashed()
            ->selectRaw('LOWER(TRIM(first_name)) as fn_key, LOWER(TRIM(COALESCE(last_name, ""))) as ln_key, birth_date, COUNT(*) as total')
            ->groupBy(['fn_key', 'ln_key', 'birth_date'])
            ->havingRaw('COUNT(*) > 1')
            ->limit($limit)
            ->get();

        if ($groups->isEmpty()) {
            $this->info('No duplicate groups found.');
            return self::SUCCESS;
        }

        $this->info('Duplicate groups found: ' . $groups->count());

        $mergedGroups = 0;
        $mergedPeople = 0;

        foreach ($groups as $group) {
            $people = Person::withTrashed()
                ->whereRaw('LOWER(TRIM(first_name)) = ?', [$group->fn_key])
                ->whereRaw('LOWER(TRIM(COALESCE(last_name, ""))) = ?', [$group->ln_key])
                ->where('birth_date', $group->birth_date)
                ->orderByRaw('CASE WHEN deleted_at IS NULL THEN 0 ELSE 1 END')
                ->orderBy('created_at')
                ->get();

            if ($people->count() < 2) {
                continue;
            }

            $keep = $people->first();
            $mergeIds = $people->slice(1)->pluck('id')->all();

            $this->line(sprintf(
                'Group: %s %s (%s) -> keep %s merge %d',
                $keep->first_name,
                $keep->last_name ?? '',
                $keep->birth_date ?? 'no-date',
                $keep->id,
                count($mergeIds)
            ));

            if (!$dryRun) {
                $personMergeService->merge($keep->id, $mergeIds);
                $mergedGroups++;
                $mergedPeople += count($mergeIds);
            }
        }

        if ($dryRun) {
            $this->info('Dry-run complete. No data changed.');
            return self::SUCCESS;
        }

        $this->info("Merged groups: {$mergedGroups}");
        $this->info("Merged people: {$mergedPeople}");

        return self::SUCCESS;
    }
}
