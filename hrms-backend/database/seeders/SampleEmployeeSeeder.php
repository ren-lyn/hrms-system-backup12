<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\EmployeeProfile;
use Illuminate\Support\Facades\Hash;

class SampleEmployeeSeeder extends Seeder
{
    public function run()
    {
        $employees = [
            [
                'first_name' => 'John',
                'last_name' => 'Doe',
                'email' => 'john.doe@company.com',
                'position' => 'Software Developer',
                'department' => 'IT Department',
                'date_hired' => '2023-01-15',
                'salary' => 75000.00,
                'contact_number' => '+1-555-0101',
                'address' => '123 Main St, Anytown, USA'
            ],
            [
                'first_name' => 'Jane',
                'last_name' => 'Smith',
                'email' => 'jane.smith@company.com',
                'position' => 'HR Manager',
                'department' => 'HR Department',
                'date_hired' => '2022-03-01',
                'salary' => 85000.00,
                'contact_number' => '+1-555-0102',
                'address' => '456 Oak Ave, Anytown, USA'
            ],
            [
                'first_name' => 'Michael',
                'last_name' => 'Johnson',
                'email' => 'michael.johnson@company.com',
                'position' => 'Accountant',
                'department' => 'Finance Department',
                'date_hired' => '2023-05-10',
                'salary' => 65000.00,
                'contact_number' => '+1-555-0103',
                'address' => '789 Pine St, Anytown, USA'
            ],
            [
                'first_name' => 'Sarah',
                'last_name' => 'Williams',
                'email' => 'sarah.williams@company.com',
                'position' => 'Marketing Specialist',
                'department' => 'Marketing Department',
                'date_hired' => '2023-02-20',
                'salary' => 60000.00,
                'contact_number' => '+1-555-0104',
                'address' => '321 Elm St, Anytown, USA'
            ],
            [
                'first_name' => 'David',
                'last_name' => 'Brown',
                'email' => 'david.brown@company.com',
                'position' => 'System Administrator',
                'department' => 'IT Department',
                'date_hired' => '2022-08-12',
                'salary' => 80000.00,
                'contact_number' => '+1-555-0105',
                'address' => '654 Cedar Ave, Anytown, USA'
            ],
            [
                'first_name' => 'Emily',
                'last_name' => 'Davis',
                'email' => 'emily.davis@company.com',
                'position' => 'Sales Representative',
                'department' => 'Sales Department',
                'date_hired' => '2023-06-01',
                'salary' => 55000.00,
                'contact_number' => '+1-555-0106',
                'address' => '987 Birch Rd, Anytown, USA'
            ],
            [
                'first_name' => 'Robert',
                'last_name' => 'Miller',
                'email' => 'robert.miller@company.com',
                'position' => 'Project Manager',
                'department' => 'Operations Department',
                'date_hired' => '2022-11-05',
                'salary' => 90000.00,
                'contact_number' => '+1-555-0107',
                'address' => '147 Maple Dr, Anytown, USA'
            ],
            [
                'first_name' => 'Lisa',
                'last_name' => 'Wilson',
                'email' => 'lisa.wilson@company.com',
                'position' => 'Graphic Designer',
                'department' => 'Creative Department',
                'date_hired' => '2023-04-18',
                'salary' => 58000.00,
                'contact_number' => '+1-555-0108',
                'address' => '258 Willow St, Anytown, USA'
            ],
            [
                'first_name' => 'James',
                'last_name' => 'Moore',
                'email' => 'james.moore@company.com',
                'position' => 'Customer Service',
                'department' => 'Customer Service Department',
                'date_hired' => '2023-07-22',
                'salary' => 45000.00,
                'contact_number' => '+1-555-0109',
                'address' => '369 Spruce Ln, Anytown, USA'
            ],
            [
                'first_name' => 'Jennifer',
                'last_name' => 'Taylor',
                'email' => 'jennifer.taylor@company.com',
                'position' => 'Business Analyst',
                'department' => 'Operations Department',
                'date_hired' => '2022-12-03',
                'salary' => 72000.00,
                'contact_number' => '+1-555-0110',
                'address' => '741 Poplar Ave, Anytown, USA'
            ],
            [
                'first_name' => 'Mark',
                'last_name' => 'Anderson',
                'email' => 'mark.anderson@company.com',
                'position' => 'Quality Assurance',
                'department' => 'IT Department',
                'date_hired' => '2023-03-14',
                'salary' => 68000.00,
                'contact_number' => '+1-555-0111',
                'address' => '852 Hickory St, Anytown, USA'
            ],
            [
                'first_name' => 'Amanda',
                'last_name' => 'Garcia',
                'email' => 'amanda.garcia@company.com',
                'position' => 'HR Assistant',
                'department' => 'HR Department',
                'date_hired' => '2023-08-07',
                'salary' => 48000.00,
                'contact_number' => '+1-555-0112',
                'address' => '963 Ash Blvd, Anytown, USA'
            ],
            [
                'first_name' => 'Christopher',
                'last_name' => 'Martinez',
                'email' => 'christopher.martinez@company.com',
                'position' => 'Senior Developer',
                'department' => 'IT Department',
                'date_hired' => '2021-09-15',
                'salary' => 95000.00,
                'contact_number' => '+1-555-0113',
                'address' => '159 Walnut Ct, Anytown, USA'
            ],
            [
                'first_name' => 'Michelle',
                'last_name' => 'Rodriguez',
                'email' => 'michelle.rodriguez@company.com',
                'position' => 'Marketing Manager',
                'department' => 'Marketing Department',
                'date_hired' => '2022-01-20',
                'salary' => 88000.00,
                'contact_number' => '+1-555-0114',
                'address' => '357 Cherry Way, Anytown, USA'
            ],
            [
                'first_name' => 'Daniel',
                'last_name' => 'Lopez',
                'email' => 'daniel.lopez@company.com',
                'position' => 'Network Engineer',
                'department' => 'IT Department',
                'date_hired' => '2023-01-30',
                'salary' => 78000.00,
                'contact_number' => '+1-555-0115',
                'address' => '468 Peach St, Anytown, USA'
            ],
            [
                'first_name' => 'Jessica',
                'last_name' => 'Gonzalez',
                'email' => 'jessica.gonzalez@company.com',
                'position' => 'Content Writer',
                'department' => 'Creative Department',
                'date_hired' => '2023-05-25',
                'salary' => 52000.00,
                'contact_number' => '+1-555-0116',
                'address' => '579 Plum Ave, Anytown, USA'
            ],
            [
                'first_name' => 'Kevin',
                'last_name' => 'Wilson',
                'email' => 'kevin.wilson@company.com',
                'position' => 'Sales Manager',
                'department' => 'Sales Department',
                'date_hired' => '2022-04-11',
                'salary' => 92000.00,
                'contact_number' => '+1-555-0117',
                'address' => '680 Apple Rd, Anytown, USA'
            ],
            [
                'first_name' => 'Rachel',
                'last_name' => 'Lee',
                'email' => 'rachel.lee@company.com',
                'position' => 'UX Designer',
                'department' => 'Creative Department',
                'date_hired' => '2023-02-08',
                'salary' => 70000.00,
                'contact_number' => '+1-555-0118',
                'address' => '791 Grape Ln, Anytown, USA'
            ],
            [
                'first_name' => 'Brian',
                'last_name' => 'Clark',
                'email' => 'brian.clark@company.com',
                'position' => 'DevOps Engineer',
                'department' => 'IT Department',
                'date_hired' => '2022-10-16',
                'salary' => 85000.00,
                'contact_number' => '+1-555-0119',
                'address' => '802 Orange Dr, Anytown, USA'
            ],
            [
                'first_name' => 'Stephanie',
                'last_name' => 'Hall',
                'email' => 'stephanie.hall@company.com',
                'position' => 'Executive Assistant',
                'department' => 'HR Department',
                'date_hired' => '2023-07-03',
                'salary' => 50000.00,
                'contact_number' => '+1-555-0120',
                'address' => '913 Lemon St, Anytown, USA'
            ]
        ];

        foreach ($employees as $employeeData) {
            // Create user account
            $user = User::create([
                'first_name' => $employeeData['first_name'],
                'last_name' => $employeeData['last_name'],
                'email' => $employeeData['email'],
                'password' => Hash::make('password123'), // Default password
                'role_id' => 2 // Assuming role_id 2 is for employees
            ]);

            // Generate unique government ID numbers in proper Philippine formats
            $sssNumber = sprintf('%02d-%07d-%d', rand(10, 99), rand(1000000, 9999999), rand(0, 9));
            $philhealthNumber = 'PH-' . sprintf('%09d', rand(100000000, 999999999));
            $pagibigNumber = 'PG-' . sprintf('%09d', rand(100000000, 999999999));
            $tinNumber = sprintf('%03d-%03d-%03d-%03d', rand(100, 999), rand(100, 999), rand(100, 999), rand(100, 999));
            
            // Create employee profile
            EmployeeProfile::create([
                'user_id' => $user->id,
                'first_name' => $employeeData['first_name'],
                'last_name' => $employeeData['last_name'],
                'email' => $employeeData['email'],
                'position' => $employeeData['position'],
                'department' => $employeeData['department'],
                'date_hired' => $employeeData['date_hired'],
                'salary' => $employeeData['salary'],
                'contact_number' => $employeeData['contact_number'],
                'address' => $employeeData['address'],
                'sss' => $sssNumber,
                'philhealth' => $philhealthNumber,
                'pagibig' => $pagibigNumber,
                'tin_no' => $tinNumber,
            ]);
        }

        $this->command->info('Sample employees created successfully!');
    }
}