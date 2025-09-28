<?php

namespace Database\Seeders;

use App\Models\DisciplinaryCategory;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DisciplinaryCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Clear existing categories to avoid duplicates during re-seeding
        // Use delete instead of truncate to handle foreign key constraints
        DisciplinaryCategory::query()->delete();
        
        $categories = [
            // MINOR SEVERITY CATEGORIES
            [
                'name' => 'Tardiness',
                'description' => 'Habitual lateness or arriving after scheduled start time without valid reason',
                'severity_level' => 'minor',
                'suggested_actions' => ['verbal_warning', 'written_warning', 'final_warning'],
                'is_active' => true
            ],
            [
                'name' => 'Poor Performance',
                'description' => 'Consistently failing to meet job requirements or performance standards',
                'severity_level' => 'minor',
                'suggested_actions' => ['coaching', 'performance_improvement_plan', 'written_warning', 'training'],
                'is_active' => true
            ],
            [
                'name' => 'Dress Code Violation',
                'description' => 'Failure to adhere to company dress code and appearance policies',
                'severity_level' => 'minor',
                'suggested_actions' => ['verbal_warning', 'written_warning'],
                'is_active' => true
            ],
            [
                'name' => 'Personal Use of Company Resources',
                'description' => 'Minor unauthorized use of company equipment, internet, or phone for personal matters',
                'severity_level' => 'minor',
                'suggested_actions' => ['verbal_warning', 'written_warning', 'coaching'],
                'is_active' => true
            ],
            [
                'name' => 'Workplace Housekeeping',
                'description' => 'Failure to maintain clean and organized workspace according to company standards',
                'severity_level' => 'minor',
                'suggested_actions' => ['verbal_warning', 'written_warning', 'training'],
                'is_active' => true
            ],
            [
                'name' => 'Minor Policy Violation',
                'description' => 'Non-compliance with minor company policies and procedures',
                'severity_level' => 'minor',
                'suggested_actions' => ['verbal_warning', 'written_warning', 'mandatory_training'],
                'is_active' => true
            ],
            [
                'name' => 'Excessive Personal Calls/Texts',
                'description' => 'Frequent personal phone calls or text messaging during work hours',
                'severity_level' => 'minor',
                'suggested_actions' => ['verbal_warning', 'written_warning', 'coaching'],
                'is_active' => true
            ],
            [
                'name' => 'Attendance Issues',
                'description' => 'Occasional unexplained absences or failure to follow proper absence reporting procedures',
                'severity_level' => 'minor',
                'suggested_actions' => ['verbal_warning', 'written_warning', 'counseling'],
                'is_active' => true
            ],

            // MAJOR SEVERITY CATEGORIES
            [
                'name' => 'Absenteeism',
                'description' => 'Unauthorized absence or excessive absences affecting work productivity',
                'severity_level' => 'major',
                'suggested_actions' => ['written_warning', 'final_warning', 'suspension', 'termination'],
                'is_active' => true
            ],
            [
                'name' => 'Insubordination',
                'description' => 'Refusal to follow legitimate orders or disrespectful behavior towards supervisors',
                'severity_level' => 'major',
                'suggested_actions' => ['written_warning', 'final_warning', 'suspension', 'termination'],
                'is_active' => true
            ],
            [
                'name' => 'Misconduct',
                'description' => 'Inappropriate behavior or violation of company policies affecting workplace harmony',
                'severity_level' => 'major',
                'suggested_actions' => ['written_warning', 'final_warning', 'suspension', 'mandatory_training'],
                'is_active' => true
            ],
            [
                'name' => 'Safety Violation',
                'description' => 'Failure to follow safety protocols or creating unsafe working conditions',
                'severity_level' => 'major',
                'suggested_actions' => ['safety_training', 'written_warning', 'suspension', 'termination'],
                'is_active' => true
            ],
            [
                'name' => 'Unprofessional Conduct',
                'description' => 'Behavior that is unprofessional and negatively impacts the work environment',
                'severity_level' => 'major',
                'suggested_actions' => ['written_warning', 'final_warning', 'suspension', 'mandatory_training'],
                'is_active' => true
            ],
            [
                'name' => 'Discrimination',
                'description' => 'Treating individuals unfairly based on protected characteristics',
                'severity_level' => 'major',
                'suggested_actions' => ['final_warning', 'suspension', 'termination', 'mandatory_training'],
                'is_active' => true
            ],
            [
                'name' => 'Falsification of Records',
                'description' => 'Deliberately providing false information in company records or reports',
                'severity_level' => 'major',
                'suggested_actions' => ['final_warning', 'suspension', 'termination'],
                'is_active' => true
            ],
            [
                'name' => 'Conflict of Interest',
                'description' => 'Engaging in activities that conflict with company interests or duties',
                'severity_level' => 'major',
                'suggested_actions' => ['written_warning', 'final_warning', 'suspension', 'termination'],
                'is_active' => true
            ],
            [
                'name' => 'Violation of IT Policies',
                'description' => 'Serious breach of information technology and cybersecurity policies',
                'severity_level' => 'major',
                'suggested_actions' => ['mandatory_training', 'written_warning', 'suspension'],
                'is_active' => true
            ],
            [
                'name' => 'Inappropriate Use of Social Media',
                'description' => 'Misuse of social media that damages company reputation or violates policies',
                'severity_level' => 'major',
                'suggested_actions' => ['written_warning', 'final_warning', 'suspension', 'mandatory_training'],
                'is_active' => true
            ],

            // SEVERE SEVERITY CATEGORIES
            [
                'name' => 'Harassment',
                'description' => 'Unwelcome conduct that creates a hostile, intimidating, or offensive work environment',
                'severity_level' => 'severe',
                'suggested_actions' => ['suspension', 'termination', 'mandatory_training', 'mandatory_counseling'],
                'is_active' => true
            ],
            [
                'name' => 'Sexual Harassment',
                'description' => 'Unwelcome sexual advances, requests for sexual favors, or other sexual conduct',
                'severity_level' => 'severe',
                'suggested_actions' => ['suspension', 'termination', 'legal_action', 'mandatory_counseling'],
                'is_active' => true
            ],
            [
                'name' => 'Theft',
                'description' => 'Stealing company property, time, resources, or intellectual property',
                'severity_level' => 'severe',
                'suggested_actions' => ['suspension', 'termination', 'legal_action'],
                'is_active' => true
            ],
            [
                'name' => 'Fraud',
                'description' => 'Intentional deception or misrepresentation for personal or financial gain',
                'severity_level' => 'severe',
                'suggested_actions' => ['termination', 'legal_action'],
                'is_active' => true
            ],
            [
                'name' => 'Embezzlement',
                'description' => 'Theft or misappropriation of funds or property entrusted to one\'s care',
                'severity_level' => 'severe',
                'suggested_actions' => ['termination', 'legal_action'],
                'is_active' => true
            ],
            [
                'name' => 'Confidentiality Breach',
                'description' => 'Unauthorized disclosure of confidential company or client information',
                'severity_level' => 'severe',
                'suggested_actions' => ['suspension', 'termination', 'legal_action'],
                'is_active' => true
            ],
            [
                'name' => 'Substance Abuse',
                'description' => 'Use of alcohol or drugs that affects work performance, safety, or workplace conduct',
                'severity_level' => 'severe',
                'suggested_actions' => ['mandatory_counseling', 'suspension', 'termination'],
                'is_active' => true
            ],
            [
                'name' => 'Violence or Threats',
                'description' => 'Physical violence, threats of violence, or intimidating behavior towards others',
                'severity_level' => 'severe',
                'suggested_actions' => ['suspension', 'termination', 'legal_action'],
                'is_active' => true
            ],
            [
                'name' => 'Workplace Bullying',
                'description' => 'Repeated unreasonable behavior directed towards an employee that creates health and safety risks',
                'severity_level' => 'severe',
                'suggested_actions' => ['final_warning', 'suspension', 'termination', 'mandatory_counseling'],
                'is_active' => true
            ],
            [
                'name' => 'Sabotage',
                'description' => 'Deliberate destruction or damage to company property, systems, or operations',
                'severity_level' => 'severe',
                'suggested_actions' => ['suspension', 'termination', 'legal_action'],
                'is_active' => true
            ],
            [
                'name' => 'Bribery and Corruption',
                'description' => 'Offering, accepting, or soliciting bribes or engaging in corrupt practices',
                'severity_level' => 'severe',
                'suggested_actions' => ['termination', 'legal_action'],
                'is_active' => true
            ],
            [
                'name' => 'Data Breach',
                'description' => 'Unauthorized access, disclosure, or misuse of sensitive company or customer data',
                'severity_level' => 'severe',
                'suggested_actions' => ['suspension', 'termination', 'legal_action'],
                'is_active' => true
            ],
            [
                'name' => 'Criminal Activity',
                'description' => 'Engaging in criminal behavior that affects the workplace or company reputation',
                'severity_level' => 'severe',
                'suggested_actions' => ['suspension', 'termination', 'legal_action'],
                'is_active' => true
            ]
        ];

        $this->command->info('Creating disciplinary categories...');
        
        foreach ($categories as $category) {
            DisciplinaryCategory::create($category);
        }
        
        $this->command->info('Successfully created ' . count($categories) . ' disciplinary categories.');
        
        // Display summary by severity level
        $severityCounts = [
            'minor' => collect($categories)->where('severity_level', 'minor')->count(),
            'major' => collect($categories)->where('severity_level', 'major')->count(),
            'severe' => collect($categories)->where('severity_level', 'severe')->count(),
        ];
        
        $this->command->table(
            ['Severity Level', 'Count'],
            [
                ['Minor', $severityCounts['minor']],
                ['Major', $severityCounts['major']],
                ['Severe', $severityCounts['severe']],
                ['Total', array_sum($severityCounts)]
            ]
        );
    }
}
