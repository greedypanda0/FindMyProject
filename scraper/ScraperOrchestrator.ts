import { BaseAdapter } from './adapters/BaseAdapter';
import { FreelancerAdapter } from './adapters/FreelancerAdapter';
import { JobData, SearchFilters, ScrapingConfig, ScrapingResult, Platform, AdapterConfig } from './types';
import { saveJobsToCSV, saveJobsToJSON, saveScrapingResult, generateFilename } from './utils';

export class ScraperOrchestrator {
  private adapters: Map<Platform, BaseAdapter> = new Map();
  private config: ScrapingConfig;

  constructor(config: Partial<ScrapingConfig> = {}) {
    this.config = {
      headless: config.headless ?? true,
      timeout: config.timeout ?? 60000,
      maxJobs: config.maxJobs ?? 20,
      searchFilters: config.searchFilters ?? {},
      outputFormat: config.outputFormat ?? 'csv',
      outputDir: config.outputDir ?? './output',
      delayBetweenRequests: config.delayBetweenRequests ?? 2000,
      retryAttempts: config.retryAttempts ?? 3
    };

    this.initializeAdapters();
  }

  /**
   * Initialize all available adapters
   */
  private initializeAdapters(): void {
    const adapterConfig: AdapterConfig = {
      timeout: this.config.timeout,
      maxJobs: this.config.maxJobs,
      delayBetweenRequests: this.config.delayBetweenRequests,
      retryAttempts: this.config.retryAttempts,
      headless: this.config.headless
    };

    // Initialize Freelancer adapter
    this.adapters.set(Platform.FREELANCER, new FreelancerAdapter(adapterConfig));

    // Future adapters can be added here:
    // this.adapters.set(Platform.UPWORK, new UpworkAdapter(adapterConfig));
    // this.adapters.set(Platform.FIVERR, new FiverrAdapter(adapterConfig));
  }

