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

        // Create sample job postings
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
            ],
            [
                'title' => 'LOGISTICS COORDINATOR',
                'description' => 'Coordinate routing, dispatch, and shipment tracking to ensure on-time deliveries.',
                'requirements' => 'Bachelor\'s degree preferred. 2+ years in logistics or supply chain. Proficient with routing and WMS tools.',
                'department' => 'Logistics Department',
                'status' => 'Open',
                'hr_staff_id' => $hrStaff ? $hrStaff->id : 1,
            ],
            [
                'title' => 'PLANT SUPERVISOR',
                'description' => 'Oversee daily plant operations, safety compliance, and production targets.',
                'requirements' => 'Engineering or related field. 3+ years supervisory experience in manufacturing.',
                'department' => 'Production Department',
                'status' => 'Open',
                'hr_staff_id' => $hrStaff ? $hrStaff->id : 1,
            ],
            [
                'title' => 'HR RECRUITER',
                'description' => 'Manage end-to-end recruitment including sourcing, screening, and onboarding.',
                'requirements' => 'Bachelor in Psychology/HR. Strong interviewing skills. Familiar with ATS.',
                'department' => 'HR Department',
                'status' => 'Open',
                'hr_staff_id' => $hrStaff ? $hrStaff->id : 1,
            ],
            [
                'title' => 'DRIVER',
                'description' => 'Safely transport materials and finished goods; maintain vehicle logs.',
                'requirements' => 'Valid professional driver\'s license. Knowledge of basic vehicle maintenance.',
                'department' => 'Logistics Department',
                'status' => 'Open',
                'hr_staff_id' => $hrStaff ? $hrStaff->id : 1,
            ],
            [
                'title' => 'ACCOUNTING ASSISTANT',
                'description' => 'Assist with AP/AR, reconciliations, and month-end close activities.',
                'requirements' => 'BS in Accountancy/Finance. Knowledge of bookkeeping and Excel.',
                'department' => 'Accounting Department',
                'status' => 'Open',
                'hr_staff_id' => $hrStaff ? $hrStaff->id : 1,
            ],
        ];

        foreach ($jobPostings as $jobData) {
            JobPosting::create($jobData);
        }
    }

}
