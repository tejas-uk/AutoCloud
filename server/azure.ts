import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { storage } from "./storage";

const execAsync = promisify(exec);

/**
 * Check if a command is installed
 */
async function isCommandInstalled(command: string): Promise<boolean> {
  try {
    await execAsync(`which ${command}`);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if Azure CLI is installed
 */
async function isAzureCliInstalled(): Promise<boolean> {
  return isCommandInstalled("az");
}

/**
 * Check if Terraform is installed
 */
async function isTerraformInstalled(): Promise<boolean> {
  return isCommandInstalled("terraform");
}

/**
 * Authenticate with Azure CLI
 * This function will check if Azure CLI is installed, and if so,
 * either use an existing authenticated session or guide the user through the login process
 */
export async function authenticateWithAzure(): Promise<{ 
  success: boolean; 
  message: string; 
  logs: string[]; 
  isLoggedIn: boolean;
  isCliInstalled: boolean;
}> {
  const logs: string[] = [];
  
  // First check if Azure CLI is installed
  const cliInstalled = await isAzureCliInstalled();
  if (!cliInstalled) {
    logs.push("Azure CLI is not installed in this environment.");
    logs.push("To use this feature in a real environment, you would need to install the Azure CLI.");
    logs.push("For more information, visit: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli");
    
    return {
      success: false,
      message: "Azure CLI is not installed",
      logs,
      isLoggedIn: false,
      isCliInstalled: false
    };
  }
  
  try {
    // Check if already logged in
    logs.push("Checking Azure CLI login status...");
    const { stdout: accountsOutput } = await execAsync("az account show");
    const accountInfo = JSON.parse(accountsOutput);
    
    logs.push(`Already logged in as: ${accountInfo.user.name}`);
    logs.push(`Subscription: ${accountInfo.name} (${accountInfo.id})`);
    
    return {
      success: true,
      message: "Already authenticated with Azure",
      logs,
      isLoggedIn: true,
      isCliInstalled: true
    };
  } catch (error) {
    // Not logged in, need to authenticate
    logs.push("Not currently logged in to Azure.");
    logs.push("Starting Azure CLI login process...");
    
    try {
      const { stdout: loginOutput } = await execAsync("az login");
      const loginInfo = JSON.parse(loginOutput);
      
      // Verify login was successful
      if (Array.isArray(loginInfo) && loginInfo.length > 0) {
        const account = loginInfo[0];
        logs.push(`Successfully logged in as: ${account.user.name}`);
        logs.push(`Subscription: ${account.name} (${account.id})`);
        
        return {
          success: true,
          message: "Successfully authenticated with Azure",
          logs,
          isLoggedIn: true,
          isCliInstalled: true
        };
      } else {
        throw new Error("Login response did not contain expected account information");
      }
    } catch (loginError: any) {
      logs.push(`Login error: ${loginError.message || "Unknown login error"}`);
      
      return {
        success: false,
        message: "Failed to authenticate with Azure",
        logs,
        isLoggedIn: false,
        isCliInstalled: true
      };
    }
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
  isTerraformInstalled?: boolean;
}> {
  const logs: string[] = [];
  
  // First check if Terraform is installed
  const terraformInstalled = await isTerraformInstalled();
  if (!terraformInstalled) {
    logs.push("Terraform is not installed in this environment.");
    logs.push("To use this feature in a real environment, you would need to install Terraform.");
    logs.push("For more information, visit: https://developer.hashicorp.com/terraform/downloads");
    
    return {
      success: false,
      message: "Terraform is not installed",
      logs,
      isTerraformInstalled: false
    };
  }
  
  try {
    // Get the analysis to find the Terraform code
    const analysis = await storage.getAnalysis(analysisId);
    if (!analysis) {
      throw new Error("Analysis not found");
    }
    
    if (!analysis.terraformCode) {
      throw new Error("No Terraform code found for this analysis");
    }
    
    // Repository details for directory naming
    const repoName = analysis.repoName.replace('/', '_');
    const terraformDir = path.join("./tmp", `${repoName}_terraform`);
    
    logs.push(`Using Terraform directory: ${terraformDir}`);
    
    // Ensure directory exists
    if (!fs.existsSync(terraformDir)) {
      logs.push("Creating Terraform directory...");
      fs.mkdirSync(terraformDir, { recursive: true });
    }
    
    // Write Terraform files to disk if they don't exist
    const fileOps = [];
    for (const file of analysis.terraformCode.files) {
      const filePath = path.join(terraformDir, file.name);
      logs.push(`Creating file: ${file.name}`);
      fileOps.push(fs.promises.writeFile(filePath, file.content));
    }
    
    await Promise.all(fileOps);
    logs.push("All Terraform files written to disk");
    
    // Run Terraform Init
    logs.push("Running Terraform init...");
    const { stdout: initOutput, stderr: initError } = await execAsync("terraform init", { cwd: terraformDir });
    logs.push(initOutput);
    
    if (initError) {
      logs.push(`Init error: ${initError}`);
    }
    
    // Run Terraform Plan
    logs.push("Running Terraform plan...");
    const { stdout: planOutput, stderr: planError } = await execAsync("terraform plan -out=tfplan", { cwd: terraformDir });
    logs.push(planOutput);
    
    if (planError) {
      logs.push(`Plan error: ${planError}`);
    }
    
    return {
      success: true,
      message: "Terraform plan completed successfully",
      logs,
      planOutput,
      isTerraformInstalled: true
    };
  } catch (error: any) {
    logs.push(`Error: ${error.message || "Unknown error"}`);
    
    return {
      success: false,
      message: `Failed to run Terraform plan: ${error.message || "Unknown error"}`,
      logs,
      isTerraformInstalled: true
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
  isTerraformInstalled?: boolean;
}> {
  const logs: string[] = [];
  
  // First check if Terraform is installed
  const terraformInstalled = await isTerraformInstalled();
  if (!terraformInstalled) {
    logs.push("Terraform is not installed in this environment.");
    logs.push("To use this feature in a real environment, you would need to install Terraform.");
    logs.push("For more information, visit: https://developer.hashicorp.com/terraform/downloads");
    
    return {
      success: false,
      message: "Terraform is not installed",
      logs,
      isTerraformInstalled: false
    };
  }
  
  try {
    // Get the analysis to find the repository details
    const analysis = await storage.getAnalysis(analysisId);
    if (!analysis) {
      throw new Error("Analysis not found");
    }
    
    // Repository details for directory lookup
    const repoName = analysis.repoName.replace('/', '_');
    const terraformDir = path.join("./tmp", `${repoName}_terraform`);
    
    logs.push(`Using Terraform directory: ${terraformDir}`);
    
    // Ensure the directory and plan file exist
    if (!fs.existsSync(terraformDir)) {
      throw new Error("Terraform directory not found");
    }
    
    if (!fs.existsSync(path.join(terraformDir, "tfplan"))) {
      logs.push("No plan file found, running terraform plan...");
      const planResult = await runTerraformPlan(analysisId);
      
      if (!planResult.success) {
        return {
          success: false,
          message: "Failed to create Terraform plan",
          logs: [...logs, ...planResult.logs],
          isTerraformInstalled: true
        };
      }
    }
    
    // Apply the plan
    logs.push("Running Terraform apply...");
    const { stdout: applyOutput, stderr: applyError } = await execAsync("terraform apply -auto-approve tfplan", { cwd: terraformDir });
    logs.push(applyOutput);
    
    if (applyError) {
      logs.push(`Apply error: ${applyError}`);
    }
    
    // Extract outputs
    logs.push("Getting Terraform outputs...");
    const { stdout: outputsJson } = await execAsync("terraform output -json", { cwd: terraformDir });
    const outputs = JSON.parse(outputsJson);
    
    // Convert complex output structure to simple key-value pairs
    const formattedOutputs: Record<string, string> = {};
    for (const [key, value] of Object.entries(outputs)) {
      // @ts-ignore - Dynamic structure from Terraform
      formattedOutputs[key] = value.value;
    }
    
    return {
      success: true,
      message: "Terraform apply completed successfully",
      logs,
      outputs: formattedOutputs,
      isTerraformInstalled: true
    };
  } catch (error: any) {
    logs.push(`Error: ${error.message || "Unknown error"}`);
    
    return {
      success: false,
      message: `Failed to apply Terraform plan: ${error.message || "Unknown error"}`,
      logs,
      isTerraformInstalled: true
    };
  }
}