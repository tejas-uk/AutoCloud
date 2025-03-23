import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { DimensionAnalysis, AnalysisDimension } from "@/lib/types";
import path from "path";

// Initialize LLM clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "missing_openai_key" });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "missing_anthropic_key" });

// The dimensions to analyze
const analysisPromptDimensions = [
  {
    key: "database",
    name: "Database Configurations",
    description: "Database connection strings, ORM configurations, and migration scripts to identify database requirements (SQL, NoSQL, caching systems).",
    filePatterns: ["database", "db", "orm", "migration", "sql", "mongo", "prisma", "sequelize", "typeorm", "knex", "pg", "mysql", "redis"]
  },
  {
    key: "storage",
    name: "Storage References",
    description: "File system operations, blob storage clients, or media handling code that indicates storage needs.",
    filePatterns: ["storage", "upload", "media", "file", "s3", "blob", "azure", "gcs", "bucket", "minio", "fileSystem", "fs"]
  },
  {
    key: "configuration",
    name: "Configuration Files",
    description: "Docker files, YAML configurations, environment variables, and infrastructure-as-code files that define dependencies.",
    filePatterns: ["config", "dockerfile", "docker-compose", "yaml", "yml", "env", "terraform", "pulumi", "ansible", "cloudformation", "bicep", "kube", "k8s", "helm"]
  },
  {
    key: "apiIntegrations",
    name: "API Integrations",
    description: "External API calls to third-party services that might need to be accessible from your cloud environment.",
    filePatterns: ["api", "client", "service", "http", "request", "fetch", "axios", "graphql", "grpc", "webhook", "integration"]
  },
  {
    key: "authentication",
    name: "Authentication Mechanisms",
    description: "Authentication code to determine if you need identity services, SSO integrations, or key management.",
    filePatterns: ["auth", "login", "authz", "oauth", "jwt", "token", "sso", "identity", "permission", "rbac", "role", "keycloak", "passport", "cognito"]
  },
  {
    key: "compute",
    name: "Compute Requirements",
    description: "Resource-intensive operations, parallelization, and concurrency patterns to determine compute needs.",
    filePatterns: ["worker", "background", "job", "thread", "pool", "queue", "process", "cluster", "parallel", "concurrent", "compute", "cpu", "memory"]
  },
  {
    key: "networking",
    name: "Networking Code",
    description: "Socket connections, network configurations, and port definitions to understand networking requirements.",
    filePatterns: ["network", "socket", "websocket", "tcp", "udp", "port", "proxy", "load balancer", "ingress", "egress", "cors", "dns"]
  },
  {
    key: "deployment",
    name: "Deployment Scripts",
    description: "CI/CD pipelines, build scripts, and deployment manifests for specific cloud dependencies.",
    filePatterns: ["deploy", "ci", "cd", "pipeline", "github/workflow", "gitlab-ci", "travis", "jenkins", "azure-pipeline", "circleci"]
  },
  {
    key: "scalability",
    name: "Scalability Patterns",
    description: "Message queues, pub/sub patterns, or horizontal scaling code that indicates specific cloud service needs.",
    filePatterns: ["queue", "topic", "pubsub", "kafka", "rabbitmq", "sqs", "eventbridge", "event", "scale", "shard", "partition"]
  },
  {
    key: "logging",
    name: "Logging and Monitoring",
    description: "Instrumentation code to determine observability requirements.",
    filePatterns: ["log", "monitor", "metric", "trace", "sentry", "newrelic", "datadog", "grafana", "prometheus", "splunk", "elasticsearch", "winston", "bunyan"]
  },
  {
    key: "development",
    name: "Development Environment Setups",
    description: "Local development configurations as they often mirror production needs.",
    filePatterns: ["dev", "develop", "local", ".env.local", ".env.development", "package.json", "npm", "yarn", "pnpm", "nvmrc", "makefile"]
  },
  {
    key: "security",
    name: "Security Requirements",
    description: "Code for encryption, secrets management, and compliance-related functionality.",
    filePatterns: ["security", "crypto", "encrypt", "decrypt", "secret", "vault", "key", "cert", "ssl", "tls", "password", "hash", "aes", "rsa"]
  }
];

interface RepoInfo {
  owner: string;
  repo: string;
  fullName: string;
}

interface RepoFile {
  path: string;
  content: string;
}

/**
 * Group files by the dimensions they're likely related to
 */
