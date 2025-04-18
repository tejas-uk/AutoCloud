import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { DimensionAnalysis, AnalysisDimension, Language, Framework, HostingRecommendation, AzureService } from "@/lib/types";
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
// Export Azure hosting recommendation function
export { generateAzureHostingRecommendation };

export async function generateAnalysis(
  repoInfo: RepoInfo,
  files: RepoFile[],
  directoryStructure: string,
  model: string
): Promise<{
  dimensions: Record<AnalysisDimension, DimensionAnalysis>;
  languages: Language[];
  frameworks: Framework[];
  hostingRecommendation?: HostingRecommendation;
}> {
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
  const outputTemplate: Record<string, any> = {};
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

  // Detect languages and frameworks
  const languages = detectLanguages(files);
  const frameworks = detectFrameworks(files);
  
  console.log(`Detected ${languages.length} languages and ${frameworks.length} frameworks`);
  
  try {
    // Use the appropriate LLM based on the model selection
    let analysisData: Record<AnalysisDimension, DimensionAnalysis>;
    
    if (model === "claude-3-7-sonnet") {
      analysisData = await generateWithAnthropic(systemPrompt, userPrompt);
    } else {
      analysisData = await generateWithOpenAI(model, systemPrompt, userPrompt);
    }
    
    // Return the result without Azure hosting recommendations (will be handled separately)
    return {
      dimensions: analysisData,
      languages,
      frameworks
    };
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
  const modelMapping: Record<string, string> = {
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
  
  let content = "";
  if (response.content && response.content.length > 0) {
    const firstContent = response.content[0];
    if (typeof firstContent === 'object') {
      // If it's a text block
      if ('text' in firstContent && typeof firstContent.text === 'string') {
        content = firstContent.text;
      } 
      // For safety, if we can't determine the structure, stringify it
      else {
        content = JSON.stringify(firstContent);
      }
    } else if (typeof firstContent === 'string') {
      content = firstContent;
    }
  }
  
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
 * Detect programming languages and their usage in the repository
 */
function detectLanguages(files: RepoFile[]): Language[] {
  try {
    const languageCounts: Record<string, { files: number, lines: number }> = {};
    let totalLines = 0;
    
    // Language detection based on file extensions
    const languageExtensions: Record<string, string> = {
      '.js': 'JavaScript',
      '.jsx': 'JavaScript (React)',
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript (React)',
      '.py': 'Python',
      '.java': 'Java',
      '.rb': 'Ruby',
      '.php': 'PHP',
      '.go': 'Go',
      '.rs': 'Rust',
      '.c': 'C',
      '.cpp': 'C++',
      '.cs': 'C#',
      '.swift': 'Swift',
      '.kt': 'Kotlin',
      '.scala': 'Scala',
      '.html': 'HTML',
      '.css': 'CSS',
      '.scss': 'SCSS',
      '.less': 'LESS',
      '.sql': 'SQL',
      '.sh': 'Shell',
      '.bat': 'Batch',
      '.ps1': 'PowerShell',
      '.yaml': 'YAML',
      '.yml': 'YAML',
      '.json': 'JSON',
      '.md': 'Markdown',
      '.r': 'R',
      '.dart': 'Dart',
      '.lua': 'Lua',
      '.ex': 'Elixir',
      '.exs': 'Elixir',
      '.elm': 'Elm',
      '.clj': 'Clojure',
      '.fs': 'F#',
      '.hs': 'Haskell'
    };
    
    // Process all files to count languages
    for (const file of files) {
      try {
        // Skip files with no content
        if (!file.content || !file.path) continue;
        
        // Extract the actual filename from the path
        const filename = file.path.split('/').pop() || file.path;
        const ext = path.extname(filename).toLowerCase();
        const language = languageExtensions[ext] || 'Other';
        
        // Count lines (safely handling potential errors)
        let lines = 0;
        try {
          lines = file.content.split('\n').length;
        } catch (e) {
          console.warn(`Error counting lines in file ${file.path}:`, e);
          lines = 1; // Default to 1 line if we can't count
        }
        
        totalLines += lines;
        
        if (!languageCounts[language]) {
          languageCounts[language] = { files: 0, lines: 0 };
        }
        
        languageCounts[language].files += 1;
        languageCounts[language].lines += lines;
      } catch (e) {
        console.warn(`Error processing file for language detection:`, e);
        // Continue with the next file
      }
    }
    
    // In case of no files or errors
    if (totalLines === 0) {
      return [
        { name: "Not Detected", percentage: 100, files: 0 }
      ];
    }
    
    // Convert to percentage and format as Language[]
    const languages = Object.entries(languageCounts)
      .map(([name, { files, lines }]) => ({
        name,
        percentage: totalLines > 0 ? Math.round((lines / totalLines) * 100) : 0,
        files
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .filter(lang => lang.percentage > 0 && lang.name !== 'Other'); // Filter out languages with 0% or just 'Other'
    
    // If no languages were detected but we have files, add a placeholder
    if (languages.length === 0 && files.length > 0) {
      return [
        { name: "Not Detected", percentage: 100, files: files.length }
      ];
    }
    
    return languages;
  } catch (error) {
    console.error("Error in language detection:", error);
    // Return a fallback in case of errors
    return [
      { name: "Detection Error", percentage: 100, files: 0 }
    ];
  }
}

/**
 * Detect frameworks and libraries used in the repository
 */
function detectFrameworks(files: RepoFile[]): Framework[] {
  try {
    const frameworks: Framework[] = [];
    
    // Get special files for dependency analysis with error handling
    const packageJsonFiles = files.filter(file => {
      try {
        if (!file || !file.path) return false;
        const filename = file.path.split('/').pop() || '';
        return filename === 'package.json';
      } catch (e) {
        return false;
      }
    });
    
    const requirementsTxtFiles = files.filter(file => {
      try {
        if (!file || !file.path) return false;
        const filename = file.path.split('/').pop() || '';
        return filename === 'requirements.txt';
      } catch (e) {
        return false;
      }
    });
    
    // Framework detection patterns
    const frameworkPatterns = [
      // Frontend frameworks
      { pattern: /react|react-dom/, name: 'React', category: 'frontend', confidence: 0.9 },
      { pattern: /vue|nuxt/, name: 'Vue.js', category: 'frontend', confidence: 0.9 },
      { pattern: /angular|ng-/, name: 'Angular', category: 'frontend', confidence: 0.9 },
      { pattern: /svelte/, name: 'Svelte', category: 'frontend', confidence: 0.9 },
      { pattern: /next|Next\.js/, name: 'Next.js', category: 'frontend', confidence: 0.9 },
      
      // Backend frameworks
      { pattern: /express|koa|fastify|hapi|nest/, name: 'Node.js', category: 'backend', confidence: 0.9 },
      { pattern: /django|Flask|FastAPI|Pyramid/, name: 'Python Web', category: 'backend', confidence: 0.9 },
      { pattern: /spring|springboot|spring-boot/, name: 'Spring Boot', category: 'backend', confidence: 0.9 },
      { pattern: /rails|ruby on rails|actionpack/, name: 'Ruby on Rails', category: 'backend', confidence: 0.9 },
      { pattern: /laravel|symfony|slim|lumen/, name: 'PHP Framework', category: 'backend', confidence: 0.9 },
      { pattern: /asp\.net|aspnetcore/, name: 'ASP.NET', category: 'backend', confidence: 0.9 },
      
      // Database patterns
      { pattern: /postgres|pg\s|postgresql/, name: 'PostgreSQL', category: 'database', confidence: 0.8 },
      { pattern: /mysql|mariadb/, name: 'MySQL/MariaDB', category: 'database', confidence: 0.8 },
      { pattern: /mongodb|mongoose/, name: 'MongoDB', category: 'database', confidence: 0.8 },
      { pattern: /sqlite/, name: 'SQLite', category: 'database', confidence: 0.8 },
      { pattern: /redis/, name: 'Redis', category: 'database', confidence: 0.8 },
    ];
    
    // Check each file for framework patterns with error handling
    for (const file of files) {
      try {
        if (!file || !file.content) continue;
        
        const content = file.content.toLowerCase();
        
        for (const { pattern, name, category, confidence } of frameworkPatterns) {
          try {
            if (pattern.test(content)) {
              // Only add if not already detected with higher confidence
              const existingFramework = frameworks.find(f => f.name === name);
              if (!existingFramework || existingFramework.confidence < confidence) {
                if (existingFramework) {
                  // Remove the existing one with lower confidence
                  const index = frameworks.indexOf(existingFramework);
                  frameworks.splice(index, 1);
                }
                frameworks.push({ name, category, confidence });
              }
            }
          } catch (patternError) {
            // Skip this pattern but continue with others
            console.warn(`Error with pattern ${pattern}:`, patternError);
          }
        }
      } catch (fileError) {
        // Skip this file but continue with others
        console.warn("Error processing file for framework detection:", fileError);
      }
    }
    
    // Parse package.json files for more accurate JavaScript framework detection
    for (const file of packageJsonFiles) {
      try {
        if (!file || !file.content) continue;
        
        const packageJson = JSON.parse(file.content);
        const dependencies = {
          ...(packageJson.dependencies || {}),
          ...(packageJson.devDependencies || {})
        };
        
        for (const [dep, version] of Object.entries(dependencies)) {
          // Frontend frameworks
          if (dep === 'react' || dep === 'react-dom') {
            addOrUpdateFramework(frameworks, 'React', 'frontend', 1.0);
          } else if (dep === 'vue' || dep === '@vue/cli') {
            addOrUpdateFramework(frameworks, 'Vue.js', 'frontend', 1.0);
          } else if (dep === '@angular/core') {
            addOrUpdateFramework(frameworks, 'Angular', 'frontend', 1.0);
          } else if (dep === 'svelte') {
            addOrUpdateFramework(frameworks, 'Svelte', 'frontend', 1.0);
          } else if (dep === 'next') {
            addOrUpdateFramework(frameworks, 'Next.js', 'frontend', 1.0);
          }
          
          // Backend frameworks
          else if (['express', 'koa', 'fastify', 'hapi', '@nestjs/core'].includes(dep)) {
            addOrUpdateFramework(frameworks, 'Node.js', 'backend', 1.0);
          }
          
          // Database
          else if (dep.includes('pg') || dep.includes('postgres')) {
            addOrUpdateFramework(frameworks, 'PostgreSQL', 'database', 1.0);
          } else if (dep.includes('mysql')) {
            addOrUpdateFramework(frameworks, 'MySQL', 'database', 1.0);
          } else if (dep.includes('mongo')) {
            addOrUpdateFramework(frameworks, 'MongoDB', 'database', 1.0);
          } else if (dep.includes('redis')) {
            addOrUpdateFramework(frameworks, 'Redis', 'database', 1.0);
          }
        }
      } catch (error) {
        console.warn('Failed to parse package.json:', error);
      }
    }
    
    // Parse requirements.txt for Python frameworks
    for (const file of requirementsTxtFiles) {
      try {
        if (!file || !file.content) continue;
        
        const content = file.content.toLowerCase();
        const lines = content.split('\n');
        
        for (const line of lines) {
          try {
            const requirement = line.trim().split('==')[0].split('>=')[0].trim();
            
            if (['django', 'flask', 'fastapi', 'pyramid'].includes(requirement)) {
              addOrUpdateFramework(frameworks, 'Python Web', 'backend', 1.0);
            } else if (['sqlalchemy', 'tortoise-orm', 'sqlmodel', 'django-orm'].includes(requirement)) {
              addOrUpdateFramework(frameworks, 'Python ORM', 'database', 1.0);
            } else if (['pytest', 'unittest', 'nose'].includes(requirement)) {
              addOrUpdateFramework(frameworks, 'Python Testing', 'testing', 1.0);
            }
          } catch (lineError) {
            // Skip this line but continue with others
            continue;
          }
        }
      } catch (fileError) {
        console.warn('Error processing requirements.txt:', fileError);
      }
    }
    
    // If no frameworks were detected but we have files, add a placeholder
    if (frameworks.length === 0 && files.length > 0) {
      return [
        { name: "No Frameworks Detected", category: "unknown", confidence: 1.0 }
      ];
    }
    
    return frameworks.sort((a, b) => b.confidence - a.confidence);
  } catch (error) {
    console.error("Error in framework detection:", error);
    // Return a fallback framework list in case of error
    return [
      { name: "Framework Detection Error", category: "unknown", confidence: 1.0 }
    ];
  }
}

function addOrUpdateFramework(frameworks: Framework[], name: string, category: string, confidence: number): void {
  const existing = frameworks.find(f => f.name === name);
  
  if (existing) {
    existing.confidence = Math.max(existing.confidence, confidence);
  } else {
    frameworks.push({ name, category, confidence });
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

/**
 * Generate Azure hosting recommendations based on repository analysis
 */
async function generateAzureHostingRecommendation(
  repoInfo: RepoInfo,
  analysisData: Record<AnalysisDimension, DimensionAnalysis>,
  languages: Language[],
  frameworks: Framework[],
  model: string
): Promise<HostingRecommendation> {
  // Prepare input data for the LLM to analyze and make recommendations
  const azureServicesPrompt = `
  You are an Azure cloud architecture expert specializing in designing hosting solutions.
  
  Based on the repository analysis, recommend the best Azure services to host this application.
  Consider the following aspects:
  
  Repository: ${repoInfo.fullName}
  
  Primary Languages: ${languages.slice(0, 3).map(l => `${l.name} (${l.percentage}%)`).join(', ')}
  
  Frameworks: ${frameworks.map(f => f.name).join(', ')}
  
  Infrastructure Analysis Summary:
  - Database: ${analysisData.database?.summary || 'No database requirements detected'}
  - Storage: ${analysisData.storage?.summary || 'No storage requirements detected'}
  - API Integrations: ${analysisData.apiIntegrations?.summary || 'No API integrations detected'}
  - Authentication: ${analysisData.authentication?.summary || 'No authentication requirements detected'}
  - Compute: ${analysisData.compute?.summary || 'No specific compute requirements detected'}
  - Networking: ${analysisData.networking?.summary || 'No specific networking requirements detected'}
  - Scalability: ${analysisData.scalability?.summary || 'No scalability patterns detected'}
  
  Provide a JSON response with the following structure:
  {
    "summary": "Brief overview of the Azure architecture recommendation (2-3 sentences)",
    "azureServices": [
      {
        "name": "Azure Service Name",
        "description": "Brief description of how this service fits the requirements",
        "category": "compute|database|storage|networking|security|etc.",
        "necessity": "required|recommended|optional",
        "alternativeServices": ["Alternative 1", "Alternative 2"],
        "estimatedCost": "Low/Medium/High cost estimate description"
      }
    ],
    "architectureSummary": "Detailed explanation of how these services work together (3-5 sentences)",
    "costEstimateDescription": "Overview of estimated costs for this solution"
  }
  
  Focus ONLY on Azure services, not AWS or GCP. Be specific with service names and include only services that directly address requirements found in the repository analysis.
  `;

  try {
    let hostingRecommendation: HostingRecommendation;
    
    // Use the appropriate LLM based on the model selection
    if (model === "claude-3-7-sonnet") {
      const response = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 4000,
        temperature: 0.2,
        messages: [
          { role: "user", content: azureServicesPrompt }
        ],
      });
      
      let content = "";
      if (response.content && response.content.length > 0) {
        const firstContent = response.content[0];
        if (typeof firstContent === 'object' && 'text' in firstContent) {
          content = firstContent.text;
        } else if (typeof firstContent === 'string') {
          content = firstContent;
        }
      }
      
      // Extract JSON from the response
      const jsonMatch = content.match(/```json([\s\S]*?)```/) || content.match(/{[\s\S]*}/);
      
      if (!jsonMatch) {
        throw new Error("No JSON found in Anthropic response for Azure recommendations");
      }
      
      const jsonContent = jsonMatch[1] || jsonMatch[0];
      hostingRecommendation = JSON.parse(jsonContent.replace(/```json|```/g, "").trim());
      
    } else {
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const modelMapping: Record<string, string> = {
        "gpt-4o-mini": "gpt-4o-mini",
        "gpt-4o": "gpt-4o",
        "o3-mini": "gpt-3.5-turbo",
      };
      
      const actualModel = modelMapping[model] || "gpt-4o";
      const response = await openai.chat.completions.create({
        model: actualModel,
        messages: [
          { role: "user", content: azureServicesPrompt }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
        max_tokens: 4000
      });
      
      const content = response.choices[0].message.content;
      
      if (!content) {
        throw new Error("Empty response from OpenAI for Azure recommendations");
      }
      
      hostingRecommendation = JSON.parse(content);
    }
    
    return hostingRecommendation;
  } catch (error) {
    console.error("Failed to generate Azure hosting recommendations:", error);
    
    // Return a fallback recommendation if something goes wrong
    return {
      summary: "Unable to generate specific Azure hosting recommendations due to an error. Please try again.",
      azureServices: [],
      architectureSummary: "Error during recommendation generation. The analysis engine encountered an issue while processing this repository."
    };
  }
}
