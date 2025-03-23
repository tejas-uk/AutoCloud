import * as fs from "fs";
import * as fse from "fs-extra";
import * as path from "path";
import * as tmp from "tmp";
import { storage } from "./storage";
import { Terraform } from "js-terraform";
import { DefaultAzureCredential } from "@azure/identity";
import { ResourceManagementClient } from "@azure/arm-resources";
import { ComputeManagementClient } from "@azure/arm-compute";
import { NetworkManagementClient } from "@azure/arm-network";
import { StorageManagementClient } from "@azure/arm-storage";

/**
 * Authenticate with Azure SDK
 * This function will use the DefaultAzureCredential to authenticate with Azure
 * which tries various authentication methods based on the environment
 */
export async function authenticateWithAzure(): Promise<{ 
  success: boolean; 
  message: string; 
  logs: string[]; 
  isLoggedIn: boolean;
  credentials?: DefaultAzureCredential;
}> {
  const logs: string[] = [];
  
  try {
    logs.push("Initializing Azure SDK authentication...");
    
    // DefaultAzureCredential will try multiple authentication methods:
    // - Environment variables
    // - Managed identity
    // - Visual Studio Code credentials
    // - Azure CLI credentials
    // - Interactive browser login (if available)
    const credential = new DefaultAzureCredential();
    
    logs.push("Checking Azure authentication by accessing subscription information...");
    
    // Try to get a token to validate credentials
    try {
      await credential.getToken("https://management.azure.com/.default");
      logs.push("Successfully authenticated with Azure SDK");
      
      // Get subscription information if possible
      try {
        const resourceClient = new ResourceManagementClient(credential, process.env.AZURE_SUBSCRIPTION_ID || "");
        const subscriptions = await resourceClient.subscriptions.list();
        const subscriptionArray = Array.from(await subscriptions.next().then(r => r.value || []));
        
        if (subscriptionArray.length > 0) {
          const subscription = subscriptionArray[0];
          logs.push(`Using subscription: ${subscription.displayName} (${subscription.subscriptionId})`);
        } else {
          logs.push("No subscription information available");
        }
      } catch (subError: any) {
        logs.push(`Unable to retrieve subscription details: ${subError.message}`);
        logs.push("This is expected when authenticating without a specific subscription ID.");
      }
      
      return {
        success: true,
        message: "Successfully authenticated with Azure",
        logs,
        isLoggedIn: true,
        credentials: credential
      };
      
    } catch (tokenError: any) {
      logs.push(`Authentication failed: ${tokenError.message}`);
      logs.push("No valid Azure credentials found.");
      logs.push("In a real environment, you would need to:");
      logs.push("1. Log in with the Azure CLI: az login");
      logs.push("2. Set environment variables: AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET");
      logs.push("3. Or use a managed identity if available");
      
      return {
        success: false,
        message: "Azure authentication failed",
        logs,
        isLoggedIn: false
      };
    }
  } catch (error: any) {
    logs.push(`Azure SDK initialization error: ${error.message || "Unknown error"}`);
    
    return {
      success: false,
      message: "Failed to initialize Azure SDK",
      logs,
      isLoggedIn: false
    };
  }
}

/**
 * Run Terraform Init and Plan on the generated Terraform files
 * Uses JS-Terraform library instead of requiring the CLI to be installed
 */
