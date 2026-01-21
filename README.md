# FindMyProject - Scalable Job Scraper

A scalable TypeScript job scraper with adapters for multiple freelancing platforms. Built with the adapter pattern for easy extension and maintenance.

## 🚀 Features

- **Multi-Platform Support**: Currently supports Freelancer.com with easy extension for Upwork, Fiverr, and other platforms
- **Adapter Pattern**: Clean, scalable architecture for adding new platforms
- **Advanced Search**: Support for keywords, categories, tags, budget filters, and more
- **Multiple Output Formats**: CSV, JSON, or both
- **Rate Limiting**: Built-in delays and retry mechanisms to avoid being blocked
- **Tag-Based Search**: Especially useful for Freelancer's category system (e.g., software-development)
- **Statistics**: Get insights about skills demand and market trends
- **TypeScript**: Full type safety and excellent IDE support

## 📦 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd findmyproject
```

2. Install dependencies:
```bash
npm install
```

3. Install Playwright browsers:
```bash
npx playwright install chromium
```

## 🏗️ Architecture

```
findmyproject/
├── scraper/                 # Main scraper package
│   ├── adapters/           # Platform-specific adapters
│   │   ├── BaseAdapter.ts  # Abstract base class
│   │   ├── FreelancerAdapter.ts
│   │   └── index.ts
│   ├── ScraperOrchestrator.ts  # Main orchestrator class
│   ├── types.ts            # Shared TypeScript interfaces
│   ├── utils.ts            # Utility functions
│   └── index.ts            # Main exports
├── src/
│   └── index.ts            # Example usage and CLI
└── output/                 # Generated CSV/JSON files
```

### Adapter Pattern Benefits

- **Scalability**: Easy to add new platforms
- **Maintainability**: Changes to one platform don't affect others
- **Consistency**: All adapters implement the same interface
- **Flexibility**: Platform-specific optimizations while maintaining common functionality

## 🎯 Usage

### Basic Usage

```typescript
import { ScraperOrchestrator, Platform } from './scraper';

const scraper = new ScraperOrchestrator({
  headless: true,
  maxJobs: 20,
  outputFormat: 'both'
});

// Quick search
const results = await scraper.quickSearch('developer', 'software-development');
```

### Advanced Search

```typescript
const filters = {
  keyword: 'react developer',
  category: 'software-development',
  tags: ['javascript', 'react', 'typescript'],
  jobType: 'fixed',
  experienceLevel: 'intermediate',
  minBudget: 500,
  maxBudget: 5000,
  sortBy: 'newest'
};

const results = await scraper.advancedSearch(filters);
```

### Tag-Based Search (Great for Freelancer)

```typescript
// Search in software-development category with specific tags
const results = await scraper.searchByTags(
  ['javascript', 'react', 'nodejs'],
  'software-development'
);
```

### Multiple Platforms

```typescript
// Search across all supported platforms
const results = await scraper.scrapeFromAllPlatforms(filters);

// Search specific platforms
const results = await scraper.scrapeFromMultiplePlatforms(
  [Platform.FREELANCER], // Add more as available
  filters
);
```

## 🖥️ CLI Usage

The project includes several convenient CLI commands:

```bash
# Basic scraping with default settings
npm run dev

# Quick search for specific term
npm run scrape:quick [keyword]

# Search by tags
npm run scrape:tags [tag1] [tag2] [tag3]

# Software development jobs specifically
npm run scrape:software

