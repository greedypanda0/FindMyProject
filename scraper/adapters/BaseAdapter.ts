import { Browser, Page } from 'playwright';
import { JobData, SearchFilters, ScrapingResult, AdapterConfig } from '../types';

export abstract class BaseAdapter {
  protected browser?: Browser;
  protected page?: Page;
  protected config: AdapterConfig;
  protected platformName: string;

  constructor(config: AdapterConfig, platformName: string) {
    this.config = config;
    this.platformName = platformName;
  }

  /**
   * Initialize the adapter (launch browser, create page, set headers, etc.)
   */
  abstract initialize(): Promise<void>;

  /**
   * Navigate to the jobs search page with the given filters
   */
  abstract navigateToJobsPage(filters: SearchFilters): Promise<void>;

  /**
   * Extract jobs from the current page
   */
  abstract extractJobs(): Promise<JobData[]>;

  /**
   * Build the search URL based on filters
   */
  abstract buildSearchUrl(filters: SearchFilters): string;

  /**
   * Get platform-specific categories/tags
   */
  abstract getSupportedCategories(): string[];

  /**
   * Main scraping method that orchestrates the entire process
   */
  async scrape(filters: SearchFilters): Promise<ScrapingResult> {
    const startTime = new Date();
    let jobs: JobData[] = [];
    const errors: string[] = [];

    try {
      await this.initialize();
      await this.navigateToJobsPage(filters);
      jobs = await this.extractJobs();

      // Add platform info to jobs
      jobs = jobs.map(job => ({
        ...job,
        platform: this.platformName
      }));

      return {
        jobs,
        totalFound: jobs.length,
        platform: this.platformName,
        searchQuery: this.buildSearchQuery(filters),
        timestamp: startTime,
        success: true
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);

      return {
        jobs,
        totalFound: jobs.length,
        platform: this.platformName,
        searchQuery: this.buildSearchQuery(filters),
        timestamp: startTime,
        success: false,
        errors
      };
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Clean up resources (close browser, etc.)
   */
  async cleanup(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
      }
      if (this.browser) {
        await this.browser.close();
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * Build a human-readable search query string for logging
   */
  protected buildSearchQuery(filters: SearchFilters): string {
    const parts: string[] = [];

    if (filters.keyword) parts.push(`keyword: "${filters.keyword}"`);
    if (filters.category) parts.push(`category: "${filters.category}"`);
    if (filters.tags && filters.tags.length > 0) parts.push(`tags: [${filters.tags.join(', ')}]`);
    if (filters.jobType && filters.jobType !== 'all') parts.push(`type: ${filters.jobType}`);
    if (filters.experienceLevel && filters.experienceLevel !== 'all') parts.push(`experience: ${filters.experienceLevel}`);
    if (filters.minBudget) parts.push(`min budget: ${filters.minBudget}`);
    if (filters.maxBudget) parts.push(`max budget: ${filters.maxBudget}`);
    if (filters.location) parts.push(`location: "${filters.location}"`);

    return parts.length > 0 ? parts.join(', ') : 'no filters';
  }

  /**
   * Utility method to wait with random delay to avoid detection
   */
  protected async randomDelay(min: number = 1000, max: number = 3000): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Utility method to retry operations
   */
  protected async retry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = this.config.retryAttempts,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt === maxAttempts) {
          throw lastError;
        }

        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }

    throw lastError!;
  }
}
