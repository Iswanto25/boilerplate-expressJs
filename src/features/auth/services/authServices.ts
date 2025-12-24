import prisma from "../../../configs/database";
import { existingEmail } from "../../../utils/existingUsers";
import { encryptPassword, comparePassword } from "../../../utils/utils";
import { apiError } from "../../../utils/respons";
import { jwtUtils } from "../../../utils/jwt";
import { storeToken, deleteToken } from "../../../utils/tokenStore";
import { sendEmail } from "../../../utils/smtp";
import { generateOTP, isPhoneNumberValid, isEmailValid } from "../../../utils/utils";
import { v4 as uuidv4 } from "uuid";

interface LocalRegister {
	name: string;
	email: string;
	password: string;
}

export const authServices = {
	async register(data: LocalRegister) {
		return await prisma.$transaction(async (tx) => {
			if (!isEmailValid(data.email)) throw new apiError(400, "Invalid email");
			const existing = await existingEmail(data.email);
			if (existing) throw new apiError(400, "Email already exists");

			const user = await tx.user.create({
				data: {
					name: data.name,
					email: data.email,
					password: await encryptPassword(data.password),
				},
			});

			const accessToken = jwtUtils.generateAccessToken({ id: user.id, email: user.email });
			const refreshToken = jwtUtils.generateRefreshToken({ id: user.id, email: user.email });

			await storeToken(user.id, accessToken, "access", 24 * 60 * 60);
			await storeToken(user.id, refreshToken, "refresh", 7 * 24 * 60 * 60);

			await tx.refreshToken.create({
				data: {
					id: uuidv4(),
					userId: user.id,
					token: refreshToken,
				},
			});

			return {
				user: {
					id: user.id,
					name: user.name,
					email: user.email,
				},
				accessToken,
				refreshToken,
			};
		});
	},

	async login(email: string, password: string) {
		if (!isEmailValid(email)) throw new apiError(400, "Invalid email");
		const user = await prisma.user.findUnique({ where: { email } });
		if (!user) throw new apiError(400, "User not found");

		const isValid = await comparePassword(password, user.password);
		if (!isValid) throw new apiError(400, "Invalid password");

		await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
		await deleteToken(user.id, "access");
		await deleteToken(user.id, "refresh");

		const accessToken = jwtUtils.generateAccessToken({ id: user.id, email: user.email });
		const refreshToken = jwtUtils.generateRefreshToken({ id: user.id, email: user.email });

		await prisma.refreshToken.create({
			data: {
				id: uuidv4(),
				userId: user.id,
				token: refreshToken,
			},
		});

		await storeToken(user.id, accessToken, "access", 24 * 60 * 60);
		await storeToken(user.id, refreshToken, "refresh", 7 * 24 * 60 * 60);

		return {
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
			},
			accessToken,
			refreshToken,
		};
	},

	async refreshToken(oldToken: string) {
		const decoded = jwtUtils.verifyRefreshToken(oldToken);

		const user = await prisma.user.findUnique({ where: { id: decoded.id } });
		if (!user) throw new apiError(400, "User not found");

		const tokenRecord = await prisma.refreshToken.findFirst({
			where: { userId: user.id, token: oldToken },
		});
		if (!tokenRecord) throw new apiError(400, "Invalid token");

		await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
		await deleteToken(user.id, "access");
		await deleteToken(user.id, "refresh");

		const newAccessToken = jwtUtils.generateAccessToken({ id: user.id, email: user.email });
		const newRefreshToken = jwtUtils.generateRefreshToken({ id: user.id, email: user.email });

		await prisma.refreshToken.create({
			data: { id: uuidv4(), userId: user.id, token: newRefreshToken },
		});
		await storeToken(user.id, newAccessToken, "access", 24 * 60 * 60);
		await storeToken(user.id, newRefreshToken, "refresh", 7 * 24 * 60 * 60);

		return {
			accessToken: newAccessToken,
			refreshToken: newRefreshToken,
		};
	},

	async logout(userId: string) {
		await prisma.refreshToken.deleteMany({ where: { userId } });
		await deleteToken(userId, "access");
		await deleteToken(userId, "refresh");

		return { message: "Logout berhasil" };
	},

	async profile(userId: string) {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				name: true,
				email: true,
				role: true,
				isActive: true,
				createdAt: true,
				updatedAt: true,
			},
		});
		if (!user) throw new apiError(400, "User not found");
		return user;
	},

	async forgotPassword(email: string): Promise<void> {
		const user = await prisma.user.findUnique({ where: { email } });
		if (!user) throw new apiError(400, "User not found");
		const otp = generateOTP();
		const to = email;
		const subject = "Reset Password";
		const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Reset Password - ${process.env.APP_NAME}</title>
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
    .otp-box {
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
    <div class="header">${process.env.APP_NAME || "Our App"}</div>
    <div class="body">
      <p>Halo <strong>${user.name || "User"}</strong>,</p>
      <p>Kami menerima permintaan untuk mengatur ulang kata sandi akun Anda.</p>
      <p>Gunakan kode OTP berikut untuk melanjutkan proses reset password:</p>
      <div class="otp-box">${otp}</div>
      <p>Kode ini akan kedaluwarsa dalam waktu <strong>10 menit</strong>.</p>
      <p>Jika Anda tidak meminta reset password, abaikan email ini.</p>
      <p>Terima kasih,<br>Tim ${process.env.APP_NAME || "Kami"}</p>
    </div>
    <div class="footer">
      Email ini dikirim otomatis oleh sistem ${process.env.APP_NAME || "Aplikasi"}.
      <br>
      &copy; ${new Date().getFullYear()} ${process.env.APP_NAME || "Boilerplate App"}.
    </div>
  </div>
</body>
</html>
`;

		const fromName = process.env.APP_NAME;
		const fromEmail = process.env.SMTP_USER;
		await sendEmail({
			to,
			subject,
			html,
			fromName,
			fromEmail,
		});
	},
};
