<?php
declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;

ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond(int $code, string $message, array $errors = []): void
{
    http_response_code($code);
    echo json_encode(['success' => $code === 200, 'message' => $message, 'errors' => $errors]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    respond(405, 'Please submit the application form.');
}
// A cross-origin HTML form cannot set this header. Do not enable CORS here.
if (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'XMLHttpRequest') {
    respond(403, 'Please submit the application from our website.');
}
if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 16384) {
    respond(413, 'Your application is too large. Please shorten your message.');
}

$data = [];
foreach (['fullName', 'mobile', 'email', 'loanType', 'amount', 'message', 'website'] as $key) {
    if (isset($_POST[$key]) && !is_string($_POST[$key])) {
        respond(422, 'Please check your application details.');
    }
    $data[$key] = trim($_POST[$key] ?? '');
}
if ($data['website'] !== '') {
    respond(422, 'Unable to submit this application.');
}
$errors = [];
if (strlen($data['fullName']) < 2 || strlen($data['fullName']) > 400 ||
    preg_match_all('/./us', $data['fullName']) > 100 ||
    !preg_match('/\p{L}/u', $data['fullName']) || preg_match('/[\x00-\x1F\x7F]/', $data['fullName'])) {
    $errors['fullName'] = 'Please enter your full name (up to 100 characters).';
}
$data['mobile'] = preg_replace('/[\s()-]/', '', $data['mobile']);
$data['mobile'] = preg_replace('/^(\+91|0091)/', '', $data['mobile']);
if (!preg_match('/^[6-9][0-9]{9}$/', $data['mobile'])) {
    $errors['mobile'] = 'Enter a valid 10-digit Indian mobile number.';
}
if (strlen($data['email']) > 254 || !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Please enter a valid email address.';
}
if (!in_array($data['loanType'], ['Personal Loan', 'Home Loan', 'Car Loan', 'Business Loan',
    'Education Loan', 'Loan Against Property', 'Other'], true)) {
    $errors['loanType'] = 'Please select a loan type.';
}
if (!preg_match('/^[0-9]{1,16}$/', $data['amount']) || (float) $data['amount'] < 1 ||
    (float) $data['amount'] > 9007199254740991) {
    $errors['amount'] = 'Enter a positive whole-rupee amount.';
}
if (strlen($data['message']) > 8000 || !preg_match('//u', $data['message']) ||
    preg_match_all('/./us', $data['message']) > 2000) {
    $errors['message'] = 'Please shorten your message to 2,000 characters.';
}
if ($errors) {
    respond(422, 'Please check the highlighted fields.', $errors);
}

try {
    $configPath = __DIR__ . '/smtp-config.php';
    $config = is_file($configPath) ? require $configPath : [];
    $username = getenv('SMTP_USERNAME') ?: ($config['username'] ?? 'capifysales@gmail.com');
    $password = preg_replace('/\s+/', '', getenv('SMTP_PASSWORD') ?: ($config['password'] ?? ''));
    $recipient = getenv('MAIL_TO') ?: ($config['recipient'] ?? 'capifysales@gmail.com');
    if (!$password || !filter_var($username, FILTER_VALIDATE_EMAIL) ||
        !filter_var($recipient, FILTER_VALIDATE_EMAIL) || !is_file(__DIR__ . '/vendor/autoload.php')) {
        respond(503, 'Email submission is currently unavailable. Please call us or try again later.');
    }

    // Limit valid submission attempts per IP; store no application details.
    $ratePath = sys_get_temp_dir() . '/capify-' . hash('sha256', __DIR__ . ($_SERVER['REMOTE_ADDR'] ?? 'unknown')) . '.json';
    $rateFile = fopen($ratePath, 'c+');
    if (!$rateFile || !flock($rateFile, LOCK_EX)) {
        throw new RuntimeException('Rate limiter unavailable');
    }
    $attempts = json_decode(stream_get_contents($rateFile), true) ?: [];
    $attempts = array_values(array_filter($attempts, static fn ($time) => $time > time() - 600));
    if (count($attempts) >= 5) {
        fclose($rateFile);
        header('Retry-After: 600');
        respond(429, 'Too many attempts. Please wait 10 minutes or call us.');
    }
    $attempts[] = time();
    rewind($rateFile);
    ftruncate($rateFile, 0);
    fwrite($rateFile, json_encode($attempts));
    fflush($rateFile);
    flock($rateFile, LOCK_UN);
    fclose($rateFile);

    require __DIR__ . '/vendor/autoload.php';
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = 'smtp.gmail.com';
    $mail->SMTPAuth = true;
    $mail->Username = $username;
    $mail->Password = $password;
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = 587;
    $mail->Timeout = 20;
    $mail->Timelimit = 30;
    $mail->CharSet = 'UTF-8';
    $mail->setFrom($username, 'Capify Website');
    $mail->addAddress($recipient);
    $mail->addReplyTo($data['email'], $data['fullName']);
    $mail->Subject = 'New Capify application - ' . $data['loanType'];
    $mail->Body = "New loan enquiry from the Capify website\n\n"
        . "Full name: {$data['fullName']}\nMobile: +91 {$data['mobile']}\n"
        . "Email: {$data['email']}\nLoan type: {$data['loanType']}\n"
        . "Loan amount (INR): {$data['amount']}\n\nMessage:\n"
        . ($data['message'] ?: 'No message provided.');
    $mail->send();
    respond(200, 'Your application has been sent successfully. Our team will contact you shortly.');
} catch (Throwable $error) {
    // Do not expose SMTP credentials, server diagnostics, or applicant data.
    error_log('Capify application email failed (' . get_class($error) . ').');
    respond(502, 'We could not send your application. Please try again later or call us.');
}
