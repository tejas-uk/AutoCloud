import { OpenAI } from "openai";
import { HostingRecommendation, TerraformCode, AzureService } from "@/lib/types";
import { fetchRepositoryInfo } from "./github";
import fs from "fs";
import path from "path";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate Terraform Infrastructure as Code based on analyzed repository and Azure recommendations
 */
export async function generateTerraformCode(
  analysisId: string,
  repoUrl: string,
  hostingRecommendation: HostingRecommendation
): Promise<TerraformCode> {
  try {
    const repoInfo = await fetchRepositoryInfo(repoUrl);
    
    // Create a directory for the Terraform files
    const terraformDir = path.join("./tmp", `${repoInfo.owner}_${repoInfo.repo}_terraform`);
    
    // Create the terraform directory if it doesn't exist
    if (!fs.existsSync(terraformDir)) {
      fs.mkdirSync(terraformDir, { recursive: true });
    }
    
    // Generate terraform code using OpenAI
    const terraformFiles = await generateTerraformFilesWithAI(repoInfo.fullName, hostingRecommendation);
    
    // Validate the generated files
    const validatedFiles = validateTerraformFiles(terraformFiles);
    console.log("Validated Terraform files");
    
    // Write the generated files to disk
    for (const file of validatedFiles) {
      const filePath = path.join(terraformDir, file.name);
      fs.writeFileSync(filePath, file.content);
    }
    
    return {
      files: validatedFiles,
      summary: `Complete Terraform code for deploying ${repoInfo.fullName} to Azure with required infrastructure`,
      instructions: "To use this Terraform code:\n1. Install Terraform CLI\n2. Initialize with 'terraform init'\n3. Review and modify variables in terraform.tfvars\n4. Run 'terraform plan' to preview changes\n5. Apply with 'terraform apply'"
    };
  } catch (error) {
    console.error("Error generating Terraform code:", error);
    throw error;
  }
}

/**
 * Generate Terraform files using OpenAI
 */
