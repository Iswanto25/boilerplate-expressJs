import fs from "fs";
import path from "path";
import os from "os";

interface GetUsersMetrics {
	// Request Info
	timestamp: string;
	totalUsers: number;

	// Performance
	queryTime: number;
	urlGenerationTime: number;
	totalTime: number;

	// User Distribution
	usersWithPhoto: number;
	usersWithoutPhoto: number;

	// System Resources
	memoryUsedMB: number;
	cpuCores: number;

	// Throughput
	averageTimePerUser: number;
	throughputUsersPerSecond: number;

	// NIK Decryption
	nikDecryptionTime?: number;
	nikDecryptionCount?: number;
	averageNIKDecryptTime?: number;
}

export function generateGetUsersReport(metrics: GetUsersMetrics): string {
	const date = new Date(metrics.timestamp);
	const formattedDate = date.toLocaleString("id-ID", {
		dateStyle: "full",
		timeStyle: "long",
	});

	const photoPercentage = metrics.totalUsers > 0 ? ((metrics.usersWithPhoto / metrics.totalUsers) * 100).toFixed(2) : "0.00";

	let report = `# Get All Users Performance Report

## 📋 Informasi Umum

| Item | Value |
|------|-------|
| **Timestamp** | ${formattedDate} |
| **Total Users Retrieved** | ${metrics.totalUsers.toLocaleString("id-ID")} users |
| **Users with Photo** | ${metrics.usersWithPhoto.toLocaleString("id-ID")} (${photoPercentage}%) |
| **Users without Photo** | ${metrics.usersWithoutPhoto.toLocaleString("id-ID")} (${(100 - parseFloat(photoPercentage)).toFixed(2)}%) |

---

## ⏱️ Performance Metrics

### System Resources

| Resource | Value |
|----------|-------|
| **CPU Cores Available** | ${metrics.cpuCores} cores |

### Execution Time Breakdown

| Phase | Time (ms) | Time (s) | Percentage |
|-------|-----------|----------|------------|
| **1. Database Query** | ${metrics.queryTime.toLocaleString("id-ID")}ms | ${(metrics.queryTime / 1000).toFixed(2)}s | ${((metrics.queryTime / metrics.totalTime) * 100).toFixed(2)}% |
| **2. URL Generation** | ${metrics.urlGenerationTime.toLocaleString("id-ID")}ms | ${(metrics.urlGenerationTime / 1000).toFixed(2)}s | ${((metrics.urlGenerationTime / metrics.totalTime) * 100).toFixed(2)}% |
${
	metrics.nikDecryptionTime !== undefined && metrics.nikDecryptionTime > 0 ?
		`| **3. NIK Decryption** | ${metrics.nikDecryptionTime.toLocaleString("id-ID")}ms | ${(metrics.nikDecryptionTime / 1000).toFixed(2)}s | ${((metrics.nikDecryptionTime / metrics.totalTime) * 100).toFixed(2)}% |
`
	:	""
}| **🎯 TOTAL TIME** | **${metrics.totalTime.toLocaleString("id-ID")}ms** | **${(metrics.totalTime / 1000).toFixed(2)}s** | **100%** |

### Throughput

| Metric | Value |
|--------|-------|
| **Average Time per User** | ${metrics.averageTimePerUser.toFixed(3)}ms/user |
| **Throughput** | ${metrics.throughputUsersPerSecond.toFixed(2)} users/second |
| **Memory Used** | ${metrics.memoryUsedMB.toFixed(2)} MB |
${
	metrics.nikDecryptionCount !== undefined && metrics.nikDecryptionCount > 0 ?
		`
### NIK Decryption Performance

| Metric | Value |
|--------|-------|
| **NIK Decrypted** | ${metrics.nikDecryptionCount} NIKs |
| **Total Decryption Time** | ${metrics.nikDecryptionTime}ms (${(metrics.nikDecryptionTime! / 1000).toFixed(2)}s) |
| **Average Time per NIK** | ${metrics.averageNIKDecryptTime!.toFixed(3)}ms/NIK |
| **Decryption Throughput** | ${((metrics.nikDecryptionCount / metrics.nikDecryptionTime!) * 1000).toFixed(2)} NIKs/second |
`
	:	""
}
---

## 🎯 Performance Analysis

`;

	// Bottleneck Detection
	const slowestPhase = metrics.queryTime > metrics.urlGenerationTime ? "Database Query" : "URL Generation";
	report += `### 🔍 Bottleneck Detection\n\n`;
	report += `**Slowest Phase:** ${slowestPhase} (${Math.max(metrics.queryTime, metrics.urlGenerationTime)}ms)\n\n`;

	// Recommendations
	report += `### 💡 Recommendations\n\n`;

	if (metrics.queryTime > 1000) {
		report += `- ⚠️ **Database Query is slow** (${metrics.queryTime}ms)\n`;
		report += `  - Add database index on frequently queried columns\n`;
		report += `  - Consider pagination for better performance\n`;
		report += `  - Enable database query caching\n\n`;
	}

	if (metrics.urlGenerationTime > 500) {
		report += `- ⚠️ **URL Generation is slow** (${metrics.urlGenerationTime}ms)\n`;
		report += `  - Consider caching photo URLs\n`;
		report += `  - Use CDN for faster URL generation\n`;
		report += `  - Optimize URL construction logic\n\n`;
	}

	if (metrics.averageTimePerUser > 1) {
		report += `- ⚠️ **High average time per user** (${metrics.averageTimePerUser.toFixed(3)}ms/user)\n`;
		report += `  - Recommend implementing pagination\n`;
		report += `  - Consider limiting default page size\n`;
		report += `  - Add select field filtering\n\n`;
	}

	if (metrics.totalUsers > 10000) {
		report += `- ⚠️ **Large dataset** (${metrics.totalUsers} users)\n`;
		report += `  - **Strongly recommend** pagination to avoid performance issues\n`;
		report += `  - Consider implementing infinite scroll or cursor-based pagination\n`;
		report += `  - Add filters (search, date range, etc.)\n\n`;
	}

	if (metrics.queryTime < 500 && metrics.urlGenerationTime < 200 && metrics.totalUsers < 5000) {
		report += `✅ **Performance is excellent!** Query is fast and dataset is manageable.\n\n`;
	}

	// Scalability Analysis
	report += `### 📈 Scalability Analysis\n\n`;

	const estimatedTimeFor10k = (metrics.averageTimePerUser * 10000).toFixed(0);
	const estimatedTimeFor100k = (metrics.averageTimePerUser * 100000).toFixed(0);

	report += `**Estimated performance for different dataset sizes:**\n\n`;
	report += `| Users | Estimated Time | Recommendation |\n`;
	report += `|-------|----------------|----------------|\n`;
	report += `| 1,000 | ${(metrics.averageTimePerUser * 1000).toFixed(0)}ms (${((metrics.averageTimePerUser * 1000) / 1000).toFixed(2)}s) | ✅ Acceptable |\n`;
	report += `| 10,000 | ${estimatedTimeFor10k}ms (${(parseFloat(estimatedTimeFor10k) / 1000).toFixed(2)}s) | ${parseFloat(estimatedTimeFor10k) < 5000 ? "✅ Acceptable" : "⚠️ Consider pagination"} |\n`;
	report += `| 100,000 | ${estimatedTimeFor100k}ms (${(parseFloat(estimatedTimeFor100k) / 1000).toFixed(2)}s) | ${parseFloat(estimatedTimeFor100k) < 10000 ? "⚠️ Pagination recommended" : "❌ Pagination required"} |\n`;

	// Footer
	report += `\n---\n\n`;
	report += `*Report generated automatically on ${formattedDate}*\n`;
	report += `*Total execution time: ${(metrics.totalTime / 1000).toFixed(3)} seconds*\n`;

	return report;
}

export async function saveGetUsersReport(metrics: GetUsersMetrics): Promise<string> {
	const reportDir = path.join(process.cwd(), "logger", "get-users-reports");

	// Create directory if not exists
	if (!fs.existsSync(reportDir)) {
		fs.mkdirSync(reportDir, { recursive: true });
	}

	// Generate filename with timestamp
	const date = new Date(metrics.timestamp);
	const filename = `get-users-${date.toISOString().replace(/:/g, "-").split(".")[0]}.md`;
	const filepath = path.join(reportDir, filename);

	// Generate and save report
	const report = generateGetUsersReport(metrics);
	fs.writeFileSync(filepath, report, "utf-8");

	console.log(`\n📄 Report saved: ${filepath}\n`);

	return filepath;
}
