# Sample Test Accounts

This file contains sample login credentials for testing the HRMS system. All accounts use the password: **password123**

## Account Structure
- **Total Users Created**: 50 (10 per role)
- **Password for all accounts**: `password123`

## Role Distribution

### HR Assistant (10 accounts)
Email domain: `@company.com`
- carmen.cruz1@company.com
- luz.cruz2@company.com
- maria.santos3@company.com
- patricia.cruz4@company.com
- teresa.cruz5@company.com
- francisco.bautista6@company.com
- juan.torres7@company.com
- pedro.garcia8@company.com
- antonio.cruz9@company.com
- roberto.bautista10@company.com

### HR Staff (10 accounts)
Email domain: `@company.com`
- jose.flores1@company.com
- teresa.santos2@company.com
- elena.bautista3@company.com
- maria.santos4@company.com
- isabel.flores5@company.com
- gloria.flores6@company.com
- carlos.mendoza7@company.com
- miguel.torres8@company.com
- jose.flores9@company.com
- pedro.flores10@company.com

### Manager (10 accounts)
Email domain: `@company.com`
- teresa.torres1@company.com
- miguel.bautista2@company.com
- francisco.flores3@company.com
- luz.ocampo4@company.com
- teresa.villanueva5@company.com
- antonio.garcia6@company.com
- gloria.bautista7@company.com
- ana.cruz8@company.com
- carlos.cruz9@company.com
- teresa.bautista10@company.com

### Employee (10 accounts)
Email domain: `@company.com`
- gloria.santos1@company.com
- isabel.bautista2@company.com
- ana.flores3@company.com
- elena.ocampo4@company.com
- luz.flores5@company.com
- juan.villanueva6@company.com
- manuel.garcia7@company.com
- gloria.flores8@company.com
- carlos.garcia9@company.com
- ricardo.ocampo10@company.com

### Applicant (10 accounts)
Email domain: `@gmail.com`
- isabel.mendoza1@gmail.com
- jose.torres2@gmail.com
- teresa.villanueva3@gmail.com
- juan.torres4@gmail.com
- roberto.mendoza5@gmail.com
- juan.torres6@gmail.com
- antonio.mendoza7@gmail.com
- ana.flores8@gmail.com
- elena.bautista9@gmail.com
- teresa.bautista10@gmail.com

## Generated Data Features

Each account (except Applicants) includes:
- **Complete Employee Profiles** with realistic Filipino names and addresses
- **Randomized personal information**: age (25-55), civil status, gender, birth dates
- **Realistic contact information**: Philippine mobile numbers, emergency contacts
- **Address data**: Philippine provinces, cities, and barangays
- **Employment details**: departments, positions, hire dates, salaries based on role
- **Government IDs**: SSS, PhilHealth, Pag-IBIG, and TIN numbers
- **Salary ranges** appropriate to each role:
  - HR Assistant: ₱30,000 - ₱40,000
  - HR Staff: ₱40,000 - ₱60,000
  - Manager: ₱60,000 - ₱100,000
  - Employee: ₱25,000 - ₱50,000

## Usage
1. Use any email from the list above
2. Password: `password123`
3. Login to test different role functionalities
4. Each role has appropriate permissions and access levels

## Re-running the Seeder
To generate a fresh set of accounts:
```bash
php artisan db:seed --class=MultipleAccountsSeeder
```

Note: This will create additional accounts. If you want to start fresh, reset your database first:
```bash
php artisan migrate:fresh --seed
```