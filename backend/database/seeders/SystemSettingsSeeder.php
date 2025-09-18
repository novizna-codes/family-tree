<?php

namespace Database\Seeders;

use App\Models\SystemSetting;
use Illuminate\Database\Seeder;

class SystemSettingsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $defaultSettings = [
            [
                'key' => 'default_language',
                'value' => 'en',
                'type' => 'string',
                'description' => 'Default language for new users and the application'
            ],
            [
                'key' => 'max_tree_size',
                'value' => 1000,
                'type' => 'integer',
                'description' => 'Maximum number of people allowed per family tree'
            ],
            [
                'key' => 'enable_email_notifications',
                'value' => true,
                'type' => 'boolean',
                'description' => 'Send email notifications for important events'
            ],
            [
                'key' => 'maintenance_mode',
                'value' => false,
                'type' => 'boolean',
                'description' => 'Put the application in maintenance mode'
            ],
            [
                'key' => 'backup_frequency',
                'value' => 'weekly',
                'type' => 'string',
                'description' => 'How often to create automatic backups (daily, weekly, monthly)'
            ],
            [
                'key' => 'max_file_upload_size',
                'value' => 10,
                'type' => 'integer',
                'description' => 'Maximum file upload size in MB for photos and documents'
            ],
            [
                'key' => 'privacy_default',
                'value' => 'private',
                'type' => 'string',
                'description' => 'Default privacy setting for new family trees (private, family, public)'
            ],
            [
                'key' => 'session_timeout',
                'value' => 120,
                'type' => 'integer',
                'description' => 'User session timeout in minutes'
            ]
        ];

        foreach ($defaultSettings as $setting) {
            SystemSetting::updateOrCreate(
                ['key' => $setting['key']],
                [
                    'value' => $setting['value'],
                    'type' => $setting['type'],
                    'description' => $setting['description']
                ]
            );
        }

        $this->command->info('System settings seeded successfully.');
    }
}
