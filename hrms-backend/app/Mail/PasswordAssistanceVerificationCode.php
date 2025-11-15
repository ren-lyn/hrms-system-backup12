<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class PasswordAssistanceVerificationCode extends Mailable
{
    use Queueable, SerializesModels;

    public $email;
    public $verificationCode;
    public $name;

    /**
     * Create a new message instance.
     *
     * @param  string  $email
     * @param  string  $verificationCode
     * @param  string  $name
     */
    public function __construct($email, $verificationCode, $name = null)
    {
        $this->email = $email;
        $this->verificationCode = $verificationCode;
        $this->name = $name;
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        return $this->subject('Password Assistance Verification Code - HRMS')
                    ->view('emails.password-assistance-verification-code')
                    ->with([
                        'email' => $this->email,
                        'verificationCode' => $this->verificationCode,
                        'name' => $this->name,
                    ]);
    }
}
