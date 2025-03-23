import { v4 as uuidv4 } from 'uuid';
import { Repository, GithubUser, DimensionAnalysis, AnalysisDimension, Language, Framework, HostingRecommendation, LLMModel } from '@/lib/types';
// We'll create a modified version of AnalysisResult that accepts string for model (for simpler storage)
interface StorageAnalysisResult {
  id: string;
  repoName: string;
  repoUrl: string;
  model: string; // String version of LLMModel
  dimensions: Record<AnalysisDimension, DimensionAnalysis>;
  languages: Language[];
  frameworks: Framework[];
  hostingRecommendation?: HostingRecommendation;
  createdAt: string;
}

// Use our interface for storage operations
type AnalysisResult = StorageAnalysisResult;
import { users, type User, type InsertUser } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // GitHub auth storage
  saveGithubUser(user: GithubUser): Promise<GithubUser>;
  getGithubUser(id: string): Promise<GithubUser | undefined>;
  
  // Repository storage
  saveRepository(repository: Repository): Promise<Repository>;
  getRepository(id: string): Promise<Repository | undefined>;
  getUserRepositories(userId: string): Promise<Repository[]>;
  
  // Analysis storage
  saveAnalysis(analysis: {
    id?: string;
    repoUrl: string;
    repoName: string;
    model: string;
    dimensions: Record<AnalysisDimension, DimensionAnalysis>;
    languages: Language[];
    frameworks: Framework[];
    hostingRecommendation?: HostingRecommendation;
    createdAt?: string;
  }): Promise<AnalysisResult>;
  getAnalysis(id: string): Promise<AnalysisResult | undefined>;
  getLatestAnalysis(): Promise<AnalysisResult | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private githubUsers: Map<string, GithubUser>;
  private repositories: Map<string, Repository>;
  private analyses: Map<string, AnalysisResult>;
  private latestAnalysisId: string | null = null;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.githubUsers = new Map();
    this.repositories = new Map();
    this.analyses = new Map();
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // GitHub Auth
  async saveGithubUser(user: GithubUser): Promise<GithubUser> {
    this.githubUsers.set(user.id, user);
    return user;
  }

  async getGithubUser(id: string): Promise<GithubUser | undefined> {
    return this.githubUsers.get(id);
  }

  // Repositories
  async saveRepository(repository: Repository): Promise<Repository> {
    const repoWithId = {
      ...repository,
      id: repository.id || uuidv4(),
    };
    this.repositories.set(repoWithId.id, repoWithId);
    return repoWithId;
  }

  async getRepository(id: string): Promise<Repository | undefined> {
    return this.repositories.get(id);
  }

  async getUserRepositories(userId: string): Promise<Repository[]> {
    // In a real implementation, repositories would have a userId field
    // Here we're just returning all repositories for simplicity
    return Array.from(this.repositories.values());
  }

  // Analysis
  async saveAnalysis(analysisData: {
    id?: string;
    repoUrl: string;
    repoName: string;
    model: string;
    dimensions: Record<AnalysisDimension, DimensionAnalysis>;
    languages: Language[];
    frameworks: Framework[];
    hostingRecommendation?: HostingRecommendation;
    createdAt?: string;
  }): Promise<AnalysisResult> {
    // Handle updating an existing analysis (like adding hosting recommendations)
    if (analysisData.id && this.analyses.has(analysisData.id)) {
      const existingAnalysis = this.analyses.get(analysisData.id)!;
      // Ensure model type is correctly handled while merging
      const updatedAnalysis: AnalysisResult = {
        ...existingAnalysis,
        dimensions: analysisData.dimensions || existingAnalysis.dimensions,
        languages: analysisData.languages || existingAnalysis.languages,
        frameworks: analysisData.frameworks || existingAnalysis.frameworks,
        hostingRecommendation: analysisData.hostingRecommendation,
        // Preserve original creation date
        createdAt: existingAnalysis.createdAt
      };
      
      this.analyses.set(analysisData.id, updatedAnalysis);
      return updatedAnalysis;
    }
    
    // Create a new analysis
    const id = analysisData.id || uuidv4();
    const analysis: AnalysisResult = {
      id,
      repoUrl: analysisData.repoUrl,
      repoName: analysisData.repoName,
      model: analysisData.model as any, // Type coercion here for simplicity
      dimensions: analysisData.dimensions,
      languages: analysisData.languages,
      frameworks: analysisData.frameworks,
      hostingRecommendation: analysisData.hostingRecommendation,
      createdAt: analysisData.createdAt || new Date().toISOString(),
    };
    
    this.analyses.set(id, analysis);
    this.latestAnalysisId = id;
    
    return analysis;
  }

  async getAnalysis(id: string): Promise<AnalysisResult | undefined> {
    return this.analyses.get(id);
  }

  async getLatestAnalysis(): Promise<AnalysisResult | undefined> {
    if (!this.latestAnalysisId) return undefined;
    return this.analyses.get(this.latestAnalysisId);
  }
}

export const storage = new MemStorage();