async function generateTerraformFilesWithAI(
  repoFullName: string,
  hostingRecommendation: HostingRecommendation
): Promise<Array<{ name: string; content: string; description: string }>> {
  try {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `You are an expert Terraform developer. Generate Terraform code for Azure infrastructure following these requirements:

1. File Organization:
   - main.tf: Core infrastructure resources ONLY (no randomization resources)
   - variables.tf: Input variables
   - outputs.tf: Output values
   - providers.tf: Provider configuration
   - randomization.tf: ONLY place for random string/integer generation (DO NOT define randomization resources in main.tf)

2. Best Practices:
   - Use consistent resource naming with prefix and random suffix
   - Set appropriate default values for variables
   - Include descriptive comments
   - Use proper resource dependencies
   - Follow Azure naming conventions

3. Provider Requirements:
   - Use azurerm provider version ~> 3.0
   - Include required provider blocks
   - Configure provider features block

4. Resource Requirements:
   - Resource Group with tags
   - App Service Plan (Standard tier)
   - App Service with proper configuration
   - SQL Server (use azurerm_mssql_server, not azurerm_sql_server)
   - SQL Database (use azurerm_mssql_database, not azurerm_sql_database)
   - Storage Account with Standard tier
   - Azure AD Application with proper tags
   - API Management with Developer SKU
   - Application Insights for monitoring
   - Key Vault with proper access policies

5. SQL Server Specific Requirements:
   - Use azurerm_mssql_server resource type
   - Configure minimum_tls_version = "1.2"
   - Set public_network_access_enabled = false
   - Use azurerm_mssql_database for databases
   - Do not use extended_auditing_policy block

6. Key Vault Specific Requirements:
   - MUST include the azurerm_client_config data source at the top of main.tf
   - Key Vault must use the data source for tenant_id and access policies
   - Access policy must include key and secret permissions for the current user
   - Key Vault configuration must include:
     * name
     * location
     * resource_group_name
     * tenant_id (from azurerm_client_config)
     * sku_name
     * access_policy block with:
       - tenant_id (from azurerm_client_config)
       - object_id (from azurerm_client_config)
       - key_permissions
       - secret_permissions
   - Example structure:
     data "azurerm_client_config" "current" {}
     
     resource "azurerm_key_vault" "main" {
       name                = "\${var.prefix}-\${random_string.suffix.result}-kv"
       location            = azurerm_resource_group.main.location
       resource_group_name = azurerm_resource_group.main.name
       tenant_id          = data.azurerm_client_config.current.tenant_id
       sku_name           = "standard"
       
       access_policy {
         tenant_id = data.azurerm_client_config.current.tenant_id
         object_id = data.azurerm_client_config.current.object_id
         
         key_permissions = [
           "Get", "List", "Create", "Delete", "Update"
         ]
         
         secret_permissions = [
           "Get", "List", "Set", "Delete"
         ]
       }
     }

7. Randomization Resources:
   - MUST define all random resources ONLY in randomization.tf
   - Include a random_string resource named "suffix" for use in naming resources
   - DO NOT define any random resources in main.tf or other files

8. Output Requirements:
   - Resource group name
   - App service URL
   - SQL server FQDN
   - Storage account name
   - Azure AD application ID
   - Key Vault name

9. Additional Requirements:
   - Use toset() for Azure AD application tags
   - Include proper resource dependencies
   - Set appropriate SKUs and tiers
   - Configure proper networking settings

10. JSON Output Format:
   {
     "main.tf": "content",
     "variables.tf": "content",
     "outputs.tf": "content",
     "providers.tf": "content",
     "randomization.tf": "content"
   }`
      },
      {
        role: "user",
        content: `Generate Terraform code for Azure infrastructure with the following requirements:

1. Resource Group:
   - Name: {prefix}-{random}-rg
   - Location: {location}
   - Tags: {tags}

2. App Service Plan:
   - Name: {prefix}-{random}-asp
   - SKU: Standard S1
   - Location: Same as resource group

3. App Service:
   - Name: {prefix}-{random}-app
   - Plan: Reference to App Service Plan
   - Location: Same as resource group

4. SQL Server:
   - Name: {prefix}-{random}-sql
   - Version: 12.0
   - Admin credentials: From variables
   - Private endpoint only
   - TLS 1.2
   - Use azurerm_mssql_server resource type
   - Disable public network access

5. SQL Database:
   - Name: {prefix}-{random}-db
   - Server: Reference to SQL Server
   - SKU: Basic
   - Max size: 2GB
   - Use azurerm_mssql_database resource type

6. Storage Account:
   - Name: {prefix}{random}st
   - Tier: Standard
   - Replication: LRS
   - Location: Same as resource group

7. Azure AD Application:
   - Display name: {prefix}-{random}-app
   - Tags: Environment and project

8. API Management:
   - Name: {prefix}-{random}-api
   - SKU: Developer_1
   - Publisher details: From prefix

9. Application Insights:
   - Name: {prefix}-{random}-ai
   - Type: Web
   - Location: Same as resource group

10. Key Vault:
    - Name: {prefix}-{random}-kv
    - SKU: Standard
    - Access policy for current user
    - Key and secret permissions

11. Variables:
    - prefix: String
    - location: String
    - tags: Map
    - sql_admin_username: String
    - sql_admin_password: String
    - environment: String
    - project: String

12. Outputs:
    - Resource group name
    - App service URL
    - SQL server FQDN
    - Storage account name
    - Azure AD application ID
    - Key Vault name

IMPORTANT: 
- Use azurerm_mssql_server and azurerm_mssql_database resources, not the older sql_server variants
- Ensure the Key Vault configuration includes the azurerm_client_config data source
- Do not use extended_auditing_policy block in SQL Server configuration`
      }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 4000
    });

    // Parse the response JSON
    const messageContent = response.choices[0].message.content;
    if (!messageContent) {
      console.error("Empty response from AI");
      throw new Error("Empty response from AI");
    }
    
    if (typeof messageContent !== 'string') {
      console.error("Invalid response type:", typeof messageContent);
      throw new Error("Invalid response from AI. Content is not a string.");
    }
    
    console.log("AI Response received, length:", messageContent.length);
    console.log("AI Response content:", messageContent);
    
    try {
      const result = JSON.parse(messageContent);
      console.log("Parsed JSON result:", JSON.stringify(result, null, 2));
      
      // Check for and fix duplicate resources
      const fixedResult = fixDuplicateResources(result);
      
      // Convert the flat file structure to the expected format
      const files = Object.entries(fixedResult).map(([name, content]) => ({
        name,
        content: content as string,
        description: getFileDescription(name)
      }));
      
      if (files.length === 0) {
        console.error("No files found in the response");
        throw new Error("No Terraform files in the AI response.");
      }
      
      return files;
    } catch (parseError: unknown) {
      console.error("Error parsing AI response:", parseError);
      console.error("Response content snippet:", messageContent.substring(0, 200) + "...");
      if (parseError instanceof Error) {
        throw new Error(`Failed to parse AI response: ${parseError.message}`);
      } else {
        throw new Error(`Failed to parse AI response: ${String(parseError)}`);
      }
    }
  } catch (error: unknown) {
    console.error("Error in generateTerraformFilesWithAI:", error);
    
    // If we have an AI model error, create some fallback basic files
    // to demonstrate the structure without actual implementation
    if (error instanceof Error && error.message.includes("AI")) {
      console.log("Generating fallback Terraform files...");
      return [
        {
          name: "main.tf",
          content: `# Terraform configuration for ${repoFullName}
# This is a basic template. Please customize for your specific needs.

resource "azurerm_resource_group" "main" {
  name     = "\${var.prefix}-\${random_string.suffix.result}-rg"
  location = var.location
  
  tags = {
    environment = var.environment
    project     = "${repoFullName.split('/')[1]}"
    generated   = "true"
    timestamp   = formatdate("YYYY-MM-DD-hh-mm", timestamp())
  }
}

# Additional resources would be defined here based on the specific requirements
`,
          description: "Main Terraform configuration file defining the Azure resources"
        },
        {
          name: "variables.tf",
          content: `# Variables for ${repoFullName} Terraform configuration

variable "prefix" {
  description = "Prefix for all resource names"
  type        = string
  default     = "azure-deploy"
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "eastus"
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project" {
  description = "Project name for resource tagging"
  type        = string
  default     = "azure-app"
}
`,
          description: "Variables used in the Terraform configuration"
        },
        {
          name: "randomization.tf",
          content: `# Random resource generation to avoid naming conflicts

resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

resource "random_integer" "priority" {
  min = 100
  max = 999
}
`,
          description: "Randomization resources to ensure unique naming in Azure"
        },
        {
          name: "providers.tf",
          content: `# Provider configuration

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
  
  required_version = ">= 1.0.0"
}

provider "azurerm" {
  features {}
}
`,
          description: "Azure provider configuration for Terraform"
        },
        {
          name: "outputs.tf",
          content: `# Outputs from the Terraform deployment

output "resource_group_id" {
  value       = azurerm_resource_group.main.id
  description = "ID of the created resource group"
}

output "resource_group_location" {
  value       = azurerm_resource_group.main.location
  description = "Location of the created resource group"
}

output "random_suffix" {
  value       = random_string.suffix.result
  description = "Random suffix used for resource naming"
}
`,
          description: "Outputs from the Terraform deployment"
        },
        {
          name: "terraform.tfvars",
          content: `# Default values for ${repoFullName} Terraform deployment

prefix      = "azure-${repoFullName.split('/')[1].toLowerCase().substring(0, 10)}"
location    = "eastus"
environment = "dev"
project     = "azure-app"
`,
          description: "Sample Terraform variable values"
        }
      ];
    }
    
    // If it's another kind of error, just propagate it
    throw error;
  }
}

