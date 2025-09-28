<?php

namespace App\Console\Commands;

use Database\Seeders\DisciplinaryCategorySeeder;
use Illuminate\Console\Command;

class SeedDisciplinaryCategories extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'disciplinary:seed-categories {--fresh : Clear existing categories before seeding}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Seed disciplinary action categories with comprehensive data';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        if ($this->option('fresh')) {
            $this->info('🔄 Running fresh seed with existing data cleanup...');
        } else {
            $this->info('🌱 Seeding disciplinary categories...');
        }

        try {
            $seeder = new DisciplinaryCategorySeeder();
            $seeder->setCommand($this);
            $seeder->run();

            $this->newLine();
            $this->info('✅ Disciplinary categories seeded successfully!');
            
            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('❌ Failed to seed disciplinary categories: ' . $e->getMessage());
            
            return Command::FAILURE;
        }
    }
}