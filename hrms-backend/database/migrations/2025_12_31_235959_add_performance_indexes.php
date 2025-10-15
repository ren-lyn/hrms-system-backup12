<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Check if an index exists on a table
     */
    private function indexExists($table, $index)
    {
        // Use raw SQL to check for index existence
        $connection = Schema::getConnection();
        $database = $connection->getDatabaseName();
        
        $result = $connection->select(
            "SELECT COUNT(*) as count 
             FROM information_schema.statistics 
             WHERE table_schema = ? 
             AND table_name = ? 
             AND index_name = ?",
            [$database, $table, $index]
        );
        
        return $result[0]->count > 0;
    }
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add indexes for frequently queried fields - only if tables exist
        
        // Users table indexes
        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                if (!$this->indexExists('users', 'users_role_id_created_at_index')) {
                    $table->index(['role_id', 'created_at']);
                }
                if (!$this->indexExists('users', 'users_email_index')) {
                    $table->index('email');
                }
            });
        }

        // Employee profiles table indexes
        if (Schema::hasTable('employee_profiles')) {
            Schema::table('employee_profiles', function (Blueprint $table) {
                if (!$this->indexExists('employee_profiles', 'employee_profiles_user_id_employment_status_index')) {
                    $table->index(['user_id', 'employment_status']);
                }
                if (!$this->indexExists('employee_profiles', 'employee_profiles_department_position_index')) {
                    $table->index(['department', 'position']);
                }
                if (!$this->indexExists('employee_profiles', 'employee_profiles_employee_id_index')) {
                    $table->index('employee_id');
                }
            });
        }

        // Leave requests table indexes
        if (Schema::hasTable('leave_requests')) {
            Schema::table('leave_requests', function (Blueprint $table) {
                if (!$this->indexExists('leave_requests', 'leave_requests_employee_id_status_created_at_index')) {
                    $table->index(['employee_id', 'status', 'created_at']);
                }
                if (!$this->indexExists('leave_requests', 'leave_requests_from_to_index')) {
                    $table->index(['from', 'to']);
                }
                if (!$this->indexExists('leave_requests', 'leave_requests_status_index')) {
                    $table->index('status');
                }
            });
        }

        // Cash advances table indexes
        if (Schema::hasTable('cash_advances')) {
            Schema::table('cash_advances', function (Blueprint $table) {
                if (!$this->indexExists('cash_advances', 'cash_advances_employee_id_status_created_at_index')) {
                    $table->index(['employee_id', 'status', 'created_at']);
                }
                if (!$this->indexExists('cash_advances', 'cash_advances_status_index')) {
                    $table->index('status');
                }
            });
        }

        // Job postings table indexes
        if (Schema::hasTable('job_postings')) {
            Schema::table('job_postings', function (Blueprint $table) {
                if (!$this->indexExists('job_postings', 'job_postings_status_created_at_index')) {
                    $table->index(['status', 'created_at']);
                }
                if (!$this->indexExists('job_postings', 'job_postings_department_index')) {
                    $table->index('department');
                }
            });
        }

        // Applications table indexes
        if (Schema::hasTable('applications')) {
            Schema::table('applications', function (Blueprint $table) {
                if (!$this->indexExists('applications', 'applications_job_posting_id_status_index')) {
                    $table->index(['job_posting_id', 'status']);
                }
                if (!$this->indexExists('applications', 'applications_applicant_id_status_index')) {
                    $table->index(['applicant_id', 'status']);
                }
            });
        }

        // Attendance table indexes
        if (Schema::hasTable('attendance')) {
            Schema::table('attendance', function (Blueprint $table) {
                if (!$this->indexExists('attendance', 'attendance_employee_id_date_index')) {
                    $table->index(['employee_id', 'date']);
                }
                if (!$this->indexExists('attendance', 'attendance_date_status_index')) {
                    $table->index(['date', 'status']);
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove indexes
        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropIndex(['role_id', 'created_at']);
                $table->dropIndex(['email']);
            });
        }

        if (Schema::hasTable('employee_profiles')) {
            Schema::table('employee_profiles', function (Blueprint $table) {
                $table->dropIndex(['user_id', 'employment_status']);
                $table->dropIndex(['department', 'position']);
                $table->dropIndex(['employee_id']);
            });
        }

        if (Schema::hasTable('leave_requests')) {
            Schema::table('leave_requests', function (Blueprint $table) {
                $table->dropIndex(['employee_id', 'status', 'created_at']);
                $table->dropIndex(['from', 'to']);
                $table->dropIndex(['status']);
            });
        }

        if (Schema::hasTable('cash_advances')) {
            Schema::table('cash_advances', function (Blueprint $table) {
                $table->dropIndex(['employee_id', 'status', 'created_at']);
                $table->dropIndex(['status']);
            });
        }

        if (Schema::hasTable('job_postings')) {
            Schema::table('job_postings', function (Blueprint $table) {
                $table->dropIndex(['status', 'created_at']);
                $table->dropIndex(['department']);
            });
        }

        if (Schema::hasTable('applications')) {
            Schema::table('applications', function (Blueprint $table) {
                $table->dropIndex(['job_posting_id', 'status']);
                $table->dropIndex(['applicant_id', 'status']);
            });
        }

        if (Schema::hasTable('attendance')) {
            Schema::table('attendance', function (Blueprint $table) {
                $table->dropIndex(['employee_id', 'date']);
                $table->dropIndex(['date', 'status']);
            });
        }
    }
};