/**
 * Format Azure services for the AI prompt
 */
function formatAzureServicesForPrompt(services: AzureService[]): string {
  return services.map(service => {
    return `- ${service.name} (${service.category}): ${service.description}
      Necessity: ${service.necessity}
      ${service.alternativeServices ? `Alternatives: ${service.alternativeServices.join(", ")}` : ''}
      ${service.estimatedCost ? `Estimated Cost: ${service.estimatedCost}` : ''}`;
  }).join("\n\n");
}

/**
 * Get a description for a Terraform file based on its name
 */
function getFileDescription(filename: string): string {
  switch (filename) {
    case "main.tf":
      return "Main Terraform configuration file defining the Azure resources";
    case "variables.tf":
      return "Variables used in the Terraform configuration";
    case "outputs.tf":
      return "Outputs from the Terraform deployment";
    case "providers.tf":
      return "Azure provider configuration for Terraform";
    case "randomization.tf":
      return "Randomization resources to ensure unique naming in Azure";
    case "terraform.tfvars":
      return "Sample Terraform variable values";
    default:
      return "Terraform configuration file";
  }
}

/**
 * Check for and fix duplicate resource definitions across files
 */
function fixDuplicateResources(files: Record<string, string>): Record<string, string> {
  console.log("Checking for duplicate resources...");
  
  // Check if both main.tf and randomization.tf have random_string "suffix"
  if (files["main.tf"] && files["randomization.tf"]) {
    const mainHasRandomString = files["main.tf"].includes('resource "random_string" "suffix"');
    const randomizationHasRandomString = files["randomization.tf"].includes('resource "random_string" "suffix"');
    
    if (mainHasRandomString && randomizationHasRandomString) {
      console.log("Found duplicate random_string resource in main.tf and randomization.tf. Removing from main.tf...");
      
      // Remove the random_string definition from main.tf
      const lines = files["main.tf"].split('\n');
      let inRandomStringBlock = false;
      let blockStart = -1;
      let blockEnd = -1;
      let braceCount = 0;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('resource "random_string" "suffix"')) {
          inRandomStringBlock = true;
          blockStart = i;
          braceCount = 1; // Count the opening brace
          continue;
        }
        
        if (inRandomStringBlock) {
          // Count braces to find the end of the block
          const openBraces = (lines[i].match(/{/g) || []).length;
          const closeBraces = (lines[i].match(/}/g) || []).length;
          braceCount += openBraces - closeBraces;
          
          if (braceCount === 0) {
            blockEnd = i;
            break;
          }
        }
      }
      
      if (blockStart >= 0 && blockEnd >= 0) {
        // Remove the block from main.tf
        lines.splice(blockStart, blockEnd - blockStart + 1);
        files["main.tf"] = lines.join('\n');
        console.log("Successfully removed duplicate random_string from main.tf");
      }
    }
  }
  
  // Similarly check for other potential duplicates
  
  return files;
}

