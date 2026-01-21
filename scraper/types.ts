export interface JobData {
  title: string;
  description: string;
  budget: string;
  hourlyRate: string;
  skills: string[];
  postedTime: string;
  clientInfo: string;
  jobUrl: string;
  jobType: string;
  duration: string;
  experienceLevel: string;
  platform: string;
}

export interface SearchFilters {
  keyword?: string;
  category?: string;
  tags?: string[];
  minBudget?: number;
  maxBudget?: number;
  jobType?: "fixed" | "hourly" | "all";
  experienceLevel?: "entry" | "intermediate" | "expert" | "all";
  location?: string;
  sortBy?: "relevance" | "newest" | "budget" | "proposals";
}

export interface ScrapingConfig {
  headless: boolean;
  timeout: number;
  maxJobs: number;
  searchFilters: SearchFilters;
  outputFormat: "csv" | "json" | "both";
  outputDir: string;
  delayBetweenRequests: number; // milliseconds
  retryAttempts: number;
}

export interface ScrapingResult {
  jobs: JobData[];
  totalFound: number;
  platform: string;
  searchQuery: string;
  timestamp: Date;
  success: boolean;
  errors?: string[];
}

export interface CsvJobRecord {
  title: string;
  description: string;
  budget: string;
  hourlyRate: string;
  skills: string;
  postedTime: string;
  clientInfo: string;
  jobUrl: string;
  jobType: string;
  duration: string;
  experienceLevel: string;
  platform: string;
}

export interface AdapterConfig {
  timeout: number;
  maxJobs: number;
  delayBetweenRequests: number;
  retryAttempts: number;
  headless: boolean;
}

export enum Platform {
  FREELANCER = "freelancer",
}
