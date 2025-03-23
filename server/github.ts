import { Octokit } from "octokit";
import path from "path";
import fs from "fs";
import util from "util";
import { exec } from "child_process";
import { rimraf } from "rimraf";
import { glob } from "glob";

const execPromise = util.promisify(exec);

// Clone function
function gitClone(repo: string, targetPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(`git clone ${repo} ${targetPath}`, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

// Use native glob pattern function
async function findFiles(pattern: string, options: Record<string, any>): Promise<string[]> {
  try {
    const matches = await glob(pattern, options);
    return matches;
  } catch (error) {
    console.error("Error finding files:", error);
    return [];
  }
}

interface RepoInfo {
  owner: string;
  repo: string;
  fullName: string;
}

interface RepoFile {
  path: string;
  content: string;
}

interface AnalysisData {
  files: RepoFile[];
  directoryStructure: string;
}

/**
 * Extract owner and repo name from a GitHub URL
 */
export function parseGitHubUrl(url: string): RepoInfo {
  // Clean the URL
  url = url.trim();
  if (url.endsWith("/")) {
    url = url.slice(0, -1);
  }

  // Extract owner and repo from URL
  const githubRegex = /github\.com\/([^/]+)\/([^/]+)/;
  const match = url.match(githubRegex);

  if (!match) {
    throw new Error("Invalid GitHub URL format");
  }

  const [, owner, repo] = match;
  return {
    owner,
    repo,
    fullName: `${owner}/${repo}`,
  };
}

/**
 * Fetch repository information from GitHub
 */
export async function fetchRepositoryInfo(repoUrl: string): Promise<RepoInfo> {
  try {
    return parseGitHubUrl(repoUrl);
  } catch (error) {
    console.error("Failed to parse GitHub URL:", error);
    throw error;
  }
}

/**
 * Analyze a GitHub repository by cloning it and reading its contents
 */
export async function analyzeRepository(repoUrl: string): Promise<AnalysisData> {
  const githubToken = process.env.GITHUB_TOKEN;
  
  if (!githubToken) {
    throw new Error("GitHub token is required to clone repositories");
  }
  
  try {
    const { owner, repo } = parseGitHubUrl(repoUrl);
    const repoDir = `./tmp/${owner}_${repo}_${Date.now()}`;
    
    console.log(`Cloning repository ${owner}/${repo} to ${repoDir}...`);
    
    // Create temporary directory if it doesn't exist
    if (!fs.existsSync('./tmp')) {
      fs.mkdirSync('./tmp', { recursive: true });
    }
    
    // Use authentication with GitHub token for cloning
    const authRepoUrl = `https://${githubToken}@github.com/${owner}/${repo}.git`;
    
    try {
      // Clone the repository
      await gitClone(authRepoUrl, repoDir);
      console.log(`Repository cloned successfully to ${repoDir}`);
      
      // Get directory structure
      const directoryStructure = await getDirectoryStructure(repoDir);
      
      // Find all relevant files
      const allFiles = await findRelevantFiles(repoDir);
      console.log(`Found ${allFiles.length} relevant files for analysis`);
      
      // Read content of files
      const files = await readFilesContent(repoDir, allFiles);
      
      // Clean up - remove the cloned repository
      await rimraf(repoDir);
      
      return {
        files,
        directoryStructure,
      };
    } catch (error) {
      // Clean up in case of error
      if (fs.existsSync(repoDir)) {
        await rimraf(repoDir);
      }
      throw error;
    }
  } catch (error) {
    console.error("Failed to analyze repository:", error);
    throw new Error("Failed to analyze repository: " + (error instanceof Error ? error.message : String(error)));
  }
}

/**
 * Get the directory structure of the cloned repository
 */
async function getDirectoryStructure(repoDir: string): Promise<string> {
  try {
    const { stdout } = await execPromise(`find ${repoDir} -type f -o -type d | sort`);
    
    // Remove the temporary directory prefix and filter out node_modules, .git, etc.
    const lines = stdout
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => line.replace(`${repoDir}/`, ''))
      .filter(line => !line.includes('node_modules/') && 
                       !line.includes('.git/') &&
                       !line.includes('tmp/'));
    
    return lines.join('\n');
  } catch (error) {
    console.error("Error getting directory structure:", error);
    return "Error: Failed to get directory structure";
  }
}

/**
 * Find all relevant files in the cloned repository
 * Limit to a reasonable number to avoid overwhelming the LLM
 */
async function findRelevantFiles(repoDir: string): Promise<string[]> {
  try {
    // Find relevant files using glob patterns for infrastructure-related files
    const relevantPatterns = [
      // Configuration files
      "**/*.json", "**/*.yaml", "**/*.yml", "**/*.toml", "**/*.ini", "**/*.env*",
      // Ignore files
      "**/.*ignore",
      // Infrastructure files
      "**/Dockerfile*", "**/docker-compose*", "**/Procfile*",
      // Database
      "**/*.sql", "**/*.prisma", "**/schema.rb", "**/migrations/**/*.{js,ts,rb,py,php}",
      // Requirements/dependencies
      "**/package.json", "**/requirements.txt", "**/Gemfile*", "**/pom.xml", "**/build.gradle*", "**/go.mod",
      // CI/CD
      "**/.github/**/*.{yml,yaml}", "**/.gitlab-ci*", "**/.travis*", "**/appveyor*", "**/azure-pipelines*", "**/Jenkinsfile*",
      // Configuration in various languages
      "**/config/**/*.{js,ts,py,rb,json,yaml,yml}",
      "**/settings/**/*.{js,ts,py,rb,json,yaml,yml}",
    ];
    
    const ignorePatterns = [
      "**/node_modules/**", 
      "**/.git/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/vendor/**"
    ];
    
    let allFiles: string[] = [];
    
    for (const pattern of relevantPatterns) {
      const files = await findFiles(`${repoDir}/${pattern}`, {
        ignore: ignorePatterns,
        nodir: true
      });
      
      allFiles = [...allFiles, ...files.map((f: string) => f.replace(`${repoDir}/`, ''))];
    }
    
    // Add main entry point files if they exist
    const entryFiles = [
      "index.js", "index.ts", "main.py", "app.py", "app.js", "server.js", "server.ts", "application.rb"
    ];
    
    for (const file of entryFiles) {
      if (fs.existsSync(`${repoDir}/${file}`)) {
        allFiles.push(file);
      }
    }
    
    // Deduplicate and sort
    const uniqueFilesSet = new Set<string>();
    for (const file of allFiles) {
      uniqueFilesSet.add(file);
    }
    const uniqueFiles = Array.from(uniqueFilesSet).sort();
    
    // Limit to max 100 files to avoid overwhelming the LLM
    return uniqueFiles.slice(0, 100);
  } catch (error) {
    console.error("Error finding relevant files:", error);
    return [];
  }
}

/**
 * Read the content of the specified files
 */
async function readFilesContent(repoDir: string, filePaths: string[]): Promise<RepoFile[]> {
  const result: RepoFile[] = [];
  
  for (const filePath of filePaths) {
    try {
      const fullPath = path.join(repoDir, filePath);
      
      // Skip very large files
      const stats = fs.statSync(fullPath);
      if (stats.size > 300 * 1024) { // 300 KB limit
        console.log(`Skipping large file ${filePath} (${Math.round(stats.size / 1024)} KB)`);
        continue;
      }
      
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        result.push({
          path: filePath,
          content
        });
      }
    } catch (error) {
      console.warn(`Failed to read content for ${filePath}:`, error);
    }
  }
  
  return result;
}
