import { Octokit } from "octokit";
import path from "path";

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
 * Analyze a GitHub repository and fetch relevant files
 */
export async function analyzeRepository(repoUrl: string): Promise<AnalysisData> {
  const githubToken = process.env.GITHUB_TOKEN;
  const octokit = new Octokit({
    auth: githubToken,
  });

  try {
    const { owner, repo } = parseGitHubUrl(repoUrl);

    // Get repository contents (files and directories in the root)
    const { data: rootContents } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: "",
    });

    // Keep track of all directories to explore
    const dirsToExplore = Array.isArray(rootContents)
      ? rootContents.filter((item) => item.type === "dir").map((dir) => dir.path)
      : [];

    // Files we want to analyze
    const filesToAnalyze: RepoFile[] = [];
    const directoryStructure: string[] = [];

    // Process the root level files first
    if (Array.isArray(rootContents)) {
      const relevantFiles = rootContents.filter(
        (item) => item.type === "file" && isRelevantFile(item.name)
      );

      for (const file of relevantFiles) {
        directoryStructure.push(file.path);
        
        try {
          const content = await fetchFileContent(octokit, owner, repo, file.path);
          filesToAnalyze.push({
            path: file.path,
            content: content,
          });
        } catch (error) {
          console.warn(`Failed to fetch content for ${file.path}:`, error);
        }
      }
    }

    // Process up to 5 directories to avoid rate limits
    const maxDirs = Math.min(5, dirsToExplore.length);
    for (let i = 0; i < maxDirs; i++) {
      const dirPath = dirsToExplore[i];
      
      try {
        // Get contents of the directory
        const { data: dirContents } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: dirPath,
        });

        if (Array.isArray(dirContents)) {
          // Add subdirectories to explore
          const subdirs = dirContents
            .filter((item) => item.type === "dir")
            .slice(0, 3); // Only process up to 3 subdirectories per directory
          
          subdirs.forEach((subdir) => directoryStructure.push(`${subdir.path}/`));
          
          // Process relevant files in this directory
          const relevantFiles = dirContents.filter(
            (item) => item.type === "file" && isRelevantFile(item.name)
          ).slice(0, 10); // Only process up to 10 files per directory
          
          for (const file of relevantFiles) {
            directoryStructure.push(file.path);
            
            try {
              const content = await fetchFileContent(octokit, owner, repo, file.path);
              filesToAnalyze.push({
                path: file.path,
                content: content,
              });
            } catch (error) {
              console.warn(`Failed to fetch content for ${file.path}:`, error);
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to explore directory ${dirPath}:`, error);
      }
    }

    return {
      files: filesToAnalyze.slice(0, 30), // Limit to 30 files to avoid overwhelming the LLM
      directoryStructure: directoryStructure.join("\n"),
    };
  } catch (error) {
    console.error("Failed to analyze repository:", error);
    throw new Error("Failed to analyze repository: " + (error instanceof Error ? error.message : String(error)));
  }
}

/**
 * Fetch the content of a file from GitHub
 */
async function fetchFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string
): Promise<string> {
  const { data } = await octokit.rest.repos.getContent({
    owner,
    repo,
    path,
  });

  if ("content" in data && typeof data.content === "string") {
    return Buffer.from(data.content, "base64").toString("utf-8");
  } else {
    throw new Error(`Could not get content for file ${path}`);
  }
}

/**
 * Check if a file is relevant for infrastructure analysis
 */
function isRelevantFile(filename: string): boolean {
  const relevantExtensions = [
    // Configuration files
    ".json", ".yaml", ".yml", ".toml", ".ini", ".env",
    // Infrastructure files
    "Dockerfile", "docker-compose", ".dockerignore", "Procfile",
    // Database
    ".sql", ".prisma", "schema.rb", "migrations",
    // Source code
    ".js", ".ts", ".py", ".rb", ".java", ".go", ".php", ".cs",
    // Requirements/dependencies
    "package.json", "requirements.txt", "Gemfile", "pom.xml", "build.gradle", "go.mod",
    // CI/CD
    ".github", ".gitlab-ci", ".travis", "appveyor", "azure-pipelines", "Jenkinsfile",
  ];

  const ext = path.extname(filename).toLowerCase();
  const basename = path.basename(filename).toLowerCase();
  
  return (
    relevantExtensions.includes(ext) ||
    relevantExtensions.some((r) => basename.includes(r)) ||
    basename.startsWith(".") // Hidden config files like .gitignore
  );
}
