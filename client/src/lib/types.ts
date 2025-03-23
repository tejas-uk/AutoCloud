export type LLMModel = "gpt-4o-mini" | "gpt-4o" | "o3-mini" | "claude-3-7-sonnet";

export type AnalysisDimension =
  | "database"
  | "storage"
  | "configuration"
  | "apiIntegrations"
  | "authentication"
  | "compute"
  | "networking"
  | "deployment"
  | "scalability"
  | "logging"
  | "development"
  | "security";

export interface Finding {
  title: string;
  description: string;
  fileCount?: number;
  codeExample?: string;
}

export interface DimensionAnalysis {
  summary: string;
  findings: Finding[];
  recommendations: string[];
}

export interface Language {
  name: string;
  percentage: number; // Percentage of codebase
  files: number;      // Number of files
}

export interface Framework {
  name: string;
  category: string;   // frontend, backend, database, etc.
  confidence: number; // 0-1 score of detection confidence
}

export interface AzureService {
  name: string;
  description: string;
  category: string;   // compute, database, storage, networking, etc.
  necessity: 'required' | 'recommended' | 'optional';
  alternativeServices?: string[];
  estimatedCost?: string;
}

export interface HostingRecommendation {
  summary: string;
  azureServices: AzureService[];
  architectureSummary: string;
  costEstimateDescription?: string;
}

export interface AnalysisResult {
  id: string;
  repoName: string;
  repoUrl: string;
  model: LLMModel;
  dimensions: Record<AnalysisDimension, DimensionAnalysis>;
  languages: Language[];
  frameworks: Framework[];
  hostingRecommendation?: HostingRecommendation;
  createdAt: string;
}

export interface Repository {
  id: string;
  name: string;
  fullName: string;
  url: string;
  description: string | null;
}

export interface GithubUser {
  id: string;
  username: string;
  accessToken: string;
}