  /**
   * Get list of supported platforms
   */
  getSupportedPlatforms(): Platform[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Get supported categories for a specific platform
   */
  getSupportedCategories(platform: Platform): string[] {
    const adapter = this.adapters.get(platform);
    return adapter ? adapter.getSupportedCategories() : [];
  }

  /**
   * Scrape jobs from a single platform
   */
  async scrapeFromPlatform(platform: Platform, filters: SearchFilters): Promise<ScrapingResult> {
    const adapter = this.adapters.get(platform);

    if (!adapter) {
      throw new Error(`Adapter for platform "${platform}" is not available`);
    }

    console.log(`🚀 Starting scraping for platform: ${platform}`);
    console.log(`🔍 Search filters:`, filters);

    try {
      const result = await adapter.scrape(filters);

      // Save results if jobs were found
      if (result.jobs.length > 0) {
        await this.saveResults(result);
      }

      console.log(`✅ Scraping completed for ${platform}: ${result.jobs.length} jobs found`);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Scraping failed for ${platform}:`, errorMessage);

      return {
        jobs: [],
        totalFound: 0,
        platform,
        searchQuery: adapter.buildSearchUrl ? adapter.buildSearchUrl(filters) : 'N/A',
        timestamp: new Date(),
        success: false,
        errors: [errorMessage]
      };
    }
  }

  /**
   * Scrape jobs from multiple platforms
   */
  async scrapeFromMultiplePlatforms(
    platforms: Platform[],
    filters: SearchFilters
  ): Promise<ScrapingResult[]> {
    const results: ScrapingResult[] = [];

    for (const platform of platforms) {
      try {
        console.log(`\n📍 Processing platform: ${platform}`);
        const result = await this.scrapeFromPlatform(platform, filters);
        results.push(result);

        // Add delay between platforms to avoid rate limiting
        if (platforms.indexOf(platform) < platforms.length - 1) {
          console.log(`⏳ Waiting ${this.config.delayBetweenRequests}ms before next platform...`);
          await this.delay(this.config.delayBetweenRequests);
        }

      } catch (error) {
        console.error(`❌ Failed to scrape from ${platform}:`, error);
        results.push({
          jobs: [],
          totalFound: 0,
          platform,
          searchQuery: 'N/A',
          timestamp: new Date(),
          success: false,
          errors: [error instanceof Error ? error.message : 'Unknown error']
        });
      }
    }

    // Save combined results
    const combinedJobs = results.flatMap(result => result.jobs);
    if (combinedJobs.length > 0) {
      await this.saveCombinedResults(results, filters);
    }

    return results;
  }

  /**
   * Scrape jobs from all available platforms
   */
  async scrapeFromAllPlatforms(filters: SearchFilters): Promise<ScrapingResult[]> {
    const platforms = this.getSupportedPlatforms();
    console.log(`🌐 Scraping from all platforms: ${platforms.join(', ')}`);
    return this.scrapeFromMultiplePlatforms(platforms, filters);
  }

  /**
   * Quick search with common filters
   */
  async quickSearch(
    keyword: string,
    category?: string,
    platforms?: Platform[]
  ): Promise<ScrapingResult[]> {
    const filters: SearchFilters = {
      keyword,
      category,
      jobType: 'all',
      experienceLevel: 'all'
    };

    const targetPlatforms = platforms || this.getSupportedPlatforms();
    return this.scrapeFromMultiplePlatforms(targetPlatforms, filters);
  }

  /**
   * Search by tags (especially useful for Freelancer)
   */
  async searchByTags(
    tags: string[],
    category?: string,
    platforms?: Platform[]
  ): Promise<ScrapingResult[]> {
    const filters: SearchFilters = {
      tags,
      category,
      jobType: 'all',
      experienceLevel: 'all'
    };

    const targetPlatforms = platforms || this.getSupportedPlatforms();
    return this.scrapeFromMultiplePlatforms(targetPlatforms, filters);
  }

  /**
   * Advanced search with all filter options
   */
  async advancedSearch(filters: SearchFilters, platforms?: Platform[]): Promise<ScrapingResult[]> {
    const targetPlatforms = platforms || this.getSupportedPlatforms();
    return this.scrapeFromMultiplePlatforms(targetPlatforms, filters);
  }

  /**
   * Save results for a single platform
   */
  private async saveResults(result: ScrapingResult): Promise<void> {
    try {
      const timestamp = new Date().toISOString().split('T')[0];

      if (this.config.outputFormat === 'csv' || this.config.outputFormat === 'both') {
        const csvFilename = generateFilename(result.platform, 'csv');
        await saveJobsToCSV(result.jobs, csvFilename);
      }

      if (this.config.outputFormat === 'json' || this.config.outputFormat === 'both') {
        const jsonFilename = generateFilename(result.platform, 'json');
        await saveJobsToJSON(result.jobs, jsonFilename);

        // Also save the complete result with metadata
        const resultFilename = `result_${result.platform}_${timestamp}.json`;
        await saveScrapingResult(result, resultFilename);
      }

    } catch (error) {
      console.error('❌ Error saving results:', error);
    }
  }

  /**
   * Save combined results from multiple platforms
   */
  private async saveCombinedResults(
    results: ScrapingResult[],
    filters: SearchFilters
  ): Promise<void> {
    try {
      const combinedJobs = results.flatMap(result => result.jobs);
      const timestamp = new Date().toISOString().split('T')[0];
      const platforms = results.map(r => r.platform).join('_');

      if (this.config.outputFormat === 'csv' || this.config.outputFormat === 'both') {
        const csvFilename = `jobs_combined_${platforms}_${timestamp}.csv`;
        await saveJobsToCSV(combinedJobs, csvFilename);
      }

      if (this.config.outputFormat === 'json' || this.config.outputFormat === 'both') {
        const jsonFilename = `jobs_combined_${platforms}_${timestamp}.json`;
        await saveJobsToJSON(combinedJobs, jsonFilename);

        // Save detailed results
        const combinedResult = {
          summary: {
            totalJobs: combinedJobs.length,
            platforms: results.map(r => ({
              platform: r.platform,
              jobs: r.jobs.length,
              success: r.success
            })),
            searchFilters: filters,
            timestamp: new Date()
          },
          results
        };

        const resultFilename = `results_combined_${platforms}_${timestamp}.json`;
        await saveScrapingResult(combinedResult as any, resultFilename);
      }

      console.log(`💾 Combined results saved: ${combinedJobs.length} total jobs from ${results.length} platforms`);

    } catch (error) {
      console.error('❌ Error saving combined results:', error);
    }
  }

  /**
   * Get statistics from recent scraping results
   */
  getStatistics(results: ScrapingResult[]): any {
    const totalJobs = results.reduce((sum, result) => sum + result.jobs.length, 0);
    const successfulPlatforms = results.filter(result => result.success).length;

    const platformStats = results.map(result => ({
      platform: result.platform,
      jobs: result.jobs.length,
      success: result.success,
      errors: result.errors?.length || 0
    }));

    const skillFrequency: { [key: string]: number } = {};
    results.forEach(result => {
      result.jobs.forEach(job => {
        job.skills.forEach(skill => {
          skillFrequency[skill] = (skillFrequency[skill] || 0) + 1;
        });
      });
    });

    const topSkills = Object.entries(skillFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([skill, count]) => ({ skill, count }));

    return {
      totalJobs,
      totalPlatforms: results.length,
      successfulPlatforms,
      failedPlatforms: results.length - successfulPlatforms,
      platformStats,
      topSkills,
      timestamp: new Date()
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ScrapingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.initializeAdapters(); // Reinitialize with new config
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup all adapters
   */
  async cleanup(): Promise<void> {
    const cleanupPromises = Array.from(this.adapters.values()).map(adapter =>
      adapter.cleanup().catch(error =>
        console.error('Error cleaning up adapter:', error)
      )
    );

    await Promise.all(cleanupPromises);
  }
}
