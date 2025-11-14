<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class PasswordResetLinkMail extends Mailable
{
    use Queueable, SerializesModels;

    public $user;
    public $token;
    public $resetUrl;
    public $requestId;

    /**
     * Create a new message instance.
     *
     * @param  \App\Models\User  $user
     * @param  string  $token
     * @param  int|null  $requestId
     */
    public function __construct($user, $token, $requestId = null)
    {
        $this->user = $user;
        $this->token = $token;
        $this->requestId = $requestId;
        
        // Build the reset URL
        $frontendUrl = config('services.frontend.url', 'http://localhost:3000');
        $resetUrl = $frontendUrl . '/reset-password?token=' . urlencode($token) . '&email=' . urlencode($user->email);
        
        if ($requestId) {
            $resetUrl .= '&requestId=' . $requestId;
        }
        
        $this->resetUrl = $resetUrl;
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        return $this->subject('Password Reset Request Approved')
                    ->view('emails.password-reset-link')
                    ->with([
                        'user' => $this->user,
                        'resetUrl' => $this->resetUrl,
                        'token' => $this->token,
                    ]);
    }
}
