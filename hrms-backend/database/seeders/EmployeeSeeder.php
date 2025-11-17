<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Role;
use App\Models\EmployeeProfile;
use Carbon\Carbon;

class EmployeeSeeder extends Seeder
{
    /**
     * The number of employees to create.
     */
    public static $count = 1000;

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $count = self::$count;
        
        if ($count <= 0) {
            $this->command->error('Count must be a positive number.');
            return;
        }

        // Get Employee role ID
        $employeeRole = Role::where('name', 'Employee')->first();
        
        if (!$employeeRole) {
            $this->command->error('Employee role not found. Please run RoleSeeder first.');
            return;
        }

        // Sample first names (mix of Filipino and common names)
        $firstNames = [
            'Maria', 'Juan', 'Jose', 'Anna', 'Michael', 'Sarah', 'David', 'Jennifer',
            'John', 'Mary', 'Robert', 'Lisa', 'James', 'Michelle', 'William', 'Patricia',
            'Richard', 'Linda', 'Joseph', 'Barbara', 'Thomas', 'Elizabeth', 'Charles', 'Susan',
            'Christopher', 'Jessica', 'Daniel', 'Sarah', 'Matthew', 'Karen', 'Anthony', 'Nancy',
            'Mark', 'Betty', 'Donald', 'Helen', 'Steven', 'Sandra', 'Paul', 'Donna',
            'Andrew', 'Carol', 'Joshua', 'Ruth', 'Kenneth', 'Sharon', 'Kevin', 'Michelle',
            'Brian', 'Laura', 'George', 'Emily', 'Edward', 'Kimberly', 'Ronald', 'Deborah',
            'Timothy', 'Amy', 'Jason', 'Angela', 'Jeffrey', 'Ashley', 'Ryan', 'Brenda',
            'Jacob', 'Emma', 'Gary', 'Olivia', 'Nicholas', 'Cynthia', 'Eric', 'Marie',
            'Jonathan', 'Janet', 'Stephen', 'Catherine', 'Larry', 'Frances', 'Justin', 'Christine',
            'Scott', 'Samantha', 'Brandon', 'Debra', 'Benjamin', 'Rachel', 'Samuel', 'Carolyn',
            'Frank', 'Janet', 'Gregory', 'Virginia', 'Raymond', 'Maria', 'Alexander', 'Heather',
            'Patrick', 'Diane', 'Jack', 'Julie', 'Dennis', 'Joyce', 'Jerry', 'Victoria'
        ];

        // Sample last names (mix of Filipino and common names)
        $lastNames = [
            'Santos', 'Reyes', 'Cruz', 'Bautista', 'Villanueva', 'Fernandez', 'Ramos', 'Torres',
            'Gonzales', 'Rivera', 'Dela Cruz', 'Garcia', 'Rodriguez', 'Martinez', 'Lopez', 'Gonzalez',
            'Wilson', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson',
            'Garcia', 'Martinez', 'Robinson', 'Clark', 'Rodriguez', 'Lewis', 'Lee', 'Walker',
            'Hall', 'Allen', 'Young', 'Hernandez', 'King', 'Wright', 'Lopez', 'Hill',
            'Scott', 'Green', 'Adams', 'Baker', 'Nelson', 'Carter', 'Mitchell', 'Perez',
            'Roberts', 'Turner', 'Phillips', 'Campbell', 'Parker', 'Evans', 'Edwards', 'Collins',
            'Stewart', 'Sanchez', 'Morris', 'Rogers', 'Reed', 'Cook', 'Morgan', 'Bell',
            'Murphy', 'Bailey', 'Rivera', 'Cooper', 'Richardson', 'Cox', 'Howard', 'Ward',
            'Torres', 'Peterson', 'Gray', 'Ramirez', 'James', 'Watson', 'Brooks', 'Kelly',
            'Sanders', 'Price', 'Bennett', 'Wood', 'Barnes', 'Ross', 'Henderson', 'Coleman',
            'Jenkins', 'Perry', 'Powell', 'Long', 'Patterson', 'Hughes', 'Flores', 'Washington'
        ];

        // Departments
        $departments = [
            'IT Department',
            'HR Department',
            'Finance Department',
            'Accounting Department',
            'Marketing Department',
            'Sales Department',
            'Operations Department',
            'Production Department',
            'Logistics Department',
            'Customer Service Department',
            'Creative Department',
            'Engineering Department',
            'Administration Department'
        ];

        // Positions by department
        $positions = [
            'IT Department' => ['Software Developer', 'System Administrator', 'Network Engineer', 'DevOps Engineer', 'QA Engineer', 'IT Support', 'Database Administrator', 'Frontend Developer', 'Backend Developer'],
            'HR Department' => ['HR Manager', 'HR Staff', 'HR Assistant', 'Recruiter', 'HR Specialist', 'Training Coordinator'],
            'Finance Department' => ['Finance Manager', 'Financial Analyst', 'Accountant', 'Finance Officer', 'Budget Analyst'],
            'Accounting Department' => ['Accountant', 'Accounting Manager', 'Accounting Staff', 'Bookkeeper', 'Accounts Payable', 'Accounts Receivable'],
            'Marketing Department' => ['Marketing Manager', 'Marketing Specialist', 'Digital Marketing', 'Content Writer', 'SEO Specialist', 'Social Media Manager'],
            'Sales Department' => ['Sales Manager', 'Sales Representative', 'Account Executive', 'Business Development', 'Sales Coordinator'],
            'Operations Department' => ['Operations Manager', 'Operations Staff', 'Business Analyst', 'Project Manager', 'Operations Coordinator'],
            'Production Department' => ['Production Manager', 'Production Staff', 'Quality Control', 'Production Supervisor', 'Machine Operator'],
            'Logistics Department' => ['Logistics Manager', 'Logistics Coordinator', 'Warehouse Staff', 'Driver', 'Helper', 'Supply Chain Analyst'],
            'Customer Service Department' => ['Customer Service Manager', 'Customer Service Representative', 'Support Specialist', 'Call Center Agent'],
            'Creative Department' => ['Creative Director', 'Graphic Designer', 'UX Designer', 'UI Designer', 'Video Editor', 'Photographer'],
            'Engineering Department' => ['Senior Engineer', 'Engineer', 'Junior Engineer', 'Engineering Manager', 'Technical Lead'],
            'Administration Department' => ['Administrative Assistant', 'Executive Assistant', 'Office Manager', 'Receptionist', 'Admin Staff']
        ];

