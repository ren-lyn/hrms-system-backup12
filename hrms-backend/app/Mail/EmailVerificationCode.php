<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class EmailVerificationCode extends Mailable
{
    use Queueable, SerializesModels;

    public $email;
    public $verificationCode;
    public $firstName;

    /**
     * Create a new message instance.
     *
     * @param  string  $email
     * @param  string  $verificationCode
     * @param  string  $firstName
     */
    public function __construct($email, $verificationCode, $firstName = null)
    {
        $this->email = $email;
        $this->verificationCode = $verificationCode;
        $this->firstName = $firstName;
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        return $this->subject('Email Verification Code - HRMS Registration')
                    ->view('emails.email-verification-code')
                    ->with([
                        'email' => $this->email,
                        'verificationCode' => $this->verificationCode,
                        'firstName' => $this->firstName,
                    ]);
    }
}
