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
        Schema::table('interviews', function (Blueprint $table) {
            // Add applicant_user_id to directly link to the applicant's user account
            $table->unsignedBigInteger('applicant_user_id')->nullable()->after('application_id');
            
            // Add foreign key constraint
            $table->foreign('applicant_user_id')->references('id')->on('users')->onDelete('cascade');
            
            // Add index for faster lookups
            $table->index('applicant_user_id');
        });
        
        // Populate applicant_user_id for existing records
        DB::statement('
            UPDATE interviews 
            INNER JOIN applications ON interviews.application_id = applications.id
            INNER JOIN applicants ON applications.applicant_id = applicants.id
            SET interviews.applicant_user_id = applicants.user_id
        ');
        
        // Make it non-nullable after populating
        Schema::table('interviews', function (Blueprint $table) {
            $table->unsignedBigInteger('applicant_user_id')->nullable(false)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('interviews', function (Blueprint $table) {
            // Drop foreign key first
            $table->dropForeign(['applicant_user_id']);
            // Drop index
            $table->dropIndex(['applicant_user_id']);
            // Drop column
            $table->dropColumn('applicant_user_id');
        });
    }
};

