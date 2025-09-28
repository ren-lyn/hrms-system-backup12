<?php

namespace App\Jobs;

use App\Models\DisciplinaryAction;
use App\Models\EmployeeProfile;
use App\Notifications\DisciplinaryActionIssued;
use App\Notifications\InvestigationAssigned;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SendDisciplinaryActionNotifications implements ShouldQueue
{
    use Queueable;

    protected $notificationData;

    /**
     * Create a new job instance.
     */
    public function __construct($notificationData)
    {
        $this->notificationData = $notificationData;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $action = DisciplinaryAction::with(['employee.user', 'investigator.user'])
            ->findOrFail($this->notificationData['action_id']);

        // Notify employee
        if ($action->employee && $action->employee->user) {
            $action->employee->user->notify(new DisciplinaryActionIssued($action));
        }

        // Notify investigator if assigned
        if ($this->notificationData['investigator_id'] && $action->investigator && $action->investigator->user) {
            $action->investigator->user->notify(new InvestigationAssigned($action));
        }
    }
}
