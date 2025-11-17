<?php

namespace App\Console\Commands;

use Database\Seeders\EmployeeSeeder;
use Illuminate\Console\Command;

class SeedEmployees extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'seed:employees {count=1000 : The number of employees to create}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Seed employee profiles with the specified number of employees';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $count = (int) $this->argument('count');
        
        if ($count <= 0) {
            $this->error('Count must be a positive number.');
            return Command::FAILURE;
        }

        $this->info("Creating {$count} employees...");

        try {
            // Set the count before running the seeder
            EmployeeSeeder::$count = $count;
            
            $seeder = new EmployeeSeeder();
            $seeder->setCommand($this);
            $seeder->run();

            $this->newLine();
            $this->info("✅ Successfully created {$count} employees!");
            $this->info('Default password for all employees: password123');
            
            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('❌ Failed to seed employees: ' . $e->getMessage());
            $this->error($e->getTraceAsString());
            
            return Command::FAILURE;
        }
    }
}

