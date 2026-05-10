<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        DB::table('people')
            ->select(['id', 'family_tree_id'])
            ->whereNotNull('family_tree_id')
            ->orderBy('id')
            ->chunk(500, function ($people) use ($now): void {
                foreach ($people as $person) {
                    DB::table('tree_people')->insertOrIgnore([
                        'id' => (string) Str::uuid(),
                        'tree_id' => $person->family_tree_id,
                        'person_id' => $person->id,
                        'metadata' => null,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }
            });
    }

    public function down(): void
    {
        // Backfill migration is intentionally non-destructive.
    }
};
