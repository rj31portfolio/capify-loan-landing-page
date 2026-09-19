# Capify landing page

The loan form sends enquiries to **capifysales@gmail.com** using PHP and PHPMailer over Gmail SMTP. SweetAlert2 shows success or failure; inline feedback remains available if the CDN cannot load.

## Setup

1. Use PHP 8.1+ with OpenSSL and Composer. Run `composer install --no-dev` (include the resulting `vendor` folder when uploading to shared hosting).
2. Copy `smtp-config.example.php` to `smtp-config.php` if it does not already exist. Set the sending Gmail address, its Gmail App Password, and the receiving email address. The local configuration is ignored by Git.
3. Enable Google 2-Step Verification and generate an [App Password](https://support.google.com/accounts/answer/185833). Use that password, not your regular Google password. Alternatively, configure server environment variables `SMTP_USERNAME`, `SMTP_PASSWORD`, and `MAIL_TO`; these override the file settings.
4. Run `php -S localhost:8000` from this folder and open http://localhost:8000. Opening index.html directly or using a static-only server cannot run the PHP endpoint.
5. For deployment, serve the site over HTTPS with PHP enabled and outbound access to `smtp.gmail.com:587`. Keep credentials server-side. Send a test application and verify receipt in the configured inbox (including spam).

The SMTP connection uses authenticated STARTTLS with certificate verification. See [Google's SMTP settings](https://support.google.com/mail/answer/7104828?hl=en) and [PHPMailer](https://github.com/PHPMailer/PHPMailer).

## Submission behavior

- Browser and PHP validation check required fields, Indian mobile numbers, email, loan type, whole-rupee amount and message length.
- The email includes all application fields and uses the applicant's email as Reply-To. Recipients are configured on the server, never supplied by the visitor.
- The submit button and inputs are disabled during sending. Success clears the form; errors preserve entries.
- A honeypot and a limit of five valid attempts per IP per ten minutes reduce abuse. Rate-limit timestamps are stored in PHP's temporary directory; application data is not stored in files or a database by this endpoint.
- A missing SMTP password/dependency returns an unavailable message. SMTP failures return a generic error without credentials or applicant data.

## Files

- `index.html`, `css/style.css`, `js/script.js`: page, responsive styling, navigation, validation and SweetAlert feedback.
- `submit-loan.php`: validation and Gmail SMTP delivery.
- `smtp-config.example.php`: server configuration template.
- `composer.json` / `composer.lock`: PHPMailer dependency and locked version.

Before publishing, set the canonical URL, review company privacy/terms copy and verify the contact details. Google Fonts and SweetAlert2 are external resources.
