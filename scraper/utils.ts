import * as fs from "fs";
import * as path from "path";
import { JobData, CsvJobRecord, ScrapingResult } from "./types";

/**
 * Converts JobData to CSV-friendly format
 */
export function jobDataToCsvRecord(job: JobData): CsvJobRecord {
  return {
    title: job.title,
    description: job.description.replace(/\n/g, " ").replace(/,/g, ";"),
    budget: job.budget,
    hourlyRate: job.hourlyRate,
    skills: job.skills.join("; "),
    postedTime: job.postedTime,
    clientInfo: job.clientInfo,
    jobUrl: job.jobUrl,
    jobType: job.jobType,
    duration: job.duration,
    experienceLevel: job.experienceLevel,
    platform: job.platform,
  };
}

/**
 * Creates CSV content from job data array
 */
export function createCsvContent(jobs: JobData[]): string {
  const headers = [
    "title",
    "description",
    "budget",
    "hourlyRate",
    "skills",
    "postedTime",
    "clientInfo",
    "jobUrl",
    "jobType",
    "duration",
    "experienceLevel",
    "platform",
  ];

  const csvRows = [headers.join(",")];

  jobs.forEach((job) => {
    const record = jobDataToCsvRecord(job);
    const row = headers.map((header) => {
      const value = record[header as keyof CsvJobRecord];
      // Escape quotes and wrap in quotes if contains comma or quote
      const stringValue = String(value || "");
      if (
        stringValue.includes(",") ||
        stringValue.includes('"') ||
        stringValue.includes("\n")
      ) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvRows.push(row.join(","));
  });

  return csvRows.join("\n");
}

/**
 * Saves jobs data to CSV file
 */
export async function saveJobsToCSV(
  jobs: JobData[],
  filename: string = "jobs.csv",
): Promise<void> {
  try {
    const csvContent = createCsvContent(jobs);
    const outputDir = path.join(__dirname, "..", "output");

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filePath = path.join(outputDir, filename);
    fs.writeFileSync(filePath, csvContent, "utf8");

    console.log(`✅ Successfully saved ${jobs.length} jobs to ${filePath}`);
  } catch (error) {
    console.error("❌ Error saving CSV file:", error);
    throw error;
  }
}

/**
 * Saves jobs data to JSON file
 */
export async function saveJobsToJSON(
  jobs: JobData[],
  filename: string = "jobs.json",
): Promise<void> {
  try {
    const outputDir = path.join(__dirname, "..", "output");

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filePath = path.join(outputDir, filename);
    const jsonContent = JSON.stringify(jobs, null, 2);
    fs.writeFileSync(filePath, jsonContent, "utf8");

    console.log(`✅ Successfully saved ${jobs.length} jobs to ${filePath}`);
  } catch (error) {
    console.error("❌ Error saving JSON file:", error);
    throw error;
  }
}

/**
 * Saves scraping result (includes metadata)
 */
export async function saveScrapingResult(
  result: ScrapingResult,
  filename: string = "scraping_result.json",
): Promise<void> {
  try {
    const outputDir = path.join(__dirname, "..", "output");

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filePath = path.join(outputDir, filename);
    const jsonContent = JSON.stringify(result, null, 2);
    fs.writeFileSync(filePath, jsonContent, "utf8");

    console.log(`✅ Successfully saved scraping result to ${filePath}`);
  } catch (error) {
    console.error("❌ Error saving scraping result:", error);
    throw error;
  }
}

/**
 * Generate filename with timestamp and platform
 */
export function generateFilename(
  platform: string,
  format: "csv" | "json",
  prefix: string = "jobs",
): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .split("T")[0];
  return `${prefix}_${platform}_${timestamp}.${format}`;
}

/**
 * Cleans and normalizes text content
 */
export function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").replace(/\n/g, " ").trim();
}

/**
 * Extracts numeric value from budget string
 */
export function extractBudgetNumber(budgetText: string): string {
  const match = budgetText.match(/\$[\d,]+/);
  return match ? match[0] : budgetText;
}

/**
 * Formats relative time to more readable format
 */
export function formatPostedTime(timeText: string): string {
  // Convert relative time like "2 hours ago" to more standardized format
  if (timeText.includes("ago")) {
    return timeText;
  }

  // Handle other time formats as needed
  return timeText;
}

/**
 * Creates a delay for rate limiting
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Logs scraping progress
 */
export function logProgress(
  current: number,
  total: number,
  message: string = "Processing",
): void {
  const percentage = Math.round((current / total) * 100);
  console.log(`📊 ${message}: ${current}/${total} (${percentage}%)`);
}
