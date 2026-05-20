import prisma from "../src/configs/database.js";
import { encryptPassword } from "../src/utils/utils.js";

async function main() {
	console.log("🌱 Memulai proses seeding database...");

	// 1. Bersihkan data lama (opsional, agar tidak duplikat saat di-run berkali-kali)
	console.log("Menghapus data lama...");
	await prisma.rolePermission.deleteMany();
	await prisma.resource.deleteMany();
	await prisma.module.deleteMany();
	await prisma.profile.deleteMany();
	await prisma.user.deleteMany();
	await prisma.role.deleteMany();

	// 2. Buat Role
	console.log("Membuat Roles...");
	const superadminRole = await prisma.role.create({
		data: {
			name: "Superadmin",
			status: true,
		},
	});

	const userRole = await prisma.role.create({
		data: {
			name: "User",
			status: true,
		},
	});

	// 3. Buat Module
	console.log("Membuat Modules...");
	const authModule = await prisma.module.create({
		data: { name: "Authentication" },
	});

	const usersModule = await prisma.module.create({
		data: { name: "Users Management" },
	});

	// 4. Buat Resource
	console.log("Membuat Resources...");
	const profileResource = await prisma.resource.create({
		data: {
			name: "Profile",
			moduleId: authModule.id,
			availableActions: ["LIST", "DETAIL", "UPDATE", "DELETE"],
		},
	});

	const usersResource = await prisma.resource.create({
		data: {
			name: "Users",
			moduleId: usersModule.id,
			availableActions: ["LIST", "DETAIL", "CREATE", "UPDATE", "DELETE"],
		},
	});

	// 5. Buat Role Permissions
	console.log("Membuat Role Permissions...");
	// Superadmin mendapat semua akses
	await prisma.rolePermission.createMany({
		data: [
			{
				roleId: superadminRole.id,
				resourceId: profileResource.id,
				grantedActions: ["LIST", "DETAIL", "UPDATE", "DELETE"],
			},
			{
				roleId: superadminRole.id,
				resourceId: usersResource.id,
				grantedActions: ["LIST", "DETAIL", "CREATE", "UPDATE", "DELETE"],
			},
		],
	});

	// User biasa mendapat akses terbatas
	await prisma.rolePermission.create({
		data: {
			roleId: userRole.id,
			resourceId: profileResource.id,
			grantedActions: ["DETAIL", "UPDATE"], // Hanya bisa lihat dan update profilnya sendiri
		},
	});

	// 6. Buat Users & Profiles
	console.log("Membuat Users...");
	const adminPassword = await encryptPassword("Admin123!");
	const adminUser = await prisma.user.create({
		data: {
			email: "admin@example.com",
			password: adminPassword,
			roleId: superadminRole.id,
			isActive: true,
			profile: {
				create: {
					name: "Super Admin",
					phone: "081234567890",
					address: "Jl. Admin Utama No.1",
					NIK: "1234567890123456",
				},
			},
		},
	});

	const normalPassword = await encryptPassword("User123!");
	const normalUser = await prisma.user.create({
		data: {
			email: "user@example.com",
			password: normalPassword,
			roleId: userRole.id,
			isActive: true,
			profile: {
				create: {
					name: "Budi Santoso",
					phone: "089876543210",
					address: "Jl. User Biasa No.2",
					NIK: "6543210987654321",
				},
			},
		},
	});

	console.log("✅ Seeding selesai!");
	console.log("-----------------------------------------");
	console.log("Akun Superadmin:");
	console.log(`Email    : ${adminUser.email}`);
	console.log(`Password : Admin123!`);
	console.log("-----------------------------------------");
	console.log("Akun User:");
	console.log(`Email    : ${normalUser.email}`);
	console.log(`Password : User123!`);
	console.log("-----------------------------------------");
}

main()
	.catch((e) => {
		console.error("❌ Error saat seeding:", e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
