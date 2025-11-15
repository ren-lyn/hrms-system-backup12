<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Two-Factor Authentication Code</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 30px;
            border: 1px solid #e0e0e0;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #7C3AED;
            margin: 0;
            font-size: 24px;
        }
        .content {
            background-color: #ffffff;
            padding: 25px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .verification-code {
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            background-color: #f3e8ff;
            border: 2px dashed #7C3AED;
            border-radius: 8px;
        }
        .verification-code h2 {
            color: #7C3AED;
            font-size: 36px;
            letter-spacing: 8px;
            margin: 0;
            font-family: 'Courier New', monospace;
        }
        .footer {
            text-align: center;
            color: #7f8c8d;
            font-size: 12px;
            margin-top: 30px;
        }
        .warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .info {
            background-color: #e7f3ff;
            border-left: 4px solid #3498db;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Two-Factor Authentication</h1>
        </div>
        
        <div class="content">
            <p>Hello {{ $name ?? 'there' }},</p>
            
            <p>You have successfully entered your password. To complete your login, please use the verification code below.</p>
            
            <div class="verification-code">
                <h2>{{ $verificationCode }}</h2>
            </div>
            
            <div class="info">
                <strong>Instructions:</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Enter this 6-digit code on the login verification screen</li>
                    <li>The code will expire in 15 minutes</li>
                    <li>If you didn't attempt to log in, please ignore this email</li>
                </ul>
            </div>
            
            <div class="warning">
                <strong>Security Notice:</strong> Never share this verification code with anyone. Our team will never ask for your verification code. If you did not attempt to log in, please contact support immediately.
            </div>
            
            <p>If you have any questions or need assistance, please contact our support team.</p>
        </div>
        
        <div class="footer">
            <p>This is an automated message from the HRMS System. Please do not reply to this email.</p>
            <p>&copy; {{ date('Y') }} Cabuyao Concrete Development Corporation. All rights reserved.</p>
        </div>
    </div>
</body>
</html>

