<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\EmployeeProfile;

class UpdateAdminGovernmentIds extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'admin:update-government-ids 
                            {--sss= : SSS Number}
                            {--philhealth= : PhilHealth Number}
                            {--pagibig= : Pag-IBIG Number}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Update System Administrator government ID numbers (SSS, PhilHealth, Pag-IBIG)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $admin = User::where('email', 'admin@company.com')->first();

        if (!$admin) {
            $this->error('System Administrator not found!');
            return 1;
        }

        $profile = $admin->employeeProfile;

        if (!$profile) {
            $this->error('System Administrator employee profile not found!');
            return 1;
        }

        $updates = [];
        
        if ($this->option('sss')) {
            $updates['sss'] = $this->option('sss');
        }
        
        if ($this->option('philhealth')) {
            $updates['philhealth'] = $this->option('philhealth');
        }
        
        if ($this->option('pagibig')) {
            $updates['pagibig'] = $this->option('pagibig');
        }

        if (empty($updates)) {
            $this->info('Current values:');
            $this->line('SSS: ' . ($profile->sss ?? 'N/A'));
            $this->line('PhilHealth: ' . ($profile->philhealth ?? 'N/A'));
            $this->line('Pag-IBIG: ' . ($profile->pagibig ?? 'N/A'));
            $this->newLine();
            $this->info('To update, use:');
            $this->line('php artisan admin:update-government-ids --sss="12-3456789-0" --philhealth="12-345678901-2" --pagibig="1234-5678-9012"');
            return 0;
        }

        $profile->update($updates);

        $this->info('System Administrator government IDs updated successfully!');
        $this->newLine();
        $this->info('Updated values:');
        $this->line('SSS: ' . ($profile->fresh()->sss ?? 'N/A'));
        $this->line('PhilHealth: ' . ($profile->fresh()->philhealth ?? 'N/A'));
        $this->line('Pag-IBIG: ' . ($profile->fresh()->pagibig ?? 'N/A'));

        return 0;
    }
}

