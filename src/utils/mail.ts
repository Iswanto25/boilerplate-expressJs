interface EmailTemplateOptions {
	userName?: string;
	appName?: string;
	title: string;
	greeting?: string;
	mainMessage: string;
	additionalInfo?: string;
	actionContent?: string; // For OTP box or buttons
	warningMessage?: string;
	footerMessage?: string;
}

/**
 * Generate a professional email HTML template
 * @param options - Email template configuration
 * @returns HTML string
 */
export function generateEmailTemplate(options: EmailTemplateOptions): string {
	const {
		userName = "User",
		appName = process.env.APP_NAME || "Our App",
		title,
		greeting,
		mainMessage,
		additionalInfo,
		actionContent,
		warningMessage,
		footerMessage,
	} = options;

	const greetingText = greeting || `Halo <strong>${userName}</strong>,`;
	const footer = footerMessage || `Email ini dikirim otomatis oleh sistem ${appName}.`;

	return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title} - ${appName}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f6f9fc;
      margin: 0;
      padding: 0;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }
    .header {
      background-color: #0066ff;
      color: #fff;
      text-align: center;
      padding: 24px 16px;
      font-size: 22px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .body {
      padding: 32px 24px;
      font-size: 16px;
      line-height: 1.6;
    }
    .action-box {
      text-align: center;
      background: #f0f4ff;
      padding: 16px;
      margin: 24px 0;
      border-radius: 8px;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 6px;
      color: #0052cc;
    }
    .button {
      display: inline-block;
      padding: 12px 32px;
      background-color: #0066ff;
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 16px 0;
    }
    .warning {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 12px;
      margin: 16px 0;
      border-radius: 4px;
      font-size: 14px;
    }
    .footer {
      text-align: center;
      padding: 16px;
      font-size: 13px;
      color: #888;
      background: #f9f9f9;
    }
    .footer a {
      color: #0066ff;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">${appName}</div>
    <div class="body">
      <p>${greetingText}</p>
      <p>${mainMessage}</p>
      ${additionalInfo ? `<p>${additionalInfo}</p>` : ""}
      ${actionContent ? `<div class="action-box">${actionContent}</div>` : ""}
      ${warningMessage ? `<div class="warning">${warningMessage}</div>` : ""}
      <p>Terima kasih,<br>Tim ${appName}</p>
    </div>
    <div class="footer">
      ${footer}
      <br>
      &copy; ${new Date().getFullYear()} ${appName}.
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Generate OTP email template for password reset
 */
export function generateOTPEmail(userName: string, otp: string): string {
	return generateEmailTemplate({
		userName,
		title: "Reset Password",
		mainMessage: "Kami menerima permintaan untuk mengatur ulang kata sandi akun Anda.",
		additionalInfo: "Gunakan kode OTP berikut untuk melanjutkan proses reset password:",
		actionContent: otp,
		warningMessage: "Kode ini akan kedaluwarsa dalam waktu <strong>10 menit</strong>. Jika Anda tidak meminta reset password, abaikan email ini.",
	});
}

/**
 * Generate verification email template
 */
export function generateVerificationEmail(userName: string, verificationCode: string): string {
	return generateEmailTemplate({
		userName,
		title: "Verifikasi Akun",
		mainMessage: "Terima kasih telah mendaftar! Silakan verifikasi akun Anda dengan kode berikut:",
		actionContent: verificationCode,
		warningMessage: "Kode verifikasi ini akan kedaluwarsa dalam waktu <strong>24 jam</strong>.",
	});
}

/**
 * Generate welcome email template
 */
export function generateWelcomeEmail(userName: string): string {
	return generateEmailTemplate({
		userName,
		title: "Selamat Datang",
		mainMessage: `Selamat datang di ${process.env.APP_NAME || "aplikasi kami"}!`,
		additionalInfo: "Akun Anda telah berhasil dibuat. Anda sekarang dapat menggunakan semua fitur yang tersedia.",
		warningMessage: "Jika Anda mengalami masalah atau memiliki pertanyaan, jangan ragu untuk menghubungi tim support kami.",
	});
}

/**
 * Generate password change confirmation email
 */
export function generatePasswordChangedEmail(userName: string): string {
	return generateEmailTemplate({
		userName,
		title: "Password Berhasil Diubah",
		mainMessage: "Password akun Anda telah berhasil diubah.",
		additionalInfo: "Jika Anda tidak melakukan perubahan ini, segera hubungi tim support kami.",
		warningMessage: "<strong>Penting:</strong> Jika ini bukan Anda, akun Anda mungkin telah diakses oleh orang lain. Segera amankan akun Anda!",
	});
}

/**
 * Generate generic OTP email (for various purposes)
 */
export function generateGenericOTPEmail(options: { userName: string; otp: string; purpose: string; expiryMinutes?: number }): string {
	const { userName, otp, purpose, expiryMinutes = 10 } = options;

	return generateEmailTemplate({
		userName,
		title: `Kode OTP - ${purpose}`,
		mainMessage: `Anda telah meminta kode OTP untuk ${purpose}.`,
		additionalInfo: "Gunakan kode OTP berikut untuk melanjutkan:",
		actionContent: otp,
		warningMessage: `Kode ini akan kedaluwarsa dalam waktu <strong>${expiryMinutes} menit</strong>. Jangan bagikan kode ini kepada siapapun.`,
	});
}
