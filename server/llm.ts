import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { DimensionAnalysis, AnalysisDimension } from "@/lib/types";

// Initialize LLM clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "missing_openai_key" });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "missing_anthropic_key" });

// The dimensions to analyze
const analysisPromptDimensions = [
  {
    key: "database",
    name: "Database Configurations",
    description: "Database connection strings, ORM configurations, and migration scripts to identify database requirements (SQL, NoSQL, caching systems)."
  },
  {
    key: "storage",
    name: "Storage References",
    description: "File system operations, blob storage clients, or media handling code that indicates storage needs."
  },
  {
    key: "configuration",
    name: "Configuration Files",
    description: "Docker files, YAML configurations, environment variables, and infrastructure-as-code files that define dependencies."
  },
  {
    key: "apiIntegrations",
    name: "API Integrations",
    description: "External API calls to third-party services that might need to be accessible from your cloud environment."
  },
  {
    key: "authentication",
    name: "Authentication Mechanisms",
    description: "Authentication code to determine if you need identity services, SSO integrations, or key management."
  },
  {
    key: "compute",
    name: "Compute Requirements",
    description: "Resource-intensive operations, parallelization, and concurrency patterns to determine compute needs."
  },
  {
    key: "networking",
    name: "Networking Code",
    description: "Socket connections, network configurations, and port definitions to understand networking requirements."
  },
  {
    key: "deployment",
    name: "Deployment Scripts",
    description: "CI/CD pipelines, build scripts, and deployment manifests for specific cloud dependencies."
  },
  {
    key: "scalability",
    name: "Scalability Patterns",
    description: "Message queues, pub/sub patterns, or horizontal scaling code that indicates specific cloud service needs."
  },
  {
    key: "logging",
    name: "Logging and Monitoring",
    description: "Instrumentation code to determine observability requirements."
  },
  {
    key: "development",
    name: "Development Environment Setups",
    description: "Local development configurations as they often mirror production needs."
  },
  {
    key: "security",
    name: "Security Requirements",
    description: "Code for encryption, secrets management, and compliance-related functionality."
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
 * Generate analysis for a repository using the selected LLM
 */
export async function generateAnalysis(
  repoInfo: RepoInfo,
  files: RepoFile[],
  directoryStructure: string,
  model: string
): Promise<Record<AnalysisDimension, DimensionAnalysis>> {
  // Create a summary of the repository files
  const filesSummary = files.map(file => `${file.path} (${file.content.length} chars)`).join("\n");
  
  // Prepare structured JSON output template
  const outputTemplate = {};
  analysisPromptDimensions.forEach(dim => {
    outputTemplate[dim.key] = {
      summary: `Analysis of ${dim.name}`,
      findings: [{ title: "Example finding", description: "Description of finding", fileCount: 0, codeExample: "" }],
      recommendations: ["Example recommendation"]
    };
  });

  const systemPrompt = `
  You are an expert software engineer analyzing GitHub repositories to identify infrastructure requirements.
  You will be given a repository name, directory structure, and contents of key files.
  
  Analyze the code across these dimensions:
  ${analysisPromptDimensions.map(dim => `- ${dim.name}: ${dim.description}`).join("\n")}
  
  For each dimension, provide:
  1. A concise summary (2-3 sentences)
  2. Key findings with specific evidence from the files (title, description, file count, code example if relevant)
  3. 2-3 practical recommendations for implementation
  
  Respond in JSON format matching this structure:
  ${JSON.stringify(outputTemplate, null, 2)}
  
  Keep your analysis technical, accurate, and based strictly on the provided code.
  `;

  const userPrompt = `
  Repository: ${repoInfo.fullName}
  
  Directory Structure:
  ${directoryStructure}
  
  Files Summary:
  ${filesSummary}
  
  File Contents:
  ${files.map(file => `---\nFile: ${file.path}\n---\n${truncateContent(file.content, 1500)}`).join("\n\n")}
  
  Please analyze this repository across all the dimensions specified and return your analysis in the requested JSON format.
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
  
  const response = await openai.chat.completions.create({
    model: actualModel,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
    max_tokens: 4000
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
  const response = await anthropic.messages.create({
    model: "claude-3-7-sonnet-20250219",
    system: systemPrompt,
    max_tokens: 4000,
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
 * Truncate content to a specific length to avoid overwhelming the LLM
 */
function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content;
  }
  
  return content.substring(0, maxLength) + `\n... (truncated, ${content.length - maxLength} more characters)`;
}
