import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeRepository, fetchRepositoryInfo } from "./github";
import { generateAnalysis } from "./llm";
import { generateTerraformCode } from "./terraform";
import { authenticateWithAzure, runTerraformPlan, applyTerraformPlan } from "./azure";
import crypto from "crypto";

// PKCE Utilities
function base64URLEncode(str: Buffer): string {
  return str.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function generateCodeVerifier(): string {
  return base64URLEncode(crypto.randomBytes(32));
}

function generateCodeChallenge(verifier: string): string {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return base64URLEncode(hash);
}

// Store code verifiers temporarily (in a real app, use Redis or another session store)
const codeVerifiers = new Map<string, string>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Azure AD OAuth routes - Move these to the top to ensure they're registered first
  app.get("/api/auth/azure", (req: Request, res: Response) => {
    console.log("[Azure Auth] Starting authentication flow...");
    const clientId = process.env.AZURE_CLIENT_ID || "missing_azure_client_id";
    const tenantId = process.env.AZURE_TENANT_ID || "common";
    const redirectUri = "http://localhost:3000/auth/callback";
    
    console.log("[Azure Auth] Configuration:", {
      clientId: clientId === "missing_azure_client_id" ? "MISSING" : "CONFIGURED",
      tenantId,
      redirectUri
    });
    
    // Generate PKCE values
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    
    // Generate state
    const state = Math.random().toString(36).substring(2, 15);
    
    console.log("[Azure Auth] Generated PKCE values:", {
      codeVerifierLength: codeVerifier.length,
      codeChallengeLength: codeChallenge.length,
      state
    });
    
    // Store the code verifier for later use
    codeVerifiers.set(state, codeVerifier);
    
    const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` +
      `client_id=${clientId}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_mode=query` +
      `&scope=${encodeURIComponent("https://management.azure.com/user_impersonation offline_access")}` +
      `&state=${state}` +
      `&code_challenge=${codeChallenge}` +
      `&code_challenge_method=S256`;
    
    console.log("[Azure Auth] Redirecting to:", authUrl);
    res.redirect(authUrl);
  });

  app.get("/auth/callback", async (req: Request, res: Response) => {
    console.log("[Azure Callback] Received callback with query params:", {
      code: req.query.code ? "PRESENT" : "MISSING",
      state: req.query.state,
      error: req.query.error,
      error_description: req.query.error_description
    });
    
    const { code, state } = req.query;
    
    if (!code || !state) {
      console.error("[Azure Callback] Missing code or state parameters");
      return res.redirect("/?error=azure_auth_failed");
    }
    
    try {
      // Retrieve the code verifier using the state parameter
      const codeVerifier = codeVerifiers.get(state.toString());
      console.log("[Azure Callback] Code verifier lookup:", {
        state: state.toString(),
        codeVerifierFound: !!codeVerifier,
        storedStates: Array.from(codeVerifiers.keys())
      });
      
      if (!codeVerifier) {
        throw new Error("Invalid state parameter");
      }
      
      // Clean up the stored code verifier
      codeVerifiers.delete(state.toString());
      
      const clientId = process.env.AZURE_CLIENT_ID || "";
      const clientSecret = process.env.AZURE_CLIENT_SECRET || "";
      const tenantId = process.env.AZURE_TENANT_ID || "common";
      const redirectUri = "http://localhost:3000/auth/callback";
      
      console.log("[Azure Callback] Attempting token exchange with config:", {
        clientId: clientId ? "CONFIGURED" : "MISSING",
        clientSecret: clientSecret ? "CONFIGURED" : "MISSING",
        tenantId,
        redirectUri
      });
      
      // Exchange the code for tokens with PKCE
      const tokenResponse = await fetch(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: clientId,
            client_secret: clientSecret,
            code: code.toString(),
            redirect_uri: redirectUri,
            code_verifier: codeVerifier,
            scope: "https://management.azure.com/.default offline_access",
          }),
        }
      );
      
      console.log("[Azure Callback] Token response status:", tokenResponse.status);
      const tokenData = await tokenResponse.json();
      
      if (tokenResponse.status !== 200) {
        console.error("[Azure Callback] Token exchange failed:", {
          status: tokenResponse.status,
          error: tokenData.error,
          errorDescription: tokenData.error_description
        });
        throw new Error(tokenData.error_description || "Failed to exchange code for token");
      }
      
      console.log("[Azure Callback] Token exchange successful");
      
      // Get subscription ID using the access token
      console.log("[Azure Callback] Fetching subscription information...");
      const subsResponse = await fetch(
        "https://management.azure.com/subscriptions?api-version=2020-01-01",
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        }
      );
      
      console.log("[Azure Callback] Subscription response status:", subsResponse.status);
      const subsData = await subsResponse.json();
      
      if (subsResponse.status !== 200) {
        console.error("[Azure Callback] Failed to fetch subscriptions:", {
          status: subsResponse.status,
          error: subsData.error,
          errorMessage: subsData.message
        });
        throw new Error("Failed to fetch Azure subscriptions");
      }
      
      if (!subsData.value || subsData.value.length === 0) {
        console.warn("[Azure Callback] No subscriptions found in response");
        throw new Error("No Azure subscriptions found for this account");
      }

      // Get tenant information
      const tenantResponse = await fetch(
        "https://management.azure.com/tenants?api-version=2020-01-01",
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        }
      );

      const tenantData = await tenantResponse.json();
      
      // Store the account information
      const selectedSubscription = subsData.value[0];
      const accountInfo = {
        subscriptionId: selectedSubscription.subscriptionId,
        subscriptionName: selectedSubscription.displayName,
        tenantId: process.env.AZURE_TENANT_ID,
        tenantName: tenantData.value?.[0]?.displayName || "Unknown",
        environment: selectedSubscription.environmentName || "AzureCloud"
      };
      
      // Store tokens and subscription ID
      process.env.AZURE_ACCESS_TOKEN = tokenData.access_token;
      process.env.AZURE_REFRESH_TOKEN = tokenData.refresh_token;
      process.env.AZURE_SUBSCRIPTION_ID = accountInfo.subscriptionId;
      
      // Store account info in a way that can be retrieved later
      process.env.AZURE_ACCOUNT_INFO = JSON.stringify(accountInfo);
      
      // Redirect back to the frontend with success and account info
      const redirectParams = new URLSearchParams({
        azure: 'success',
        subscription: accountInfo.subscriptionName,
        tenant: accountInfo.tenantName,
        environment: accountInfo.environment
      });
      
      console.log("[Azure Callback] Authentication successful with account:", {
        subscription: accountInfo.subscriptionName,
        tenant: accountInfo.tenantName,
        environment: accountInfo.environment
      });
      
      res.redirect(`/?${redirectParams.toString()}`);
    } catch (error) {
      console.error("[Azure Callback] Error during callback processing:", error);
      res.redirect("/?azure=error");
    }
  });

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

  // Terraform code generation endpoint
  app.post("/api/terraform", async (req: Request, res: Response) => {
    try {
      const { analysisId } = req.body;
      
      if (!analysisId) {
        return res.status(400).json({ message: "Analysis ID is required" });
      }
      
      // Get the existing analysis
      const analysis = await storage.getAnalysis(analysisId);
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }
      
      // Check if the analysis has hosting recommendations
      if (!analysis.hostingRecommendation) {
        return res.status(400).json({ 
          message: "Azure hosting recommendations are required before generating Terraform code"
        });
      }

      try {
        // Generate Terraform code
        const terraformCode = await generateTerraformCode(
          analysisId,
          analysis.repoUrl,
          analysis.hostingRecommendation
        );
        
        // Update the analysis with Terraform code
        const updatedAnalysis = await storage.saveAnalysis({
          id: analysis.id,
          repoUrl: analysis.repoUrl,
          repoName: analysis.repoName,
          model: analysis.model,
          dimensions: analysis.dimensions,
          languages: analysis.languages,
          frameworks: analysis.frameworks,
          hostingRecommendation: analysis.hostingRecommendation,
          terraformCode
        });
        
        res.json(updatedAnalysis);
      } catch (error) {
        console.error("Terraform code generation failed:", error);
        res.status(500).json({ 
          message: "Failed to generate Terraform code",
          error: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      console.error("Failed to process Terraform generation request:", error);
      res.status(500).json({ message: "Failed to process Terraform generation request" });
    }
  });
  
  // Azure deployment endpoints
  
  // Authentication with Azure
  app.post("/api/azure/authenticate", async (_req: Request, res: Response) => {
    try {
      const authResult = await authenticateWithAzure();
      
      if (authResult.success) {
        res.json(authResult);
      } else {
        res.status(401).json(authResult);
      }
    } catch (error) {
      console.error("Azure authentication error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to authenticate with Azure",
        logs: [error instanceof Error ? error.message : String(error)],
        isLoggedIn: false
      });
    }
  });
  
  // Terraform planning
  app.post("/api/azure/terraform-plan", async (req: Request, res: Response) => {
    try {
      const { analysisId } = req.body;
      
      if (!analysisId) {
        return res.status(400).json({ message: "Analysis ID is required" });
      }
      
      const planResult = await runTerraformPlan(analysisId);
      
      if (planResult.success) {
        res.json(planResult);
      } else {
        res.status(400).json(planResult);
      }
    } catch (error) {
      console.error("Terraform plan error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to run Terraform plan",
        logs: [error instanceof Error ? error.message : String(error)]
      });
    }
  });
  
  // Terraform apply
  app.post("/api/azure/terraform-apply", async (req: Request, res: Response) => {
    try {
      const { analysisId } = req.body;
      
      if (!analysisId) {
        return res.status(400).json({ message: "Analysis ID is required" });
      }
      
      const applyResult = await applyTerraformPlan(analysisId);
      
      if (applyResult.success) {
        res.json(applyResult);
      } else {
        res.status(400).json(applyResult);
      }
    } catch (error) {
      console.error("Terraform apply error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to apply Terraform plan",
        logs: [error instanceof Error ? error.message : String(error)]
      });
    }
  });

  // Azure configuration endpoint
  app.post("/api/azure/configure", async (req: Request, res: Response) => {
    try {
      const { tenantId, clientId, clientSecret, subscriptionId } = req.body;

      // Validate required fields
      if (!tenantId || !clientId || !clientSecret || !subscriptionId) {
        return res.status(400).json({ 
          message: "Missing required Azure credentials" 
        });
      }

      // Store credentials in environment variables
      process.env.AZURE_TENANT_ID = tenantId;
      process.env.AZURE_CLIENT_ID = clientId;
      process.env.AZURE_CLIENT_SECRET = clientSecret;
      process.env.AZURE_SUBSCRIPTION_ID = subscriptionId;

      // Test the credentials
      const authResult = await authenticateWithAzure();
      
      if (!authResult.success) {
        return res.status(401).json({ 
          message: "Invalid Azure credentials",
          details: authResult.message
        });
      }

      res.json({ 
        message: "Azure credentials configured successfully",
        isAuthenticated: true 
      });
    } catch (error) {
      console.error("Azure configuration error:", error);
      res.status(500).json({ 
        message: "Failed to configure Azure credentials",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Azure status endpoints
  app.get("/api/azure/status", (_req: Request, res: Response) => {
    const isConnected = !!(
      process.env.AZURE_ACCESS_TOKEN &&
      process.env.AZURE_SUBSCRIPTION_ID
    );
    
    res.json({ isConnected });
  });

  app.get("/api/azure/account-info", (_req: Request, res: Response) => {
    try {
      const accountInfo = process.env.AZURE_ACCOUNT_INFO;
      
      if (!accountInfo) {
        return res.status(404).json({ message: "No Azure account connected" });
      }
      
      const parsedInfo = JSON.parse(accountInfo);
      res.json({
        subscription: parsedInfo.subscriptionName,
        tenant: parsedInfo.tenantName,
        environment: parsedInfo.environment
      });
    } catch (error) {
      console.error("Error fetching Azure account info:", error);
      res.status(500).json({ message: "Failed to fetch Azure account info" });
    }
  });

  app.post("/api/azure/disconnect", (_req: Request, res: Response) => {
    // Clear Azure-related environment variables
    delete process.env.AZURE_ACCESS_TOKEN;
    delete process.env.AZURE_REFRESH_TOKEN;
    delete process.env.AZURE_SUBSCRIPTION_ID;
    delete process.env.AZURE_ACCOUNT_INFO;
    
    res.json({ message: "Successfully disconnected from Azure" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