# Freelancer-specific search
npm run scrape:freelancer
```

## 📊 Supported Platforms

### Currently Available

- **Freelancer.com** ✅
  - Categories: websites, mobile-apps, software-development, data-entry, writing, translation, design, marketing, etc.
  - Features: Keyword search, category filtering, tag support, budget filters

### Coming Soon

- **Upwork** 🚧 (Architecture ready, adapter pending)
- **Fiverr** 🚧
- **Guru** 🚧
- **Toptal** 🚧

## 🔧 Configuration

```typescript
interface ScrapingConfig {
  headless: boolean;              // Run browser in headless mode
  timeout: number;               // Request timeout (ms)
  maxJobs: number;              // Maximum jobs to scrape
  searchFilters: SearchFilters; // Search criteria
  outputFormat: 'csv' | 'json' | 'both';
  outputDir: string;            // Output directory
  delayBetweenRequests: number; // Rate limiting delay
  retryAttempts: number;        // Retry failed requests
}
```

### Search Filters

```typescript
interface SearchFilters {
  keyword?: string;
  category?: string;           // Platform-specific categories
  tags?: string[];            // Skill tags
  minBudget?: number;
  maxBudget?: number;
  jobType?: 'fixed' | 'hourly' | 'all';
  experienceLevel?: 'entry' | 'intermediate' | 'expert' | 'all';
  location?: string;
  sortBy?: 'relevance' | 'newest' | 'budget' | 'proposals';
}
```

## 📁 Output Files

The scraper generates timestamped files in the `output/` directory:

- `jobs_freelancer_2024-01-15.csv` - CSV format
- `jobs_freelancer_2024-01-15.json` - JSON format
- `result_freelancer_2024-01-15.json` - Complete result with metadata
- `jobs_combined_freelancer_upwork_2024-01-15.csv` - Multi-platform results

### Sample Job Data

```json
{
  "title": "React Developer Needed for E-commerce Site",
  "description": "Looking for an experienced React developer...",
  "budget": "₹50,000 - ₹75,000",
  "hourlyRate": "",
  "skills": ["JavaScript", "React", "Node.js", "MongoDB"],
  "postedTime": "2 hours ago",
  "clientInfo": "Payment verified, 15 jobs posted",
  "jobUrl": "https://www.freelancer.in/projects/...",
  "jobType": "Fixed Price",
  "duration": "1-3 months",
  "experienceLevel": "Intermediate",
  "platform": "freelancer"
}
```

## 🎯 Adding New Platforms

To add a new platform, create an adapter that extends `BaseAdapter`:

```typescript
export class NewPlatformAdapter extends BaseAdapter {
  constructor(config: AdapterConfig) {
    super(config, 'newplatform');
  }

  async initialize(): Promise<void> {
    // Initialize browser and page
  }

  buildSearchUrl(filters: SearchFilters): string {
    // Build platform-specific URL
  }

  async navigateToJobsPage(filters: SearchFilters): Promise<void> {
    // Navigate to search results
  }

  async extractJobs(): Promise<JobData[]> {
    // Extract job data from page
  }

  getSupportedCategories(): string[] {
    // Return platform categories
  }
}
```

Then register it in `ScraperOrchestrator.ts`:

```typescript
this.adapters.set(Platform.NEWPLATFORM, new NewPlatformAdapter(adapterConfig));
```

## 📈 Statistics & Analytics

Get insights from your scraping results:

```typescript
const stats = scraper.getStatistics(results);

console.log(`Total jobs: ${stats.totalJobs}`);
console.log(`Top skills:`, stats.topSkills);
console.log(`Platform performance:`, stats.platformStats);
```

## ⚡ Performance Tips

1. **Use headless mode** in production: `headless: true`
2. **Set appropriate delays**: `delayBetweenRequests: 2000`
3. **Limit concurrent requests**: Process platforms sequentially
4. **Use retry logic**: Built-in retry with exponential backoff
5. **Monitor rate limits**: Adjust delays based on platform responses

## 🚨 Legal & Ethical Considerations

- **Respect robots.txt** and platform terms of service
- **Implement rate limiting** to avoid overloading servers
- **Use data responsibly** - for personal/research purposes
- **Consider official APIs** when available
- **Be transparent** about automated access when possible

## 🔍 Troubleshooting

### Common Issues

1. **No jobs found**
   - Check platform page structure hasn't changed
   - Verify search filters are valid
   - Run with `headless: false` to debug

2. **Timeout errors**
   - Increase timeout value
   - Check internet connection
   - Verify platform accessibility

3. **Browser issues**
   - Reinstall Playwright browsers: `npx playwright install`
   - Update Playwright: `npm update playwright`

### Debug Mode

Run with debugging enabled:

```bash
# Run with visible browser
npm run dev

# Enable debug logging
DEBUG=* npm run dev
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-platform`
3. Add your adapter following the existing pattern
4. Add tests for your adapter
5. Update documentation
6. Submit a pull request

### Coding Standards

- Use TypeScript with strict mode
- Follow existing code patterns
- Add JSDoc comments for public methods
- Include error handling and logging
- Write tests for new features

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- [Playwright](https://playwright.dev/) for browser automation
- [TypeScript](https://www.typescriptlang.org/) for type safety
- Freelancing platforms for providing job opportunities

---

**Note**: This tool is for educational and research purposes. Always respect platform terms of service and implement appropriate rate limiting.