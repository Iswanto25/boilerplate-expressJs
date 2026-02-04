import fs from "fs";
import path from "path";
import os from "os";

interface BulkRegisterMetrics {
	// Request Info
	totalUsers: number;
	timestamp: string;

	// Phase Timings (ms)
	emailValidationTime: number;
	preprocessingTime: number;
	databaseInsertionTime: number;
	totalTime: number;

	// Results
	successCount: number;
	failedCount: number;
	existingEmailsCount: number;
	uploadedPhotos: number;
	failedPhotos: number;

	// Batch Info
	batchSize: number;
	totalBatches: number;
	batchTimings: Array<{ batchNum: number; users: number; time: number; status: "success" | "failed"; error?: string }>;

	// Memory & Performance
	memoryUsedMB: number;
	averageTimePerUser: number;
	throughputUsersPerSecond: number;

	// CPU & Concurrency
	cpuCores: number;
	concurrencyLimit: number;
	cpuUsagePercent?: number;

	// NIK Encryption
	nikEncryptionTime?: number;
	nikEncryptionCount?: number;
	averageNIKEncryptTime?: number;

	// Data Size (if photos included)
	totalDataSizeMB?: number;
	averagePhotoSizeMB?: number;
}

export function generateBulkRegisterReport(metrics: BulkRegisterMetrics): string {
	const date = new Date(metrics.timestamp);
	const formattedDate = date.toLocaleString("id-ID", {
		dateStyle: "full",
		timeStyle: "long",
	});

	const successRate = ((metrics.successCount / metrics.totalUsers) * 100).toFixed(2);
	const photoSuccessRate =
		metrics.uploadedPhotos + metrics.failedPhotos > 0 ?
			((metrics.uploadedPhotos / (metrics.uploadedPhotos + metrics.failedPhotos)) * 100).toFixed(2)
		:	"N/A";

	let report = `# Bulk Register Performance Report

## 📋 Informasi Umum

| Item | Value |
|------|-------|
| **Timestamp** | ${formattedDate} |
| **Total Users Requested** | ${metrics.totalUsers.toLocaleString("id-ID")} users |
| **Batch Size** | ${metrics.batchSize} users/batch |
| **Total Batches** | ${metrics.totalBatches} batches |

---

## 📊 Summary Results

| Metric | Value | Percentage |
|--------|-------|------------|
| ✅ **Success** | ${metrics.successCount.toLocaleString("id-ID")} users | ${successRate}% |
| ❌ **Failed** | ${metrics.failedCount.toLocaleString("id-ID")} users | ${((metrics.failedCount / metrics.totalUsers) * 100).toFixed(2)}% |
| 🔒 **Existing Emails** | ${metrics.existingEmailsCount.toLocaleString("id-ID")} users | - |
| 📸 **Photos Uploaded** | ${metrics.uploadedPhotos.toLocaleString("id-ID")} photos | ${photoSuccessRate}% |
| 📸 **Photos Failed** | ${metrics.failedPhotos.toLocaleString("id-ID")} photos | - |

---

## ⏱️ Performance Metrics

### System Resources

| Resource | Value |
|----------|-------|
| **CPU Cores Available** | ${metrics.cpuCores} cores |
| **Concurrency Limit** | ${metrics.concurrencyLimit} parallel processes |
${metrics.cpuUsagePercent !== undefined ? `| **CPU Usage** | ${metrics.cpuUsagePercent.toFixed(2)}% |` : ""}

### Execution Time Breakdown

| Phase | Time (ms) | Time (s) | Percentage |
|-------|-----------|----------|------------|
| **1. Email Validation** | ${metrics.emailValidationTime.toLocaleString("id-ID")}ms | ${(metrics.emailValidationTime / 1000).toFixed(2)}s | ${((metrics.emailValidationTime / metrics.totalTime) * 100).toFixed(2)}% |
| **2. Preprocessing (Hash + Upload)** | ${metrics.preprocessingTime.toLocaleString("id-ID")}ms | ${(metrics.preprocessingTime / 1000).toFixed(2)}s | ${((metrics.preprocessingTime / metrics.totalTime) * 100).toFixed(2)}% |
| **3. Database Insertion** | ${metrics.databaseInsertionTime.toLocaleString("id-ID")}ms | ${(metrics.databaseInsertionTime / 1000).toFixed(2)}s | ${((metrics.databaseInsertionTime / metrics.totalTime) * 100).toFixed(2)}% |
| **🎯 TOTAL TIME** | **${metrics.totalTime.toLocaleString("id-ID")}ms** | **${(metrics.totalTime / 1000).toFixed(2)}s** | **100%** |

### Throughput

| Metric | Value |
|--------|-------|
| **Average Time per User** | ${metrics.averageTimePerUser.toFixed(2)}ms/user |
| **Throughput** | ${metrics.throughputUsersPerSecond.toFixed(2)} users/second |
| **Memory Used** | ${metrics.memoryUsedMB.toFixed(2)} MB |
| **Parallel Processes** | ${metrics.concurrencyLimit} (utilizing ${((metrics.concurrencyLimit / metrics.cpuCores) * 100).toFixed(0)}% of CPU cores) |

---

## 📦 Batch Processing Details

| Batch | Users | Time (ms) | Status | Error |
|-------|-------|-----------|--------|-------|
`;

	metrics.batchTimings.forEach((batch) => {
		const statusIcon = batch.status === "success" ? "✅" : "❌";
		const error = batch.error || "-";
		report += `| ${batch.batchNum} | ${batch.users} | ${batch.time}ms | ${statusIcon} ${batch.status} | ${error} |\n`;
	});

	// Data Size Section (if available)
	if (metrics.totalDataSizeMB !== undefined && metrics.averagePhotoSizeMB !== undefined) {
		report += `\n---\n\n## 💾 Data Size Analysis\n\n`;
		report += `| Metric | Value |\n`;
		report += `|--------|-------|\n`;
		report += `| **Total Data Size** | ${metrics.totalDataSizeMB.toFixed(2)} MB |\n`;
		report += `| **Average Photo Size** | ${metrics.averagePhotoSizeMB.toFixed(3)} MB/photo |\n`;
		report += `| **Total Photos** | ${metrics.uploadedPhotos} photos |\n`;
	}

	// NIK Encryption Section (if available)
	if (metrics.nikEncryptionCount !== undefined && metrics.nikEncryptionCount > 0) {
		report += `\n---\n\n## 🔐 NIK Encryption Performance\n\n`;
		report += `| Metric | Value |\n`;
		report += `|--------|-------|\n`;
		report += `| **NIK Encrypted** | ${metrics.nikEncryptionCount} NIKs |\n`;
		report += `| **Total Encryption Time** | ${metrics.nikEncryptionTime}ms (${(metrics.nikEncryptionTime! / 1000).toFixed(2)}s) |\n`;
		report += `| **Average Time per NIK** | ${metrics.averageNIKEncryptTime!.toFixed(3)}ms/NIK |\n`;
		report += `| **Encryption Throughput** | ${((metrics.nikEncryptionCount / metrics.nikEncryptionTime!) * 1000).toFixed(2)} NIKs/second |\n`;
	}

	// Performance Analysis
	report += `\n---\n\n## 🎯 Performance Analysis\n\n`;

	// Bottleneck Detection
	const phases = [
		{ name: "Email Validation", time: metrics.emailValidationTime, threshold: 2000 },
		{ name: "Preprocessing", time: metrics.preprocessingTime, threshold: metrics.totalUsers * 100 }, // 100ms per user
		{ name: "Database Insertion", time: metrics.databaseInsertionTime, threshold: metrics.totalBatches * 5000 }, // 5s per batch
	];

	const slowestPhase = phases.reduce((prev, current) => (prev.time > current.time ? prev : current));
	const bottlenecks = phases.filter((phase) => phase.time > phase.threshold);

	report += `### 🔍 Bottleneck Detection\n\n`;
	report += `**Slowest Phase:** ${slowestPhase.name} (${slowestPhase.time}ms)\n\n`;

	if (bottlenecks.length > 0) {
		report += `**⚠️ Phases Exceeding Threshold:**\n`;
		bottlenecks.forEach((bottleneck) => {
			report += `- **${bottleneck.name}**: ${bottleneck.time}ms (threshold: ${bottleneck.threshold}ms)\n`;
		});
	} else {
		report += `✅ All phases are within acceptable thresholds.\n`;
	}

	// Recommendations
	report += `\n### 💡 Recommendations\n\n`;

	if (metrics.emailValidationTime > 2000) {
		report += `- ⚠️ **Email Validation is slow** (${metrics.emailValidationTime}ms)\n`;
		report += `  - Add database index on email column\n`;
		report += `  - Consider caching existing emails\n\n`;
	}

	if (metrics.preprocessingTime > metrics.totalUsers * 100) {
		report += `- ⚠️ **Preprocessing is slow** (${(metrics.preprocessingTime / metrics.totalUsers).toFixed(2)}ms/user)\n`;
		report += `  - Increase concurrency limit (current: pLimit(10))\n`;
		report += `  - Consider skipping photo uploads for bulk operations\n`;
		report += `  - Reduce bcrypt rounds if password hashing is slow\n\n`;
	}

	if (metrics.databaseInsertionTime > metrics.totalBatches * 5000) {
		report += `- ⚠️ **Database Insertion is slow** (${(metrics.databaseInsertionTime / metrics.totalBatches).toFixed(2)}ms/batch)\n`;
		report += `  - Reduce batch size (current: ${metrics.batchSize})\n`;
		report += `  - Increase database connection pool size\n`;
		report += `  - Add indexes on frequently queried columns\n\n`;
	}

	if (metrics.failedPhotos > metrics.uploadedPhotos * 0.1) {
		report += `- ⚠️ **High photo upload failure rate** (${((metrics.failedPhotos / (metrics.uploadedPhotos + metrics.failedPhotos)) * 100).toFixed(2)}%)\n`;
		report += `  - Check MinIO connection stability\n`;
		report += `  - Validate photo format before upload\n`;
		report += `  - Increase upload timeout\n\n`;
	}

	if (bottlenecks.length === 0 && metrics.failedCount === 0) {
		report += `✅ **Performance is optimal!** No issues detected.\n\n`;
	}

	// Footer
	report += `\n---\n\n`;
	report += `*Report generated automatically on ${formattedDate}*\n`;
	report += `*Total execution time: ${(metrics.totalTime / 1000).toFixed(2)} seconds*\n`;

	return report;
}

export async function saveBulkRegisterReport(metrics: BulkRegisterMetrics): Promise<string> {
	const reportDir = path.join(process.cwd(), "logger", "bulk-register-reports");

	// Create directory if not exists
	if (!fs.existsSync(reportDir)) {
		fs.mkdirSync(reportDir, { recursive: true });
	}

	// Generate filename with timestamp
	const date = new Date(metrics.timestamp);
	const filename = `bulk-register-${date.toISOString().replace(/:/g, "-").split(".")[0]}.md`;
	const filepath = path.join(reportDir, filename);

	// Generate and save report
	const report = generateBulkRegisterReport(metrics);
	fs.writeFileSync(filepath, report, "utf-8");

	console.log(`\n📄 Report saved: ${filepath}\n`);

	return filepath;
}
