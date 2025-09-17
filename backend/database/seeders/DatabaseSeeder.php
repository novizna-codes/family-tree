<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RolesAndPermissionsSeeder::class,
            SystemSettingsSeeder::class,
        ]);

        $this->command->info('System initialization completed successfully!');
        $this->command->info('');
        $this->command->info('The system is ready to use.');
        $this->command->info('Available user roles: admin, user');
        $this->command->info('Create your first admin user through the setup page: /setup');
    }
}
