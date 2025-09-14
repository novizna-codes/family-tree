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
        Schema::create('relationships', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('family_tree_id')->constrained()->onDelete('cascade');
            $table->uuid('person1_id');
            $table->uuid('person2_id');
            $table->enum('relationship_type', ['spouse', 'partner', 'divorced', 'separated']);
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->string('marriage_place')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->foreign('person1_id')->references('id')->on('people')->onDelete('cascade');
            $table->foreign('person2_id')->references('id')->on('people')->onDelete('cascade');
            
            $table->unique(['person1_id', 'person2_id', 'relationship_type']);
            $table->index(['family_tree_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('relationships');
    }
};
