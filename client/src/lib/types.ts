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

export interface AnalysisResult {
  id: string;
  repoName: string;
  repoUrl: string;
  model: LLMModel;
  dimensions: Record<AnalysisDimension, DimensionAnalysis>;
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
