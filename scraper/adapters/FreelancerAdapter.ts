import { chromium } from "playwright";
import { BaseAdapter } from "./BaseAdapter";
import { JobData, SearchFilters, AdapterConfig } from "../types";
import {
  cleanText,
} from "../utils";

export class FreelancerAdapter extends BaseAdapter {
  private readonly baseUrl = "https://www.freelancer.in";

  // Freelancer.com supported categories
  private readonly supportedCategories = [
    "websites",
    "mobile-apps",
    "software-development",
    "data-entry",
    "writing",
    "translation",
    "design",
    "marketing",
    "engineering-architecture",
    "legal",
    "admin-support",
    "customer-service",
    "sales",
    "accounting",
  ];

  constructor(config: AdapterConfig) {
    super(config, "freelancer");
  }

  async initialize(): Promise<void> {
    try {
      console.log("🚀 Initializing Freelancer adapter...");

      this.browser = await chromium.launch({
        headless: this.config.headless,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-blink-features=AutomationControlled",
          "--disable-web-security",
          "--window-size=1920,1080",
        ],
      });

      this.page = await this.browser.newPage();

      // Set realistic headers
      await this.page.setExtraHTTPHeaders({
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      });

      await this.page.setViewportSize({ width: 1920, height: 1080 });
      console.log("✅ Freelancer adapter initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Freelancer adapter:", error);
      throw error;
    }
  }

  buildSearchUrl(filters: SearchFilters): string {
    let url = `${this.baseUrl}/jobs`;

    // Handle category-based URLs (like /jobs/software-development)
    if (
      filters.category &&
      this.supportedCategories.includes(filters.category)
    ) {
      url += `/${filters.category}`;
    }

    const params = new URLSearchParams();

    // Add keyword search
    if (filters.keyword) {
      params.append("keyword", filters.keyword);
    }

    // Add tags as keywords if no main keyword
    if (!filters.keyword && filters.tags && filters.tags.length > 0) {
      params.append("keyword", filters.tags.join(" "));
    }

    // Add job type filter
    if (filters.jobType && filters.jobType !== "all") {
      if (filters.jobType === "fixed") {
        params.append("type", "fixed");
      } else if (filters.jobType === "hourly") {
        params.append("type", "hourly");
      }
    }

    // Add budget filters
    if (filters.minBudget) {
      params.append("min_price", filters.minBudget.toString());
    }
    if (filters.maxBudget) {
      params.append("max_price", filters.maxBudget.toString());
    }

    // Add sorting
    if (filters.sortBy) {
      switch (filters.sortBy) {
        case "newest":
          params.append("sort", "time");
          break;
        case "budget":
          params.append("sort", "price");
          break;
        default:
          // relevance is default
          break;
      }
    }

    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
  }

  async navigateToJobsPage(filters: SearchFilters): Promise<void> {
    if (!this.page) {
      throw new Error("Page not initialized. Call initialize() first.");
    }

    const url = this.buildSearchUrl(filters);
    console.log(`🔍 Navigating to: ${url}`);

    try {
      await this.page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: this.config.timeout,
      });

      // Wait for job listings to load
      const jobSelectors = [
        ".JobSearchCard-item",
        ".JobCard",
        ".job-item",
        ".project-item",
        '[data-testid="job-card"]',
      ];

      let contentLoaded = false;
      for (const selector of jobSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 10000 });
          contentLoaded = true;
          console.log(`✅ Jobs loaded with selector: ${selector}`);
          break;
        } catch (e) {
          console.log(`⏭️ Selector ${selector} not found, trying next...`);
        }
      }

      if (!contentLoaded) {
        console.log(
          "⚠️ No standard job selectors found, taking screenshot for debugging",
        );
        await this.page.screenshot({
          path: `debug-freelancer-${Date.now()}.png`,
          fullPage: false,
        });
      }

      // Small delay to ensure everything is loaded
      await this.randomDelay(1000, 2000);
    } catch (error) {
      console.error("❌ Failed to navigate to jobs page:", error);
      throw error;
    }
  }

  async extractJobs(): Promise<JobData[]> {
    if (!this.page) {
      throw new Error("Page not initialized");
    }

    console.log("📊 Starting job extraction...");

    let jobs: JobData[] = [];

    // Try multiple extraction strategies
    jobs = await this.extractJobsWithModernSelectors();
    if (jobs.length === 0) {
      jobs = await this.extractJobsWithLegacySelectors();
    }
    if (jobs.length === 0) {
      jobs = await this.extractJobsGeneric();
    }

    console.log(`✅ Extracted ${jobs.length} jobs total`);
    return jobs.slice(0, this.config.maxJobs);
  }

  private async extractJobsWithModernSelectors(): Promise<JobData[]> {
    const jobs: JobData[] = [];
    const modernSelectors = [
      ".JobSearchCard-item",
      ".JobCard",
      '[data-testid="job-card"]',
      ".project-item",
    ];

    for (const selector of modernSelectors) {
      const elements = await this.page!.$$(selector);
      if (elements.length > 0) {
        console.log(
          `🎯 Found ${elements.length} jobs with selector: ${selector}`,
        );

        for (const element of elements) {
          try {
            const job = await this.extractJobFromElement(element);
            if (job) jobs.push(job);
          } catch (error) {
            console.log("⚠️ Error extracting job:", error);
          }
        }
        break; // Use first successful selector
      }
    }

    return jobs;
  }

  private async extractJobsWithLegacySelectors(): Promise<JobData[]> {
    const jobs: JobData[] = [];
    const legacySelectors = [
      ".job-item",
      ".project-card",
      ".freelancer-job",
      "[data-job-id]",
      ".job-listing",
    ];

    for (const selector of legacySelectors) {
      const elements = await this.page!.$$(selector);
      if (elements.length > 0) {
        console.log(
          `🎯 Found ${elements.length} jobs with legacy selector: ${selector}`,
        );

        for (const element of elements) {
          try {
            const job = await this.extractJobFromElement(element);
            if (job) jobs.push(job);
          } catch (error) {
            console.log("⚠️ Error extracting job:", error);
          }
        }
        break;
      }
    }

    return jobs;
  }

  private async extractJobsGeneric(): Promise<JobData[]> {
    const jobs: JobData[] = [];

    // Look for any elements that might contain job data
    const allElements = await this.page!.$$(
      'article, .card, [class*="job"], [class*="project"]',
    );

    for (const element of allElements) {
      const text = await element.textContent();
      if (
        text &&
        text.length > 100 &&
        (text.includes("₹") || text.includes("$") || text.includes("hour"))
      ) {
        try {
          const job = await this.extractJobFromElement(element);
          if (job) jobs.push(job);
        } catch (error) {
          console.log("⚠️ Error extracting generic job:", error);
        }
      }
    }

    return jobs;
  }

  private async extractJobFromElement(element: any): Promise<JobData | null> {
    try {
      const elementText = (await element.textContent()) || "";

      // Extract title
      let title = "Untitled Job";
      const titleSelectors = [
        "h1",
        "h2",
        "h3",
        "h4",
        ".job-title",
        ".project-title",
        ".title",
        '[data-testid="job-title"]',
        'a[href*="/projects/"]',
        'a[href*="/job/"]',
        ".JobSearchCard-primary-heading",
        ".JobSearchCard-item-title",
      ];

      for (const selector of titleSelectors) {
        const titleEl = await element.$(selector);
        if (titleEl) {
          title = cleanText((await titleEl.textContent()) || "");
          if (title && title !== "Untitled Job") break;
        }
      }

      // Fallback: extract from text
      if (title === "Untitled Job") {
        const lines = elementText
          .split("\n")
          .map((line: string) => cleanText(line))
          .filter(
            (line: string) =>
              line.length > 10 &&
              line.length < 100 &&
              !line.includes("₹") &&
              !line.includes("$"),
          );
        if (lines.length > 0) {
          title = lines[0];
        }
      }

      // Extract job URL
      let jobUrl = "";
      const linkEl = await element.$('a[href*="/projects/"], a[href*="/job/"]');
      if (linkEl) {
        const href = await linkEl.getAttribute("href");
        if (href) {
          jobUrl = href.startsWith("http") ? href : `${this.baseUrl}${href}`;
        }
      }

      // Extract description
      let description = "No description available";
      const descSelectors = [
        ".job-description",
        ".project-description",
        ".description",
        ".JobSearchCard-secondary-price",
        "p",
      ];

      for (const selector of descSelectors) {
        const descEl = await element.$(selector);
        if (descEl) {
          const text = cleanText((await descEl.textContent()) || "");
          if (text && text.length > 20) {
            description = text.substring(0, 500);
            break;
          }
        }
      }

      // Fallback: extract from element text
      if (description === "No description available") {
        const lines = elementText
          .split("\n")
          .map((line: string) => cleanText(line))
          .filter((line: string) => line.length > 30 && line.length < 300)
          .slice(1, 3);
        description = lines.join(" ").substring(0, 500);
      }

      // Extract budget and hourly rate
      let budget = "";
      let hourlyRate = "";
      let jobType = "Not specified";

      const budgetPatterns = [
        /₹([\d,]+)(?:\s*-\s*₹([\d,]+))?\s*(?:INR)?/gi,
        /\$([\d,]+)(?:\s*-\s*\$([\d,]+))?\s*(?:USD)?/gi,
        /Budget[:\s]*₹([\d,]+)/gi,
        /Budget[:\s]*\$([\d,]+)/gi,
      ];

      const hourlyPatterns = [
        /₹([\d,]+)(?:\s*-\s*₹([\d,]+))?\s*\/\s*hour/gi,
        /\$([\d,]+)(?:\s*-\s*\$([\d,]+))?\s*\/\s*hour/gi,
        /([\d,]+)\s*\/\s*hr/gi,
        /Hourly[:\s]*₹([\d,]+)/gi,
      ];

      // Check for budget patterns
      for (const pattern of budgetPatterns) {
        const matches = elementText.match(pattern);
        if (matches) {
          budget = matches[0];
          jobType = "Fixed Price";
          break;
        }
      }

      // Check for hourly patterns
      for (const pattern of hourlyPatterns) {
        const matches = elementText.match(pattern);
        if (matches) {
          hourlyRate = matches[0];
          jobType = "Hourly";
          break;
        }
      }

      // Extract skills
      const skills = this.extractSkillsFromText(elementText);

      // Extract posted time
      let postedTime = "Recently posted";
      const timePatterns = [
        /(\d+)\s*(?:hour|hr|hours|hrs)\s*ago/gi,
        /(\d+)\s*(?:day|days)\s*ago/gi,
        /(\d+)\s*(?:week|weeks)\s*ago/gi,
        /yesterday/gi,
        /today/gi,
      ];

      for (const pattern of timePatterns) {
        const match = elementText.match(pattern);
        if (match) {
          postedTime = match[0];
          break;
        }
      }

      // Extract client info
      let clientInfo = "Client information not available";
      const clientPatterns = [
        /(\d+)\s*(?:review|reviews)/gi,
        /(\d+)\s*(?:job|jobs)\s*posted/gi,
        /Payment\s*verified/gi,
        /Verified/gi,
        /(\$\d+[\d,]*)\s*spent/gi,
      ];

      for (const pattern of clientPatterns) {
        const clientMatches = elementText.match(pattern);
        if (clientMatches) {
          const matches = clientMatches.slice(0, 2).join(", ");
          if (matches) {
            clientInfo = matches;
            break;
          }
        }
      }

      // Extract experience level
      let experienceLevel = "Not specified";
      if (
        elementText.toLowerCase().includes("entry level") ||
        elementText.toLowerCase().includes("beginner")
      ) {
        experienceLevel = "Entry Level";
      } else if (elementText.toLowerCase().includes("intermediate")) {
        experienceLevel = "Intermediate";
      } else if (
        elementText.toLowerCase().includes("expert") ||
        elementText.toLowerCase().includes("advanced")
      ) {
        experienceLevel = "Expert";
      }

      return {
        title: title || "Untitled Job",
        description: description || "No description available",
        budget: budget || "",
        hourlyRate: hourlyRate || "",
        skills: skills || [],
        postedTime: postedTime || "Recently posted",
        clientInfo: clientInfo || "Client information not available",
        jobUrl: jobUrl || "",
        jobType: jobType || "Not specified",
        duration: "Not specified", // Freelancer doesn't always specify duration
        experienceLevel: experienceLevel || "Not specified",
        platform: "freelancer",
      };
    } catch (error) {
      console.log("⚠️ Error extracting job data:", error);
      return null;
    }
  }

  private extractSkillsFromText(text: string): string[] {
    const skills: string[] = [];
    const skillPatterns = [
      // Common programming languages
      /\b(JavaScript|TypeScript|Python|Java|C\+\+|C#|PHP|Ruby|Go|Rust|Swift|Kotlin|Scala)\b/gi,
      // Web technologies
      /\b(React|Vue|Angular|Node\.?js|Express|Django|Flask|Laravel|Spring|ASP\.NET)\b/gi,
      // Databases
      /\b(MySQL|PostgreSQL|MongoDB|Redis|SQLite|Oracle|SQL Server)\b/gi,
      // Cloud & DevOps
      /\b(AWS|Azure|Google Cloud|Docker|Kubernetes|Jenkins|CI\/CD)\b/gi,
      // Design & Content
      /\b(Photoshop|Illustrator|Figma|Sketch|After Effects|Premiere|Content Writing|Copywriting)\b/gi,
      // Marketing & Business
      /\b(SEO|SEM|Social Media|Digital Marketing|Data Entry|Virtual Assistant|Excel|Word)\b/gi,
      // Mobile Development
      /\b(iOS|Android|React Native|Flutter|Xamarin|Ionic)\b/gi,
    ];

    for (const pattern of skillPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        skills.push(...matches.map((skill) => skill.trim()));
      }
    }

    // Remove duplicates and return unique skills
    return Array.from(new Set(skills));
  }

  getSupportedCategories(): string[] {
    return Array.from(this.supportedCategories);
  }
}