function categorizeFiles(files: RepoFile[]): Record<string, RepoFile[]> {
  const categorized: Record<string, RepoFile[]> = {};
  
  analysisPromptDimensions.forEach(dim => {
    const matchingFiles = files.filter(file => {
      const lowerPath = file.path.toLowerCase();
      const fileName = path.basename(lowerPath);
      const fileContent = file.content.toLowerCase();
      
      return dim.filePatterns.some(pattern => 
        lowerPath.includes(pattern.toLowerCase()) || 
        fileName.includes(pattern.toLowerCase()) || 
        fileContent.includes(pattern.toLowerCase())
      );
    });
    
    categorized[dim.key] = matchingFiles;
  });
  
  // Add an "other" category for files that don't clearly match any dimension
  const otherFiles = files.filter(file => 
    !analysisPromptDimensions.some(dim => 
      categorized[dim.key].some(catFile => catFile.path === file.path)
    )
  );
  
  categorized.other = otherFiles;
  
  return categorized;
}

/**
 * Generate analysis for a repository using the selected LLM
 */
export async function generateAnalysis(
  repoInfo: RepoInfo,
  files: RepoFile[],
  directoryStructure: string,
  model: string
): Promise<Record<AnalysisDimension, DimensionAnalysis>> {
  // Categorize files by dimension for better context organization
  const categorizedFiles = categorizeFiles(files);
  
  // Create summary statistics about the repository
  const fileStats = {
    totalFiles: files.length,
    totalChars: files.reduce((acc, file) => acc + file.content.length, 0),
    filesByExt: {} as Record<string, number>
  };
  
  // Count files by extension
  files.forEach(file => {
    const ext = path.extname(file.path) || 'no-extension';
    fileStats.filesByExt[ext] = (fileStats.filesByExt[ext] || 0) + 1;
  });
  
  // Prepare structured JSON output template
  const outputTemplate = {};
  analysisPromptDimensions.forEach(dim => {
    outputTemplate[dim.key] = {
      summary: `Analysis of ${dim.name}`,
      findings: [{ title: "Example finding", description: "Description of finding", fileCount: 0, codeExample: "" }],
      recommendations: ["Example recommendation"]
    };
  });

  // System prompt is kept relatively short but specific
  const systemPrompt = `
  You are an expert DevOps and infrastructure engineer specializing in analyzing GitHub repositories to identify cloud infrastructure requirements.
  You will be given a repository name, directory structure, and categorized file contents.
  
  Your task is to perform a detailed analysis across these infrastructure dimensions:
  ${analysisPromptDimensions.map(dim => `- ${dim.name}: ${dim.description}`).join("\n")}
  
  For each dimension, provide:
  1. A concise summary (2-3 sentences max)
  2. Key findings with specific evidence from the files (title, description, file count, and representative code example)
  3. 3-5 practical recommendations for implementation in a cloud environment
  
  Format your response in JSON exactly matching this structure:
  ${JSON.stringify(outputTemplate, null, 2)}
  
  Keep your analysis technical, accurate, and based strictly on the provided code.
  Focus on extracting clear infrastructure requirements from the codebase.
  `;

  // User prompt contains the actual repository content - this will be much larger
  let userPrompt = `
  Repository: ${repoInfo.fullName}
  
  Repository statistics:
  - Total files analyzed: ${fileStats.totalFiles}
  - Total code volume: ${formatFileSize(fileStats.totalChars)} characters
  - File types: ${Object.entries(fileStats.filesByExt).map(([ext, count]) => `${ext}: ${count}`).join(', ')}
  
  Directory Structure:
  ${directoryStructure}
  
  Below are the repository files organized by infrastructure dimension:
  `;
  
  // Add categorized files to the prompt
  for (const dim of analysisPromptDimensions) {
    const dimFiles = categorizedFiles[dim.key];
    if (dimFiles && dimFiles.length > 0) {
      userPrompt += `\n\n## ${dim.name} (${dimFiles.length} files)\n`;
      
      // Sort files by path for better organization
      dimFiles.sort((a, b) => a.path.localeCompare(b.path));
      
      // Calculate token budget per file
      const maxCharsPerFile = determineMaxCharsPerFile(dimFiles, model);
      
      // Add file contents with adaptive truncation
      for (const file of dimFiles) {
        userPrompt += `\n### File: ${file.path}\n\`\`\`\n${truncateContent(file.content, maxCharsPerFile)}\n\`\`\`\n`;
      }
    }
  }
  
  // Add "other" files if there's still room in the context
  if (categorizedFiles.other && categorizedFiles.other.length > 0) {
    userPrompt += `\n\n## Other Potentially Relevant Files (${categorizedFiles.other.length} files)\n`;
    
    // Only include a sample of other files to save token space
    const otherFilesToInclude = categorizedFiles.other.slice(0, 10);
    const maxCharsPerFile = 500; // Short snippets for "other" files
    
    for (const file of otherFilesToInclude) {
      userPrompt += `\n### File: ${file.path}\n\`\`\`\n${truncateContent(file.content, maxCharsPerFile)}\n\`\`\`\n`;
    }
    
    if (categorizedFiles.other.length > 10) {
      userPrompt += `\n(${categorizedFiles.other.length - 10} more files omitted for brevity)\n`;
    }
  }
  
  userPrompt += `
  
  Please analyze this repository across all the dimensions specified and return your analysis in the requested JSON format.
  Focus on identifying infrastructure requirements and providing specific, actionable recommendations.
  `;

  try {
    // Use the appropriate LLM based on the model selection
    if (model === "claude-3-7-sonnet") {
      return await generateWithAnthropic(systemPrompt, userPrompt);
    } else {
      return await generateWithOpenAI(model, systemPrompt, userPrompt);
    }
  } catch (error) {
    console.error("Failed to generate analysis:", error);
    throw new Error(`Failed to generate analysis with ${model}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate analysis using OpenAI models
 */
async function generateWithOpenAI(
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<Record<AnalysisDimension, DimensionAnalysis>> {
  // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
  const modelMapping = {
    "gpt-4o-mini": "gpt-4o-mini",
    "gpt-4o": "gpt-4o",
    "o3-mini": "gpt-3.5-turbo", // Fallback for o3-mini which might not exist
  };
  
  const actualModel = modelMapping[model] || "gpt-4o";
  
  // Set max tokens based on model
  const maxTokens = model === "gpt-4o" ? 16000 : 8000;
  
  console.log(`Using OpenAI model: ${actualModel} with max_tokens: ${maxTokens}`);
  
  const response = await openai.chat.completions.create({
    model: actualModel,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
    max_tokens: maxTokens
  });
  
  const content = response.choices[0].message.content;
  
  if (!content) {
    throw new Error("Empty response from OpenAI");
  }
  
  try {
    const result = JSON.parse(content);
    return result as Record<AnalysisDimension, DimensionAnalysis>;
  } catch (error) {
    throw new Error(`Failed to parse OpenAI response as JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate analysis using Anthropic Claude
 */
async function generateWithAnthropic(
  systemPrompt: string,
  userPrompt: string
): Promise<Record<AnalysisDimension, DimensionAnalysis>> {
  // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
  console.log(`Using Anthropic model: claude-3-7-sonnet-20250219 with max_tokens: 16000`);
  
  const response = await anthropic.messages.create({
    model: "claude-3-7-sonnet-20250219",
    system: systemPrompt,
    max_tokens: 16000,
    temperature: 0.2,
    messages: [
      { role: "user", content: userPrompt }
    ],
  });
  
  const content = response.content[0].text;
  
  try {
    // Extract JSON from the response
    const jsonMatch = content.match(/```json([\s\S]*?)```/) || content.match(/{[\s\S]*}/);
    
    if (!jsonMatch) {
      throw new Error("No JSON found in Anthropic response");
    }
    
    const jsonContent = jsonMatch[1] || jsonMatch[0];
    const result = JSON.parse(jsonContent.replace(/```json|```/g, "").trim());
    
    return result as Record<AnalysisDimension, DimensionAnalysis>;
  } catch (error) {
    throw new Error(`Failed to parse Anthropic response as JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Determine maximum characters per file based on model and file count
 */
function determineMaxCharsPerFile(files: RepoFile[], model: string): number {
  if (files.length === 0) return 2000;
  
  // Base token budget allocation depends on the model
  let totalTokenBudget: number;
  
  if (model === "gpt-4o") {
    totalTokenBudget = 80000; // approx 60K tokens for user content
  } else if (model === "claude-3-7-sonnet") {
    totalTokenBudget = 80000; // approx 60K tokens for user content
  } else {
    totalTokenBudget = 40000; // approx 30K tokens for user content in smaller models
  }
  
  // Reserve some tokens for prompt and system instruction
  const reservedTokens = 10000;
  const availableTokens = totalTokenBudget - reservedTokens;
  
  // Estimate average chars per token (conservative estimate)
  const charsPerToken = 3.5;
  
  // Calculate available characters
  const availableChars = availableTokens * charsPerToken;
  
  // Calculate max chars per file, with a reasonable minimum and maximum
  const calculatedMax = Math.floor(availableChars / files.length);
  return Math.max(500, Math.min(calculatedMax, 5000));
}

/**
 * Truncate content to a specific length to avoid overwhelming the LLM
 */
function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content;
  }
  
  return content.substring(0, maxLength) + `\n... (truncated, ${content.length - maxLength} more characters)`;
}

/**
 * Format file size in a human-readable way
 */
function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size}`;
  } else if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)}K`;
  } else {
    return `${(size / (1024 * 1024)).toFixed(1)}M`;
  }
}