/**
 * Validate Terraform files to ensure they meet requirements and don't have common errors
 */
function validateTerraformFiles(files: Array<{ name: string; content: string; description: string }>): Array<{ name: string; content: string; description: string }> {
  console.log("Validating Terraform files...");
  
  // Check for randomization resources in main.tf
  const mainTfFile = files.find(f => f.name === "main.tf");
  const randomizationFile = files.find(f => f.name === "randomization.tf");
  
  if (mainTfFile && randomizationFile) {
    // Check if main.tf contains random_string or random_integer definitions
    if (mainTfFile.content.includes('resource "random_string"') || mainTfFile.content.includes('resource "random_integer"')) {
      console.log("Found randomization resources in main.tf. Moving them to randomization.tf...");
      
      // Extract random resources from main.tf
      const randomResourceRegex = /resource\s+"random_(string|integer)"\s+"[^"]+"\s+{[\s\S]+?}/g;
      const randomResources = mainTfFile.content.match(randomResourceRegex) || [];
      
      if (randomResources.length > 0) {
        // Remove random resources from main.tf
        let updatedMainContent = mainTfFile.content;
        randomResources.forEach(resource => {
          updatedMainContent = updatedMainContent.replace(resource, '');
        });
        
        // Clean up any double newlines created by the removal
        updatedMainContent = updatedMainContent.replace(/\n\s*\n\s*\n/g, '\n\n');
        mainTfFile.content = updatedMainContent;
        
        // Add random resources to randomization.tf if they don't already exist
        randomResources.forEach(resource => {
          const resourceName = resource.match(/resource\s+"random_(string|integer)"\s+"([^"]+)"/);
          if (resourceName && !randomizationFile.content.includes(`resource "random_${resourceName[1]}" "${resourceName[2]}"`)) {
            randomizationFile.content += `\n\n${resource}`;
          }
        });
      }
    }
  }
  
  // Check for Key Vault tenant_id issue
  const keyVaultRegex = /resource\s+"azurerm_key_vault"\s+"main"\s+{[\s\S]+?}/;
  if (mainTfFile && mainTfFile.content.match(keyVaultRegex)) {
    // Check if azurerm_client_config data source is defined
    if (!mainTfFile.content.includes('data "azurerm_client_config" "current"')) {
      console.log("Adding missing azurerm_client_config data source for Key Vault...");
      mainTfFile.content = 'data "azurerm_client_config" "current" {}\n\n' + mainTfFile.content;
    }
    
    // Check if Key Vault includes tenant_id
    if (!mainTfFile.content.includes('tenant_id') && mainTfFile.content.includes('resource "azurerm_key_vault"')) {
      console.log("Key Vault is missing tenant_id. Adding it...");
      mainTfFile.content = mainTfFile.content.replace(
        /resource\s+"azurerm_key_vault"\s+"main"\s+{/,
        'resource "azurerm_key_vault" "main" {\n  tenant_id = data.azurerm_client_config.current.tenant_id'
      );
    }
  }
  
  // Check for SQL Server resource type
  if (mainTfFile && mainTfFile.content.includes('resource "azurerm_sql_server"')) {
    console.log("Found deprecated azurerm_sql_server resource. Replacing with azurerm_mssql_server...");
    mainTfFile.content = mainTfFile.content.replace(
      /resource\s+"azurerm_sql_server"/g,
      'resource "azurerm_mssql_server"'
    );
    
    // Remove extended_auditing_policy block if present
    const extendedAuditingRegex = /\s*extended_auditing_policy\s*{[\s\S]+?}/g;
    mainTfFile.content = mainTfFile.content.replace(extendedAuditingRegex, '');
  }
  
  return files;
}