        // Civil status options
        $civilStatuses = ['Single', 'Married', 'Divorced', 'Widowed', 'Separated'];

        // Gender options
        $genders = ['Male', 'Female', 'Other'];

        // Employment status options
        $employmentStatuses = ['Full Time', 'Part Time', 'Contract', 'Probationary'];

        // Philippine cities
        $cities = ['Manila', 'Quezon City', 'Makati', 'Taguig', 'Pasig', 'Mandaluyong', 'San Juan', 'Pasay', 'Las Piñas', 'Parañaque', 'Muntinlupa', 'Marikina', 'Caloocan', 'Valenzuela', 'Malabon', 'Navotas'];
        
        // Philippine provinces
        $provinces = ['Metro Manila', 'Cavite', 'Laguna', 'Bulacan', 'Rizal', 'Batangas', 'Pampanga', 'Nueva Ecija'];

        // Philippine barangays (sample)
        $barangays = ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4', 'Barangay 5', 'Poblacion', 'San Jose', 'San Antonio', 'San Isidro', 'San Miguel'];

        $this->command->info("Creating {$count} employees...");

        for ($i = 1; $i <= $count; $i++) {
            // Generate unique email
            $firstName = $firstNames[array_rand($firstNames)];
            $lastName = $lastNames[array_rand($lastNames)];
            $email = strtolower($firstName . '.' . $lastName . '.' . $i . '@company.com');
            
            // Ensure email is unique
            $counter = 1;
            while (User::where('email', $email)->exists()) {
                $email = strtolower($firstName . '.' . $lastName . '.' . $i . '.' . $counter . '@company.com');
                $counter++;
            }

            // Select department and position
            $department = $departments[array_rand($departments)];
            $position = $positions[$department][array_rand($positions[$department])];

            // Generate birth date (age between 22 and 55)
            $age = rand(22, 55);
            $birthDate = Carbon::now()->subYears($age)->subDays(rand(0, 365));

            // Generate hire date (between 1 month and 5 years ago)
            $hireDate = Carbon::now()->subMonths(rand(1, 60))->subDays(rand(0, 30));

            // Create user account
            $user = User::create([
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => $email,
                'password' => Hash::make('password123'), // Default password
                'role_id' => $employeeRole->id,
                'is_active' => 1
            ]);

            // Generate unique government ID numbers in proper Philippine formats
            $sssNumber = sprintf('%02d-%07d-%d', rand(10, 99), rand(1000000, 9999999), rand(0, 9));
            $philhealthNumber = 'PH-' . sprintf('%09d', rand(100000000, 999999999));
            $pagibigNumber = 'PG-' . sprintf('%09d', rand(100000000, 999999999));
            $tinNumber = sprintf('%03d-%03d-%03d-%03d', rand(100, 999), rand(100, 999), rand(100, 999), rand(100, 999));

            // Generate contact number (Philippine format)
            $contactNumber = '+63' . rand(9000000000, 9999999999);
            $phone = '+63' . rand(9000000000, 9999999999);

            // Generate address components
            $address = rand(100, 9999) . ' ' . $lastNames[array_rand($lastNames)] . ' Street';
            $city = $cities[array_rand($cities)];
            $province = $provinces[array_rand($provinces)];
            $barangay = $barangays[array_rand($barangays)];
            $postalCode = rand(1000, 9999);

            // Generate emergency contact
            $emergencyContactName = $firstNames[array_rand($firstNames)] . ' ' . $lastNames[array_rand($lastNames)];
            $emergencyContactPhone = '+63' . rand(9000000000, 9999999999);

            // Create employee profile
            // Note: employee_id will be auto-generated by the model's boot method if not provided
            EmployeeProfile::create([
                'user_id' => $user->id,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => $email,
                'position' => $position,
                'department' => $department,
                'salary' => rand(20000, 150000), // Salary between 20k and 150k
                'contact_number' => $contactNumber,
                'phone' => $phone,
                'address' => $address,
                'present_address' => $address,
                'city' => $city,
                'province' => $province,
                'barangay' => $barangay,
                'postal_code' => (string)$postalCode,
                'civil_status' => $civilStatuses[array_rand($civilStatuses)],
                'gender' => $genders[array_rand($genders)],
                'birth_date' => $birthDate->toDateString(),
                'age' => $age,
                'place_of_birth' => $city . ', ' . $province,
                'hire_date' => $hireDate->toDateString(),
                'employment_status' => $employmentStatuses[array_rand($employmentStatuses)],
                'job_title' => $position,
                'status' => 'active',
                'sss' => $sssNumber,
                'philhealth' => $philhealthNumber,
                'pagibig' => $pagibigNumber,
                'tin_no' => $tinNumber,
                'emergency_contact_name' => $emergencyContactName,
                'emergency_contact_phone' => $emergencyContactPhone,
            ]);

            if ($i % 10 == 0) {
                $this->command->info("Created {$i} employees...");
            }
        }

        $this->command->info("Successfully created {$count} employees!");
        $this->command->info('Default password for all employees: password123');
    }
}

