import { ScraperOrchestrator, Platform, SearchFilters } from "./scraper";

async function main() {
  // Create scraper instance with configuration
  const scraper = new ScraperOrchestrator({
    headless: false, // Set to true for production
    timeout: 60000,
    maxJobs: 20,
    outputFormat: "both", // Save as both CSV and JSON
    delayBetweenRequests: 2000,
    retryAttempts: 3,
  });

  try {
    console.log("🚀 Starting FindMyProject Job Scraper...");
    console.log(
      `📋 Supported platforms: ${scraper.getSupportedPlatforms().join(", ")}`,
    );

    console.log("\n=== Example : Advanced Search ===");
    const advancedFilters: SearchFilters = {
      category: "software-development",
    };

    const advancedResults = await scraper.advancedSearch(advancedFilters, [
      Platform.FREELANCER,
    ]);

    advancedResults.forEach((result) => {
      console.log(`✅ ${result.platform}: ${result.jobs.length} jobs found`);
    });
  } catch (error) {
    console.error("❌ Error during scraping:", error);
  } finally {
    await scraper.cleanup();
    console.log("🧹 Cleanup completed");
  }
}

main();
