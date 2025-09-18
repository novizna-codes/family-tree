<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\FamilyTree;
use App\Models\Person;
use App\Models\Relationship;

class TestFamilySeeder extends Seeder
{
    /**
     * Seed test family data for forest layout testing.
     */
    public function run(): void
    {
        // Create a test user
        $user = User::create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
        ]);

        // Create family tree
        $tree = FamilyTree::create([
            'name' => 'Test Forest Families',
            'description' => 'Multiple independent families for forest layout testing',
            'user_id' => $user->id,
            'is_public' => false,
        ]);

        // Family 1: The Johnson Family (Nuclear family)
        $johnJohnson = Person::create([
            'first_name' => 'John',
            'last_name' => 'Johnson',
            'gender' => 'male',
            'birth_date' => '1980-03-15',
            'family_tree_id' => $tree->id,
        ]);

        $maryJohnson = Person::create([
            'first_name' => 'Mary',
            'last_name' => 'Johnson',
            'gender' => 'female',
            'birth_date' => '1982-07-22',
            'family_tree_id' => $tree->id,
        ]);

        $tomJohnson = Person::create([
            'first_name' => 'Tom',
            'last_name' => 'Johnson',
            'gender' => 'male',
            'birth_date' => '2005-11-10',
            'family_tree_id' => $tree->id,
        ]);

        $sarahJohnson = Person::create([
            'first_name' => 'Sarah',
            'last_name' => 'Johnson',
            'gender' => 'female',
            'birth_date' => '2008-02-14',
            'family_tree_id' => $tree->id,
        ]);

        // Johnson family relationships
        Relationship::create([
            'person_id' => $johnJohnson->id,
            'related_person_id' => $maryJohnson->id,
            'relationship_type' => 'spouse',
            'family_tree_id' => $tree->id,
        ]);

        Relationship::create([
            'person_id' => $johnJohnson->id,
            'related_person_id' => $tomJohnson->id,
            'relationship_type' => 'parent',
            'family_tree_id' => $tree->id,
        ]);

        Relationship::create([
            'person_id' => $maryJohnson->id,
            'related_person_id' => $tomJohnson->id,
            'relationship_type' => 'parent',
            'family_tree_id' => $tree->id,
        ]);

        Relationship::create([
            'person_id' => $johnJohnson->id,
            'related_person_id' => $sarahJohnson->id,
            'relationship_type' => 'parent',
            'family_tree_id' => $tree->id,
        ]);

        Relationship::create([
            'person_id' => $maryJohnson->id,
            'related_person_id' => $sarahJohnson->id,
            'relationship_type' => 'parent',
            'family_tree_id' => $tree->id,
        ]);

        // Family 2: The Smith Orphans (Independent people)
        $bobSmith = Person::create([
            'first_name' => 'Bob',
            'last_name' => 'Smith',
            'gender' => 'male',
            'birth_date' => '1975-06-30',
            'family_tree_id' => $tree->id,
        ]);

        $aliceSmith = Person::create([
            'first_name' => 'Alice',
            'last_name' => 'Smith',
            'gender' => 'female',
            'birth_date' => '1990-12-08',
            'family_tree_id' => $tree->id,
        ]);

        // Family 3: The Wilson Extended Family (Three generations)
        $grandpaWilson = Person::create([
            'first_name' => 'Robert',
            'last_name' => 'Wilson',
            'gender' => 'male',
            'birth_date' => '1950-01-15',
            'family_tree_id' => $tree->id,
        ]);

        $grandmaWilson = Person::create([
            'first_name' => 'Helen',
            'last_name' => 'Wilson',
            'gender' => 'female',
            'birth_date' => '1952-09-20',
            'family_tree_id' => $tree->id,
        ]);

        $dadWilson = Person::create([
            'first_name' => 'Michael',
            'last_name' => 'Wilson',
            'gender' => 'male',
            'birth_date' => '1975-04-12',
            'family_tree_id' => $tree->id,
        ]);

        $momWilson = Person::create([
            'first_name' => 'Jennifer',
            'last_name' => 'Wilson',
            'gender' => 'female',
            'birth_date' => '1977-08-05',
            'family_tree_id' => $tree->id,
        ]);

        $kidWilson = Person::create([
            'first_name' => 'Emma',
            'last_name' => 'Wilson',
            'gender' => 'female',
            'birth_date' => '2010-05-18',
            'family_tree_id' => $tree->id,
        ]);

        // Wilson family relationships
        Relationship::create([
            'person_id' => $grandpaWilson->id,
            'related_person_id' => $grandmaWilson->id,
            'relationship_type' => 'spouse',
            'family_tree_id' => $tree->id,
        ]);

        Relationship::create([
            'person_id' => $grandpaWilson->id,
            'related_person_id' => $dadWilson->id,
            'relationship_type' => 'parent',
            'family_tree_id' => $tree->id,
        ]);

        Relationship::create([
            'person_id' => $grandmaWilson->id,
            'related_person_id' => $dadWilson->id,
            'relationship_type' => 'parent',
            'family_tree_id' => $tree->id,
        ]);

        Relationship::create([
            'person_id' => $dadWilson->id,
            'related_person_id' => $momWilson->id,
            'relationship_type' => 'spouse',
            'family_tree_id' => $tree->id,
        ]);

        Relationship::create([
            'person_id' => $dadWilson->id,
            'related_person_id' => $kidWilson->id,
            'relationship_type' => 'parent',
            'family_tree_id' => $tree->id,
        ]);

        Relationship::create([
            'person_id' => $momWilson->id,
            'related_person_id' => $kidWilson->id,
            'relationship_type' => 'parent',
            'family_tree_id' => $tree->id,
        ]);

        $this->command->info('Test family data seeded successfully!');
        $this->command->info('Created families:');
        $this->command->info('- Johnson Family: Nuclear family with 2 parents + 2 children');
        $this->command->info('- Smith Orphans: 2 independent people (no relationships)');
        $this->command->info('- Wilson Family: 3-generation family (grandparents → parents → child)');
        $this->command->info('User email: test@example.com');
        $this->command->info('Password: password');
    }
}