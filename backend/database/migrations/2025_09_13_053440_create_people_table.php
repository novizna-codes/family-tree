<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('people', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('family_tree_id')->constrained()->onDelete('cascade');
            $table->string('first_name');
            $table->string('last_name')->nullable();
            $table->string('maiden_name')->nullable();
            $table->string('nickname')->nullable();
            $table->enum('gender', ['M', 'F', 'O'])->nullable();
            $table->date('birth_date')->nullable();
            $table->boolean('is_deceased')->default(false);
            $table->date('death_date')->nullable();
            $table->string('birth_place')->nullable();
            $table->string('death_place')->nullable();
            $table->uuid('father_id')->nullable();
            $table->uuid('mother_id')->nullable();
            $table->string('photo_path')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('father_id')->references('id')->on('people')->onDelete('set null');
            $table->foreign('mother_id')->references('id')->on('people')->onDelete('set null');

            $table->index(['family_tree_id', 'first_name']);
            $table->index(['father_id']);
            $table->index(['mother_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('people');
    }
};
