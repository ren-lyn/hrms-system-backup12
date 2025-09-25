<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\JobPosting;

class JobPostingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run()
    {
        $hrStaff = User::whereHas('role', function ($q) {
            $q->where('name', 'HR Staff');
        })->inRandomOrder()->first();

        // Create the exact job postings from the image
        $jobPostings = [
            [
                'title' => 'SUPPLY CHAIN SUPERVISOR',
                'description' => 'Manage supply chain operations and logistics to ensure efficient flow of materials and products throughout the organization.',
                'requirements' => 'Bachelor\'s degree in Business Administration, Supply Chain Management, or related field. Minimum 3 years of experience in supply chain operations. Strong leadership and communication skills.',
                'department' => 'FDC HOME OFFICE - CEBU - NPI',
                'status' => 'Open',
                'hr_staff_id' => $hrStaff ? $hrStaff->id : 1,
            ],
            [
                'title' => 'CIVIL ENGINEER',
                'description' => 'Design and oversee construction projects, ensuring compliance with safety standards and project specifications.',
                'requirements' => 'Bachelor\'s degree in Civil Engineering. Licensed Professional Engineer. Minimum 5 years of experience in construction project management.',
                'department' => 'Cabuyao Plant - Laguna',
                'status' => 'Open',
                'hr_staff_id' => $hrStaff ? $hrStaff->id : 1,
            ],
            [
                'title' => 'ACCOUNTING STAFF',
                'description' => 'Handle financial records, prepare reports, and assist with various accounting functions to support business operations.',
                'requirements' => 'Bachelor\'s degree in Accounting or Finance. CPA license preferred. Strong knowledge of accounting principles and financial reporting.',
                'department' => 'Cebu Office - Finance Department',
                'status' => 'Open',
                'hr_staff_id' => $hrStaff ? $hrStaff->id : 1,
            ],
            [
                'title' => 'IT SUPPORT SPECIALIST',
                'description' => 'Provide technical support and maintenance for computer systems, networks, and software applications.',
                'requirements' => 'Bachelor\'s degree in Information Technology or Computer Science. 2+ years of experience in IT support. Strong troubleshooting skills.',
                'department' => 'Manila Head Office',
                'status' => 'Open',
                'hr_staff_id' => $hrStaff ? $hrStaff->id : 1,
            ],
            [
                'title' => 'SALES REPRESENTATIVE',
                'description' => 'Develop and maintain client relationships, identify new business opportunities, and achieve sales targets.',
                'requirements' => 'Bachelor\'s degree in Business or Marketing. Excellent communication and negotiation skills. Sales experience preferred.',
                'department' => 'Mindanao Branch - Davao City',
                'status' => 'Open',
                'hr_staff_id' => $hrStaff ? $hrStaff->id : 1,
            ]
        ];

        foreach ($jobPostings as $jobData) {
            JobPosting::create($jobData);
        }
    }

}
