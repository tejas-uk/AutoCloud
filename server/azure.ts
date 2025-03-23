import * as fs from "fs";
import * as fse from "fs-extra";
import * as path from "path";
import * as tmp from "tmp";
import { storage } from "./storage";
import { DefaultAzureCredential } from "@azure/identity";
import { ResourceManagementClient } from "@azure/arm-resources";
import { ComputeManagementClient } from "@azure/arm-compute";
import { NetworkManagementClient } from "@azure/arm-network";
import { StorageManagementClient } from "@azure/arm-storage";
import { execSync } from "child_process";

// Use direct process execution instead of the js-terraform library
// This approach is simpler and more reliable

// Create a wrapper to execute Terraform commands
class TerraformWrapper {
  private cwd: string;

  constructor(options: { cwd: string }) {
    this.cwd = options.cwd;
  }

  async init(): Promise<string> {
    try {
      // Create a provider.tf file if it doesn't exist
      const providerPath = path.join(this.cwd, 'provider.tf');
      if (!fs.existsSync(providerPath)) {
        const azurermProvider = `
provider "azurerm" {
  features {}
  subscription_id = "${process.env.AZURE_SUBSCRIPTION_ID}"
  tenant_id       = "${process.env.AZURE_TENANT_ID}"
  client_id       = "${process.env.AZURE_CLIENT_ID}"
  client_secret   = "${process.env.AZURE_CLIENT_SECRET}"
}
`;
        await fs.promises.writeFile(providerPath, azurermProvider);
      }

      // Execute the terraform init command
      try {
        const output = execSync('terraform init', { 
          cwd: this.cwd, 
          env: process.env,
          stdio: 'pipe'
        }).toString();
        
        return `Initialized terraform in ${this.cwd}\n${output}`;
      } catch (execError: any) {
        throw new Error(`Terraform init execution error: ${execError.message || ''}\n${execError.stderr?.toString() || ''}`);
      }
    } catch (error: any) {
      let errorMessage = error.message || '';
      if (error.stderr) {
        errorMessage += `\n${error.stderr}`;
      }
      throw new Error(`Terraform init error: ${errorMessage}`);
    }
  }

  async plan(options?: { out?: string }): Promise<string> {
    try {
      // Construct the command with any options
      let command = 'terraform plan';
      if (options?.out) {
        command += ` -out=${options.out}`;
      }
      
      // Use execSync for reliability
      try {
        const output = execSync(command, { 
          cwd: this.cwd, 
          env: process.env,
          stdio: 'pipe'
        }).toString();
        
        return output || 'Terraform plan completed successfully';
      } catch (execError: any) {
        throw new Error(`Terraform plan execution error: ${execError.message || ''}\n${execError.stderr?.toString() || ''}`);
      }
    } catch (error: any) {
      let errorMessage = error.message || '';
      if (error.stderr) {
        errorMessage += `\n${error.stderr}`;
      }
      throw new Error(`Terraform plan error: ${errorMessage}`);
    }
  }

  async apply(options?: { autoApprove?: boolean }): Promise<string> {
    try {
      // Construct the command with any options
      let command = 'terraform apply';
      if (options?.autoApprove) {
        command += ' -auto-approve';
      }
      
      // Use execSync for reliability
      try {
        const output = execSync(command, { 
          cwd: this.cwd, 
          env: process.env,
          stdio: 'pipe'
        }).toString();
        
        return output || 'Terraform apply completed successfully';
      } catch (execError: any) {
        throw new Error(`Terraform apply execution error: ${execError.message || ''}\n${execError.stderr?.toString() || ''}`);
      }
    } catch (error: any) {
      let errorMessage = error.message || '';
      if (error.stderr) {
        errorMessage += `\n${error.stderr}`;
      }
      throw new Error(`Terraform apply error: ${errorMessage}`);
    }
  }

