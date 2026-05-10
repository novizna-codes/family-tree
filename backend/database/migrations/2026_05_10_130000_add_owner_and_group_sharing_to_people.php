<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('people', function (Blueprint $table) {
            $table->unsignedBigInteger('owner_user_id')->nullable()->after('family_tree_id');
        });

        $treeOwners = DB::table('family_trees')
            ->select(['id', 'user_id'])
            ->get()
            ->pluck('user_id', 'id');

        DB::table('people')->select(['id', 'family_tree_id'])->orderBy('id')->chunk(500, function ($rows) use ($treeOwners) {
            foreach ($rows as $row) {
                DB::table('people')
                    ->where('id', $row->id)
                    ->update([
                        'owner_user_id' => $treeOwners[$row->family_tree_id] ?? null,
                    ]);
            }
        });

        Schema::table('people', function (Blueprint $table) {
            $table->unsignedBigInteger('owner_user_id')->nullable(false)->change();
            $table->foreign('owner_user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->index('owner_user_id');
            $table->index(['owner_user_id', 'family_tree_id']);
        });

        Schema::create('user_groups', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('owner_user_id');
            $table->string('name');
            $table->text('description')->nullable();
            $table->timestamps();

            $table->foreign('owner_user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->unique(['owner_user_id', 'name']);
            $table->index('owner_user_id');
        });

        Schema::create('user_group_members', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_group_id');
            $table->unsignedBigInteger('user_id');
            $table->timestamps();

            $table->foreign('user_group_id')->references('id')->on('user_groups')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->unique(['user_group_id', 'user_id']);
            $table->index('user_id');
        });

        Schema::create('people_share_groups', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('person_id');
            $table->uuid('user_group_id');
            $table->timestamps();

            $table->foreign('person_id')->references('id')->on('people')->cascadeOnDelete();
            $table->foreign('user_group_id')->references('id')->on('user_groups')->cascadeOnDelete();
            $table->unique(['person_id', 'user_group_id']);
            $table->index('user_group_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('people_share_groups');
        Schema::dropIfExists('user_group_members');
        Schema::dropIfExists('user_groups');

        Schema::table('people', function (Blueprint $table) {
            $table->dropIndex(['owner_user_id', 'family_tree_id']);
            $table->dropIndex(['owner_user_id']);
            $table->dropForeign(['owner_user_id']);
            $table->dropColumn('owner_user_id');
        });
    }
};
