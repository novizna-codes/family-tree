<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Remove duplicate 'allow_public_registration' setting 
        // The correct one is 'public_registration_enabled' from the original migration
        DB::table('system_settings')
            ->where('key', 'allow_public_registration')
            ->delete();
            
        // Also remove any duplicate 'site_name' if it exists from seeder
        $siteNameCount = DB::table('system_settings')
            ->where('key', 'site_name')
            ->count();
            
        if ($siteNameCount > 1) {
            // Keep the one from migration (should be first), delete others
            $firstSiteName = DB::table('system_settings')
                ->where('key', 'site_name')
                ->orderBy('id')
                ->first();
                
            if ($firstSiteName) {
                DB::table('system_settings')
                    ->where('key', 'site_name')
                    ->where('id', '!=', $firstSiteName->id)
                    ->delete();
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // We don't want to restore duplicates, so leave this empty
        // If needed for testing, the seeder can be run again
    }
};