export async function runTerraformPlan(analysisId: string): Promise<{ 
  success: boolean; 
  message: string; 
  logs: string[]; 
  planOutput?: string;
}> {
  const logs: string[] = [];
  
  try {
    // Get the analysis to find the Terraform code
    const analysis = await storage.getAnalysis(analysisId);
    if (!analysis) {
      throw new Error("Analysis not found");
    }
    
    if (!analysis.terraformCode) {
      throw new Error("No Terraform code found for this analysis");
    }
    
    // Create a temporary directory for Terraform files
    const tempDir = tmp.dirSync({ prefix: 'terraform-' });
    const terraformDir = tempDir.name;
    
    logs.push(`Created temporary Terraform directory: ${terraformDir}`);
    
    // Write Terraform files to the temporary directory
    const fileOps = [];
    for (const file of analysis.terraformCode.files) {
      const filePath = path.join(terraformDir, file.name);
      logs.push(`Creating file: ${file.name}`);
      fileOps.push(fs.promises.writeFile(filePath, file.content));
    }
    
    await Promise.all(fileOps);
    logs.push("All Terraform files written to disk");
    
    // Initialize the Terraform instance
    const terraform = new Terraform({
      cwd: terraformDir
    });
    
    // Run Terraform Init
    logs.push("Running Terraform init...");
    try {
      const initResult = await terraform.init();
      logs.push("Terraform init completed successfully");
      logs.push(initResult);
    } catch (initError: any) {
      logs.push(`Terraform init error: ${initError.message}`);
      throw initError;
    }
    
    // Run Terraform Plan
    logs.push("Running Terraform plan...");
    try {
      const planResult = await terraform.plan({
        out: "tfplan"
      });
      logs.push("Terraform plan completed successfully");
      logs.push(planResult);
      
      return {
        success: true,
        message: "Terraform plan completed successfully",
        logs,
        planOutput: planResult
      };
    } catch (planError: any) {
      logs.push(`Terraform plan error: ${planError.message}`);
      throw planError;
    }
  } catch (error: any) {
    logs.push(`Error: ${error.message || "Unknown error"}`);
    
    return {
      success: false,
      message: `Failed to run Terraform plan: ${error.message || "Unknown error"}`,
      logs
    };
  }
}

/**
 * Apply the Terraform plan to deploy resources to Azure
 * Uses JS-Terraform library instead of requiring the CLI to be installed
 */
export async function applyTerraformPlan(analysisId: string): Promise<{ 
  success: boolean; 
  message: string; 
  logs: string[]; 
  outputs?: Record<string, string>;
}> {
  const logs: string[] = [];
  
  try {
    // First run the plan to make sure we have a valid plan file
    const planResult = await runTerraformPlan(analysisId);
    if (!planResult.success) {
      return {
        success: false,
        message: "Failed to create Terraform plan",
        logs: [...logs, ...planResult.logs]
      };
    }
    
    logs.push(...planResult.logs);
    
    // Get the directory from the plan logs
    const dirLine = planResult.logs.find(line => line.includes('Created temporary Terraform directory'));
    if (!dirLine) {
      return {
        success: false,
        message: "Could not find Terraform directory",
        logs
      };
    }
    
    const terraformDir = dirLine.split('Created temporary Terraform directory: ')[1];
    logs.push(`Using Terraform directory: ${terraformDir}`);
    
    // Initialize the Terraform instance
    const terraform = new Terraform({
      cwd: terraformDir
    });
    
    // Apply the plan
    logs.push("Running Terraform apply...");
    try {
      const applyResult = await terraform.apply({
        autoApprove: true
      });
      logs.push("Terraform apply completed successfully");
      logs.push(applyResult);
      
      // Get outputs
      logs.push("Getting Terraform outputs...");
      const outputs = await terraform.output({
        json: true
      });
      
      // Parse outputs
      const parsedOutputs = JSON.parse(outputs);
      
      // Convert complex output structure to simple key-value pairs
      const formattedOutputs: Record<string, string> = {};
      for (const [key, value] of Object.entries(parsedOutputs)) {
        // @ts-ignore - Dynamic structure from Terraform
        formattedOutputs[key] = value.value;
      }
      
      return {
        success: true,
        message: "Terraform apply completed successfully",
        logs,
        outputs: formattedOutputs
      };
    } catch (applyError: any) {
      logs.push(`Terraform apply error: ${applyError.message}`);
      throw applyError;
    }
  } catch (error: any) {
    logs.push(`Error: ${error.message || "Unknown error"}`);
    
    return {
      success: false,
      message: `Failed to apply Terraform plan: ${error.message || "Unknown error"}`,
      logs
    };
  }
}