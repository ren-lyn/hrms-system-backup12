@php
    $greetingName = trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? ''));
    if ($greetingName === '') {
        $greetingName = $user->email;
    }
@endphp

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Password Reset Instructions</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f5f7fb;
            color: #1f2933;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 30px auto;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            color: #ffffff;
            padding: 24px 32px;
        }
        .content {
            padding: 32px;
        }
        .button {
            display: inline-block;
            padding: 14px 28px;
            background: #2563eb;
            color: #ffffff;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 24px 0;
        }
        .details {
            background: #f8fafc;
            border-radius: 8px;
            padding: 16px;
            margin-top: 16px;
        }
        .footer {
            padding: 20px 32px;
            font-size: 12px;
            color: #64748b;
            background: #f8fafc;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Reset your HRMS password</h1>
        </div>
        <div class="content">
            <p>Hi {{ $greetingName }},</p>

            <p>We received a password reset request for your HRMS account. Click the button below to create a new password.</p>

            <p style="text-align: center;">
                <a class="button" href="{{ $resetUrl }}">Reset Password</a>
            </p>

            <p>For security, this link will expire on <strong>{{ $expiresAt->timezone(config('app.timezone', 'UTC'))->format('F j, Y g:i A') }}</strong>.</p>

            <div class="details">
                <p><strong>Request Details</strong></p>
                <ul style="padding-left: 18px; margin: 0;">
                    <li>Email: {{ $request->email }}</li>
                    <li>Requested by: {{ $request->full_name }}</li>
                    <li>Department: {{ $request->department ?? 'Not provided' }}</li>
                    <li>Submitted on: {{ optional($request->created_at)->format('F j, Y g:i A') }}</li>
                </ul>
            </div>

            <p>If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>

            <p>Stay secure,<br />CCDC HRMS Team</p>
        </div>
        <div class="footer">
            <p>This email was sent automatically because a password reset was approved by an administrator. Please do not reply.</p>
        </div>
    </div>
</body>
</html>



