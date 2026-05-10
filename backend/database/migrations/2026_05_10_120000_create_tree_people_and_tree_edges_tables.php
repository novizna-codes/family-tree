<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tree_people', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tree_id')->constrained('family_trees')->cascadeOnDelete();
            $table->foreignUuid('person_id')->constrained('people')->cascadeOnDelete();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->unique(['tree_id', 'person_id']);
            $table->index('person_id');
        });

        Schema::create('tree_edges', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tree_id')->constrained('family_trees')->cascadeOnDelete();
            $table->foreignUuid('parent_person_id')->constrained('people')->cascadeOnDelete();
            $table->foreignUuid('child_person_id')->constrained('people')->cascadeOnDelete();
            $table->enum('parent_role', ['father', 'mother']);
            $table->enum('relationship_type', ['biological', 'adoptive', 'step', 'guardian'])->default('biological');
            $table->unsignedInteger('sort_order')->nullable();
            $table->timestamps();

            $table->unique(['tree_id', 'parent_person_id', 'child_person_id', 'parent_role'], 'tree_edges_unique');
            $table->index(['tree_id', 'parent_person_id']);
            $table->index(['tree_id', 'child_person_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tree_edges');
        Schema::dropIfExists('tree_people');
    }
};
