<?php

namespace App\Mail;

use App\Models\PasswordChangeRequest;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class PasswordResetLinkMail extends Mailable
{
    use Queueable, SerializesModels;

    public User $user;
    public PasswordChangeRequest $request;
    public string $resetUrl;
    public Carbon $expiresAt;

    public function __construct(User $user, PasswordChangeRequest $request, string $resetUrl, Carbon $expiresAt)
    {
        $this->user = $user;
        $this->request = $request;
        $this->resetUrl = $resetUrl;
        $this->expiresAt = $expiresAt;
    }

    public function build(): self
    {
        return $this->subject('Reset Your HRMS Account Password')
            ->view('emails.password-reset-link')
            ->with([
                'user' => $this->user,
                'request' => $this->request,
                'resetUrl' => $this->resetUrl,
                'expiresAt' => $this->expiresAt,
            ]);
    }
}



