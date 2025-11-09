<?php
class EmailService {
    
    public function sendVerificationEmail($to, $token, $name) {
        // Include config to access constants
        require_once __DIR__ . '/../config/config.php';
        
        $verification_url = "http://localhost/UniStay---Website/verify-email.html?token=" . $token;
        
        $subject = "Verify Your UniStay Account";
        $message = $this->getVerificationEmailTemplate($name, $verification_url);
        
        // Localhost email headers - NOW THESE CONSTANTS WILL WORK
        $headers = "From: " . SMTP_FROM_NAME . " <" . SMTP_FROM . ">\r\n";
        $headers .= "Reply-To: no-reply@unistay.com\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "X-Mailer: PHP/" . phpversion();
        
        // Try to send via localhost
        $email_sent = mail($to, $subject, $message, $headers);
        
        // ALWAYS log to file (for school project demonstration)
        $this->logEmail($to, $verification_url, $email_sent);
        
        return $email_sent;
    }
    
    private function getVerificationEmailTemplate($name, $verification_url) {
        return "
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
                .header { background: linear-gradient(135deg, #1a237e 0%, #283593 100%); color: white; padding: 30px; text-align: center; }
                .content { padding: 30px; background: #f9f9f9; }
                .button { display: inline-block; padding: 12px 30px; background: #1a237e; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 15px 0; }
                .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
                .link-box { background: #fff; padding: 15px; border-left: 4px solid #1a237e; margin: 15px 0; word-break: break-all; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>UniStay</h1>
                    <h2>Verify Your Email Address</h2>
                </div>
                <div class='content'>
                    <h3>Hello {$name},</h3>
                    <p>Welcome to UniStay! Please verify your email address to activate your account.</p>
                    
                    <a href='{$verification_url}' class='button'>Verify Email Address</a>
                    
                    <p><strong>For demonstration purposes:</strong> This email was sent from localhost. The verification link has been logged to a file.</p>
                    
                    <div class='link-box'>
                        <strong>Verification URL:</strong><br>
                        <code>{$verification_url}</code>
                    </div>
                    
                    <div class='footer'>
                        <p><strong>This link will expire in 24 hours.</strong></p>
                        <p>This is a school project demonstration - UniStay Student Accommodation System</p>
                    </div>
                </div>
            </div>
        </body>
        </html>";
    }
	
	public function sendPasswordResetEmail($to, $token, $name) {
    $reset_url = "http://localhost/UniStay---Website/reset-password.html?token=" . $token;
    
    $subject = "Reset Your UniStay Password";
    $message = $this->getPasswordResetEmailTemplate($name, $reset_url);
    
    $headers = "From: UniStay <noreply@unistay.com>\r\n";
    $headers .= "Reply-To: noreply@unistay.com\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    
    // Log the email
    $log_message = "=== PASSWORD RESET EMAIL ===\n";
    $log_message .= "To: $to\n";
    $log_message .= "URL: $reset_url\n";
    $log_message .= "Time: " . date('Y-m-d H:i:s') . "\n";
    $log_message .= "----------------------------------------\n\n";
    
    file_put_contents(__DIR__ . '/../email_log.txt', $log_message, FILE_APPEND);
    
    // For localhost, always return true
    return true;
}

private function getPasswordResetEmailTemplate($name, $reset_url) {
    return "
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1a237e; color: white; padding: 20px; text-align: center; }
            .button { display: inline-block; padding: 12px 24px; background: #1a237e; color: white; text-decoration: none; border-radius: 4px; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h1>UniStay Password Reset</h1>
            </div>
            <div style='padding: 20px;'>
                <h2>Hello $name,</h2>
                <p>You requested to reset your password. Click the button below:</p>
                <a href='$reset_url' class='button'>Reset Password</a>
                <p>Or copy this link: $reset_url</p>
                <p>This link expires in 1 hour.</p>
            </div>
        </div>
    </body>
    </html>";
}
    
    private function logEmail($to, $url, $email_sent) {
        $status = $email_sent ? "SENT" : "FAILED";
        
        $log_message = "=== EMAIL VERIFICATION ===\n";
        $log_message .= "SENT\n";
        $log_message .= "To: {$to}\n";
        $log_message .= "URL: {$url}\n";
        $log_message .= "Time: " . date('Y-m-d H:i:s') . "\n";
        $log_message .= "Method: Localhost mail() function\n";
        $log_message .= "----------------------------------------\n\n";
        
        // Log to project file
        file_put_contents(__DIR__ . '/../email_log.txt', $log_message, FILE_APPEND);
        
        // Also show in PHP error log for easy debugging
        error_log("UniStay Email: Verification link generated for {$to}");
    }
}
?>