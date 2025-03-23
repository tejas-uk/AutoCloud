import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeRepository, fetchRepositoryInfo } from "./github";
import { generateAnalysis } from "./llm";

export async function registerRoutes(app: Express): Promise<Server> {
  // GitHub OAuth routes
  app.get("/api/auth/github", async (_req: Request, res: Response) => {
    const clientId = process.env.GITHUB_CLIENT_ID || "missing_github_client_id";
    const redirectUri = process.env.REDIRECT_URI || "http://localhost:5000/api/auth/github/callback";
    
    // Generate a random state to prevent CSRF attacks
    const state = Math.random().toString(36).substring(2, 15);
    
    // Store the state in the user's session (simplified for this example)
    // In a real app, you'd use express-session or similar
    
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=repo&state=${state}`;
    
    res.json({ authUrl });
  });

  app.get("/api/auth/github/callback", async (req: Request, res: Response) => {
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).json({ message: "Authorization code is missing" });
    }
    
    try {
      // In a real implementation, verify the state parameter matches what was sent
      
      // Exchange the code for an access token
      const clientId = process.env.GITHUB_CLIENT_ID || "";
      const clientSecret = process.env.GITHUB_CLIENT_SECRET || "";
      
      const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      });
      
      const tokenData = await tokenResponse.json();
      
      if (tokenData.error) {
        throw new Error(tokenData.error_description || "Failed to exchange code for token");
      }
      
      const accessToken = tokenData.access_token;
      
      // Fetch user information
      const userResponse = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${accessToken}`,
        },
      });
      
      const userData = await userResponse.json();
      
      // Save user data with the access token
      await storage.saveGithubUser({
        id: userData.id.toString(),
        username: userData.login,
        accessToken,
      });
      
      // Redirect back to the frontend with a success message
      res.redirect("/?auth=success");
    } catch (error) {
      console.error("OAuth callback error:", error);
      res.redirect("/?auth=error");
    }
  });

  // Repository routes
  app.get("/api/repositories", async (_req: Request, res: Response) => {
    try {
      // In a real implementation, you would get the current user from the session
      const user = await storage.getGithubUser("dummy-user-id");
      
      if (!user) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const repositories = await storage.getUserRepositories(user.id);
      res.json(repositories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch repositories" });
    }
  });

  // Analysis routes
  app.post("/api/analyze", async (req: Request, res: Response) => {
    const { repoUrl, model } = req.body;
    
    if (!repoUrl) {
      return res.status(400).json({ message: "Repository URL is required" });
    }
    
    if (!model) {
      return res.status(400).json({ message: "LLM model is required" });
    }
    
    try {
      // Extract repo information from URL
      const repoInfo = await fetchRepositoryInfo(repoUrl);
      
      // Analyze the repository to get code files
      const { files, directoryStructure } = await analyzeRepository(repoUrl);
      
      // Generate analysis using the selected LLM
      const analysisResult = await generateAnalysis(
        repoInfo,
        files,
        directoryStructure,
        model
      );
      
      // Save the analysis result
      const savedAnalysis = await storage.saveAnalysis({
        repoUrl,
        repoName: repoInfo.fullName,
        model,
        dimensions: analysisResult.dimensions,
        languages: analysisResult.languages,
        frameworks: analysisResult.frameworks
      });
      
      res.json(savedAnalysis);
    } catch (error) {
      console.error("Analysis error:", error);
      res.status(500).json({ 
        message: "Failed to analyze repository",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/analysis", async (_req: Request, res: Response) => {
    try {
      const analysis = await storage.getLatestAnalysis();
      
      if (!analysis) {
        return res.status(404).json({ message: "No analysis found" });
      }
      
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analysis results" });
    }
  });
  
  // Azure hosting recommendation as a separate step
  app.post("/api/azure-recommendation", async (req: Request, res: Response) => {
    try {
      const { analysisId, model } = req.body;
      
      if (!analysisId) {
        return res.status(400).json({ message: "Analysis ID is required" });
      }
      
      // Get the existing analysis
      const analysis = await storage.getAnalysis(analysisId);
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }
      
      try {
        // Import the generateAzureHostingRecommendation function
        const { generateAzureHostingRecommendation } = await import("./llm");
        
        // Parse GitHub URL to get repo info
        const repoInfo = await fetchRepositoryInfo(analysis.repoUrl);
        
        // Generate Azure hosting recommendations
        const hostingRecommendation = await generateAzureHostingRecommendation(
          repoInfo,
          analysis.dimensions,
          analysis.languages,
          analysis.frameworks,
          model || analysis.model
        );
        
        // Update the analysis with hosting recommendations
        const updatedAnalysis = await storage.saveAnalysis({
          id: analysis.id,
          repoUrl: analysis.repoUrl,
          repoName: analysis.repoName,
          model: analysis.model,
          dimensions: analysis.dimensions,
          languages: analysis.languages,
          frameworks: analysis.frameworks,
          hostingRecommendation
        });
        
        res.json(updatedAnalysis);
      } catch (error) {
        console.error("Azure hosting recommendation failed:", error);
        res.status(500).json({ 
          message: "Failed to generate Azure hosting recommendations",
          error: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      console.error("Failed to process hosting recommendation request:", error);
      res.status(500).json({ message: "Failed to process hosting recommendation request" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