  async output(options?: { json?: boolean }): Promise<string> {
    try {
      // Construct the command with any options
      let command = 'terraform output';
      if (options?.json) {
        command += ' -json';
      }
      
      // Use execSync for reliability
      try {
        const output = execSync(command, { 
          cwd: this.cwd, 
          env: process.env,
          stdio: 'pipe'
        }).toString();
        
        return output || '{}';
      } catch (execError: any) {
        throw new Error(`Terraform output execution error: ${execError.message || ''}\n${execError.stderr?.toString() || ''}`);
      }
    } catch (error: any) {
      let errorMessage = error.message || '';
      if (error.stderr) {
        errorMessage += `\n${error.stderr}`;
      }
      throw new Error(`Terraform output error: ${errorMessage}`);
    }
  }
}

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
  subscriptionId?: string;
}> {
  const logs: string[] = [];
  
  try {
    logs.push("Starting Azure authentication process...");
    logs.push("Initializing Azure SDK authentication...");
    
    // Check if environment variables are set
    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
    
    if (!tenantId || !clientId || !clientSecret || !subscriptionId) {
      logs.push("Missing required Azure credentials. Environment variables not set correctly.");
      logs.push("Please ensure AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and AZURE_SUBSCRIPTION_ID are provided.");
      return {
        success: false,
        message: "Azure authentication failed: Missing required credentials",
        logs,
        isLoggedIn: false
      };
    }
    
    // DefaultAzureCredential will try multiple authentication methods:
    // - Environment variables (which we just verified are present)
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
      logs.push(`Using subscription: ${subscriptionId}`);
      
      // Create a resource client to further validate access
      const resourceClient = new ResourceManagementClient(credential, subscriptionId);
      
      // Try a simple call to validate our access
      try {
        await resourceClient.resources.list({ top: 1 });
        logs.push("Successfully accessed Azure resources");
      } catch (resourceError: any) {
        logs.push(`Warning: Could not access Azure resources: ${resourceError.message}`);
        // We'll continue anyway as token was successful
      }
      
      return {
        success: true,
        message: "Successfully authenticated with Azure",
        logs,
        isLoggedIn: true,
        credentials: credential,
        subscriptionId
      };
      
    } catch (tokenError: any) {
      logs.push(`Authentication failed: ${tokenError.message}`);
      return {
        success: false,
        message: "Azure authentication failed: Invalid credentials",
        logs,
        isLoggedIn: false
      };
    }
  } catch (error: any) {
    logs.push(`Azure SDK initialization error: ${error.message || "Unknown error"}`);
    
    return {
      success: false,
      message: `Azure authentication failed: ${error.message || "Unknown error"}`,
      logs,
      isLoggedIn: false
    };
  }
}

/**
 * Run Terraform Init and Plan on the generated Terraform files
 */
export async function runTerraformPlan(analysisId: string): Promise<{ 
  success: boolean; 
  message: string; 
  logs: string[]; 
  planOutput?: string;
  terraformDir?: string;
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
    const terraform = new TerraformWrapper({
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
      
      // Extract plan details from the output if available
      const planMatch = planResult.match(/Plan: (\d+) to add, (\d+) to change, (\d+) to destroy/);
      if (planMatch) {
        logs.push(`Resources to deploy: ${planMatch[1]} add, ${planMatch[2]} change, ${planMatch[3]} destroy`);
      }
      
      return {
        success: true,
        message: "Terraform plan completed successfully",
        logs,
        planOutput: planResult,
        terraformDir
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
    
    // Get the directory from the plan result
    const terraformDir = planResult.terraformDir;
    if (!terraformDir) {
      return {
        success: false,
        message: "Could not find Terraform directory",
        logs
      };
    }
    
    logs.push(`Using Terraform directory: ${terraformDir}`);
    
    // Initialize the Terraform instance
    const terraform = new TerraformWrapper({
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
      
      // Extract apply details from the output if available
      const applyMatch = applyResult.match(/Apply complete! Resources: (\d+) added, (\d+) changed, (\d+) destroyed/);
      if (applyMatch) {
        logs.push(`Resources deployed: ${applyMatch[1]} added, ${applyMatch[2]} changed, ${applyMatch[3]} destroyed`);
      }
      
      // Get outputs
      logs.push("Getting Terraform outputs...");
      const outputs = await terraform.output({
        json: true
      });
      
      try {
        // Parse outputs
        const parsedOutputs = JSON.parse(outputs);
        
        // Convert complex output structure to simple key-value pairs
        const formattedOutputs: Record<string, string> = {};
        for (const [key, value] of Object.entries(parsedOutputs)) {
          // @ts-ignore - Dynamic structure from Terraform
          formattedOutputs[key] = value.value;
          logs.push(`Output ${key}: ${formattedOutputs[key]}`);
        }
        
        if (formattedOutputs.app_service_url || formattedOutputs.webapp_url) {
          const appUrl = formattedOutputs.app_service_url || formattedOutputs.webapp_url;
          logs.push(`🎉 Your application is available at: ${appUrl}`);
        }
        
        return {
          success: true,
          message: "Terraform apply completed successfully",
          logs,
          outputs: formattedOutputs
        };
      } catch (outputError: any) {
        logs.push(`Warning: Unable to parse Terraform outputs: ${outputError.message}`);
        // Continue even without outputs
        return {
          success: true,
          message: "Terraform apply completed successfully, but outputs could not be parsed",
          logs
        };
      }
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